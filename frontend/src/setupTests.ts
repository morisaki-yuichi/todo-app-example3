// toBeInTheDocument() などの DOM 用マッチャーを expect に追加する
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// テストごとに描画した DOM を破棄する。
// （globals: false 構成では RTL の自動クリーンアップが効かないため明示する。
//  これを忘れると前のテストの画面が残り、「Found multiple elements」の原因になる）
afterEach(() => {
  cleanup()
})
