# 現行サンプルの自動テスト（不具合の再現）

現行サンプルの不具合を、操作手順ごと自動テストとして残す。
各テストは **意図どおりの動作** を確かめる。既知の不具合は `test.fail(...)` で「失敗するはず」と印を付けておき、修正したらその行を消す。
修正後に印を消し忘れると「失敗するはずが成功した」と報告されるので、気づける。

対応する説明は [取扱説明書（観察版）](../docs/spec/00-sample-manual.md)（`rewrite` ブランチ）を参照。

## 準備

```bash
cd e2e
npm install
npx playwright install chromium ffmpeg
```

Linux で必要なライブラリが足りない場合は、`sudo npx playwright install-deps chromium` を実行する。

## 実行

```bash
npm test
```

画面に表示しながら、字幕付きでゆっくり再現する（動画も `test-results/` に保存される）：

```bash
npm run demo
```

インストール済みの Chromium を使う場合は、環境変数 `PW_CHROMIUM_EXECUTABLE` に実行ファイルのパスを指定する。
