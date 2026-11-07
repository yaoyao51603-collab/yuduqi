import { expect, test, type Page } from '@playwright/test'

const TXT = `书名：雨夜来信
作者：林川

第一章 雨
窗外下着雨，屋檐的水连成一条线。

第二章 灯
灯亮着，桌上摊着一本没有读完的书。

第三章 清晨
天亮的时候，雨停了。
`

async function importTxt(page: Page, name = '雨夜来信') {
  await page.locator('input[type="file"]').setInputFiles({
    name: `${name}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from(TXT, 'utf-8'),
  })
  await expect(page.getByRole('button', { name: `阅读《${name}》` })).toBeVisible()
}

async function openReader(page: Page, title: string) {
  await page.getByRole('button', { name: `阅读《${title}》` }).click()
  await expect(page).toHaveURL(/\/read\//)
  await expect(page.getByText(title, { exact: true })).toBeVisible()
  await expect(page.locator('iframe').first()).toBeVisible()
}

test('empty shelf can open the built-in sample', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '纸间' })).toBeVisible()
  await expect(page.getByText('书架还空着')).toBeVisible()

  await page.getByRole('button', { name: '先读一段试读样章' }).click()
  await expect(page).toHaveURL(/\/read\//)
  await expect(page.getByText('纸间', { exact: true })).toBeVisible()
  await expect(page.locator('iframe').first()).toBeVisible()

  await page.getByRole('button', { name: '目录' }).click()
  await expect(page.getByRole('dialog', { name: '目录' })).toBeVisible()
  await expect(page.getByRole('button', { name: /第一章 纸页之间/ })).toBeVisible()

  await page.getByRole('button', { name: '关闭' }).click()
  await expect(page.getByRole('dialog', { name: '目录' })).toBeHidden()

  await page.getByRole('button', { name: '返回书架' }).click()
  await expect(page.getByRole('heading', { name: '纸间' })).toBeVisible()
  await expect(page.getByText('本地书架 · 1 本')).toBeVisible()
})

test('imports a TXT book, jumps in the TOC and persists theme', async ({ page }) => {
  await page.goto('/')
  await importTxt(page)

  await openReader(page, '雨夜来信')

  await page.getByRole('button', { name: '目录' }).click()
  const toc = page.getByRole('dialog', { name: '目录' })
  await expect(toc.getByRole('button', { name: /第一章 雨/ })).toBeVisible()
  await toc.getByRole('button', { name: /第二章 灯/ }).click()
  await expect(toc).toBeHidden()

  await page.getByRole('button', { name: '阅读设置' }).click()
  const settings = page.getByRole('dialog', { name: '阅读设置' })
  await expect(settings).toBeVisible()
  await settings.getByRole('button', { name: '夜间' }).click()
  await expect(page.locator('[data-reader-theme="night"]').first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('雨夜来信', { exact: true })).toBeVisible()
  await expect(page.locator('[data-reader-theme="night"]').first()).toBeVisible()
})

test('deletes a book after confirmation', async ({ page }) => {
  await page.goto('/')
  await importTxt(page)

  await page.getByRole('button', { name: '删除《雨夜来信》' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '删除' }).click()

  await expect(page.getByText('书架还空着')).toBeVisible()
})

test('reloads the app while offline through the service worker', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  // 第一次 reload 让页面处于 SW 控制之下，之后断开网络再 reload。
  await page.reload()
  await expect(page.getByRole('heading', { name: '纸间' })).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: '纸间' })).toBeVisible()
  await expect(page.getByText('书架还空着')).toBeVisible()
  await context.setOffline(false)
})
