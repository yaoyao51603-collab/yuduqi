import { db } from './database'
import type { ProgressRecord } from './schema'

export function getProgress(bookId: string): Promise<ProgressRecord | undefined> {
  return db.progress.get(bookId)
}

export async function saveProgress(record: ProgressRecord): Promise<void> {
  await db.progress.put(record)
}

export async function clearProgress(bookId: string): Promise<void> {
  await db.progress.delete(bookId)
}

export async function getAllProgress(): Promise<Map<string, ProgressRecord>> {
  const records = await db.progress.toArray()
  return new Map(records.map((record) => [record.bookId, record]))
}
