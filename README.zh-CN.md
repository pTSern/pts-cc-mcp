# Cocos Creator MCP 服务端插件 (pts-cc-mcp)

🌐 [English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

一款适用于 Cocos Creator 3.8+ 的综合性开源 MCP（Model Context Protocol，模型上下文协议）服务端插件，赋能各类 AI 编程助手（Claude CLI、Claude Desktop、Cursor、Windsurf、Antigravity）通过标准化协议对 Cocos Creator 游戏项目进行审查、创作、校验与全方位控制。

**🚀 具备 Streamable HTTP 与 SSE 双传输引擎、16 个统一意图工具（覆盖 231 个操作码）、声明式一键 UI 构建、离线反射知识库、时间轴关键帧动画制作以及场景/资源回归快照比对！**

---

## 🙏 致谢与来源声明

本项目最初基于 **LiDaxian** 创建的开源项目 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) 进行分叉开发。我们向 **LiDaxian** 先生以及所有社区贡献者致以最崇高的敬意与由衷感谢，正是他们搭建了基础架构，开辟了 AI 驱动 Cocos Creator 开发的全新道路。

`pts-cc-mcp` 在此基石之上，作为一个由社区驱动的 100% 完全开源扩展持续演进，用更优秀的开源实现替代了所有的闭源与商业化特性。

---

## 🚀 版本 1.6.0 更新日志：统一专业级架构 (Unified Pro Architecture)

### 1. 双协议原生支持：Streamable HTTP 与 Server-Sent Events (SSE) 传输 (阶段 1)
- 全面原生支持 `@modelcontextprotocol/sdk` 的 Streamable HTTP（`/mcp`）与 Server-Sent Events（`/sse` 与 `/messages`），默认运行于端口 `3121`。
- 提供基于客户端的独立会话生命周期管理、心跳保活机制，以及面向现代 AI 客户端的完整 CORS 请求头支持。

### 2. 意图级统一操作码架构 (阶段 2)
- 将以往 50 多个分散零碎的工具 Schema 统一收敛为 **16 个统一意图工具**，涵盖 231 种细分操作（基于 `action` 操作码分发）。
- 在 LLM 上下文窗口中将 Schema Token 消耗降低 70% 以上，同时完美保持对旧版工具调用的向后兼容。

### 3. 声明式一键 UI 与场景构建器 (阶段 3)
- `ui_builder`：支持通过声明式数据一键构建复杂的 UI 节点树（`build_tree`、`create_dialog`、`create_button`、`create_list`），自动挂载 `UITransform`、计算约束布局（Widget 锚点对齐、Layout 边距自动求解），并在发生异常时自动执行快照回滚。

### 4. 嵌入式 Cocos Creator 3.8 反射知识库 (阶段 4)
- `knowledge_query`：内置内置 2D/3D 组件（`cc.Sprite`、`cc.Label`、`cc.Widget`、`cc.Layout`、`sp.Skeleton` 等）的架构规范与 `@property` 属性字典、设计分辨率适配指南以及世界坐标/局部坐标转换公式。
- 提供自动化 `AGENTS.md` 校验与文档生成器（`get_mcp_guide`、`sync_agents_doc`）。

### 5. 时间轴动画与关键帧曲线编辑器 (阶段 5)
- `anim_manage`：直接创建与编辑 `.anim`（`cc.AnimationClip`）轨道，支持三次贝塞尔（Cubic Bezier）、线性（Linear）与常数（Constant）曲线插值。
- 支持动画帧事件触发器（Animation Events）、快捷动态预设（`bounce_pop`、`fade_in`、`fade_out`、`shake`），以及自动化多分段 FBX 动画片段（Take）切分。

### 6. 场景与资源诊断及快照比对 (阶段 6)
- `validation_manage`：同级节点同名冲突检测、缺失 `UITransform` 诊断，以及深度递归扫描场景组件中的 `__uuid__` 资源引用有效性。
- 提供 SHA-256 场景状态快照捕获（`capture_snapshot`）与可视化 Markdown 回归比对表格（`diff_snapshot`）。

---

## 🛠️ 16 个统一意图 API 速查表

| 意图工具 | 核心参数 | 作用与最佳实践 |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | 场景生命周期管理、完整节点树检查与场景脚本执行。 |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | 通用节点搜索、创建、删除、变换与层级关系调整。 |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | 添加/移除组件、深度属性更新（带自动保存）、点击事件绑定与 @ccclass 类反射。 |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | 预制体全生命周期管理、非破坏性编辑会话栈与原子化批量编辑。 |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | 声明式一键 UI 生成，自动计算 UITransform、Widget 约束与 Layout 布局。 |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | 时间轴 AnimationClip 编辑、属性曲线插值、缓动模式、动画事件、预设应用、FBX 动画切分与 AnimGraph 状态机。 |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | 资源发现、依赖项分析以及智能子资源解析（`@spriteFrame`、`@texture`）。 |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | 离线架构知识库查询，涵盖内置组件、坐标转换、布局规则以及最新 MCP 说明。 |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | 自动化审计缺失 UITransform、损坏资源引用、越界节点，并支持可视化快照回归比对。 |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | 进程内原子批处理执行引擎，单次 IPC 事务顺次执行多项操作。 |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | 构建配置查看、预览服务器启动控制与 TypeScript 编译状态监听。 |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | 视口摄像机对焦、视角切换与编辑器网格/Gizmo 控制。 |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | 一键装配 Spine 骨骼或 FastSpine 角色组件并配置动画。 |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | 编辑器控制台日志监控与性能指标统计。 |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | 编辑器偏好设置读取与配置。 |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | 编辑器内部消息事件监听与广播。 |

---

## 📖 标准 MCP 工作流

### A. 检查场景或预制体节点树
* 使用 `scene_manage(action="inspect")` 审查格式化 JSON 或 Markdown 树状结构的场景层级、组件与属性。
* 使用 `scene_manage(action="hierarchy", includeComponents=true)` 列出当前活跃场景或已打开预制体中的实时节点。

### B. 修改当前活跃场景中的组件
* 使用 `component_manage(action="update")` 进行深度属性更新（如 `config.sid`、`config.data`）、嵌套 `@ccclass` 对象实例化以及资源数组赋值（`onUpdates`、`onChanged`）。
* 使用 `scene_manage(action="save")` 保存场景修改。

### C. 修改预制体中的组件/节点
* **若预制体当前处于打开/审查状态：**
  1. `node_manage(action="query")` 定位目标节点。
  2. `component_manage(action="add")`（挂载新脚本）或 `component_manage(action="update")`（更新属性值）。
  3. `prefab_manage(action="save")` 保存预制体。
* **若预制体处于后台（未打开）：**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` 定位目标节点。
  3. `component_manage(action="update")` 应用属性变更。
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* 或者直接使用原子化编辑：`prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. 类反射与类型信息查询
* 在赋值之前，使用 `component_manage(action="query_class_info")` 查询组件的 `@ccclass` 反射属性定义、默认值与 `@property` 元数据。

### E. 声明式 UI 构建
* 使用 `ui_builder(action="build_tree", parent="Canvas", tree={...})` 单次调用即可构建完整的 UI 节点树（面板、按钮、文本、精灵、滚动视图等），并自动计算挂载 UITransform 与 Widget 约束。

### F. 时间轴关键帧动画与 FBX 切分
* 使用曲线插值直接创作 `.anim` 动画剪辑：`anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`。
* 应用动态预设：`anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`。
* 切分多段 FBX 动画模型：`anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`。

### G. 场景与资源诊断及快照比对
* 在修改前捕获基线场景快照：`validation_manage(action="capture_snapshot", tag="PreEdit")`。
* 修改完成后比对场景快照：`validation_manage(action="diff_snapshot")`。
* 审计场景层级布局缺陷：`validation_manage(action="check_scene")`。
* 扫描项目与场景中的失效 GUID 资源引用：`validation_manage(action="check_assets")`。

---

## ⚡ 快速开始

`pts-cc-mcp` 默认运行在端口 `3121`，提供双传输协议支持：**Streamable HTTP**（`/mcp`）与 **Server-Sent Events (SSE)**（`/sse`）。

### 1. Claude CLI 配置

```bash
# Streamable HTTP（默认推荐）
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# 或通过 Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop 客户端配置

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

*或使用 SSE 协议配置：*

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

### 3. Cursor 与 Windsurf 配置

在 Cursor 或 Windsurf 的 MCP 设置（`.cursor/mcp.json`）中添加：

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

## ⚠️ 前置要求与必需对等依赖

> **重要提示：`pts-cc-mcp` 要求项目中必须安装 `pts-core` 扩展。**
>
> **为什么必须安装 `pts-core`？**  
> Cocos Creator 3.8+ 采用多进程架构，其中**编辑器主进程**（`pts-cc-mcp` 运行环境）与**场景执行进程**（运行游戏场景、组件实例与实时 `@ccclass` 引擎环境）完全隔离。  
>
> `pts-cc-mcp` 通过向引擎发起 IPC 请求执行场景指令：`Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`。该场景脚本执行器（`src/_cc.js`）直接托管在 `pts-core` 插件中。  
>
> 如果缺少 `pts-core`，所有依赖实时场景运行时的工具（如 `component_*`、`node_manage`、`scene_manage`、`ui_builder` 和 `validation_manage`）将无法与场景节点进行交互。

---

## 安装与设置

### 1. 放置插件文件
确保将 `pts-core` 与 `pts-cc-mcp` 两个扩展均放置在 Cocos Creator 项目的 `extensions/` 目录下：

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 必需：核心引擎与场景脚本运行时 (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP 服务端与工具提供方
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. 安装依赖并构建插件
```bash
# 1. 配置 pts-core（若从源码构建）
cd extensions/pts-core
npm install
npm run build

# 2. 配置 pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. 在 Cocos Creator 中启用扩展
1. 重启 Cocos Creator 或刷新扩展管理器（**扩展 > 扩展管理器**）。
2. 确认 **pts-core** 与 **pts-cc-mcp** 两个扩展均处于启用状态。
3. 点击菜单栏 `扩展 > pTS MCP Server` 打开控制面板。
4. 服务端默认运行在端口 `3121`（可在面板中自定义配置）。

---

## 项目结构

```
pts-cc-mcp/
├── source/                    # TypeScript 源代码
│   ├── main.ts               # 插件入口与引导自检
│   ├── mcp-server.ts         # Streamable HTTP 与 SSE 传输层
│   ├── settings.ts           # 设置与配置管理
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 辅助工具库
│   │   ├── agents-doc-generator.ts # AGENTS.md 模板与文档同步生成器
│   │   ├── asset-resolver.ts       # 智能子资源 UUID 解析器
│   │   ├── json-utils.ts           # 防御性 JSON 解析与容错修复
│   │   └── i18n.ts                 # 多语言国际化翻译引擎
│   ├── tools/                # 子系统与统一意图工具实现
│   │   ├── intent-dispatcher.ts    # 16 意图 API 调度器与操作码路由
│   │   ├── ui-builder-tools.ts     # 声明式一键 UI 构建器
│   │   ├── knowledge-tools.ts      # 离线反射知识库
│   │   ├── animation-tools.ts      # AnimationClip 动画与 FBX 切分编辑器
│   │   ├── validation-tools.ts     # 场景诊断与快照回归比对
│   │   ├── batch-tools.ts          # 原子批处理执行引擎
│   │   ├── scene-tools.ts          # 场景生命周期管理
│   │   ├── node-tools.ts           # 节点变换与层级操作
│   │   ├── component-tools.ts      # 组件反射与属性更新器
│   │   ├── prefab-tools.ts         # 预制体编辑会话栈与原子编辑
│   │   ├── asset-advanced-tools.ts # 资源数据库检索与智能解析
│   │   ├── project-tools.ts        # 构建与预览执行
│   │   ├── debug-tools.ts          # 控制台日志与 TS 编译器监控
│   │   └── preferences-tools.ts    # 用户偏好设置管理
│   └── panels/               # 基于 Vue 3 的控制面板与内置工具测试器
├── dist/                     # 编译输出目录
├── static/                   # 静态资源（图标、样式、模板）
├── i18n/                     # 国际化语言字典
├── package.json              # 扩展描述清单与贡献点
└── tsconfig.json             # TypeScript 构建配置文件
```

---

## 许可证

本插件基于 MIT 许可证开源，专为 Cocos Creator 游戏开发打造。
