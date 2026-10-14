# Cocos Creator MCP 服务器插件

🌐 [English](README.md) · **简体中文** · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

一个适用于 Cocos Creator 3.8+ 的综合性 MCP（模型上下文协议）服务器插件，使 AI 助手能够通过标准化协议与 Cocos Creator 编辑器进行交互。一键安装和使用，省去所有繁琐环境和配置。已经测试过 Claude 客户端、Claude CLI、Cursor 与 Windsurf，其他编辑器亦完美兼容。

**🚀 现已提供强力融合工具体系与原子化批处理能力，实现 99% 的编辑器控制！**

## 🙏 致谢与来源声明

本项目基于 **LiDaxian** 开源的 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) 进行二次开发与架构增强。我们衷心感谢 **LiDaxian** 及社区贡献者为 Cocos Creator 接入 AI 模型上下文协议（MCP）奠定的坚实基础。

`pts-cc-mcp` 将作为完全开源的社区项目持续迭代演进，现已全面支持：
- **100% 英文核心代码库**，附带完整的多语言 i18n 本地化支持
- **进程内原子批处理引擎**（`batch_execute` / `editor_batch_execute`）
- **原生动画图状态机读写**（`animgraph_manage`）
- **安全预制体编辑会话栈**，自动恢复场景避免崩溃
- **智能递归资源与子资源解析器**（`@spriteFrame`、`@texture`、原生路径与 UUID）
- **Spine 与 FastSpine** 角色骨骼一键装配工具
- **TypeScript 编译器监听**（`compile_status`），消除脚本修改后的并发冲突

## 开源版本更新日志

## 🚀 重大更新 v1.5.4

- **进程内原子批处理 (`batch_execute` / `editor_batch_execute`)**：支持将多个工具调用合并为单一事务在进程内顺次执行，大幅降低 HTTP 往返与 Token 开销，支持出错立即中断与自动保存。
- **动画图状态机支持 (`animgraph_manage`)**：原生读写 `.animgraph` 文件，支持审查状态/过渡/参数、增删改 `StateMachineComponent`、批量迁移组件类型，保存时自动刷新资源库。
- **预制体编辑会话栈与安全恢复**：`enter` 时自动记忆进入前的场景 UUID/URL，`exit` 时自动恢复场景；若未记录则自动搜索项目有效场景，彻底消除“目标场景不存在”报错；新增 `atomic_edit` 动作。
- **智能资源与子资源解析 (`asset_query(action="resolve")`)**：自动解析路径、UUID 及 `@spriteFrame`（对应 `@f9941`）与 `@texture`（对应 `@6c48a`），并在组件属性设置与更新中自动递归解析。
- **Spine / FastSpine 角色装配 (`spine_setup`)**：一键挂载 FastSpine 或 sp.Skeleton、绑定骨骼资产、设置默认动作与循环、自动同步 UITransform。
- **编译状态监控与防御性默认值 (`compile_status`)**：支持脚本修改后查询或等待 TypeScript 编译器就绪，消除并发调用冲突；所有调试与服务器工具支持缺省安全默认值，并提供明确的错误指示。
- **代码全面英文规范化**：源代码、注释与错误提示 100% 英文规范化，搭配完整的多语言 i18n 系统。

---

## 工具体系与操作码

- 所有工具均以“类别_操作”命名，参数采用统一 Schema，支持多操作码（action）切换，极大提升灵活性和可扩展性。
- 涵盖场景、节点、组件、预制体、资源、动画图、批处理、项目、调试、偏好设置、服务器、消息广播等全部编辑器操作。
- 工具调用示例：

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

## 主要功能类别

- **batch_execute / editor_batch_execute**：原子化批处理执行引擎，单次请求运行多项工具操作
- **animgraph_manage**：动画图状态机读写、状态机组件绑定与批量迁移
- **scene_management / scene_hierarchy**：场景管理（获取/打开/保存/新建/关闭场景）与层级树
- **node_query / node_lifecycle / node_transform**：节点查询、创建、删除、变换与属性变更
- **component_manage / set_component_property / spine_setup**：组件管理、属性严格校验设置、FastSpine 装配
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**：预制体浏览、创建、实例化、安全进出与原子编辑
- **asset_manage / asset_analyze / asset_query**：资源导入、删除、依赖分析、智能子资源解析
- **debug_console / debug_logs / compile_status**：控制台管理、日志分析与 TS 编译监控
- **project_manage / project_build_system**：项目运行、构建、配置信息
- **preferences_manage**：偏好设置管理
- **server_information / server_connectivity**：服务器信息与连通性检测
- **broadcast_log_management / broadcast_listener_management**：编辑器内部消息监控与广播

---

## 快速使用

**Claude CLI 配置：**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude 客户端配置：**

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

**Cursor 或 VS Code MCP 配置：**

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

## ⚠️ 安装前必读（重要）

> **首次安装或升级前，请务必删除当前项目 `settings/` 目录下的 `mcp-server.json` 和 `tool-manager.json` 两个文件，否则插件的工具列表显示会出现异常！**
>
> 文件路径：`你的项目/settings/mcp-server.json` 与 `你的项目/settings/tool-manager.json`
> 删除这两个文件后，重新打开插件面板即可恢复正常。

## 安装说明

### 1. 复制插件文件

将整个 `pts-cc-mcp` 文件夹复制到您的 Cocos Creator 项目的 `extensions` 目录中：

```
您的项目/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- 将插件放在这里
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. 安装依赖

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. 构建插件

```bash
npm run build
```

### 4. 启用插件

1. 重启 Cocos Creator 或刷新扩展管理器
2. 插件将出现在扩展菜单中
3. 点击 `扩展 > pTS MCP Server` 打开控制面板

---

## 开发

### 项目结构
```
pts-cc-mcp/
├── source/                    # TypeScript 源文件
│   ├── main.ts               # 插件主进程入口
│   ├── mcp-server.ts         # MCP 协议服务端实现
│   ├── settings.ts           # 设置管理
│   ├── types/                # 类型定义
│   ├── utils/                # 工具库（智能资源解析、Schema兼容、JSON修正）
│   ├── tools/                # 工具模块实现
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
│   ├── panels/               # UI 面板实现
│   └── test/                 # 测试用例
├── dist/                     # 编译输出目录
├── static/                   # 静态资源
├── i18n/                     # 国际化语言包
├── package.json              # 插件配置
└── tsconfig.json             # TypeScript 配置
```

### 从源码构建

```bash
# 开发监视模式
npm run watch

# 生产构建
npm run build
```

---

## 系统要求

- Cocos Creator 3.8.6 或更高版本
- Node.js（Cocos Creator 自带）
- TypeScript（开发依赖）

## 许可证

本插件供 Cocos Creator 项目使用，源代码一并打包，可用于学习和交流。
