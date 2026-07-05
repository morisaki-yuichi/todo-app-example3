import { expect, test, type Page } from '@playwright/test'

/** E2E は「本物のブラウザ + 本物の API + 本物の DB」で動く最後の砦。
 *  単体テストで守れているものは重複させず、次の2本に絞る（Try T-18）:
 *  1. クリティカルパス（登録 → 作成 → 完了 → 削除）
 *  2. 認可（他人の TODO が見えない = US-08 フロント編の受け入れ条件）
 */

// 実行のたびに一意なメールアドレスを使う（DB を洗い替えずに何度でも実行できる）
const uniqueEmail = (label: string) =>
  `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`

async function registerNewUser(page: Page, email: string) {
  await page.goto('/register')
  await page.getByLabel(/メールアドレス/).fill(email)
  await page.getByLabel(/パスワード/).fill('password123')
  await page.getByRole('button', { name: '登録する' }).click()
  await expect(page).toHaveURL(/\/todos$/)
}

async function createTodo(page: Page, title: string) {
  await page.getByRole('link', { name: '+ 新規作成' }).click()
  await page.getByLabel(/タイトル/).fill(title)
  await page.getByRole('button', { name: '作成する' }).click()
  // 作成後は詳細画面へ遷移する
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

test('登録 → 作成 → 完了 → 削除のクリティカルパス', async ({ page }) => {
  await registerNewUser(page, uniqueEmail('main'))
  await expect(page.getByText('TODO はまだありません')).toBeVisible()

  await createTodo(page, 'E2Eで作ったTODO')

  // 一覧に戻り、チェックボックスで完了にする
  await page.getByRole('link', { name: '← 一覧へ戻る' }).click()
  const checkbox = page.getByRole('checkbox', {
    name: 'E2Eで作ったTODO を完了にする',
  })
  await checkbox.click()
  // invalidateQueries による再取得後、チェック済みとして描き直される
  await expect(
    page.getByRole('checkbox', { name: 'E2Eで作ったTODO を未完了にする' }),
  ).toBeChecked()

  // 詳細から削除（確認ダイアログを受諾）
  await page.getByRole('link', { name: 'E2Eで作ったTODO' }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '削除' }).click()
  await expect(page).toHaveURL(/\/todos$/)
  await expect(page.getByText('TODO はまだありません')).toBeVisible()
})

test('他人の TODO は一覧に見えず、URL 直叩きでも読めない', async ({ page }) => {
  // ユーザー A が秘密の TODO を作る
  await registerNewUser(page, uniqueEmail('user-a'))
  await createTodo(page, 'Aの秘密のTODO')
  const secretUrl = page.url() // A の TODO の詳細 URL を控える

  await page.getByRole('button', { name: 'ログアウト' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // ユーザー B でログインし直す
  await registerNewUser(page, uniqueEmail('user-b'))

  // B の一覧に A の TODO は出ない
  await expect(page.getByText('TODO はまだありません')).toBeVisible()
  await expect(page.getByText('Aの秘密のTODO')).not.toBeVisible()

  // URL を直接叩いても中身は読めない（API が 403 を返し、エラー表示になる）
  await page.goto(secretUrl)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Aの秘密のTODO')).not.toBeVisible()
})
