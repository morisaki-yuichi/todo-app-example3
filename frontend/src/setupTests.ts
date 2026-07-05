// toBeInTheDocument() などの DOM 用マッチャーを expect に追加する
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Node の実験的 WebStorage が jsdom の localStorage を覆い隠して
// 「getItem is not a function」になる環境があるため、テストでは
// 確実に動くメモリ実装へ固定する（テストの前提は自分で固定する）
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

Object.defineProperty(window, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
})

// テストごとに描画した DOM を破棄する。
// （globals: false 構成では RTL の自動クリーンアップが効かないため明示する。
//  これを忘れると前のテストの画面が残り、「Found multiple elements」の原因になる）
afterEach(() => {
  cleanup()
  window.localStorage.clear() // トークン等の残骸をテスト間に持ち込まない
})
