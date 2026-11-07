import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * 构建完成后生成 SW 的预缓存清单。
 * 不用 workbox：本机 Node 是 hardened runtime，无法加载 rollup 的原生绑定，
 * 自己生成一份资源列表交给 public/sw.js 消费即可，效果等价且没有构建期依赖。
 */
function offlinePrecache(): Plugin {
  return {
    name: 'zhijian-offline-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((file) => !file.endsWith('.map'))
        .filter((file) => /\.(js|css|html|png|svg|webp|epub|woff2|webmanifest)$/.test(file))
        .map((file) => `./${file}`)

      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify(assets),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), offlinePrecache()],
  build: { cssMinify: false },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
