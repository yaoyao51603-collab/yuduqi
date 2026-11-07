import { describe, expect, it } from 'vitest'
import { decodeText } from '../../src/lib/txt/decode'
import { splitChapters, stripMetadata } from '../../src/lib/txt/chapters'
import { ImportError } from '../../src/lib/errors'

function bufferOf(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe('decodeText', () => {
  it('decodes UTF-8 without BOM', () => {
    const buffer = new TextEncoder().encode('第一章 起点\n正文').buffer
    expect(decodeText(buffer)).toEqual({ text: '第一章 起点\n正文', encoding: 'utf-8' })
  })

  it('decodes UTF-8 BOM and strips it', () => {
    const body = new TextEncoder().encode('你好')
    const buffer = bufferOf([0xef, 0xbb, 0xbf, ...body])
    expect(decodeText(buffer)).toEqual({ text: '你好', encoding: 'utf-8' })
  })

  it('decodes UTF-16LE with BOM', () => {
    // 你好
    const buffer = bufferOf([0xff, 0xfe, 0x60, 0x4f, 0x7d, 0x59])
    expect(decodeText(buffer)).toEqual({ text: '你好', encoding: 'utf-16le' })
  })

  it('falls back to gb18030 for invalid UTF-8', () => {
    // 中文 in GB18030
    const buffer = bufferOf([0xd6, 0xd0, 0xce, 0xc4])
    expect(decodeText(buffer)).toEqual({ text: '中文', encoding: 'gb18030' })
  })

  it('normalizes CRLF and NUL bytes', () => {
    const buffer = new TextEncoder().encode('a\r\nb\u0000c').buffer
    expect(decodeText(buffer).text).toBe('a\nbc')
  })

  it('rejects an empty file', () => {
    expect(() => decodeText(new ArrayBuffer(0))).toThrow(ImportError)
  })

  it('rejects a whitespace-only file', () => {
    const buffer = new TextEncoder().encode('  \n\t ').buffer
    expect(() => decodeText(buffer)).toThrow(ImportError)
  })
})

describe('splitChapters', () => {
  const novel = [
    '第一章 起点',
    '这是第一章的正文。',
    '',
    '第二章 远行',
    '这是第二章的正文。',
    '',
    '番外 后来',
    '番外的正文。',
    '',
  ].join('\n')

  it('splits on chapter headings and keeps content', () => {
    const chapters = splitChapters(novel)
    expect(chapters).toHaveLength(3)
    expect(chapters[0]?.title).toBe('第一章 起点')
    expect(chapters[0]?.content).toContain('这是第一章的正文。')
    expect(chapters[2]?.title).toBe('番外 后来')
  })

  it('keeps a preface before the first heading as 开篇', () => {
    const chapters = splitChapters(`写在前面\n${novel}`)
    expect(chapters[0]?.title).toBe('开篇')
    expect(chapters[1]?.title).toBe('第一章 起点')
  })

  it('falls back to fixed-size chunks when no heading exists', () => {
    const text = '甲'.repeat(25)
    const chapters = splitChapters(text, { chunkSize: 10 })
    expect(chapters.map((chapter) => chapter.title)).toEqual(['第 1 节', '第 2 节', '第 3 节'])
    expect(chapters.map((chapter) => chapter.content.length)).toEqual([10, 10, 5])
  })

  it('does not treat a sentence with a chapter word as a heading', () => {
    const chapters = splitChapters('他说第一章已经写完了，然后合上书。', { chunkSize: 40 })
    expect(chapters).toHaveLength(1)
    expect(chapters[0]?.title).toBe('第 1 节')
  })
})

describe('stripMetadata', () => {
  it('removes leading title and author lines before the first chapter', () => {
    const text = '书名：雨夜来信\n作者：林川\n\n第一章 雨\n正文。'
    expect(stripMetadata(text)).toBe('第一章 雨\n正文。')
  })

  it('keeps a real preface that is not metadata', () => {
    const text = '写在前面\n这是作者的话。\n\n第一章 雨\n正文。'
    expect(stripMetadata(text)).toBe(text)
  })

  it('only strips the header block, not lines later in the book', () => {
    const text = '书名：雨夜来信\n第一章 雨\n正文。\n作者：林川'
    expect(stripMetadata(text)).toBe('第一章 雨\n正文。\n作者：林川')
  })
})
