import Dexie, { type EntityTable } from 'dexie'
import type {
  BookRecord,
  LocationsRecord,
  ProgressRecord,
  ReaderSettingsRecord,
} from './schema'

export class ReaderDatabase extends Dexie {
  books!: EntityTable<BookRecord, 'id'>
  progress!: EntityTable<ProgressRecord, 'bookId'>
  locations!: EntityTable<LocationsRecord, 'bookId'>
  settings!: EntityTable<ReaderSettingsRecord, 'id'>

  constructor(name = 'zhijian-reader') {
    super(name)
    this.version(1).stores({
      books: 'id, addedAt, lastOpenedAt, title',
      progress: 'bookId',
      locations: 'bookId',
      settings: 'id',
    })
  }
}

export const db = new ReaderDatabase()
