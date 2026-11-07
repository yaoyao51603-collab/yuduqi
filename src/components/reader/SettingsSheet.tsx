import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LINE_HEIGHTS,
  type FontFamily,
  type MarginSize,
  type PageMode,
  type ReaderSettings,
  type ReaderTheme,
} from '../../lib/db/schema'
import Sheet from '../Sheet'
import styles from './SettingsSheet.module.css'

interface SettingsSheetProps {
  open: boolean
  settings: ReaderSettings
  onChange: (patch: Partial<ReaderSettings>) => void
  onClose: () => void
}

const FONT_OPTIONS: Array<{ value: FontFamily; label: string; sample: string }> = [
  { value: 'system', label: '系统', sample: '系统' },
  { value: 'serif', label: '宋体', sample: '宋体' },
  { value: 'sans', label: '黑体', sample: '黑体' },
]

const THEME_OPTIONS: Array<{ value: ReaderTheme; label: string }> = [
  { value: 'paper', label: '纸白' },
  { value: 'sepia', label: '米黄' },
  { value: 'night', label: '夜间' },
]

const MARGIN_OPTIONS: Array<{ value: MarginSize; label: string }> = [
  { value: 'narrow', label: '窄' },
  { value: 'medium', label: '中' },
  { value: 'wide', label: '宽' },
]

const PAGE_OPTIONS: Array<{ value: PageMode; label: string }> = [
  { value: 'paginated', label: '翻页' },
  { value: 'scrolled', label: '滚动' },
]

export default function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  return (
    <Sheet open={open} title="阅读设置" onClose={onClose} theme={settings.theme} tall>
      <div className={styles.body}>
        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>字号</span>
            <span className={styles.hint}>{settings.fontSize}px</span>
          </div>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label="减小字号"
              disabled={settings.fontSize <= FONT_SIZE_MIN}
              onClick={() => onChange({ fontSize: settings.fontSize - 1 })}
            >
              −
            </button>
            <span className={styles.stepValue} aria-live="polite">
              {settings.fontSize}
            </span>
            <button
              type="button"
              className={styles.stepButton}
              aria-label="增大字号"
              disabled={settings.fontSize >= FONT_SIZE_MAX}
              onClick={() => onChange({ fontSize: settings.fontSize + 1 })}
            >
              ＋
            </button>
          </div>
        </section>

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>行高</span>
          </div>
          <div className={styles.segments} role="group" aria-label="行高">
            {LINE_HEIGHTS.map((value) => (
              <button
                key={value}
                type="button"
                className={styles.segment}
                data-selected={settings.lineHeight === value || undefined}
                aria-pressed={settings.lineHeight === value}
                onClick={() => onChange({ lineHeight: value })}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>字体</span>
          </div>
          <div className={styles.segments} role="group" aria-label="字体">
            {FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.segment}
                data-selected={settings.fontFamily === option.value || undefined}
                aria-pressed={settings.fontFamily === option.value}
                onClick={() => onChange({ fontFamily: option.value })}
              >
                {option.sample}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>主题</span>
          </div>
          <div className={styles.themes} role="group" aria-label="主题">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.themeButton}
                data-theme-option={option.value}
                data-selected={settings.theme === option.value || undefined}
                aria-pressed={settings.theme === option.value}
                onClick={() => onChange({ theme: option.value })}
              >
                <span className={styles.swatch} aria-hidden="true" />
                <span className={styles.themeLabel}>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>页边距</span>
          </div>
          <div className={styles.segments} role="group" aria-label="页边距">
            {MARGIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.segment}
                data-selected={settings.margin === option.value || undefined}
                aria-pressed={settings.margin === option.value}
                onClick={() => onChange({ margin: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <div className={styles.groupHead}>
            <span className={styles.label}>翻页方式</span>
          </div>
          <div className={styles.segments} role="group" aria-label="翻页方式">
            {PAGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={styles.segment}
                data-selected={settings.pageMode === option.value || undefined}
                aria-pressed={settings.pageMode === option.value}
                onClick={() => onChange({ pageMode: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  )
}
