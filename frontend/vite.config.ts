/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 設定はリポジトリルートの .env に集約している（バックエンドと共通）
const rootEnvDir = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '')
  const frontPort = Number(env.FRONT_PORT ?? '5176')

  return {
    plugins: [react()],
    // VITE_ プレフィックスの変数（VITE_API_URL）をルート .env から
    // import.meta.env に注入させる
    envDir: rootEnvDir,
    server: {
      port: frontPort,
      // S8 で /api プロキシを廃止した。フロントは VITE_API_URL の
      // 別オリジン API に直接アクセスし、CORS はサーバ側で許可する
    },
    test: {
      // ブラウザ環境（document 等）を Node 上で再現する
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
