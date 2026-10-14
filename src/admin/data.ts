/** 관리자 화면에서 쓰는 DB 행 모양과 읽기 함수 (표 정의: supabase/migrations/0001_admin_schema.sql) */
import { supabase } from './client'

export interface Team {
  id: number
  short_name: string
  is_ours: boolean
}
export interface Player {
  id: number
  name: string
}
export type MatchStatus = 'scheduled' | 'finished' | 'postponed' | 'cancelled'
export type RecordsStatus = 'pending' | 'complete' | 'unavailable'
export interface Match {
  id: number
  season: number
  competition: string
  round_label: string | null
  match_date: string
  kickoff: string | null
  venue: string | null
  home_team_id: number
  away_team_id: number
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  kgu_unattributed_goals: number
  records_status: RecordsStatus
  records_note: string | null
  archived_at: string | null
  version: number
}
export interface PlayerRecord {
  id: number
  match_id: number
  player_id: number
  shirt_number: number | null
  goals: number
  assists: number
  yellow: number
  red: number
}
export interface Standing {
  season: number
  competition: string
  group_label: string
  team_id: number
  rank: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  points_adjustment: number
  yellow: number
  red: number
  checked_on: string
}
export interface Post {
  id: number
  kind: 'blog' | 'magazine'
  title: string
  summary: string | null
  category: string
  source: string | null
  published_on: string | null
  url: string
  position: number
  archived_at: string | null
  version: number
}

export interface AdminData {
  teams: Team[]
  players: Player[]
  matches: Match[]
  standings: Standing[]
  posts: Post[]
  revision: number
}

async function rows<T>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function loadAll(): Promise<AdminData> {
  const [teams, players, matches, standings, posts, rev] = await Promise.all([
    rows<Team>(supabase.from('teams').select('id, short_name, is_ours').order('id')),
    rows<Player>(supabase.from('players').select('id, name').order('id')),
    rows<Match>(supabase.from('matches').select('*').order('match_date').order('id')),
    rows<Standing>(supabase.from('standings').select('*').order('rank')),
    rows<Post>(supabase.from('posts').select('*').order('published_on', { ascending: false, nullsFirst: false }).order('position').order('id')),
    rows<{ revision: number }>(supabase.from('content_revision').select('revision')),
  ])
  return { teams, players, matches, standings, posts, revision: rev[0]?.revision ?? 0 }
}

export async function loadRecords(matchId: number): Promise<PlayerRecord[]> {
  return rows<PlayerRecord>(supabase.from('player_records').select('*').eq('match_id', matchId).order('id'))
}

export async function loadRevision(): Promise<number> {
  const r = await rows<{ revision: number }>(supabase.from('content_revision').select('revision'))
  return r[0]?.revision ?? 0
}

/** 버전이 같을 때만 고침. 0줄이 바뀌면 누군가 먼저 고친 것 */
export async function updateVersioned(table: 'matches' | 'posts' | 'teams', id: number, version: number, patch: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).eq('version', version).select('id')
  if (error) throw error
  if (!data || data.length === 0) throw { code: 'PT409', message: 'conflict' }
}

// ---------------------------------------------------------------- 화면 표시용

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
export function dateLabel(d: string, withYear = false) {
  const [y, m, day] = d.split('-').map(Number)
  const w = WEEK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]
  return `${withYear ? `${y}년 ` : ''}${m}월 ${day}일 (${w})`
}
export const shortDate = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return `${m}.${day} (${WEEK[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]})`
}

/** 오늘 날짜 (한국) 'YYYY-MM-DD' */
export const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)

export const statusLabel: Record<MatchStatus, string> = {
  scheduled: '예정',
  finished: '끝남',
  postponed: '연기',
  cancelled: '취소',
}

/** 목록의 상태 알약: 끝났는데 선수 기록이 없으면 '기록 대기', 날짜가 지났는데 예정이면 '결과 입력' */
export function matchBadge(m: Match): { text: string; tone: 'done' | 'todo' | 'plain' } {
  if (m.archived_at) return { text: '보관됨', tone: 'plain' }
  if (m.status === 'finished') return m.records_status === 'pending' ? { text: '기록 대기', tone: 'todo' } : { text: '끝남', tone: 'done' }
  if (m.status === 'scheduled' && m.match_date < todayKst()) return { text: '결과 입력', tone: 'todo' }
  return { text: statusLabel[m.status], tone: 'plain' }
}
