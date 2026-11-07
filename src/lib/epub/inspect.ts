import JSZip from 'jszip'
import { ImportError } from '../errors'

export interface EpubMetadata {
  title: string
  author: string
  cover: Blob | null
  chapterCount: number
}

const CONTAINER_PATH = 'META-INF/container.xml'
const MAX_COVER_BYTES = 8 * 1024 * 1024

export async function inspectEpub(file: Blob): Promise<EpubMetadata> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new ImportError('corrupt', '无法打开这个 EPUB，文件可能已损坏。')
  }

  const containerFile = zip.file(CONTAINER_PATH)
  if (!containerFile) {
    throw new ImportError('corrupt', '这个 EPUB 缺少 container.xml，无法定位正文。')
  }
  const containerDoc = parseXml(await containerFile.async('text'))
  const opfPath = findElements(containerDoc, 'rootfile')[0]?.getAttribute('full-path')?.trim()
  if (!opfPath) {
    throw new ImportError('corrupt', '这个 EPUB 的目录信息不完整。')
  }

  const opfFile = zip.file(opfPath)
  if (!opfFile) {
    throw new ImportError('corrupt', '这个 EPUB 的正文信息缺失。')
  }
  const opfDoc = parseXml(await opfFile.async('text'))
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : ''

  const title = firstText(opfDoc, 'title') || firstText(opfDoc, 'dc:title')
  const author = firstText(opfDoc, 'creator') || firstText(opfDoc, 'dc:creator')
  const chapterCount = findElements(opfDoc, 'itemref').length
  if (chapterCount === 0) {
    throw new ImportError('corrupt', '这个 EPUB 没有可阅读的章节。')
  }

  const cover = await readCover(zip, opfDoc, opfDir)

  return { title, author, cover, chapterCount }
}

function parseXml(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ImportError('corrupt', '这个 EPUB 的目录文件格式不正确。')
  }
  return doc
}

function findElements(doc: Document, localName: string): Element[] {
  const all = doc.getElementsByTagName('*')
  const result: Element[] = []
  for (let index = 0; index < all.length; index += 1) {
    const element = all[index]
    if (element && element.localName === localName) result.push(element)
  }
  return result
}

function firstText(doc: Document, localName: string): string {
  const element = findElements(doc, localName)[0]
  return element?.textContent?.trim() ?? ''
}

async function readCover(zip: JSZip, opfDoc: Document, opfDir: string): Promise<Blob | null> {
  const items = findElements(opfDoc, 'item')
  const findById = (id: string | null): Element | undefined =>
    id ? items.find((item) => item.getAttribute('id') === id) : undefined

  const propertiesCover = items.find((item) =>
    (item.getAttribute('properties') ?? '').split(/\s+/).includes('cover-image'),
  )
  const metaCoverId = findElements(opfDoc, 'meta')
    .find((meta) => meta.getAttribute('name') === 'cover')
    ?.getAttribute('content')
  const coverItem =
    propertiesCover ?? findById(metaCoverId ?? null) ?? items.find((item) => item.getAttribute('id') === 'cover')

  const href = coverItem?.getAttribute('href')?.trim()
  if (!href) return null

  const path = resolvePath(opfDir, href)
  if (!path) return null
  const entry = zip.file(path)
  if (!entry) return null

  try {
    const source = await entry.async('blob')
    if (source.size === 0 || source.size > MAX_COVER_BYTES) return null
    const mediaType = coverItem?.getAttribute('media-type')?.trim()
    const mime = mediaType?.startsWith('image/') ? mediaType : guessImageType(path)
    return new Blob([source], { type: mime })
  } catch {
    return null
  }
}

function resolvePath(baseDir: string, href: string): string {
  const clean = decodeURIComponent(href.split('#')[0] ?? '')
  if (!clean) return ''
  if (clean.startsWith('/')) return clean.slice(1)
  const parts = [...(baseDir ? baseDir.split('/') : []), ...clean.split('/')]
  const output: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') output.pop()
    else output.push(part)
  }
  return output.join('/')
}

function guessImageType(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  switch (extension) {
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    case 'avif':
      return 'image/avif'
    default:
      return 'image/jpeg'
  }
}
