import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addBook,
  countBooks,
  deleteBook,
  findDuplicate,
  getBook,
  listBooks,
  touchBook,
} from '../../src/lib/db/books'
import { getProgress, saveProgress } from '../../src/lib/db/progress'
import { getCachedLocations, saveLocations } from '../../src/lib/db/locations'
import { db } from '../../src/lib/db/database'
import type { BookRecord } from '../../src/lib/db/schema'

function makeBook(overrides: Partial<BookRecord> = {}): BookRecord {
  const id = overrides.id ?? crypto.randomUUID()
  return {
    id,
    title: '测试书',
    author: '佚名',
    format: 'epub',
    size: 128,
    fileName: `${id}.epub`,
    // fake-indexeddb 的结构化克隆只认 Node 的 Blob；真实浏览器支持 DOM Blob。
    file: new NodeBlob(['book'], { type: 'application/epub+zip' }) as unknown as Blob,
    chapterCount: 3,
    addedAt: 1000,
    ...overrides,
  }
}

beforeEach(async () => {
  await db.open()
})

describe('books store', () => {
  it('stores and reads a book with its file blob', async () => {
    const book = makeBook()
    await addBook(book)
    const stored = await getBook(book.id)
    expect(stored?.title).toBe('测试书')
    expect(stored?.file).toBeInstanceOf(NodeBlob)
    expect(await stored?.file.text()).toBe('book')
  })

  it('sorts by lastOpenedAt, then addedAt', async () => {
    await addBook(makeBook({ id: 'a', addedAt: 100 }))
    await addBook(makeBook({ id: 'b', addedAt: 200 }))
    await addBook(makeBook({ id: 'c', addedAt: 50 }))
    await touchBook('c', 900)

    expect((await listBooks()).map((book) => book.id)).toEqual(['c', 'b', 'a'])
  })

  it('finds duplicates by file name and size', async () => {
    const book = makeBook({ fileName: 'same.epub', size: 42 })
    await addBook(book)
    expect(await findDuplicate('same.epub', 42)).toMatchObject({ id: book.id })
    expect(await findDuplicate('same.epub', 43)).toBeUndefined()
    expect(await countBooks()).toBe(1)
  })

  it('deletes progress and locations with the book', async () => {
    const book = makeBook()
    await addBook(book)
    await saveProgress({ bookId: book.id, cfi: 'epubcfi(/6/4)', percentage: 0.5, chapterIndex: 1, updatedAt: 1 })
    await saveLocations(book.id, '["loc1","loc2"]')

    await deleteBook(book.id)

    expect(await getBook(book.id)).toBeUndefined()
    expect(await getProgress(book.id)).toBeUndefined()
    expect(await getCachedLocations(book.id)).toBeNull()
  })
})

describe('locations store', () => {
  it('returns the raw epub.js locations JSON', async () => {
    const json = JSON.stringify(['epubcfi(/6/2)'])
    await saveLocations('book-1', json)
    expect(await getCachedLocations('book-1')).toBe(json)
  })

  it('rejects malformed cached data', async () => {
    await db.locations.put({ bookId: 'book-2', json: '{"nope":1}', generatedAt: 1 })
    expect(await getCachedLocations('book-2')).toBeNull()
  })
})
