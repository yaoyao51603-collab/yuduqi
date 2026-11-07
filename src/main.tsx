import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/tokens.css'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('找不到应用挂载节点 #root')
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// 尽量减少浏览器在存储紧张时清掉书架的概率；失败也不影响使用。
void navigator.storage?.persist?.()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 离线缓存不可用时不阻塞阅读
    })
  })
}
