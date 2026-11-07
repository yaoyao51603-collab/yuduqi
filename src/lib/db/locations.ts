import { db } from './database'

/** Returns the raw JSON produced by epub.js `locations.save()`, ready for `locations.load()`. */
export async function getCachedLocations(bookId: string): Promise<string | null> {
  const record = await db.locations.get(bookId)
  if (!record) return null
  try {
    const parsed: unknown = JSON.parse(record.json)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return record.json
  } catch {
    return null
  }
}

export async function saveLocations(bookId: string, json: string): Promise<void> {
  await db.locations.put({
    bookId,
    json,
    generatedAt: Date.now(),
  })
}

export async function clearLocations(bookId: string): Promise<void> {
  await db.locations.delete(bookId)
}
