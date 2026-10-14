/**
 * DB 공개 스냅샷(public_snapshot() 결과) → 사이트 자료 파일(matches.json · records.json · posts.json) 변환
 * - 화면 코드가 그대로 쓰도록 지금 파일과 같은 모양으로 만든다 (공개 사이트 코드·디자인은 바뀌지 않음)
 * - 받은 스냅샷이 이상하면 파일을 쓰지 않고 오류로 멈춘다 (기존 정상 파일 유지): validateSnapshot
 */

const KUSF = {
  label: 'KUSF 대학스포츠',
  url: 'https://www.kusf.or.kr/league/league_schedule.html?e_code=45&l_year=2026&l_code=271&t_code=1704',
}
const kstDate = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(iso))

/** 스냅샷 검사: 모양·필수값. 빈 표·급감 판단은 previous(지금 파일 기준 개수)와 비교 */
export function validateSnapshot(snap, previous) {
  const problems = []
  if (!snap || typeof snap !== 'object') return ['스냅샷이 객체가 아님']
  if (!Number.isInteger(snap.revision)) problems.push('revision 없음')
  for (const k of ['teams', 'players', 'matches', 'player_records', 'standings', 'posts']) {
    if (!Array.isArray(snap[k])) problems.push(`${k} 배열 아님`)
  }
  if (problems.length) return problems
  const ours = snap.teams.filter((t) => t.is_ours)
  if (ours.length !== 1) problems.push('경기대(is_ours) 학교가 정확히 하나가 아님')
  const teamIds = new Set(snap.teams.map((t) => t.id))
  for (const m of snap.matches) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m.match_date)) problems.push(`경기 ${m.id} 날짜 형식`)
    if (!teamIds.has(m.home_team_id) || !teamIds.has(m.away_team_id)) problems.push(`경기 ${m.id} 학교 없음`)
  }
  // 오류로 받은 빈 응답·일부 응답을 정상 삭제로 착각하지 않게: 이전보다 크게 줄면 멈춤
  if (previous) {
    for (const [k, prev] of Object.entries(previous)) {
      const now = snap[k]?.length ?? 0
      if (prev >= 3 && now < Math.ceil(prev / 2)) problems.push(`${k} 개수가 ${prev} → ${now} 로 크게 줄었음 (의도한 것이면 ALLOW_SHRINK=1)`)
    }
  }
  return problems
}

export function snapshotToFiles(snap) {
  const team = new Map(snap.teams.map((t) => [t.id, t.short_name]))
  const player = new Map(snap.players.map((p) => [p.id, p.name]))
  const ours = snap.teams.find((t) => t.is_ours)
  const matches = [...snap.matches].sort((a, b) => a.match_date.localeCompare(b.match_date) || a.id - b.id)
  const competition = matches[0]?.competition ?? ''
  const latest = (rows, key) => rows.map((r) => r[key]).filter(Boolean).sort().at(-1)

  const matchesJson = {
    source: KUSF,
    updatedAt: kstDate(snap.changed_at),
    competition,
    matches: matches.map((m) => ({
      date: m.match_date,
      time: m.kickoff,
      venue: m.venue,
      home: team.get(m.home_team_id),
      away: team.get(m.away_team_id),
      homeScore: m.status === 'finished' ? m.home_score : null,
      awayScore: m.status === 'finished' ? m.away_score : null,
      ...(m.status === 'postponed' || m.status === 'cancelled' ? { status: m.status } : {}),
    })),
  }

  const complete = matches.filter((m) => m.status === 'finished' && m.records_status === 'complete')
  const notes = ["선수 기록은 KUSF 경기별 '경기대 선수기록'(교체 명단 포함)을 사람이 옮겨 넣음"]
  for (const m of complete) {
    if (m.kgu_unattributed_goals > 0) {
      const opp = m.home_team_id === ours.id ? team.get(m.away_team_id) : team.get(m.home_team_id)
      notes.push(`${m.match_date} ${opp}전 ${m.kgu_unattributed_goals}골은 선수 기록에 없음${m.records_note ? `(${m.records_note})` : ''}`)
    }
  }
  const standings = [...snap.standings].sort((a, b) => a.rank - b.rank)
  const recordsJson = {
    source: KUSF,
    updatedAt: latest(snap.standings, 'checked_on') ?? '',
    competition: standings[0]?.competition ?? competition,
    notes,
    standings: standings.map((s) => ({
      team: team.get(s.team_id),
      rank: s.rank,
      played: s.played,
      points: s.points,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goals_for,
      goalsAgainst: s.goals_against,
      goalDiff: s.goals_for - s.goals_against,
      yellow: s.yellow,
      red: s.red,
    })),
    matches: complete.map((m) => ({
      date: m.match_date,
      players: snap.player_records
        .filter((r) => r.match_id === m.id)
        .sort((a, b) => a.id - b.id)
        .map((r) => ({ number: r.shirt_number, name: player.get(r.player_id), goals: r.goals, assists: r.assists, yellow: r.yellow, red: r.red })),
      unattributedGoals: m.kgu_unattributed_goals,
    })),
  }

  const post = (p) => ({
    title: p.title,
    ...(p.summary ? { summary: p.summary } : {}),
    category: p.category,
    ...(p.source ? { source: p.source } : {}),
    ...(p.published_on ? { date: p.published_on } : {}),
    href: p.url,
  })
  const byOrder = (a, b) => (b.published_on ?? '').localeCompare(a.published_on ?? '') || a.position - b.position || a.id - b.id
  const postsJson = {
    blog: snap.posts.filter((p) => p.kind === 'blog').sort(byOrder).map(post),
    magazine: snap.posts.filter((p) => p.kind === 'magazine').sort(byOrder).map(post),
  }

  return { 'matches.json': matchesJson, 'records.json': recordsJson, 'posts.json': postsJson, revision: snap.revision }
}
