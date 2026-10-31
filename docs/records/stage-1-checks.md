# 段階 1 の記録：守らせる仕組みが効いていることの確認

[全体計画](../plan.md) 段階 1 の完了条件「違反するコードをわざと書くと、チェックが失敗することを確かめてある」の記録。CI のログは保存期間が過ぎると消えるので、ここに残す。

- 日付：2026-10-31
- 環境：WSL2（Linux）、Node 24.20.0、pnpm 12.16.1
- 方法：違反を1つずつ書き、止めるべきチェックを実行して、失敗すること（終了コードが 0 でないこと）を確かめた。確かめたら違反は消した。

## 1. 違反とチェックの結果

| # | わざと書いた違反 | 止めたチェック | 結果（エラーの要点） |
|---|---|---|---|
| 1 | `domain` から `ui` を import（パッケージ名） | TypeScript（依存の宣言がないので解決できない） | `TS2882 Cannot find module ... '@karuta/ui'` |
| 2 | `domain` から `ui` を import（相対パス） | dependency-cruiser | `domain-uses-nothing-outside` |
| 3 | `domain` で `Date` を使う | ESLint | `no-restricted-globals`（時刻は Clock ポートから受け取る） |
| 4 | `domain` で `Math.random` を使う | ESLint | `no-restricted-properties`（乱数は Random ポートから受け取る） |
| 5 | `domain` で DOM（`document`）を使う | TypeScript（`lib` に DOM がない） | `TS2584 Cannot find name 'document'` |
| 6 | 型アサーション（`as`） | ESLint | `consistent-type-assertions` |
| 7 | `any` | ESLint | `no-explicit-any` |
| 8 | 非 null アサーション（`!`） | ESLint | `no-non-null-assertion` |
| 9 | 59 行の関数 | ESLint | `max-lines-per-function`（上限 50） |
| 10 | 引数が 4 つの関数 | ESLint | `max-params`（上限 3） |
| 11 | 理由を書かない lint の抑制 | ESLint | `eslint-comments/require-description` |
| 12 | `console` を直接使う | ESLint | `no-console` |
| 13 | `switch` の場合分けの漏れ | ESLint | `switch-exhaustiveness-check` |
| 14 | `ui` から `adapters-web` を import | dependency-cruiser | `ui-not-to-adapters` |
| 15 | `ui` から `domain` の値を import | dependency-cruiser | `ui-to-domain-types-only` |
| 16 | 循環参照 | dependency-cruiser | `no-circular` |
| 17 | 使われていないファイル | knip | `Unused files` |
| 18 | テストのない関数（カバレッジ 0%） | Vitest のカバレッジ閾値 | `Coverage for lines (0%) does not meet global threshold (95%)` |
| 19 | 何も確かめないテスト | Stryker | `Final mutation score 0.00 under breaking threshold 80` |
| 20 | 書式の崩れ | Prettier | `Code style issues found` |
| 21 | JavaScript がサイズの予算を超える（予算を 10 kB に下げて確認） | size-limit | `Package size limit has exceeded by 57.73 kB` |
| 22 | 最初の描画の前に 700 ms 止める | Playwright（起動時間の予算） | `Expected: < 500, Received: 745` |

## 2. 空のアプリの値

| 項目 | 値 | 予算 |
|---|---|---|
| 再読み込みから画面の描画まで（Chromium、7 回の中央値） | 37 ms | 500 ms（ADR-0001） |
| 同（Firefox） | 100 ms | 500 ms |
| 同（WebKit） | 45 ms | 500 ms |
| JavaScript の大きさ（gzip） | 67.73 kB | 100 kB（仮の値） |

サイズの予算 100 kB は、空のアプリ（React を含む）に余裕を持たせた仮の値。本当の基準は起動時間の予算で、サイズの予算は大きくなりすぎたことに早く気づくための目安とする。

## 3. すべてのチェックの合格

WSL2 に、ブラウザが使うシステムのライブラリをユーザーが入れた（`playwright install-deps`、`sudo` が要る）。そのうえで `pnpm verify` を最後まで実行し、すべて合格した（2026-10-31）。E2E は Chromium・Firefox・WebKit・iPad 相当の 4 つで、8 件すべて合格。

## 4. 残っていること

- **テストがない間だけの設定**：テストがまだ1つもないので、Vitest の `passWithNoTests` と Stryker の `allowEmpty` を有効にしていた。段階 2 の最初のテストで外した（2026-10-31）。外した後に何が止まるかは、[段階 2 の記録](stage-2-checks.md) §2。
- **後で入れる道具**：fast-check は段階 2 で入れた（2026-10-31）。Testing Library、jsdom は、最初に使う段階で入れる。使わない依存は knip が止めるため。
- **CI**：GitHub Actions の設定（`.github/workflows/ci.yml`）は書いたが、まだ push していないので動いていない。

## 5. 置いたもの

| ファイル | 役割 |
|---|---|
| `pnpm-workspace.yaml`、`package.json` | ワークスペース、コマンド（`pnpm verify` ですべてのチェック、`pnpm check:fast` で速いチェック） |
| `tsconfig.base.json`、各パッケージの `tsconfig.json` | 型の厳しさの設定。`domain`・`application` は DOM も Node の型も持たない |
| `eslint.config.js` | lint の規則（設計方針 §5） |
| `.dependency-cruiser.json` | 層と依存の向きの規則（設計方針 §2.1） |
| `vitest.config.ts`、`stryker.config.json` | 単体テスト・カバレッジの閾値、ミューテーションテスト |
| `apps/web/playwright.config.ts`、`apps/web/e2e/` | E2E（3つのブラウザエンジンと iPad 相当）、起動時間の予算、アクセシビリティ |
| `.size-limit.json` | サイズの予算 |
| `lefthook.yml` | コミット前の速いチェック |
| `.github/workflows/ci.yml` | CI。`pnpm verify` を呼ぶだけ |
