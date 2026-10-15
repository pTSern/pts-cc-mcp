# Plugin máy chủ MCP cho Cocos Creator (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · **Tiếng Việt**

Một plugin máy chủ Model Context Protocol (MCP) toàn diện, mã nguồn mở dành cho Cocos Creator 3.8+, trao quyền cho các trợ lý lập trình AI (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) kiểm tra, tạo lập, xác thực và điều khiển các tựa game Cocos Creator thông qua một giao thức tiêu chuẩn hóa.

**🚀 Nổi bật với engine truyền tải kép Streamable HTTP & SSE, 16 công cụ ý định (intent) hợp nhất (231 mã opcode), khởi tạo giao diện người dùng khai báo một bước (declarative 1-shot UI builder), cơ sở tri thức phản chiếu ngoại tuyến, biên tập hoạt ảnh khung hình chính (keyframe) theo dòng thời gian, cùng chẩn đoán và so sánh khác biệt snapshot thoái lui cảnh/tài nguyên!**

---

## 🙏 Lời cảm ơn & Ghi nhận đóng góp

Dự án này bắt nguồn từ bản fork mã nguồn mở của [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) do tác giả **LiDaxian** sáng lập. Chúng tôi xin gửi lời cảm ơn và tri ân chân thành nhất tới **LiDaxian** cùng toàn thể cộng đồng đóng góp vì đã đặt nền móng kiến trúc và mở ra con đường phát triển Cocos Creator định hướng bởi AI.

`pts-cc-mcp` tiếp tục xây dựng và phát triển trên nền tảng này như một phần mở rộng hoàn toàn nguồn mở 100%, hướng đến cộng đồng, thay thế toàn bộ các tính năng nguồn đóng/thương mại bằng các giải pháp mã nguồn mở vượt trội.

---

## 🚀 Nhật ký Cập nhật Phiên bản 1.6.0: Kiến trúc Chuyên nghiệp Hợp nhất (The Unified Pro Architecture)

### 1. Truyền tải kép: Native Streamable HTTP & Server-Sent Events (SSE) (Giai đoạn 1)
- Hỗ trợ trực tiếp và đầy đủ `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) cùng Server-Sent Events (`/sse` & `/messages`) trên cổng mặc định `3121`.
- Quản lý vòng đời phiên cô lập theo từng client, cơ chế nhịp tim giữ kết nối (keep-alive heartbeat), và đầy đủ tiêu đề CORS cho các client AI hiện đại.

### 2. Kiến trúc Opcode Hợp nhất theo Cấp độ Ý định (Giai đoạn 2)
- Gom hơn 50 schema phân mảnh trước đây thành **16 công cụ ý định hợp nhất** bao quát 231 thao tác nghiệp vụ (thông qua điều phối opcode `action`).
- Giảm hơn 70% lượng token tiêu thụ của schema trong cửa sổ ngữ cảnh LLM trong khi vẫn duy trì khả năng tương thích ngược hoàn hảo với các lệnh gọi công cụ cũ.

### 3. Trình dựng Cảnh & UI Khai báo Một bước (Giai đoạn 3)
- `ui_builder`: Khởi tạo cấu trúc đồ thị UI phức tạp (`build_tree`, `create_dialog`, `create_button`, `create_list`) với khả năng tự động tạo `UITransform`, giải quyết ràng buộc layout (điểm neo Widget anchor, lề Layout margin), và tự động sao lưu snapshot hoàn tác khi gặp lỗi.

### 4. Cơ sở Tri thức Phản chiếu (Reflection) Tích hợp cho Cocos Creator 3.8 (Giai đoạn 4)
- `knowledge_query`: Tra cứu trong bộ nhớ các quy tắc kiến trúc và từ điển `@property` cho các thành phần 2D/3D tích hợp sẵn (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), hướng dẫn độ phân giải thiết kế (design resolution), và các công thức chuyển đổi tọa độ.
- Tự động hóa kiểm tra và tạo tài liệu `AGENTS.md` (`get_mcp_guide`, `sync_agents_doc`).

### 5. Trình biên tập Đường cong Khung hình chính & Hoạt ảnh Dòng thời gian (Giai đoạn 5)
- `anim_manage`: Biên tập trực tiếp các track clip hoạt ảnh `.anim` (`cc.AnimationClip`) với các phép nội suy đường cong Cubic Bezier, Tuyến tính (Linear), và Hằng số (Constant).
- Kích hoạt sự kiện hoạt ảnh (Animation Events), các bộ chuyển động mẫu nhanh (`bounce_pop`, `fade_in`, `fade_out`, `shake`), và tự động cắt lát các phân đoạn hoạt ảnh đa đoạn (multi-take) từ mô hình FBX.

### 6. Chẩn đoán Cảnh & Tài nguyên cùng So sánh Khác biệt Snapshot (Giai đoạn 6)
- `validation_manage`: Phát hiện xung đột trùng tên giữa các nút đồng cấp, chẩn đoán thiếu `UITransform`, và quét đệ quy chuyên sâu để kiểm tra tính hợp lệ của tham chiếu tài nguyên `__uuid__` trong thành phần cảnh so với cơ sở dữ liệu `asset-db`.
- Chụp snapshot trạng thái cảnh mã hóa SHA-256 (`capture_snapshot`) và hiển thị bảng so sánh khác biệt hồi quy Markdown trực quan (`diff_snapshot`).

---

## 🛠️ Bảng tra cứu 16 Công cụ Ý định Hợp nhất (Cheatsheet)

| Công cụ Ý định | Tham số Trọng tâm | Mục đích & Thực tiễn Tốt nhất |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Quản lý vòng đời cảnh, kiểm tra toàn bộ cây phân cấp nút, và thực thi script cảnh. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Tìm kiếm nút toàn năng, tạo, xóa, biến đổi hình học (transform) và thao tác phả hệ cây nút. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Thêm/xóa thành phần, cập nhật thuộc tính chuyên sâu (kèm tự động lưu), gán sự kiện click và phản chiếu @ccclass. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Toàn bộ vòng đời Prefab, ngăn xếp phiên chỉnh sửa không phá hủy và chỉnh sửa hàng loạt nguyên tử. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Tạo giao diện người dùng khai báo trong 1 lệnh gọi với tự động tính UITransform, ràng buộc Widget và Layout. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Chỉnh sửa AnimationClip dòng thời gian, đường cong thuộc tính, chế độ gia tốc (easing), sự kiện hoạt ảnh, bộ mẫu, cắt lát FBX và máy trạng thái AnimGraph. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Khám phá tài nguyên, kiểm tra quan hệ phụ thuộc, và giải quyết tài nguyên con thông minh (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Tra cứu kiến trúc ngoại tuyến cho các thành phần, hệ tọa độ, quy tắc bố cục và tài liệu hướng dẫn MCP trực tiếp. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Tự động kiểm định lỗi thiếu UITransform, tài nguyên hỏng, nút tràn khung nhìn, và so sánh khác biệt hồi quy snapshot. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Engine thực thi hàng loạt nguyên tử ngay trong tiến trình, chạy nhiều thao tác trong một giao dịch IPC duy nhất. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Xem cấu hình build, điều khiển máy chủ xem trước (preview server) và theo dõi trình biên dịch TypeScript. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Điều khiển camera khung nhìn (focus), chuyển góc nhìn, bật tắt lưới và gizmo trong trình biên tập. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Thiết lập nhanh bộ khung xương Spine hoặc FastSpine và cấu hình hoạt ảnh chỉ với một lệnh gọi. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Theo dõi log console của trình biên tập và thu thập số liệu hiệu năng. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Đọc và cấu hình các tùy chọn cài đặt của trình biên tập. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Giám sát và phát sóng thông điệp sự kiện nội bộ của trình biên tập. |

---

## 📖 Quy trình làm việc MCP Tiêu chuẩn

### A. Kiểm tra Cây Phân cấp Cảnh hoặc Prefab
* Sử dụng `scene_manage(action="inspect")` để kiểm tra phân cấp cảnh, thành phần và thuộc tính dưới dạng cây JSON hoặc Markdown đã định dạng.
* Sử dụng `scene_manage(action="hierarchy", includeComponents=true)` để liệt kê các nút đang hoạt động trong cảnh hiện tại hoặc Prefab đang mở.

### B. Chỉnh sửa Thành phần trong Cảnh đang Hoạt động
* Sử dụng `component_manage(action="update")` để cập nhật thuộc tính chuyên sâu (ví dụ: `config.sid`, `config.data`), khởi tạo đối tượng `@ccclass` lồng nhau, và gán mảng tài nguyên (`onUpdates`, `onChanged`).
* Sử dụng `scene_manage(action="save")` để lưu lại các thay đổi của cảnh.

### C. Chỉnh sửa Thành phần / Nút trong Prefab
* **Nếu Prefab hiện đang mở / đang được kiểm tra:**
  1. `node_manage(action="query")` để định vị nút mục tiêu.
  2. `component_manage(action="add")` (để gắn script mới) hoặc `component_manage(action="update")` (để thiết lập dữ liệu thuộc tính).
  3. `prefab_manage(action="save")` để lưu.
* **Nếu Prefab đang ở chế độ nền (chưa mở):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` để định vị nút mục tiêu.
  3. `component_manage(action="update")` để áp dụng các thay đổi.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Hoặc sử dụng thao tác chỉnh sửa nguyên tử: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Phản chiếu Lớp & Tra cứu Kiểu dữ liệu
* Trước khi gán giá trị, sử dụng `component_manage(action="query_class_info")` để kiểm tra các thuộc tính phản chiếu `@ccclass`, giá trị mặc định, và siêu dữ liệu `@property`.

### E. Dựng Giao diện Người dùng Khai báo (Declarative UI)
* Sử dụng `ui_builder(action="build_tree", parent="Canvas", tree={...})` để xây dựng toàn bộ cây UI hoàn chỉnh (Bảng panel, Nút bấm, Nhãn chữ, Sprite, Khung cuộn ScrollView) với UITransform và ràng buộc Widget được tính toán tự động chỉ trong một lệnh gọi.

### F. Hoạt ảnh Khung hình chính Dòng thời gian & Cắt lát FBX
* Tạo clip hoạt ảnh `.anim` với đường cong thuộc tính: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Áp dụng chuyển động mẫu nhanh: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Cắt lát mô hình hoạt ảnh FBX đa phân đoạn: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Chẩn đoán Cảnh & Tài nguyên cùng So sánh Khác biệt Snapshot
* Chụp snapshot đường cơ sở của cảnh trước khi sửa đổi: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* So sánh cảnh với snapshot sau khi chỉnh sửa: `validation_manage(action="diff_snapshot")`.
* Kiểm định lỗi bố cục phân cấp cảnh: `validation_manage(action="check_scene")`.
* Quét tìm các tham chiếu tài nguyên GUID bị hỏng trong dự án và cảnh: `validation_manage(action="check_assets")`.

---

## ⚡ Bắt đầu Nhanh

`pts-cc-mcp` mặc định sử dụng cổng `3121` với hỗ trợ truyền tải kép: **Streamable HTTP** (`/mcp`) và **Server-Sent Events (SSE)** (`/sse`).

### 1. Cấu hình Claude CLI

```bash
# Streamable HTTP (Mặc định khuyên dùng)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Hoặc qua Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Cấu hình ứng dụng Claude Desktop

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

*Hoặc cấu hình với giao thức SSE:*

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

### 3. Cấu hình Cursor & Windsurf

Trong phần Cài đặt MCP của Cursor hoặc Windsurf (`.cursor/mcp.json`):

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

## ⚠️ Yêu cầu Tiên quyết & Quan hệ Phụ thuộc Đồng cấp Bắt buộc

> **QUAN TRỌNG: `pts-cc-mcp` yêu cầu tiện ích mở rộng `pts-core` phải được cài đặt trong dự án của bạn.**
>
> **Vì sao `pts-core` là bắt buộc?**  
> Cocos Creator 3.8+ ứng dụng kiến trúc đa tiến trình, trong đó **Tiến trình Chính của Trình biên tập (Editor Main Process)** (nơi `pts-cc-mcp` vận hành) hoàn toàn tách biệt khỏi **Tiến trình Thực thi Cảnh (Scene Execution Process)** (nơi cảnh trò chơi, các thành phần và engine runtime `@ccclass` hoạt động trực tiếp).  
>
> `pts-cc-mcp` thực thi các lệnh cảnh bằng cách gọi `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. Script cảnh này (`src/_cc.js`) được lưu trữ và thực thi trực tiếp bên trong `pts-core`.  
>
> Nếu thiếu `pts-core`, các công cụ yêu cầu runtime cảnh trực tiếp (như `component_*`, `node_manage`, `scene_manage`, `ui_builder`, và `validation_manage`) sẽ không thể tương tác với các nút trên cảnh.

---

## Hướng dẫn Cài đặt & Thiết lập

### 1. Đặt Tệp Mở rộng
Đảm bảo CẢ HAI tiện ích mở rộng `pts-core` và `pts-cc-mcp` đều được đặt bên trong thư mục `extensions/` thuộc dự án Cocos Creator của bạn:

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- BẮT BUỘC: Lõi engine & runtime script cảnh (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- Máy chủ MCP & nhà cung cấp công cụ
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Cài đặt Phụ thuộc & Build
```bash
# 1. Thiết lập pts-core (nếu build từ mã nguồn)
cd extensions/pts-core
npm install
npm run build

# 2. Thiết lập pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Kích hoạt Tiện ích Mở rộng trong Cocos Creator
1. Khởi động lại Cocos Creator hoặc tải lại Trình quản lý Tiện ích Mở rộng (**Extensions > Extension Manager**).
2. Xác nhận rằng cả **pts-core** và **pts-cc-mcp** đều đã được kích hoạt.
3. Nhấp vào menu `Extensions > pTS MCP Server` để mở bảng điều khiển.
4. Máy chủ chạy trên cổng `3121` theo mặc định (có thể tùy chỉnh lại trong bảng điều khiển).

---

## Cấu trúc Dự án

```
pts-cc-mcp/
├── source/                    # Tệp mã nguồn TypeScript
│   ├── main.ts               # Điểm nhập plugin & kiểm tra bootstrap
│   ├── mcp-server.ts         # Lớp truyền tải Streamable HTTP & SSE
│   ├── settings.ts           # Quản lý cài đặt & cấu hình
│   ├── types/                # Định nghĩa kiểu dữ liệu TypeScript
│   ├── utils/                # Tiện ích bổ trợ
│   │   ├── agents-doc-generator.ts # Template AGENTS.md & đồng bộ tài liệu
│   │   ├── asset-resolver.ts       # Bộ giải quyết UUID tài nguyên con thông minh
│   │   ├── json-utils.ts           # Phân tích & tự động sửa lỗi JSON phòng thủ
│   │   └── i18n.ts                 # Engine dịch đa ngôn ngữ
│   ├── tools/                # Triển khai các hệ thống con & công cụ hợp nhất
│   │   ├── intent-dispatcher.ts    # Bộ điều phối 16 API ý định & định tuyến opcode
│   │   ├── ui-builder-tools.ts     # Trình dựng UI khai báo một bước
│   │   ├── knowledge-tools.ts      # Cơ sở tri thức phản chiếu ngoại tuyến
│   │   ├── animation-tools.ts      # Trình biên tập AnimationClip & cắt lát FBX
│   │   ├── validation-tools.ts     # Chẩn đoán cảnh & so sánh khác biệt snapshot
│   │   ├── batch-tools.ts          # Engine thực thi hàng loạt nguyên tử
│   │   ├── scene-tools.ts          # Quản lý vòng đời cảnh
│   │   ├── node-tools.ts           # Phép biến đổi nút & thao tác cây phân cấp
│   │   ├── component-tools.ts      # Phản chiếu thành phần & cập nhật thuộc tính
│   │   ├── prefab-tools.ts         # Ngăn xếp phiên Prefab & chỉnh sửa nguyên tử
│   │   ├── asset-advanced-tools.ts # Tìm kiếm cơ sở dữ liệu tài nguyên & giải quyết thông minh
│   │   ├── project-tools.ts        # Thực thi build & xem trước dự án
│   │   ├── debug-tools.ts          # Log console & theo dõi trình biên dịch TS
│   │   └── preferences-tools.ts    # Quản lý tùy chọn người dùng
│   └── panels/               # Giao diện bảng điều khiển Vue 3 tích hợp trình kiểm thử công cụ
├── dist/                     # Thư mục xuất mã JavaScript đã biên dịch
├── static/                   # Tài nguyên tĩnh (icon, style, template)
├── i18n/                     # Từ điển quốc tế hóa đa ngôn ngữ
├── package.json              # Khai báo manifest extension & điểm đóng góp
└── tsconfig.json             # Cấu hình biên dịch TypeScript
```

---

## Giấy phép

Plugin này là phần mềm mã nguồn mở theo Giấy phép MIT và được thiết kế chuyên biệt cho việc phát triển game với Cocos Creator.
