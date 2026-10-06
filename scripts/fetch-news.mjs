/**
 * 경기대 축구부 네이버 블로그(blog.naver.com/orangeturtles)의 새 글을 RSS로 받아 src/data/news.json 에 저장.
 * - RSS는 구독용으로 공개된 주소 (rss.blog.naver.com/orangeturtles.xml). 실행 전 robots.txt 를 확인해 막혀 있으면 멈춤
 * - 가져오는 것: 제목·날짜·분류·짧은 요약(본문 앞부분 90자)·원문 링크·대표 사진 1장
 *   본문 전체와 나머지 사진은 가져오지 않음. 대표 사진은 작은 크기로 public/news/ 에 저장 (사용자 결정 2026-10-06)
 * - 최신 6개만 유지. 내용이 그대로면 파일을 건드리지 않음
 * - 실패하면 기존 파일을 그대로 두고 종료 코드 1 (사이트에는 이전 소식이 계속 보임)
 *
 * 실행: node scripts/fetch-news.mjs
 */
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'

const BLOG_ID = 'orangeturtles'
const FEED = `https://rss.blog.naver.com/${BLOG_ID}.xml`
const OUT = new URL('../src/data/news.json', import.meta.url)
const IMG_DIR = new URL('../public/news/', import.meta.url)
const KEEP = 6
const UA = 'kgu-football-fan-site (+https://github.com/IIN0Ru/kgu_football)'

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

/** robots.txt 에서 User-agent: * 그룹의 Disallow 규칙이 path 를 막는지 */
export function isDisallowed(robots, path) {
  let applies = false
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const [k, ...rest] = line.split(':')
    const v = rest.join(':').trim()
    if (/^user-agent$/i.test(k)) applies = v === '*'
    else if (applies && /^disallow$/i.test(k) && v && path.startsWith(v)) return true
  }
  return false
}

/** RSS 글 하나 → 사이트에 쓸 항목 */
export function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => {
    const link = tag(it, 'link').split('?')[0]
    const id = link.match(/(\d{6,})$/)?.[1] ?? link
    const html = tag(it, 'description')
    const img = html.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? null
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const d = new Date(tag(it, 'pubDate'))
    return {
      id,
      title: tag(it, 'title'),
      category: tag(it, 'category') || '블로그',
      date: Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }),
      summary: text.length > 90 ? `${text.slice(0, 90).trim()}…` : text || undefined,
      href: link,
      imageUrl: img,
    }
  })
}

/** 네이버 썸네일 주소를 가로 400px 정도 크기로 */
const sized = (url) => url.replace(/([?&])type=[^&]*/, '$1type=w400')

async function main() {
  const robots = await fetch('https://rss.blog.naver.com/robots.txt', { headers: { 'user-agent': UA } })
  if (robots.ok && isDisallowed(await robots.text(), `/${BLOG_ID}.xml`)) {
    throw new Error('rss.blog.naver.com robots.txt 가 이 RSS 수집을 막고 있어 중단')
  }

  const res = await fetch(FEED, { headers: { 'user-agent': UA } })
  if (!res.ok) throw new Error(`RSS 응답 ${res.status}`)
  const items = parseItems(await res.text()).slice(0, KEEP)
  if (items.length === 0) throw new Error('RSS 에 글이 없음 — 주소나 형식이 바뀌었을 수 있어 저장하지 않음')

  await mkdir(IMG_DIR, { recursive: true })
  const kept = new Set()
  const posts = []
  for (const { imageUrl, ...p } of items) {
    let image
    if (imageUrl) {
      const file = `${p.id}.jpg`
      const existing = await readFile(new URL(file, IMG_DIR)).catch(() => null)
      if (existing) image = file
      else {
        for (const u of [sized(imageUrl), imageUrl]) {
          const r = await fetch(u, { headers: { 'user-agent': UA, referer: 'https://blog.naver.com/' } }).catch(() => null)
          if (r?.ok && (r.headers.get('content-type') ?? '').startsWith('image/')) {
            await writeFile(new URL(file, IMG_DIR), Buffer.from(await r.arrayBuffer()))
            image = file
            break
          }
        }
      }
      if (image) kept.add(image)
    }
    posts.push({ ...p, ...(image ? { image } : {}) })
  }
  // 목록에서 빠진 글의 사진은 지움
  for (const f of await readdir(IMG_DIR)) if (f.endsWith('.jpg') && !kept.has(f)) await unlink(new URL(f, IMG_DIR))

  const prev = JSON.parse(await readFile(OUT, 'utf8'))
  if (JSON.stringify(prev.posts) === JSON.stringify(posts)) {
    console.log(`변경 없음 (${posts.length}개)`)
    return
  }
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  await writeFile(OUT, JSON.stringify({ ...prev, updatedAt: today, posts }, null, 2) + '\n')
  console.log(`소식 갱신: ${posts.length}개`)
  for (const p of posts) console.log(`- ${p.date} [${p.category}] ${p.title} ${p.image ? '(사진)' : ''}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message)
    process.exit(1)
  })
}
