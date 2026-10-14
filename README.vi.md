# Plugin máy chủ MCP cho Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · **Tiếng Việt**

Một plugin máy chủ MCP (Model Context Protocol) toàn diện dành cho Cocos Creator 3.8+, cho phép các trợ lý AI tương tác với trình biên tập Cocos Creator thông qua giao thức chuẩn hóa. Cài đặt và sử dụng chỉ với một thao tác, loại bỏ mọi cấu hình môi trường rườm rà. Đã được kiểm thử với Claude Desktop, Claude CLI, Cursor và Windsurf; các trình biên tập hỗ trợ MCP khác cũng hoạt động mượt mà.

**🚀 Hiện tích hợp kiến trúc công cụ hợp nhất, thực thi hàng loạt nguyên tử (atomic batch execution) và hỗ trợ Animation Graph gốc, mang lại khả năng điều khiển 99% trình biên tập!**

## 🙏 Lời cảm ơn & Ghi nhận đóng góp

Dự án này bắt nguồn từ bản fork mã nguồn mở của [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) do tác giả **LiDaxian** sáng lập. Chúng tôi xin gửi lời cảm ơn và tri ân chân thành nhất tới **LiDaxian** cùng toàn thể cộng đồng đóng góp vì đã đặt nền móng kiến trúc và mở ra con đường phát triển Cocos Creator định hướng bởi AI.

`pts-cc-mcp` tiếp tục xây dựng và phát triển trên nền tảng này như một phần mở rộng hoàn toàn nguồn mở, hướng đến cộng đồng với:
- **Mã nguồn 100% chuẩn tiếng Anh** cùng hỗ trợ bản địa hóa đa ngôn ngữ i18n
- **Engine thực thi hàng loạt nguyên tử ngay trong tiến trình** (`batch_execute` / `editor_batch_execute`)
- **Đồ thị hoạt ảnh (Animation Graph) gốc** (`.animgraph`) kiểm tra & chỉnh sửa máy trạng thái
- **Ngăn xếp phiên Prefab an toàn** với khả năng tự phục hồi, loại bỏ lỗi sập khi thoát cảnh
- **Bộ giải quyết tài nguyên đệ quy thông minh** (`@spriteFrame`, `@texture`, đường dẫn thô, UUID)
- **Spine & FastSpine** thiết lập khung xương nhân vật tự động
- **Bộ theo dõi trình biên dịch TypeScript** (`compile_status`), loại bỏ xung đột tranh chấp khi biên dịch script

## Nhật ký cập nhật phiên bản mã nguồn mở

### 🚀 Cập nhật lớn v1.6.0 (Giai đoạn 1: Dual Streamable HTTP & SSE Transport)

- **Engine truyền tải kép: Hỗ trợ Streamable HTTP & Server-Sent Events (SSE) gốc**: Hỗ trợ đầy đủ và trực tiếp giao thức Streamable HTTP (`/mcp`) cùng Server-Sent Events (`/sse` & `/messages`) từ `@modelcontextprotocol/sdk`, song song với endpoint JSON-RPC trực tiếp dự phòng không trạng thái (stateless fallback). Cung cấp khả năng quản lý vòng đời phiên độc lập theo từng client, tự động dọn dẹp phiên nhàn rỗi (idle) và hỗ trợ đầy đủ CORS cho các IDE AI hiện đại (Claude CLI, Cursor, Windsurf, VS Code).
- **Tách biệt lõi script cảnh và xác lập quan hệ phụ thuộc đồng cấp (peer dependency) với `pts-core`**: Kiểm chứng và tài liệu hóa rõ ràng quan hệ phụ thuộc đồng cấp vào `pts-core` để thực thi script cảnh (`src/_cc.js`), đảm bảo sự tách biệt rành mạch giữa lớp chuyển dịch giao thức MCP và tầng thao tác cảnh của Cocos Creator.

### 🚀 Cập nhật lớn v1.5.4

- **Thực thi hàng loạt nguyên tử trong tiến trình (`batch_execute` / `editor_batch_execute`)**: Thực thi nhiều thao tác công cụ trong một giao dịch IPC tuần tự ngay trong tiến trình. Giảm đáng kể số lần khứ hồi (round-trip) HTTP và mức tiêu thụ Token, hỗ trợ `stopOnError` (dừng khi gặp lỗi) cùng tính năng tự động lưu cảnh/Prefab.
- **Engine Animation Graph (`animgraph_manage`)**: Kiểm tra và chỉnh sửa tệp `.animgraph` gốc. Kiểm tra máy trạng thái (state machine), trạng thái (state), chuyển tiếp (transition) và tham số; thêm, cập nhật hoặc xóa `StateMachineComponent`; cùng khả năng di chuyển hàng loạt loại lớp thành phần với đồng bộ hóa cơ sở dữ liệu tài nguyên tự động.
- **Ngăn xếp phiên Prefab & Khôi phục an toàn**: Ghi nhớ URL/UUID của cảnh đang hoạt động khi `enter`, tự động khôi phục cảnh trước đó khi `exit`, và tự động tìm kiếm cảnh hợp lệ trong dự án nếu bị thiếu — loại bỏ hoàn toàn lỗi sập `"Target scene does not exist"`. Bổ sung hành động `atomic_edit` cho quy trình enter $\to$ edit $\to$ save $\to$ exit liền mạch.
- **Bộ giải quyết tài nguyên & tài nguyên con thông minh (`asset_query(action="resolve")`)**: Tự động giải quyết đường dẫn thô, UUID và các tài nguyên con (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`). Được tích hợp hoàn toàn vào `set_component_property` và `update_component` để giải quyết tự động chuyên sâu.
- **Trợ thủ thiết lập Spine / FastSpine (`spine_setup`)**: Khởi tạo khung xương nhân vật nhanh chóng chỉ với một lệnh gọi. Gắn `FastSpine` hoặc `sp.Skeleton`, liên kết tài nguyên dữ liệu khung xương (skeleton data), cấu hình hoạt ảnh mặc định, chế độ lặp lại và đồng bộ hóa UITransform.
- **Bộ theo dõi trình biên dịch (`compile_status`) & Giá trị mặc định phòng thủ**: Giám sát và chờ đợi quá trình biên dịch TypeScript/JavaScript của Cocos Creator hoàn tất nhằm loại bỏ xung đột tranh chấp (race conditions) sau khi chỉnh sửa script. Bổ sung các giá trị mặc định phòng thủ an toàn trên toàn bộ các công cụ debug và server cùng hướng dẫn rõ ràng khi gặp thao tác không xác định.
- **Mã nguồn 100% chuẩn tiếng Anh & Kiến trúc i18n hoàn chỉnh**: Chuẩn hóa toàn bộ mã nguồn extension, chú thích, thông báo lỗi và log sang tiếng Anh chuyên nghiệp với hỗ trợ bản địa hóa đa ngôn ngữ i18n mượt mà.

---

## Hệ thống công cụ và mã thao tác

- Tất cả công cụ đều được đặt tên theo quy ước "danh_mục_thao_tác", với các tham số tuân theo Schema thống nhất và hỗ trợ chuyển đổi giữa nhiều mã thao tác (`action`), nâng cao đáng kể tính linh hoạt và khả năng mở rộng.
- Bao phủ toàn diện các lĩnh vực: cảnh, nút, thành phần, Prefab, tài nguyên, đồ thị hoạt ảnh (animation graph), giao dịch hàng loạt, dự án, gỡ lỗi, tùy chọn cài đặt, trạng thái máy chủ và phát sóng thông điệp.
- Ví dụ gọi công cụ:

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

## Các nhóm tính năng chính

- **batch_execute / editor_batch_execute**: Engine thực thi hàng loạt nguyên tử chạy nhiều thao tác công cụ trong một giao dịch IPC duy nhất
- **animgraph_manage**: Kiểm tra `.animgraph` gốc, chuyển tiếp máy trạng thái và CRUD thành phần
- **scene_management / scene_hierarchy**: Vòng đời cảnh (lấy/mở/lưu/tạo/đóng) và cây phân cấp
- **node_query / node_lifecycle / node_transform**: Tìm kiếm, tạo, xóa, phân cấp và biến đổi nút
- **component_manage / set_component_property / spine_setup**: Vòng đời thành phần, thiết lập thuộc tính và cài đặt khung xương FastSpine
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: Quản lý, khởi tạo thực thể, ngăn xếp phiên và chỉnh sửa nguyên tử Prefab
- **asset_manage / asset_analyze / asset_query**: CRUD tài nguyên, truy vết phụ thuộc và giải quyết tài nguyên con thông minh
- **debug_console / debug_logs / compile_status**: Giám sát console, tìm kiếm log dự án và bộ theo dõi trình biên dịch TS
- **project_manage / project_build_system**: Chạy dự án, điều khiển bảng build và máy chủ xem trước
- **preferences_manage**: Quản lý tùy chọn trình biên tập
- **server_information / server_connectivity**: Danh sách IP máy chủ, kiểm tra cổng và chẩn đoán kết nối
- **broadcast_log_management / broadcast_listener_management**: Giám sát và phát sóng sự kiện nội bộ trình biên tập

---

## Bắt đầu nhanh

`pts-cc-mcp` hỗ trợ cả hai phương thức truyền tải: **Streamable HTTP** (`/mcp`) và **Server-Sent Events (SSE)** (`/sse`).

### 1. Cấu hình Claude CLI

```bash
# Streamable HTTP (Mặc định khuyên dùng)
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# Hoặc thông qua Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Cấu hình Claude Desktop

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

*Hoặc cấu hình với phương thức truyền tải SSE:*

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

### 3. Cấu hình Cursor & Windsurf

Trong phần Cài đặt MCP của Cursor hoặc Windsurf (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*(Bạn cũng có thể điền `"url": "http://127.0.0.1:3000/sse"` nếu mong muốn).*

---

## ⚠️ Điều kiện tiên quyết & Phụ thuộc đồng cấp bắt buộc

> **QUAN TRỌNG: `pts-cc-mcp` yêu cầu cài đặt extension `pts-core` trong dự án của bạn.**
>
> **Vì sao `pts-core` là bắt buộc?**  
> Cocos Creator 3.8+ sử dụng kiến trúc đa tiến trình, trong đó **Tiến trình chính của Trình biên tập** (nơi `pts-cc-mcp` chạy) hoàn toàn tách biệt khỏi **Tiến trình thực thi Cảnh** (nơi cảnh game, các thành phần component và runtime engine `@ccclass` trực tiếp hoạt động).  
>
> `pts-cc-mcp` thực thi các lệnh cảnh bằng cách gọi yêu cầu IPC: `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. Script cảnh này (`src/_cc.js`) được lưu trữ trực tiếp bên trong `pts-core`.  
>
> Nếu không có `pts-core`, các công cụ cần tương tác trực tiếp với cảnh đang hoạt động (như `component_*`, `node_node_transform`, `scene_inspect_scene`, `game_*`, và `component_query_class_info`) sẽ không thể thao tác với các node trong cảnh.

> **Lưu ý trước khi cài đặt lần đầu hoặc nâng cấp:**  
> Vui lòng xóa hai tệp `mcp-server.json` và `tool-manager.json` trong thư mục `settings/` của dự án, nếu không bộ nhớ cache danh sách công cụ có thể gây ra lỗi hiển thị!  
> Đường dẫn tệp: `<Project>/settings/mcp-server.json` và `<Project>/settings/tool-manager.json`.  
> Sau khi xóa hai tệp này, mở lại bảng điều khiển extension sẽ tự động đồng bộ lại toàn bộ công cụ một cách sạch sẽ.

## Hướng dẫn cài đặt

### 1. Đặt các tệp extension

Đảm bảo CẢ HAI extension `pts-core` và `pts-cc-mcp` đều được đặt trong thư mục `extensions/` của dự án Cocos Creator:

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- BẮT BUỘC: Lõi engine & runtime script cảnh (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- Máy chủ MCP & nhà cung cấp công cụ
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Cài đặt dependency & build extension

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

### 3. Kích hoạt plugin trong Cocos Creator

1. Khởi động lại Cocos Creator hoặc tải lại Extension Manager (**Extensions > Extension Manager**).
2. Kiểm tra và đảm bảo cả **pts-core** và **pts-cc-mcp** đều đã được kích hoạt.
3. Nhấp vào `Extensions > pTS MCP Server` để mở bảng điều khiển.
4. Máy chủ chạy mặc định tại cổng `3000` (có thể tùy chỉnh cấu hình trong bảng điều khiển).

---

## Phát triển

### Cấu trúc dự án
```
pts-cc-mcp/
├── source/                    # Tệp nguồn TypeScript
│   ├── main.ts               # Điểm vào của plugin
│   ├── mcp-server.ts         # Triển khai máy chủ MCP
│   ├── settings.ts           # Quản lý cài đặt
│   ├── types/                # Định nghĩa kiểu TypeScript
│   ├── utils/                # Tiện ích (asset-resolver.ts, tương thích schema, tiện ích JSON)
│   ├── tools/                # Triển khai công cụ
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
│   ├── panels/               # Triển khai bảng điều khiển UI
│   └── test/                 # Tệp kiểm thử
├── dist/                     # Đầu ra JavaScript sau biên dịch
├── static/                   # Tài nguyên tĩnh (icon, v.v.)
├── i18n/                     # Tệp đa ngôn ngữ (i18n)
├── package.json              # Cấu hình plugin
└── tsconfig.json             # Cấu hình TypeScript
```

### Build từ mã nguồn

```bash
# Chế độ theo dõi cho phát triển (watch mode)
npm run watch

# Build bản phát hành (production)
npm run build
```

---

## Yêu cầu hệ thống

- Cocos Creator 3.8.6 trở lên
- Node.js (đi kèm sẵn trong Cocos Creator)
- TypeScript (cài đặt dưới dạng dev dependency)

## Giấy phép

Plugin này được thiết kế dành cho các dự án Cocos Creator với toàn bộ mã nguồn được cung cấp kèm theo nhằm phục vụ mục đích học tập và phát triển.
