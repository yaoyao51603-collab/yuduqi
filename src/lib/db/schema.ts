export type BookFormat = 'epub' | 'txt'
export type ReaderTheme = 'paper' | 'sepia' | 'night'
export type FontFamily = 'system' | 'serif' | 'sans'
export type MarginSize = 'narrow' | 'medium' | 'wide'
export type PageMode = 'paginated' | 'scrolled'

export interface BookRecord {
  id: string
  title: string
  author: string
  format: BookFormat
  /** 原始文件大小（字节） */
  size: number
  /** 原始文件名，用于判重与错误提示 */
  fileName: string
  /** 原始书籍文件；TXT 保留原文，EPUB 保留原始包 */
  file: Blob
  /** 封面图（若有） */
  cover?: Blob
  /** TXT 导入时在内存里生成的 EPUB */
  derivedEpub?: Blob
  /** 章节数（EPUB 为 spine 数，TXT 为切章数） */
  chapterCount: number
  addedAt: number
  lastOpenedAt?: number
}

export interface ProgressRecord {
  bookId: string
  cfi: string
  /** 0 ~ 1 */
  percentage: number
  chapterIndex: number
  chapterTitle?: string
  updatedAt: number
}

export interface LocationsRecord {
  bookId: string
  /** JSON 序列化后的 epub.js locations 数组 */
  json: string
  generatedAt: number
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  theme: ReaderTheme
  margin: MarginSize
  pageMode: PageMode
  updatedAt: number
}

export interface ReaderSettingsRecord extends ReaderSettings {
  id: 'reader'
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 19,
  lineHeight: 1.7,
  fontFamily: 'serif',
  theme: 'paper',
  margin: 'medium',
  pageMode: 'paginated',
  updatedAt: 0,
}

export const FONT_SIZE_MIN = 16
export const FONT_SIZE_MAX = 26
export const LINE_HEIGHTS = [1.5, 1.7, 1.9] as const
