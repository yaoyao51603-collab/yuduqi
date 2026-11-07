import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsSheet from '../../src/components/reader/SettingsSheet'
import TocSheet from '../../src/components/reader/TocSheet'
import { DEFAULT_SETTINGS } from '../../src/lib/db/schema'
import type { TocEntry } from '../../src/lib/reader/engine'

describe('SettingsSheet', () => {
  it('emits font size and theme changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <SettingsSheet
        open
        settings={DEFAULT_SETTINGS}
        onChange={onChange}
        onClose={() => undefined}
      />,
    )

    await user.click(screen.getByRole('button', { name: '增大字号' }))
    expect(onChange).toHaveBeenCalledWith({ fontSize: DEFAULT_SETTINGS.fontSize + 1 })

    await user.click(screen.getByRole('button', { name: '夜间' }))
    expect(onChange).toHaveBeenCalledWith({ theme: 'night' })
  })

  it('disables the minus button at the minimum font size', () => {
    render(
      <SettingsSheet
        open
        settings={{ ...DEFAULT_SETTINGS, fontSize: 16 }}
        onChange={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: '减小字号' })).toBeDisabled()
  })
})

describe('TocSheet', () => {
  const entries: TocEntry[] = [
    { label: '第一章 雨', href: 'text/chapter-001.xhtml', level: 0 },
    { label: '第二章 灯', href: 'text/chapter-002.xhtml', level: 0 },
  ]

  it('marks the current chapter and emits the selected entry', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <TocSheet
        open
        entries={entries}
        currentHref="text/chapter-001.xhtml"
        theme="paper"
        onSelect={onSelect}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByRole('button', { name: /第一章 雨/ })).toHaveAttribute(
      'aria-current',
      'location',
    )
    await user.click(screen.getByRole('button', { name: /第二章 灯/ }))
    expect(onSelect).toHaveBeenCalledWith(entries[1])
  })

  it('shows a friendly empty state', () => {
    render(
      <TocSheet
        open
        entries={[]}
        theme="paper"
        onSelect={() => undefined}
        onClose={() => undefined}
      />,
    )
    expect(screen.getByText(/没有可用的目录/)).toBeInTheDocument()
  })
})
