# Cocos Creator MCP 伺服器外掛 (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

一款適用於 Cocos Creator 3.8+ 的綜合性開源 MCP（Model Context Protocol，模型上下文協議）伺服器外掛，賦能各類 AI 程式碼助理（Claude CLI、Claude Desktop、Cursor、Windsurf、Antigravity）透過標準化協議對 Cocos Creator 遊戲專案進行審查、創作、校驗與全方位控制。

**🚀 具備 Streamable HTTP 與 SSE 雙傳輸引擎、16 個統一意圖工具（涵蓋 231 個操作碼）、宣告式一鍵 UI 建構、離線反射知識庫、時間軸關鍵影格動畫製作以及場景/資產回歸快照比對！**

---

## 🙏 致謝與來源聲明

本專案最初基於 **LiDaxian** 建立的開源專案 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) 進行分叉開發。我們向 **LiDaxian** 先生以及所有社群貢獻者致以最崇高的敬意與由衷感謝，正是他們奠定了基礎架構，開闢了 AI 驅動 Cocos Creator 開發的全新道路。

`pts-cc-mcp` 在此基石之上，作為一個由社群驅動的 100% 完全開源擴充套件持續演進，以更優異的開源實現取代了所有的閉源與商業化特性。

---

## 🚀 版本 1.6.0 更新日誌：統一專業級架構 (Unified Pro Architecture)

### 1. 雙協議原生支援：Streamable HTTP 與 Server-Sent Events (SSE) 傳輸 (階段 1)
- 全面原生支援 `@modelcontextprotocol/sdk` 的 Streamable HTTP（`/mcp`）與 Server-Sent Events（`/sse` 與 `/messages`），預設運作於連接埠 `3121`。
- 提供基於用戶端的獨立會話生命週期管理、心跳保活機制，以及面向現代 AI 用戶端的完整 CORS 標頭支援。

### 2. 意圖級統一操作碼架構 (階段 2)
- 將以往 50 多個分散零碎的工具 Schema 統一收斂為 **16 個統一意圖工具**，涵蓋 231 種細分操作（基於 `action` 操作碼分發）。
- 在 LLM 上下文視窗中將 Schema Token 消耗降低 70% 以上，同時完美維持對舊版工具呼叫的向下相容。

### 3. 宣告式一鍵 UI 與場景建構器 (階段 3)
- `ui_builder`：支援透過宣告式資料一鍵建構複雜的 UI 節點樹（`build_tree`、`create_dialog`、`create_button`、`create_list`），自動掛載 `UITransform`、計算約束佈局（Widget 錨點對齊、Layout 邊距自動求解），並在發生例外時自動執行快照回復。

### 4. 嵌入式 Cocos Creator 3.8 反射知識庫 (階段 4)
- `knowledge_query`：內建 2D/3D 元件（`cc.Sprite`、`cc.Label`、`cc.Widget`、`cc.Layout`、`sp.Skeleton` 等）的架構規範與 `@property` 屬性字典、設計解析度適配指引以及世界座標/區域座標轉換公式。
- 提供自動化 `AGENTS.md` 校驗與文件產生器（`get_mcp_guide`、`sync_agents_doc`）。

### 5. 時間軸動畫與關鍵影格曲線編輯器 (階段 5)
- `anim_manage`：直接建立與編輯 `.anim`（`cc.AnimationClip`）軌道，支援三次貝茲（Cubic Bezier）、線性（Linear）與常數（Constant）曲線插值。
- 支援動畫影格事件觸發器（Animation Events）、快捷動態預設（`bounce_pop`、`fade_in`、`fade_out`、`shake`），以及自動化多分段 FBX 動畫片段（Take）切分。

### 6. 場景與資產診斷及快照比對 (階段 6)
- `validation_manage`：同層節點同名衝突偵測、缺失 `UITransform` 診斷，以及深度遞迴掃描場景元件中的 `__uuid__` 資產引用有效性。
- 提供 SHA-256 場景狀態快照擷取（`capture_snapshot`）與視覺化 Markdown 回歸比對表格（`diff_snapshot`）。

---

## 🛠️ 16 個統一意圖 API 速查表

| 意圖工具 | 核心參數 | 作用與最佳實踐 |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | 場景生命週期管理、完整節點樹檢查與場景腳本執行。 |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | 通用節點搜尋、建立、刪除、變換與層級關係調整。 |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | 新增/移除元件、深度屬性更新（具自動儲存）、點擊事件繫結與 @ccclass 類別反射。 |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | 預製體全生命週期管理、非破壞性編輯會話棧與原子化批次編輯。 |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | 宣告式一鍵 UI 產生，自動計算 UITransform、Widget 約束與 Layout 佈局。 |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | 時間軸 AnimationClip 編輯、屬性曲線插值、緩動模式、動畫事件、預設套用、FBX 動畫切分與 AnimGraph 狀態機。 |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | 資產探索、相依性分析以及智慧子資產解析（`@spriteFrame`、`@texture`）。 |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | 離線架構知識庫查詢，涵蓋內建元件、座標轉換、佈局規則以及最新 MCP 說明。 |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | 自動化審計缺失 UITransform、損壞資產引用、越界節點，並支援視覺化快照回歸比對。 |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | 程序內原子批次處理執行引擎，單次 IPC 事務順次執行多項操作。 |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | 構建設定檢視、預覽伺服器啟動控制與 TypeScript 編譯狀態監聽。 |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | 視埠攝影機聚焦、視角切換與編輯器網格/Gizmo 控制。 |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | 一鍵裝配 Spine 骨骼或 FastSpine 角色元件並設定動畫。 |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | 編輯器主控台日誌監控與效能指標統計。 |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | 編輯器偏好設定讀取與配置。 |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | 編輯器內部訊息事件監聽與廣播。 |

---

## 📖 標準 MCP 工作流程

### A. 檢查場景或預製體節點樹
* 使用 `scene_manage(action="inspect")` 審查格式化 JSON 或 Markdown 樹狀結構的場景層級、元件與屬性。
* 使用 `scene_manage(action="hierarchy", includeComponents=true)` 列出目前活躍場景或已開啟預製體中的即時節點。

### B. 修改目前活躍場景中的元件
* 使用 `component_manage(action="update")` 進行深度屬性更新（如 `config.sid`、`config.data`）、巢狀 `@ccclass` 物件實例化以及資產陣列賦值（`onUpdates`、`onChanged`）。
* 使用 `scene_manage(action="save")` 儲存場景修改。

### C. 修改預製體中的元件/節點
* **若預製體目前處於開啟/審查狀態：**
  1. `node_manage(action="query")` 定位目標節點。
  2. `component_manage(action="add")`（掛載新腳本）或 `component_manage(action="update")`（更新屬性值）。
  3. `prefab_manage(action="save")` 儲存預製體。
* **若預製體處於背景（未開啟）：**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` 定位目標節點。
  3. `component_manage(action="update")` 套用屬性變更。
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* 或者直接使用原子化編輯：`prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. 類別反射與型別資訊查詢
* 在賦值之前，使用 `component_manage(action="query_class_info")` 查詢元件的 `@ccclass` 反射屬性定義、預設值與 `@property` 中繼資料。

### E. 宣告式 UI 建構
* 使用 `ui_builder(action="build_tree", parent="Canvas", tree={...})` 單次呼叫即可建構完整的 UI 節點樹（面板、按鈕、文字、精靈、捲動視圖等），並自動計算掛載 UITransform 與 Widget 約束。

### F. 時間軸關鍵影格動畫與 FBX 切分
* 使用曲線插值直接創作 `.anim` 動畫剪輯：`anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`。
* 套用動態預設：`anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`。
* 切分多段 FBX 動畫模型：`anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`。

### G. 場景與資產診斷及快照比對
* 在修改前擷取基準場景快照：`validation_manage(action="capture_snapshot", tag="PreEdit")`。
* 修改完成後比對場景快照：`validation_manage(action="diff_snapshot")`。
* 審計場景層級佈局缺陷：`validation_manage(action="check_scene")`。
* 掃描專案與場景中的失效 GUID 資產引用：`validation_manage(action="check_assets")`。

---

## ⚡ 快速開始

`pts-cc-mcp` 預設運作在連接埠 `3121`，提供雙傳輸協議支援：**Streamable HTTP**（`/mcp`）與 **Server-Sent Events (SSE)**（`/sse`）。

### 1. Claude CLI 設定

```bash
# Streamable HTTP（預設推薦）
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# 或透過 Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop 用戶端設定

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

*或使用 SSE 協議設定：*

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

### 3. Cursor 與 Windsurf 設定

在 Cursor 或 Windsurf 的 MCP 設定（`.cursor/mcp.json`）中加入：

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

## ⚠️ 前置需求與必需同級依賴

> **重要提示：`pts-cc-mcp` 要求專案中必須安裝 `pts-core` 擴充套件。**
>
> **為什麼必須安裝 `pts-core`？**  
> Cocos Creator 3.8+ 採用多程序架構，其中**編輯器主程序**（`pts-cc-mcp` 運作環境）與**場景執行程序**（運作遊戲場景、元件實例與即時 `@ccclass` 引擎環境）完全隔離。  
>
> `pts-cc-mcp` 透過向引擎發送 IPC 請求執行場景指令：`Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`。該場景腳本執行器（`src/_cc.js`）直接代管在 `pts-core` 外掛中。  
>
> 若缺少 `pts-core`，所有依賴即時場景執行期的工具（如 `component_*`、`node_manage`、`scene_manage`、`ui_builder` 和 `validation_manage`）將無法與場景節點進行互動。

---

## 安裝與設定

### 1. 放置外掛檔案
確保將 `pts-core` 與 `pts-cc-mcp` 兩個擴充套件均放置在 Cocos Creator 專案的 `extensions/` 目錄下：

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 必需：核心引擎與場景腳本執行時期 (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP 伺服器端與工具提供方
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. 安裝依賴並構建外掛
```bash
# 1. 設定 pts-core（若從原始碼構建）
cd extensions/pts-core
npm install
npm run build

# 2. 設定 pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. 在 Cocos Creator 中啟用外掛
1. 重啟 Cocos Creator 或重新整理擴充套件管理器（**擴充套件 > 擴充套件管理器**）。
2. 確認 **pts-core** 與 **pts-cc-mcp** 兩個擴充套件均處於啟用狀態。
3. 點擊選單列 `擴充套件 > pTS MCP Server` 開啟控制面板。
4. 伺服器端預設運作在連接埠 `3121`（可在面板中自訂配置）。

---

## 專案結構

```
pts-cc-mcp/
├── source/                    # TypeScript 原始碼
│   ├── main.ts               # 外掛入口與引導自檢
│   ├── mcp-server.ts         # Streamable HTTP 與 SSE 傳輸層
│   ├── settings.ts           # 設定與配置管理
│   ├── types/                # TypeScript 型別定義
│   ├── utils/                # 輔助工具庫
│   │   ├── agents-doc-generator.ts # AGENTS.md 範本與文件同步產生器
│   │   ├── asset-resolver.ts       # 智慧子資產 UUID 解析器
│   │   ├── json-utils.ts           # 防禦性 JSON 解析與容錯修復
│   │   └── i18n.ts                 # 多語言國際化翻譯引擎
│   ├── tools/                # 子系統與統一意圖工具實現
│   │   ├── intent-dispatcher.ts    # 16 意圖 API 調度器與操作碼路由
│   │   ├── ui-builder-tools.ts     # 宣告式一鍵 UI 建構器
│   │   ├── knowledge-tools.ts      # 離線反射知識庫
│   │   ├── animation-tools.ts      # AnimationClip 動畫與 FBX 切分編輯器
│   │   ├── validation-tools.ts     # 場景診斷與快照回歸比對
│   │   ├── batch-tools.ts          # 原子批次處理執行引擎
│   │   ├── scene-tools.ts          # 場景生命週期管理
│   │   ├── node-tools.ts           # 節點變換與層級操作
│   │   ├── component-tools.ts      # 元件反射與屬性更新器
│   │   ├── prefab-tools.ts         # 預製體編輯會話棧與原子編輯
│   │   ├── asset-advanced-tools.ts # 資產資料庫檢索與智慧解析
│   │   ├── project-tools.ts        # 構建與預覽執行
│   │   ├── debug-tools.ts          # 主控台日誌與 TS 編譯器監控
│   │   └── preferences-tools.ts    # 使用者偏好設定管理
│   └── panels/               # 基於 Vue 3 的控制面板與內建工具測試器
├── dist/                     # 編譯輸出目錄
├── static/                   # 靜態資源（圖示、樣式、範本）
├── i18n/                     # 國際化語言字典
├── package.json              # 擴充套件描述資訊與貢獻點
└── tsconfig.json             # TypeScript 構建配置檔案
```

---

## 授權條款

本外掛基於 MIT 授權條款開源，專為 Cocos Creator 遊戲開發打造。
