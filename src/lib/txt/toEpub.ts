import JSZip from 'jszip'
import { ImportError } from '../errors'
import { createId } from '../ids'
import type { TextChapter } from './chapters'

export interface BuildEpubOptions {
  title: string
  author?: string
  chapters: TextChapter[]
  language?: string
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'

const STYLE_CSS = `body { margin: 0; padding: 0; }
h2 { font-size: 1.15em; font-weight: 600; margin: 0 0 1.2em; text-align: center; }
p { margin: 0 0 0.85em; text-indent: 2em; line-height: 1.75; }
`

export async function buildEpubFromText(options: BuildEpubOptions): Promise<Blob> {
  const language = options.language ?? 'zh-CN'
  const chapters = options.chapters.filter((chapter) => chapter.content.trim().length > 0)
  if (chapters.length === 0) {
    throw new ImportError('empty', '这个文件里没有可阅读的文字。')
  }

  const identifier = `urn:uuid:${createId()}`
  const modified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const zip = new JSZip()

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file(
    'META-INF/container.xml',
    `${XML_HEADER}
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`,
  )

  zip.file('OEBPS/style.css', STYLE_CSS)
  zip.file('OEBPS/content.opf', buildOpf({ ...options, chapters, identifier, modified, language }))
  zip.file('OEBPS/nav.xhtml', buildNav(chapters))
  zip.file('OEBPS/toc.ncx', buildNcx(chapters, options.title, identifier))

  chapters.forEach((chapter, index) => {
    zip.file(`OEBPS/text/${chapterFileName(index)}`, buildChapterDocument(chapter, index))
  })

  const bytes = await zip.generateAsync({
    type: 'arraybuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
  return new Blob([bytes], { type: 'application/epub+zip' })
}

function chapterFileName(index: number): string {
  return `chapter-${String(index + 1).padStart(3, '0')}.xhtml`
}

function buildOpf({
  title,
  author,
  chapters,
  identifier,
  modified,
  language,
}: BuildEpubOptions & { chapters: TextChapter[]; identifier: string; modified: string; language: string }): string {
  const manifestItems = chapters
    .map(
      (_, index) =>
        `    <item id="chapter-${index + 1}" href="text/${chapterFileName(index)}" media-type="application/xhtml+xml"/>`,
    )
    .join('\n')
  const spineItems = chapters
    .map((_, index) => `    <itemref idref="chapter-${index + 1}"/>`)
    .join('\n')
  const creator = author?.trim()
    ? `\n    <dc:creator>${escapeXml(author.trim())}</dc:creator>`
    : ''

  return `${XML_HEADER}
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(identifier)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${escapeXml(language)}</dc:language>${creator}
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>
`
}

function buildNav(chapters: TextChapter[]): string {
  const items = chapters
    .map((chapter, index) => `      <li><a href="text/${chapterFileName(index)}">${escapeXml(chapter.title)}</a></li>`)
    .join('\n')
  return `${XML_HEADER}
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
  <head>
    <meta charset="utf-8"/>
    <title>目录</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>目录</h1>
      <ol>
${items}
      </ol>
    </nav>
  </body>
</html>
`
}

function buildNcx(chapters: TextChapter[], title: string, identifier: string): string {
  const points = chapters
    .map(
      (chapter, index) => `    <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
      <content src="text/${chapterFileName(index)}"/>
    </navPoint>`,
    )
    .join('\n')
  return `${XML_HEADER}
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(identifier)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
${points}
  </navMap>
</ncx>
`
}

function buildChapterDocument(chapter: TextChapter, index: number): string {
  const paragraphs = splitParagraphs(chapter.content)
  const body = paragraphs.map((paragraph) => `<p>${escapeXml(paragraph)}</p>`).join('\n')
  const heading = chapter.title ? `<h2>${escapeXml(chapter.title)}</h2>` : ''
  return `${XML_HEADER}
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
  <head>
    <meta charset="utf-8"/>
    <title>${escapeXml(chapter.title || `第 ${index + 1} 节`)}</title>
    <link rel="stylesheet" type="text/css" href="../style.css"/>
  </head>
  <body>
    ${heading}
    <div class="chapter">
${body}
    </div>
  </body>
</html>
`
}

export function splitParagraphs(content: string): string[] {
  const trimmed = content.trim()
  if (!trimmed) return []
  const blocks = trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (blocks.length > 1) {
    return blocks.map((block) =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join(''),
    )
  }
  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
