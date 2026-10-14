# Cocos Creator MCP 伺服器外掛

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · **繁體中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

一款適用於 Cocos Creator 3.8+ 的綜合性 MCP（模型上下文協議）伺服器外掛，讓 AI 助手能夠透過標準化協議與 Cocos Creator 編輯器進行互動。一鍵安裝即可使用，省去所有繁瑣的環境與設定。已測試過 Claude 客戶端、Claude CLI、Cursor 與 Windsurf，其他編輯器亦能完美支援。

**🚀 現已提供強大融合工具體系與原子化批次處理能力，實現 99% 的編輯器控制！**

## 🙏 致謝與來源聲明

本專案基於 **LiDaxian** 開源的 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) 進行二次開發與架構增強。我們衷心感謝 **LiDaxian** 及社群貢獻者為 Cocos Creator 接入 AI 模型上下文協議（MCP）奠定的堅實基礎。

`pts-cc-mcp` 將作為完全開源的社群專案持續迭代演進，現已全面支援：
- **100% 英文核心程式碼庫**，附帶完整的多語言 i18n 本地化支援
- **程序內原子批次處理引擎**（`batch_execute` / `editor_batch_execute`）
- **原生動畫圖狀態機讀寫**（`animgraph_manage`）
- **安全預製體編輯會話棧**，自動復原場景避免崩潰
- **智慧遞迴資源與子資源解析器**（`@spriteFrame`、`@texture`、原生路徑與 UUID）
- **Spine 與 FastSpine** 角色骨骼一鍵裝配工具
- **TypeScript 編譯器監聽**（`compile_status`），消除腳本修改後的並行衝突

## 開源版本更新日誌

## 🚀 重大更新 v1.5.4

- **程序內原子批次處理 (`batch_execute` / `editor_batch_execute`)**：支援將多個工具呼叫合併為單一事務在程序內順次執行，大幅降低 HTTP 往返與 Token 開銷，支援出錯即停與自動儲存。
- **動畫圖狀態機支援 (`animgraph_manage`)**：原生讀寫 `.animgraph` 檔案，支援審查狀態/過渡/參數、增刪改 `StateMachineComponent`、批次遷移元件類型，儲存時自動重新整理資源庫。
- **預製體編輯會話棧與安全復原**：`enter` 時自動記憶進入前的場景 UUID/URL，`exit` 時自動復原場景；若未記錄則自動搜尋專案有效場景，徹底消除「目標場景不存在」報錯；新增 `atomic_edit` 動作。
- **智慧資源與子資源解析 (`asset_query(action="resolve")`)**：自動解析路徑、UUID 及 `@spriteFrame`（對應 `@f9941`）與 `@texture`（對應 `@6c48a`），並在元件屬性設定與更新中自動遞迴解析。
- **Spine / FastSpine 角色裝配 (`spine_setup`)**：一鍵掛載 FastSpine 或 sp.Skeleton、繫結骨骼資產、設定預設動作與循環、自動同步 UITransform。
- **編譯狀態監控與防禦性預設值 (`compile_status`)**：支援腳本修改後查詢或等待 TypeScript 編譯器就緒，消除並行呼叫衝突；所有除錯與伺服器工具支援缺省安全預設值，並提供明確的錯誤指示。
- **程式碼全面英文規範化**：原始碼、註釋與錯誤提示 100% 英文規範化，搭配完整的多語言 i18n 系統。

---

## 工具體系與操作碼

- 所有工具均以「類別_操作」命名，參數採用統一 Schema，支援多操作碼（action）切換，大幅提升靈活性和可擴充性。
- 涵蓋場景、節點、元件、預製體、資源、動畫圖、批次處理、專案、除錯、偏好設定、伺服器、訊息廣播等全部編輯器操作。
- 工具呼叫範例：

```json
{
  "tool": "batch_execute",
  "arguments": {
    "operations": [
      { "tool": "node_node_transform", "args": { "nodeUuid": "uuid-1", "position": { "x": 100, "y": 0 } } },
      { "tool": "component_set_component_property", "args": { "nodeUuid": "uuid-1", "componentType": "cc.Sprite", "property": "spriteFrame", "propertyType": "spriteFrame", "value": "db://assets/textures/hero.png@spriteFrame" } }
    ],
    "autoSave": true
  }
}
```

---

## 主要功能類別

- **batch_execute / editor_batch_execute**：原子化批次處理執行引擎，單次請求執行多項工具操作
- **animgraph_manage**：動畫圖狀態機讀寫、狀態機元件繫結與批次遷移
- **scene_management / scene_hierarchy**：場景管理（取得/開啟/儲存/新建/關閉場景）與層級樹
- **node_query / node_lifecycle / node_transform**：節點查詢、建立、刪除、變換與屬性變更
- **component_manage / set_component_property / spine_setup**：元件管理、屬性嚴格校驗設定、FastSpine 裝配
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**：預製體瀏覽、建立、實體化、安全進出與原子編輯
- **asset_manage / asset_analyze / asset_query**：資源匯入、刪除、相依性分析、智慧子資源解析
- **debug_console / debug_logs / compile_status**：主控台管理、日誌分析與 TS 編譯監控
- **project_manage / project_build_system**：專案執行、建置、設定資訊
- **preferences_manage**：偏好設定管理
- **server_information / server_connectivity**：伺服器資訊與連通性檢測
- **broadcast_log_management / broadcast_listener_management**：編輯器內部訊息監控與廣播

---

## 快速使用

**Claude CLI 設定：**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude 用戶端設定：**

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

**Cursor 或 VS Code MCP 設定：**

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

---

## ⚠️ 安裝前必讀（重要）

> **首次安裝或升級前，請務必刪除目前專案 `settings/` 目錄下的 `mcp-server.json` 和 `tool-manager.json` 兩個檔案，否則外掛的工具清單顯示會出現異常！**
>
> 檔案路徑：`你的專案/settings/mcp-server.json` 與 `你的專案/settings/tool-manager.json`
> 刪除這兩個檔案後，重新開啟外掛面板即可恢復正常。

## 安裝說明

### 1. 複製外掛檔案

將整個 `pts-cc-mcp` 資料夾複製到您的 Cocos Creator 專案的 `extensions` 目錄中：

```
您的專案/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- 將外掛放在這裡
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. 安裝相依套件

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. 建置外掛

```bash
npm run build
```

### 4. 啟用外掛

1. 重新啟動 Cocos Creator 或重新整理擴充功能管理器
2. 外掛將出現在擴充功能功能表中
3. 點擊 `擴充功能 > pTS MCP Server` 開啟控制面板

---

## 開發

### 專案結構
```
pts-cc-mcp/
├── source/                    # TypeScript 原始檔
│   ├── main.ts               # 外掛主程序入口
│   ├── mcp-server.ts         # MCP 協定服務端實作
│   ├── settings.ts           # 設定管理
│   ├── types/                # 型別定義
│   ├── utils/                # 工具庫（智慧資源解析、Schema 相容、JSON 修正）
│   ├── tools/                # 工具模組實作
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
│   ├── panels/               # UI 面板實作
│   └── test/                 # 測試用例
├── dist/                     # 編譯輸出目錄
├── static/                   # 靜態資源
├── i18n/                     # 國際化語言包
├── package.json              # 外掛設定
└── tsconfig.json             # TypeScript 設定
```

### 從原始碼建置

```bash
# 開發監視模式
npm run watch

# 正式建置
npm run build
```

---

## 系統需求

- Cocos Creator 3.8.6 或更高版本
- Node.js（Cocos Creator 自帶）
- TypeScript（開發相依套件）

## 授權條款

本外掛供 Cocos Creator 專案使用，原始碼一併打包，可用於學習和交流。
