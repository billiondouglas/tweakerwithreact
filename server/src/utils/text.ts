export const MAX_TWEET_LEN = 280

export function sanitizeTweetText(raw: unknown) {
  if (typeof raw !== 'string') return ''
  let t = raw.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '')
  t = t.replace(/\r\n?/g, '\n')
  t = t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).join('\n')
  return t.trim()
}

export function timeAgo(date: Date): string {
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}m ago`
  const years = Math.floor(days / 365)
  return `${years}yr ago`
}