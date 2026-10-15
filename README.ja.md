# Cocos Creator MCP サーバープラグイン (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · **日本語** · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Cocos Creator 3.8+ に対応したオープンソースの包括的な Model Context Protocol (MCP) サーバープラグインです。AI コーディングアシスタント（Claude CLI、Claude Desktop、Cursor、Windsurf、Antigravity）が標準化されたプロトコルを通じて Cocos Creator ゲームの調査、作成、検証、操作を行えるようにします。

**🚀 Streamable HTTP & SSE デュアルトランスポート、16 の統合インテントツール（231 のオペコード）、宣言型ワンショット UI 生成、オフラインリフレクションナレッジベース、タイムラインキーフレームアニメーション作成、シーン/アセット回帰スナップショット差分比較を搭載！**

---

## 🙏 謝辞とクレジット

本プロジェクトは、**LiDaxian** 氏が作成したオープンソースプロジェクト [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) のフォークとして始まりました。Cocos Creator における AI モデルコンテキストプロトコル（MCP）の基礎アーキテクチャを築き、道を切り拓いてくださった **LiDaxian** 氏およびすべてのコミュニティ貢献者に心から感謝と敬意を表します。

`pts-cc-mcp` は、この基盤の上に構築されたコミュニティ主導の完全オープンソース拡張機能として進化を続け、すべてのクローズドソース／商用機能を優れたオープンソース実装に置き換えています。

---

## 🚀 バージョン 1.6.0 更新履歴：統合 Pro アーキテクチャ (Unified Pro Architecture)

### 1. Streamable HTTP & Server-Sent Events (SSE) デュアルトランスポート（フェーズ 1）
- ポート `3121` で `@modelcontextprotocol/sdk` の Streamable HTTP（`/mcp`）および Server-Sent Events（`/sse` & `/messages`）を完全にネイティブサポート。
- クライアントごとの独立したセッション管理、キープアライブハートビート、最新の AI クライアント向けの CORS ヘッダーを提供。

### 2. インテントレベルの統合オペコードアーキテクチャ（フェーズ 2）
- 50 以上の分散していたスキーマを、231 の操作（`action` オペコードディスパッチ）をカバーする **16 の統合インテントツール** に統合。
- レガシーツール呼び出しとの下位互換性を維持しながら、LLM コンテキストウィンドウにおけるスキーマトークン消費を 70% 以上削減。

### 3. 宣言型ワンショット UI＆シーンビルダー（フェーズ 3）
- `ui_builder`: `UITransform` の自動作成、制約解決（Widget アンカー、Layout マージン）、エラー時の自動ロールバックスナップショットを備え、複雑な UI グラフ（`build_tree`、`create_dialog`、`create_button`、`create_list`）を宣言的に構築。

### 4. 組み込み Cocos Creator 3.8 リフレクションナレッジベース（フェーズ 4）
- `knowledge_query`: ビルトイン 2D/3D コンポーネント（`cc.Sprite`、`cc.Label`、`cc.Widget`、`cc.Layout`、`sp.Skeleton`）のインメモリアーキテクチャルールと `@property` 辞書、デザイン解像度ガイド、座標変換式。
- 自動化された `AGENTS.md` 検証およびドキュメントジェネレーター（`get_mcp_guide`、`sync_agents_doc`）。

### 5. タイムラインアニメーション＆キーフレーム曲線エディタ（フェーズ 5）
- `anim_manage`: 3次ベジェ（Cubic Bezier）、線形（Linear）、定数（Constant）曲線補間による `.anim`（`cc.AnimationClip`）トラックの直接オーサリング。
- アニメーションイベントトリガー、クイックモーションプリセット（`bounce_pop`、`fade_in`、`fade_out`、`shake`）、自動マルチテイク FBX アニメーションスライシング。

### 6. シーン＆アセットの診断・スナップショット差分（フェーズ 6）
- `validation_manage`: 兄弟ノードの同名衝突検出、`UITransform` 欠落の診断、シーンコンポーネントの `__uuid__` 参照と `asset-db` を照合する詳細な再帰的アセットスキャナー。
- SHA-256 シーン状態スナップショット（`capture_snapshot`）と視覚的な Markdown 回帰差分テーブル（`diff_snapshot`）。

---

## 🛠️ 統合インテント API チートシート (16 ツール)

| インテントツール | 主要引数 | 用途とベストプラクティス |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | シーンライフサイクル管理、完全なツリーインスペクション、シーンスクリプト実行。 |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | ユニバーサルノード検索、作成、削除、トランスフォーム、階層操作。 |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | コンポーネントの追加/削除、ディーププロパティ更新（自動保存付き）、クリックイベントバインド、@ccclass リフレクション。 |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | プレハブの完全なライフサイクル、非破壊的編集セッションスタック、アトミック一括編集。 |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | 宣言型ワンショット UI 生成（自動 UITransform、Widget 制約、Layout 自動計算）。 |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | タイムライン AnimationClip 編集、プロパティ曲線、イージングモード、アニメーションイベント、プリセット、FBX スライシング、AnimGraph ステートマシン。 |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | アセット検出、依存関係検査、スマートサブアセット解決（`@spriteFrame`、`@texture`）。 |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | コンポーネント、座標、ルール、最新の MCP ガイドに関するオフラインアーキテクチャリファレンス。 |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | 欠落している UITransform、破損したアセット、範囲外ノードの自動監査、視覚的スナップショット回帰差分比較。 |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | 単一の IPC トランザクション内で複数の操作を順次実行するプロセス内アトミックバッチ実行エンジン。 |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | ビルド設定確認、プレビューサーバー制御、TypeScript コンパイル状態監視。 |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | ビューポートカメラのフォーカス、視点切り替え、エディタオーバーレイ/Gizmo 操作。 |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | ワンコールでの Spine スケルトンまたは FastSpine リグのセットアップとアニメーション構成。 |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | エディタコンソールログ監視とパフォーマンスメトリクス取得。 |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | エディタ環境設定の取得と構成。 |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | エディタ内イベントの監視とブロードキャスト。 |

---

## 📖 標準 MCP ワークフロー

### A. シーンまたはプレハブグラフのインスペクション
* `scene_manage(action="inspect")` を使用して、フォーマットされた JSON または Markdown ツリーでシーン階層、コンポーネント、プロパティを検査します。
* `scene_manage(action="hierarchy", includeComponents=true)` を使用して、アクティブなシーンまたは開いているプレハブ内のライブノードを一覧表示します。

### B. アクティブなシーン内のコンポーネント変更
* `component_manage(action="update")` を使用して、ディーププロパティ更新（`config.sid`、`config.data`）、ネストされた `@ccclass` オブジェクトのインスタンス化、アセット配列（`onUpdates`、`onChanged`）を適用します。
* `scene_manage(action="save")` を使用してシーンの変更を保存します。

### C. プレハブ内のコンポーネント / ノード変更
* **プレハブが現在開いている／検査中の場合：**
  1. `node_manage(action="query")` でターゲットノードを特定。
  2. `component_manage(action="add")`（新しいスクリプトのアタッチ）または `component_manage(action="update")`（データの設定）。
  3. `prefab_manage(action="save")` で保存。
* **プレハブがバックグラウンドにある場合（開いていない場合）：**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` でターゲットノードを特定。
  3. `component_manage(action="update")` で変更を適用。
  4. `prefab_manage(action="save")` で保存。
  5. `prefab_manage(action="exit")` で退出。
* またはアトミック編集を使用：`prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. クラスリフレクションと型情報
* 値を割り当てる前に、`component_manage(action="query_class_info")` を使用して `@ccclass` リフレクション属性、デフォルト値、および `@property` メタデータを検査します。

### E. 宣言型 UI 生成
* `ui_builder(action="build_tree", parent="Canvas", tree={...})` を使用して、1 回の呼び出しで完全な UI 階層（パネル、ボタン、ラベル、スプライト、スクロールビューなど）を構築し、自動計算された UITransform と Widget 制約を適用します。

### F. タイムラインキーフレームアニメーションと FBX スライシング
* プロパティ曲線を使用して `.anim` クリップをオーサリング：`anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`。
* モーションプリセットの適用：`anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`。
* マルチテイク FBX モデルのスライシング：`anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`。

### G. シーン＆アセットの診断とスナップショット回帰差分
* 変更前にベースラインのシーンスナップショットをキャプチャ：`validation_manage(action="capture_snapshot", tag="PreEdit")`。
* 編集後にシーンとスナップショットを比較：`validation_manage(action="diff_snapshot")`。
* シーン階層のレイアウトバグを監査：`validation_manage(action="check_scene")`。
* プロジェクトとシーン内の無効な GUID アセット参照をスキャン：`validation_manage(action="check_assets")`。

---

## ⚡ クイックスタート

`pts-cc-mcp` はデフォルトでポート `3121` で動作し、**Streamable HTTP**（`/mcp`）および **Server-Sent Events (SSE)**（`/sse`）のデュアルトランスポートをサポートしています。

### 1. Claude CLI 設定

```bash
# Streamable HTTP（デフォルト推奨）
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# または Server-Sent Events (SSE) 経由
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop クライアント設定

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3121/mcp"
    }
  }
}
```

*または SSE プロトコルを使用する場合：*

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "sse",
      "url": "http://127.0.0.1:3121/sse"
    }
  }
}
```

### 3. Cursor & Windsurf 設定

Cursor または Windsurf の MCP 設定（`.cursor/mcp.json`）に追加：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3121/mcp"
    }
  }
}
```

---

## ⚠️ 前提条件と必須ピア依存関係

> **重要：`pts-cc-mcp` を使用するには、プロジェクトに `pts-core` 拡張機能がインストールされている必要があります。**
>
> **なぜ `pts-core` が必須なのか？**  
> Cocos Creator 3.8+ はマルチプロセスアーキテクチャを採用しており、**エディタメインプロセス**（`pts-cc-mcp` が動作する環境）と**シーン実行プロセス**（ゲームシーン、コンポーネント、およびライブ `@ccclass` エンジンランタイムが動作する環境）は完全に分離されています。  
>
> `pts-cc-mcp` は、`Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })` を呼び出すことによってシーンコマンドを実行します。このシーンスクリプト（`src/_cc.js`）は `pts-core` 内に直接ホストされています。  
>
> `pts-core` がない場合、ライブシーンランタイムを必要とするツール（`component_*`、`node_manage`、`scene_manage`、`ui_builder`、`validation_manage` など）はシーンノードと対話できません。

---

## インストールとセットアップ

### 1. 拡張機能ファイルの配置
Cocos Creator プロジェクトの `extensions/` ディレクトリ内に、`pts-core` と `pts-cc-mcp` の両方が配置されていることを確認します：

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 必須：コアエンジンおよびシーンスクリプトランタイム (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP サーバーおよびツールプロバイダー
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
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

### 3. Cocos Creator で拡張機能を有効化
1. Cocos Creator を再起動するか、拡張機能マネージャー（**拡張機能 > 拡張機能マネージャー**）を再読み込みします。
2. **pts-core** と **pts-cc-mcp** の両方が有効になっていることを確認します。
3. `拡張機能 > pTS MCP Server` をクリックしてコントロールパネルを開きます。
4. サーバーはデフォルトでポート `3121` で動作します（パネルで変更可能）。

---

## プロジェクト構成

```
pts-cc-mcp/
├── source/                    # TypeScript ソースファイル
│   ├── main.ts               # プラグインエントリポイント＆ブートストラップ検証
│   ├── mcp-server.ts         # Streamable HTTP & SSE トランスポート層
│   ├── settings.ts           # 設定および構成管理
│   ├── types/                # TypeScript 型定義
│   ├── utils/                # ユーティリティ
│   │   ├── agents-doc-generator.ts # AGENTS.md テンプレート＆ドキュメント同期ジェネレーター
│   │   ├── asset-resolver.ts       # スマートサブアセット UUID リゾルバー
│   │   ├── json-utils.ts           # 防御的 JSON パース＆修復
│   │   └── i18n.ts                 # 多言語翻訳エンジン
│   ├── tools/                # サブシステムおよび統合ツール実装
│   │   ├── intent-dispatcher.ts    # 16 インテント API ディスパッチャー＆オペコードルーター
│   │   ├── ui-builder-tools.ts     # 宣言型ワンショット UI ビルダー
│   │   ├── knowledge-tools.ts      # オフラインリフレクションナレッジベース
│   │   ├── animation-tools.ts      # AnimationClip ＆ FBX スライシングエディタ
│   │   ├── validation-tools.ts     # シーン診断＆スナップショット回帰差分比較
│   │   ├── batch-tools.ts          # アトミックバッチ実行エンジン
│   │   ├── scene-tools.ts          # シーンライフサイクル管理
│   │   ├── node-tools.ts           # ノードトランスフォーム＆階層操作
│   │   ├── component-tools.ts      # コンポーネントリフレクション＆プロパティアップデータ
│   │   ├── prefab-tools.ts         # プレハブセッションスタック＆アトミック編集
│   │   ├── asset-advanced-tools.ts # アセットデータベース検索＆スマート解決
│   │   ├── project-tools.ts        # ビルド＆プレビュー実行
│   │   ├── debug-tools.ts          # コンソールログ＆ TS コンパイラウォッチャー
│   │   └── preferences-tools.ts    # ユーザー環境設定管理
│   └── panels/               # Vue 3 UI パネル実装（ツールテスター内蔵）
├── dist/                     # コンパイル済み JavaScript 出力
├── static/                   # 静的アセット（アイコン、スタイル、テンプレート）
├── i18n/                     # 国際化言語ディクショナリ
├── package.json              # 拡張機能マニフェスト＆コントリビューション
└── tsconfig.json             # TypeScript ビルド設定
```

---

## ライセンス

本プラグインは MIT ライセンスの下でオープンソースとして公開されており、Cocos Creator ゲーム開発向けに設計されています。
