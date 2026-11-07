import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { inspectEpub } from '../../src/lib/epub/inspect'
import { buildEpubFromText } from '../../src/lib/txt/toEpub'
import { ImportError } from '../../src/lib/errors'

const CONTAINER = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

const OPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:test</dc:identifier>
    <dc:title>测试之书</dc:title>
    <dc:creator>某人</dc:creator>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="cover-img" href="cover.png" media-type="image/png" properties="cover-image"/>
    <item id="c1" href="text/chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`

async function makeEpub(): Promise<Blob> {
  const zip = new JSZip()
  zip.file('mimetype', 'application/epub+zip')
  zip.file('META-INF/container.xml', CONTAINER)
  zip.file('OEBPS/content.opf', OPF)
  zip.file('OEBPS/cover.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]))
  zip.file('OEBPS/text/chapter1.xhtml', '<html><body><p>一</p></body></html>')
  zip.file('OEBPS/text/chapter2.xhtml', '<html><body><p>二</p></body></html>')
  const data = await zip.generateAsync({ type: 'arraybuffer' })
  return new Blob([data], { type: 'application/epub+zip' })
}

describe('inspectEpub', () => {
  it('reads title, author, cover and spine length', async () => {
    const metadata = await inspectEpub(await makeEpub())
    expect(metadata.title).toBe('测试之书')
    expect(metadata.author).toBe('某人')
    expect(metadata.chapterCount).toBe(2)
    expect(metadata.cover).toBeInstanceOf(Blob)
    expect(metadata.cover?.size).toBeGreaterThan(0)
  })

  it('rejects a file that is not a zip', async () => {
    await expect(inspectEpub(new Blob(['not a zip']))).rejects.toMatchObject({
      code: 'corrupt',
    })
  })

  it('rejects a zip without container.xml', async () => {
    const zip = new JSZip()
    zip.file('hello.txt', 'hi')
    const data = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(
      inspectEpub(new Blob([data], { type: 'application/epub+zip' })),
    ).rejects.toBeInstanceOf(ImportError)
  })
})

describe('buildEpubFromText', () => {
  it('builds an EPUB that can be inspected again', async () => {
    const blob = await buildEpubFromText({
      title: '山间来信',
      author: '林某',
      chapters: [
        { title: '第一章 上山', content: '第一段。\n\n第二段。' },
        { title: '第二章 下山', content: '第三段。' },
      ],
    })

    expect(blob.type).toBe('application/epub+zip')
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(Object.keys(zip.files)[0]).toBe('mimetype')
    expect(await zip.file('mimetype')?.async('string')).toBe('application/epub+zip')
    expect(zip.file('META-INF/container.xml')).toBeTruthy()
    expect(zip.file('OEBPS/nav.xhtml')).toBeTruthy()
    expect(zip.file('OEBPS/toc.ncx')).toBeTruthy()
    expect(await zip.file('OEBPS/nav.xhtml')?.async('string')).toContain('第一章 上山')

    const metadata = await inspectEpub(blob)
    expect(metadata.title).toBe('山间来信')
    expect(metadata.author).toBe('林某')
    expect(metadata.chapterCount).toBe(2)
  })

  it('escapes XML characters in titles', async () => {
    const blob = await buildEpubFromText({
      title: 'A & B <测试>',
      chapters: [{ title: '第一章 <起点> & "引号"', content: '正文。' }],
    })
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const nav = await zip.file('OEBPS/nav.xhtml')?.async('string')
    expect(nav).toContain('&lt;起点&gt;')
    expect(nav).toContain('&amp;')
  })
})
