import { addBook, findDuplicate } from '../db/books'
import type { BookFormat, BookRecord } from '../db/schema'
import { ImportError, describeImportError, type ImportErrorCode } from '../errors'
import { inspectEpub } from '../epub/inspect'
import { formatBytes } from '../format'
import { createId } from '../ids'
import { guessAuthor, guessTitle, splitChapters, stripMetadata } from '../txt/chapters'
import { decodeText } from '../txt/decode'
import { buildEpubFromText } from '../txt/toEpub'

export const MAX_IMPORT_BYTES = 100 * 1024 * 1024

export interface ImportFailure {
  fileName: string
  code: ImportErrorCode
  message: string
}

export interface ImportSummary {
  imported: BookRecord[]
  failures: ImportFailure[]
}

export async function importFiles(files: Iterable<File>): Promise<ImportSummary> {
  const imported: BookRecord[] = []
  const failures: ImportFailure[] = []

  for (const file of files) {
    try {
      imported.push(await importFile(file))
    } catch (error) {
      const info = describeImportError(error)
      failures.push({ fileName: file.name || '未知文件', ...info })
    }
  }

  return { imported, failures }
}

export async function importFile(file: File): Promise<BookRecord> {
  if (file.size === 0) {
    throw new ImportError('empty', '这个文件是空的。')
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportError('too-large', `文件大小 ${formatBytes(file.size)}，超过 100 MB 上限。`)
  }

  const format = detectFormat(file)
  if (!format) {
    throw new ImportError('unsupported', '只支持 EPUB 和 TXT 文件。')
  }

  const duplicate = await findDuplicate(file.name, file.size)
  if (duplicate) {
    throw new ImportError('duplicate', `《${duplicate.title}》已经在书架上了。`)
  }

  const book = format === 'epub' ? await buildEpubBook(file) : await buildTextBook(file)
  await addBook(book)
  return book
}

async function buildEpubBook(file: File): Promise<BookRecord> {
  const metadata = await inspectEpub(file)
  return {
    id: createId(),
    title: (metadata.title || cleanFileName(file.name)).slice(0, 120),
    author: (metadata.author || '佚名').slice(0, 80),
    format: 'epub',
    size: file.size,
    fileName: file.name,
    file,
    cover: metadata.cover ?? undefined,
    chapterCount: metadata.chapterCount,
    addedAt: Date.now(),
  }
}

async function buildTextBook(file: File): Promise<BookRecord> {
  const { text } = decodeText(await file.arrayBuffer())
  const title = (guessTitle(text) || cleanFileName(file.name)).slice(0, 120)
  const author = (guessAuthor(text) || '佚名').slice(0, 80)
  const chapters = splitChapters(stripMetadata(text))
  const derivedEpub = await buildEpubFromText({ title, author, chapters })

  return {
    id: createId(),
    title,
    author,
    format: 'txt',
    size: file.size,
    fileName: file.name,
    file,
    derivedEpub,
    chapterCount: chapters.length,
    addedAt: Date.now(),
  }
}

export function detectFormat(file: File): BookFormat | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.epub')) return 'epub'
  if (name.endsWith('.txt')) return 'txt'
  if (file.type === 'application/epub+zip') return 'epub'
  if (file.type === 'text/plain') return 'txt'
  return null
}

export function cleanFileName(name: string): string {
  const base = name
    .replace(/\.[^./\\]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return base || '未命名'
}
