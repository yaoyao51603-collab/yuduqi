export type ImportErrorCode = 'unsupported' | 'corrupt' | 'too-large' | 'duplicate' | 'empty'

export class ImportError extends Error {
  readonly code: ImportErrorCode

  constructor(code: ImportErrorCode, message: string) {
    super(message)
    this.name = 'ImportError'
    this.code = code
  }
}

export interface ImportFailureInfo {
  code: ImportErrorCode
  message: string
}

export function describeImportError(error: unknown): ImportFailureInfo {
  if (error instanceof ImportError) {
    return { code: error.code, message: error.message }
  }
  return { code: 'corrupt', message: '导入失败，请确认文件没有损坏。' }
}
