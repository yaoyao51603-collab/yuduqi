import { ImportError } from '../errors'

export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'gb18030'

export interface DecodedText {
  text: string
  encoding: TextEncoding
}

export function decodeText(buffer: ArrayBuffer): DecodedText {
  const bytes = new Uint8Array(buffer)
  if (bytes.length === 0) {
    throw new ImportError('empty', '这个文件是空的。')
  }

  let decoded: DecodedText
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    decoded = { text: decodeWith('utf-16le', bytes.subarray(2)), encoding: 'utf-16le' }
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    decoded = { text: decodeWith('utf-16be', bytes.subarray(2)), encoding: 'utf-16be' }
  } else if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    decoded = { text: decodeWith('utf-8', bytes.subarray(3)), encoding: 'utf-8' }
  } else {
    try {
      decoded = {
        text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        encoding: 'utf-8',
      }
    } catch {
      decoded = { text: decodeWith('gb18030', bytes), encoding: 'gb18030' }
    }
  }

  const text = normalizeText(decoded.text)
  if (!text.trim()) {
    throw new ImportError('empty', '这个文件里没有可阅读的文字。')
  }
  return { text, encoding: decoded.encoding }
}

function decodeWith(encoding: string, bytes: Uint8Array): string {
  try {
    return new TextDecoder(encoding).decode(bytes)
  } catch {
    return new TextDecoder('utf-8').decode(bytes)
  }
}

export function normalizeText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
}
