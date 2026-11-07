import { findDuplicate } from './db/books'
import type { BookRecord } from './db/schema'
import { importFile } from './import'

const SAMPLE_FILE_NAME = '纸间·试读样章.epub'
const SAMPLE_URL = `${import.meta.env.BASE_URL}samples/sample.epub`

let pending: Promise<BookRecord> | null = null

async function load(): Promise<BookRecord> {
  const response = await fetch(SAMPLE_URL)
  if (!response.ok) throw new Error('样章加载失败，请检查网络后重试。')
  const blob = await response.blob()
  const file = new File([blob], SAMPLE_FILE_NAME, { type: 'application/epub+zip' })

  const existing = await findDuplicate(file.name, file.size)
  if (existing) return existing
  return importFile(file)
}

/** Import the bundled sample book once; reuse the existing copy on repeat visits. */
export function loadSampleBook(): Promise<BookRecord> {
  if (!pending) {
    pending = load().finally(() => {
      pending = null
    })
  }
  return pending
}
