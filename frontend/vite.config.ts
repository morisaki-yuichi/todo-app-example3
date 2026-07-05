/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ポート設定はリポジトリルートの .env に集約している（バックエンドと共通）
const rootEnvDir = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootEnvDir, '')
  const apiPort = env.API_PORT ?? '8002'
  const frontPort = Number(env.FRONT_PORT ?? '5176')

  return {
    plugins: [react()],
    server: {
      port: frontPort,
      // フロントのコードは常に /api/... を叩く。開発中はこのプロキシが
      // /api を剥がしてバックエンド（別ポート）へ転送するため、
      // ブラウザから見ると同一オリジン = CORS 設定が不要になる（S8 で外して対比）
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      // ブラウザ環境（document 等）を Node 上で再現する
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  }
})
