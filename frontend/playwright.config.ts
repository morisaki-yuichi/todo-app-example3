import { defineConfig } from '@playwright/test'

/** E2E テストの設定。
 *
 *  前提: バックエンドが起動していること（ルートで docker compose up -d と
 *  マイグレーション適用済み）。フロントの dev サーバは Playwright が
 *  自動起動する（起動済みならそれを使う）。
 *  実行: npm run e2e
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5176',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5176',
    reuseExistingServer: true,
  },
})
