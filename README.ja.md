# Cocos Creator MCP サーバープラグイン

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語** · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Cocos Creator 3.8+ に対応した総合的な MCP（Model Context Protocol）サーバープラグインです。AI アシスタントが標準化されたプロトコルを通じて Cocos Creator エディタと連携できるようにします。ワンクリックでインストール・利用でき、煩雑な環境構築や設定は一切不要です。Claude デスクトップクライアント、Claude CLI、Cursor、Windsurf でテスト済みであり、その他の MCP 対応エディタでもシームレスに動作します。

**🚀 統合ツールアーキテクチャ、アトミックバッチ実行、ネイティブアニメーショングラフ対応を備え、エディタ制御の 99% を実現！**

## 🙏 謝辞とクレジット

本プロジェクトは、**LiDaxian** 氏が作成したオープンソースプロジェクト [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) のフォークとして始まりました。Cocos Creator における AI モデルコンテキストプロトコル（MCP）の基礎アーキテクチャを築き、道を切り拓いてくださった **LiDaxian** 氏およびすべてのコミュニティ貢献者に心から感謝と敬意を表します。

`pts-cc-mcp` は、この基盤の上に構築された完全オープンソースのコミュニティ主導の拡張機能であり、以下を包括的にサポートしています：
- **100% 英語のコードベース**とシームレスな多言語 i18n ローカライズ対応
- **プロセス内アトミックバッチ実行エンジン**（`batch_execute` / `editor_batch_execute`）
- **ネイティブアニメーショングラフ**（`.animgraph`）のステートマシン検査と編集
- **安全なプレハブセッションスタック**と自動復元によるシーン終了時クラッシュの防止
- **スマート再帰アセットリゾルバー**（`@spriteFrame`、`@texture`、生パス、UUID）
- **Spine & FastSpine** キャラクターリグの自動セットアップ
- **TypeScript コンパイラウォッチャー**（`compile_status`）によるスクリプトコンパイル競合の解消

## オープンソース版 更新履歴

### 🚀 メジャーアップデート v1.6.0 (フェーズ 1: Streamable HTTP & SSE デュアルトランスポート)

- **デュアルトランスポートエンジン：ネイティブ Streamable HTTP & Server-Sent Events (SSE)**：ステートレスな直通 JSON-RPC フォールバックエンドポイントに加え、`@modelcontextprotocol/sdk` の Streamable HTTP（`/mcp`）および Server-Sent Events（`/sse` & `/messages`）を完全にネイティブサポート。クライアントごとの独立したセッションライフサイクル管理、アイドルセッションの自動クリーンアップ、最新の AI IDE（Claude CLI、Cursor、Windsurf、VS Code）向けの完全な CORS サポートを提供します。
- **シーンスクリプト実行時コアの分離と `pts-core` ピア依存関係の明記**：シーンスクリプト実行（`src/_cc.js`）のための `pts-core` に対するピア依存関係を検証・明文化し、MCP プロトコル変換と Cocos Creator エンジンのシーン操作との明確な分離を確立しました。

### 🚀 メジャーアップデート v1.5.4

- **プロセス内アトミックバッチ実行 (`batch_execute` / `editor_batch_execute`)**: 複数のツール操作を単一のプロセス内順次 IPC トランザクションとして実行します。HTTP のラウンドトリップと Token 消費を大幅に削減し、`stopOnError`（エラー時中断）およびシーン/プレハブの自動保存をサポートします。
- **アニメーショングラフエンジン (`animgraph_manage`)**: `.animgraph` ファイルのネイティブな検査と変更に対応。ステートマシン、状態（State）、トランジション（Transition）、パラメータの調査、`StateMachineComponent` の追加・更新・削除、およびアセットデータベースの自動同期を伴うコンポーネントクラスタイプの一括移行をサポートします。
- **プレハブセッションスタックと安全な復元**: `enter` 実行時にアクティブなシーンの URL/UUID を記録し、`exit` 時に以前のシーンを自動復元します。記録がない場合でもプロジェクト内の有効なシーンを自動検索し、「対象シーンが存在しません（Target scene does not exist）」エラーを完全に解消しました。シームレスな enter $\to$ edit $\to$ save $\to$ exit サイクルを実現する `atomic_edit` アクションも追加。
- **スマートアセット＆サブアセットリゾルバー (`asset_query(action="resolve")`)**: 生パス、UUID、およびサブアセット（`@spriteFrame` $\to$ `@f9941`、`@texture` $\to$ `@6c48a`）を自動的に解決します。`set_component_property` および `update_component` に完全に統合され、ディープな自動解決が行われます。
- **Spine / FastSpine セットアップヘルパー (`spine_setup`)**: 1 回の呼び出しでキャラクターリグを迅速に初期化。`FastSpine` または `sp.Skeleton` をアタッチし、スケルトンデータアセットをバインド、デフォルトアニメーション、ループモードを設定し、UITransform を自動同期します。
- **コンパイラウォッチャー (`compile_status`) と防御的デフォルト値**: スクリプト編集後に Cocos Creator の TypeScript/JavaScript コンパイル完了を監視・待機し、競合状態を排除します。デバッグおよびサーバー関連ツール全体に安全な防御的デフォルト値を追加し、未知のアクションに対する明確なエラーガイダンスを提供します。
- **100% 英語コードベースと完全な i18n 多言語対応**: すべての拡張機能ソースコード、コメント、エラーメッセージ、ログをプロフェッショナルな英語に統一し、シームレスな多言語 i18n ローカライズをサポートしました。

---

## ツール体系と操作コード

- すべてのツールは「カテゴリ_操作」の命名規則を採用し、パラメータは統一された Schema に準拠しており、複数の操作コード（`action`）の切り替えに対応することで、柔軟性と拡張性を大幅に向上させています。
- シーン、ノード、コンポーネント、プレハブ、アセット、アニメーショングラフ、バッチトランザクション、プロジェクト、デバッグ、環境設定、サーバーステータス、メッセージブロードキャストなど、エディタ操作全体を網羅しています。
- ツール呼び出しの例：

```json
{
  "tool": "batch_execute",
  "arguments": {
    "operations": [
      {
        "tool": "node_node_transform",
        "args": { "nodeUuid": "node-uuid", "position": { "x": 100, "y": 50 } }
      },
      {
        "tool": "component_set_component_property",
        "args": {
          "nodeUuid": "node-uuid",
          "componentType": "cc.Sprite",
          "property": "spriteFrame",
          "propertyType": "spriteFrame",
          "value": "db://assets/textures/hero.png@spriteFrame"
        }
      }
    ],
    "autoSave": true
  }
}
```

---

## 主要機能カテゴリ

- **batch_execute / editor_batch_execute**: 単一の IPC トランザクションで複数のツール操作を実行するアトミックバッチ実行エンジン
- **animgraph_manage**: ネイティブな `.animgraph` の検査、ステートマシンのトランジション、およびコンポーネントの CRUD
- **scene_management / scene_hierarchy**: シーンのライフサイクル（取得/開く/保存/作成/閉じる）と階層ツリー
- **node_query / node_lifecycle / node_transform**: ノードの検索、作成、削除、階層構造、およびトランスフォーム
- **component_manage / set_component_property / spine_setup**: コンポーネントのライフサイクル、プロパティ設定、および FastSpine リグのセットアップ
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: プレハブ管理、インスタンス化、セッションスタック、およびアトミック編集
- **asset_manage / asset_analyze / asset_query**: アセットの CRUD、依存関係追跡、およびスマートサブアセット解決
- **debug_console / debug_logs / compile_status**: コンソール監視、プロジェクトログ検索、および TS コンパイラウォッチャー
- **project_manage / project_build_system**: プロジェクト実行、ビルドパネル制御、およびプレビューサーバー
- **preferences_manage**: エディタの環境設定管理
- **server_information / server_connectivity**: サーバー IP 一覧、ポート検査、および接続性診断
- **broadcast_log_management / broadcast_listener_management**: エディタ内部イベントの監視とブロードキャスト

---

## クイックスタート

`pts-cc-mcp` は **Streamable HTTP**（`/mcp`）と **Server-Sent Events (SSE)**（`/sse`）のデュアルトランスポートをサポートしています。

### 1. Claude CLI 設定

```bash
# Streamable HTTP（デフォルト推奨）
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# または Server-Sent Events (SSE) 経由
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Claude デスクトップ設定

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*または SSE トランスポートでの設定：*

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "sse",
      "url": "http://127.0.0.1:3000/sse"
    }
  }
}
```

### 3. Cursor および Windsurf 設定

Cursor または Windsurf の MCP 設定（`.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*（必要に応じて `"url": "http://127.0.0.1:3000/sse"` を指定することも可能です）。*

---

## ⚠️ 前提条件と必須のピア依存関係

> **重要: `pts-cc-mcp` を使用するには、プロジェクトに `pts-core` 拡張機能がインストールされている必要があります。**
>
> **なぜ `pts-core` が必須なのか？**  
> Cocos Creator 3.8+ ではマルチプロセスアーキテクチャが採用されており、**エディタメインプロセス**（`pts-cc-mcp` が動作する場所）と**シーン実行プロセス**（ゲームシーン、コンポーネント、および live な `@ccclass` エンジンランタイムが動作する場所）が完全に分離されています。  
>
> `pts-cc-mcp` は、`Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })` を呼び出してエンジンに IPC 要求を送信し、シーンコマンドを実行します。このシーンスクリプト（`src/_cc.js`）は直接 `pts-core` 内に配置されています。  
>
> `pts-core` が存在しない場合、ライブシーンランタイムを必要とするツール（`component_*`、`node_node_transform`、`scene_inspect_scene`、`game_*`、`component_query_class_info` など）はシーンノードと対話できません。

> **初めてインストールする場合やアップグレードを行う前の注意点：**  
> 必ずプロジェクトの `settings/` ディレクトリ配下にある `mcp-server.json` と `tool-manager.json` の 2 つのファイルを削除してください。削除しない場合、ツール一覧のキャッシュにより表示に不具合が生じる可能性があります！  
> ファイルパス：`<Project>/settings/mcp-server.json` および `<Project>/settings/tool-manager.json`。  
> これら 2 つのファイルを削除した後、拡張機能パネルを再度開くことで、すべてのツールがクリーンに再同期されます。

## インストール手順

### 1. プラグインファイルの配置

`pts-core` と `pts-cc-mcp` の両方の拡張機能が Cocos Creator プロジェクトの `extensions/` ディレクトリ内に配置されていることを確認します：

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 必須: コアエンジン＆シーンスクリプト実行環境 (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- MCP サーバー＆ツールプロバイダー
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. 依存関係のインストールとビルド

```bash
# 1. pts-core のセットアップ（ソースからビルドする場合）
cd extensions/pts-core
npm install
npm run build

# 2. pts-cc-mcp のセットアップ
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Cocos Creator でのプラグイン有効化

1. Cocos Creator を再起動するか、拡張機能マネージャーを再読み込みします（**拡張機能 > 拡張機能マネージャー**）。
2. **pts-core** と **pts-cc-mcp** の両方が有効になっていることを確認します。
3. `拡張機能 > pTS MCP Server` をクリックしてコントロールパネルを開きます。
4. サーバーはデフォルトでポート `3000` で動作します（パネルから変更可能）。

---

## 開発

### プロジェクト構造
```
pts-cc-mcp/
├── source/                    # TypeScript ソースファイル
│   ├── main.ts               # プラグインのエントリーポイント
│   ├── mcp-server.ts         # MCP サーバーの実装
│   ├── settings.ts           # 設定管理
│   ├── types/                # TypeScript 型定義
│   ├── utils/                # ユーティリティ（アセットリゾルバー、Schema互換、JSONユーティリティ）
│   ├── tools/                # ツール実装
│   │   ├── animgraph-tools.ts
│   │   ├── batch-tools.ts
│   │   ├── scene-tools.ts
│   │   ├── node-tools.ts
│   │   ├── component-tools.ts
│   │   ├── prefab-tools.ts
│   │   ├── project-tools.ts
│   │   ├── debug-tools.ts
│   │   ├── preferences-tools.ts
│   │   ├── server-tools.ts
│   │   ├── broadcast-tools.ts
│   │   ├── scene-view-tools.ts
│   │   ├── reference-image-tools.ts
│   │   └── asset-advanced-tools.ts
│   ├── panels/               # UI パネル実装
│   └── test/                 # テストファイル
├── dist/                     # コンパイル済み JavaScript 出力
├── static/                   # 静的アセット（アイコンなど）
├── i18n/                     # 国際化リソース
├── package.json              # プラグイン設定
└── tsconfig.json             # TypeScript 設定
```

### ソースからのビルド

```bash
# 開発用ウォッチモード
npm run watch

# プロダクションビルド
npm run build
```

---

## システム要件

- Cocos Creator 3.8.6 以降
- Node.js（Cocos Creator に同梱）
- TypeScript（開発依存関係としてインストール）

## ライセンス

本プラグインは Cocos Creator プロジェクト向けに設計されており、学習および開発を目的として完全なソースコードが含まれています。
