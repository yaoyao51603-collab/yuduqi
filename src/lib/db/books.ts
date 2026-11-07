import { db } from './database'
import type { BookRecord } from './schema'

/** 按最近阅读时间倒序，未读过的按导入时间倒序 */
export async function listBooks(): Promise<BookRecord[]> {
  const books = await db.books.toArray()
  return books.sort((a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt))
}

export function getBook(id: string): Promise<BookRecord | undefined> {
  return db.books.get(id)
}

export async function addBook(book: BookRecord): Promise<void> {
  await db.books.add(book)
}

export async function touchBook(id: string, at = Date.now()): Promise<void> {
  await db.books.update(id, { lastOpenedAt: at })
}

/** 删除书籍，并级联清理进度与分页缓存 */
export async function deleteBook(id: string): Promise<void> {
  await db.transaction('rw', db.books, db.progress, db.locations, async () => {
    await db.books.delete(id)
    await db.progress.delete(id)
    await db.locations.delete(id)
  })
}

export async function findDuplicate(fileName: string, size: number): Promise<BookRecord | undefined> {
  const books = await db.books.toArray()
  return books.find((book) => book.fileName === fileName && book.size === size)
}

export async function countBooks(): Promise<number> {
  return db.books.count()
}
