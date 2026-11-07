import { ImportError } from '../errors'

export interface TextChapter {
  title: string
  content: string
}

export interface SplitChaptersOptions {
  /** 没有识别到章节标题时，按多少字切一节 */
  chunkSize?: number
}

const NUMERAL = '0-9零〇一二三四五六七八九十百千万两'

const HEADING_PATTERN = new RegExp(
  '^(?:正文\\s*)?(?:' +
    `第[${NUMERAL}]+[章节回卷篇部集](?:\\s*[:：、.．·\\-—]?\\s*[^\\s。！？!?；;，,]{0,18})?` +
    '|(?:序章|序言|楔子|引子|前言|尾声|后记|终章|番外(?:篇)?)(?:\\s*[:：、.．·\\-—]?\\s*.{0,18})?' +
    '|Chapter\\s+\\d+(?:\\s*[:：.、\\-—]?\\s*.{0,18})?' +
    ')$',
  'i',
)

export function isChapterHeading(line: string): boolean {
  const text = line.trim()
  if (!text || text.length > 40) return false
  if (/[。！？!?；;]$/.test(text)) return false
  if (/^["“'‘]/.test(text)) return false
  return HEADING_PATTERN.test(text)
}


/** 去掉 TXT 开头常见的「书名：」「作者：」元信息行，避免它们被当成开篇正文。 */
export function stripMetadata(text: string): string {
  const lines = text.split('\n')
  let index = 0
  while (index < lines.length) {
    const line = (lines[index] ?? '').trim()
    if (!line) {
      index += 1
      continue
    }
    if (/^(?:书\s*名|作品名|小说名|作\s*者|作者名)[：:]\s*.{0,60}$/.test(line)) {
      index += 1
      continue
    }
    break
  }
  return lines.slice(index).join('\n').trim()
}

export function splitChapters(text: string, options: SplitChaptersOptions = {}): TextChapter[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const headings: { line: number; title: string }[] = []

  lines.forEach((line, index) => {
    if (isChapterHeading(line)) headings.push({ line: index, title: line.trim() })
  })

  if (headings.length === 0) {
    return chunkByLength(normalized, options.chunkSize ?? 40_000)
  }

  const chapters: TextChapter[] = []
  const first = headings[0]
  if (!first) return chunkByLength(normalized, options.chunkSize ?? 40_000)

  const preface = lines.slice(0, first.line).join('\n').trim()
  if (preface) chapters.push({ title: '开篇', content: preface })

  headings.forEach((heading, index) => {
    const next = headings[index + 1]
    const content = lines
      .slice(heading.line + 1, next ? next.line : lines.length)
      .join('\n')
      .trim()
    if (content) chapters.push({ title: heading.title, content })
  })

  if (chapters.length === 0) {
    return chunkByLength(normalized, options.chunkSize ?? 40_000)
  }
  return chapters
}

function chunkByLength(text: string, target: number): TextChapter[] {
  const units = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current: string[] = []
  let length = 0

  const flush = () => {
    if (current.length > 0) {
      chunks.push(current.join('\n'))
      current = []
      length = 0
    }
  }

  for (const unit of units) {
    if (unit.length > target) {
      flush()
      for (let start = 0; start < unit.length; start += target) {
        chunks.push(unit.slice(start, start + target))
      }
      continue
    }
    if (length + unit.length > target && current.length > 0) flush()
    current.push(unit)
    length += unit.length + 1
  }
  flush()

  if (chunks.length === 0) {
    throw new ImportError('empty', '这个文件里没有可阅读的文字。')
  }
  return chunks.map((content, index) => ({ title: `第 ${index + 1} 节`, content }))
}

export function guessTitle(text: string): string {
  const head = text.slice(0, 3000).split('\n').slice(0, 30)
  for (const line of head) {
    const match = line.trim().match(/^(?:书\s*名|作品名|小说名)[：:]\s*(.{1,40})$/)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}

export function guessAuthor(text: string): string {
  const head = text.slice(0, 3000).split('\n').slice(0, 30)
  for (const line of head) {
    const match = line.trim().match(/^作\s*者[：:]\s*(\S.{0,24})$/)
    if (match?.[1]) return match[1].trim()
  }
  return ''
}
