# Cocos Creator MCP 서버 플러그인 (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · **한국어** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Cocos Creator 3.8+를 위한 포괄적인 오픈소스 Model Context Protocol (MCP) 서버 플러그인으로, AI 코딩 어시스턴트(Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity)가 표준화된 프로토콜을 통해 Cocos Creator 게임을 검사, 저작, 검증 및 제어할 수 있도록 지원합니다.

**🚀 Streamable HTTP 및 SSE 듀얼 전송 엔진, 16개의 통합 인텐트 도구(231개 연산 코드), 선언적 원샷 UI 생성, 오프라인 리플렉션 지식 베이스, 타임라인 키프레임 애니메이션 제작, 씬/에셋 회귀 스냅샷 비교 기능 탑재!**

---

## 🙏 감사의 글 및 출처 표기

본 프로젝트는 **LiDaxian** 님이 제작한 오픈소스 프로젝트 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server)의 포크로 시작되었습니다. Cocos Creator를 위한 AI 모델 컨텍스트 프로토콜(MCP)의 기반 아키텍처를 구축하고 길을 열어주신 **LiDaxian** 님과 모든 커뮤니티 기여자분들께 진심으로 감사와 경의를 표합니다.

`pts-cc-mcp`는 이 기반 위에서 발전하는 100% 완전한 오픈소스 커뮤니티 주도 확장 프로그램으로, 모든 비공개/상용 기능을 뛰어난 오픈소스 구현체로 대체했습니다.

---

## 🚀 버전 1.6.0 업데이트 로그: 통합 Pro 아키텍처 (Unified Pro Architecture)

### 1. Dual Streamable HTTP 및 Server-Sent Events (SSE) 전송 (1단계)
- 포트 `3121`에서 `@modelcontextprotocol/sdk`의 Streamable HTTP(`/mcp`) 및 Server-Sent Events(`/sse` 및 `/messages`)를 완벽하게 네이티브 지원.
- 클라이언트별 격리된 세션 관리, 연결 유지 하트비트, 최신 AI 클라이언트를 위한 CORS 헤더 지원.

### 2. 인텐트 레벨 통합 연산 코드 아키텍처 (2단계)
- 50개 이상의 분산되어 있던 스키마를 231개의 세부 작업(`action` 연산 코드 디스패치)을 다루는 **16개의 통합 인텐트 도구**로 통합.
- 기존 레거시 도구 호출과의 하위 호환성을 완벽하게 유지하면서 LLM 컨텍스트 창의 스키마 토큰 소비를 70% 이상 절감.

### 3. 선언적 원샷 UI & 씬 빌더 (3단계)
- `ui_builder`: `UITransform` 자동 생성, 제약 조건 해결(Widget 앵커, Layout 여백 자동 계산), 오류 발생 시 자동 롤백 스냅샷을 갖추어 복잡한 UI 그래프(`build_tree`, `create_dialog`, `create_button`, `create_list`)를 선언적으로 원샷 구축.

### 4. 임베디드 Cocos Creator 3.8 리플렉션 지식 베이스 (4단계)
- `knowledge_query`: 내장 2D/3D 컴포넌트(`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), 디자인 해상도 가이드 및 좌표 변환 공식에 대한 인메모리 아키텍처 규칙과 `@property` 딕셔너리 제공.
- 자동화된 `AGENTS.md` 검증 및 문서 생성기(`get_mcp_guide`, `sync_agents_doc`).

### 5. 타임라인 애니메이션 & 키프레임 곡선 에디터 (5단계)
- `anim_manage`: 3차 베지에(Cubic Bezier), 선형(Linear), 상수(Constant) 곡선 보간을 지원하는 `.anim`(`cc.AnimationClip`) 트랙 직접 저작.
- 애니메이션 이벤트 트리거, 빠른 모션 프리셋(`bounce_pop`, `fade_in`, `fade_out`, `shake`), 다중 테이크 FBX 애니메이션 자동 슬라이싱.

### 6. 씬 & 에셋 진단 및 스냅샷 회귀 비교 (6단계)
- `validation_manage`: 형제 노드 동명 충돌 감지, 누락된 `UITransform` 진단, 씬 컴포넌트의 `__uuid__` 에셋 참조를 `asset-db`와 대조하는 심층 재귀 에셋 스캐너.
- SHA-256 씬 상태 스냅샷 캡처(`capture_snapshot`) 및 시각적 Markdown 회귀 비교 테이블(`diff_snapshot`).

---

## 🛠️ 16개 통합 인텐트 API 치트시트

| 인텐트 도구 | 핵심 매개변수 | 용도 및 모범 사례 |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | 씬 수명 주기 관리, 전체 노드 트리 검사, 씬 스크립트 실행. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | 범용 노드 검색, 생성, 삭제, 변환 및 계층 구조 조작. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | 컴포넌트 추가/제거, 심층 속성 업데이트(자동 저장 포함), 클릭 이벤트 바인딩, @ccclass 리플렉션. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | 프리팹 전체 수명 주기, 비파괴 편집 세션 스택, 원자적 일괄 편집. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | 선언적 1회 호출 UI 생성, 자동 UITransform 생성, Widget 제약 조건 및 Layout 자동 계산. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | 타임라인 AnimationClip 편집, 속성 곡선, 이징 모드, 애니메이션 이벤트, 프리셋, FBX 슬라이싱, AnimGraph 상태 머신. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | 에셋 검색, 의존성 검사, 스마트 서브 에셋 해석(`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | 컴포넌트, 좌표계, 레이아웃 규칙 및 최신 MCP 가이드에 대한 오프라인 아키텍처 참조. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | 누락된 UITransform, 손상된 에셋, 뷰포트 초과 노드 자동 감사 및 시각적 스냅샷 회귀 비교. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | 단일 IPC 트랜잭션 내에서 여러 작업을 순차적으로 실행하는 프로세스 내 원자적 배치 실행 엔진. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | 빌드 설정 확인, 프리뷰 서버 제어, TypeScript 컴파일 상태 감시. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | 뷰포트 카메라 포커스, 뷰 전환, 에디터 그리드 및 기즈모 제어. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | 단 한 번의 호출로 Spine 스켈레톤 또는 FastSpine 리그 설정 및 애니메이션 구성. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | 에디터 콘솔 로그 모니터링 및 성능 통계 수집. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | 에디터 환경설정 조회 및 구성. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | 에디터 내부 이벤트 메시지 모니터링 및 브로드캐스트. |

---

## 📖 표준 MCP 워크플로

### A. 씬 또는 프리팹 그래프 검사
* `scene_manage(action="inspect")`를 사용하여 형식화된 JSON 또는 Markdown 트리 형태로 씬 계층 구조, 컴포넌트 및 속성을 검사합니다.
* `scene_manage(action="hierarchy", includeComponents=true)`를 사용하여 활성 씬 또는 열린 프리팹 내의 라이브 노드를 나열합니다.

### B. 활성 씬의 컴포넌트 수정
* `component_manage(action="update")`를 사용하여 심층 속성 업데이트(`config.sid`, `config.data`), 중첩된 `@ccclass` 객체 인스턴스화, 에셋 배열(`onUpdates`, `onChanged`)을 적용합니다.
* `scene_manage(action="save")`를 사용하여 씬 변경 사항을 저장합니다.

### C. 프리팹 내 컴포넌트 / 노드 수정
* **프리팹이 현재 열려 있거나 검사 중인 경우:**
  1. `node_manage(action="query")`로 대상 노드를 검색합니다.
  2. `component_manage(action="add")`(새 스크립트 연결) 또는 `component_manage(action="update")`(데이터 설정)를 수행합니다.
  3. `prefab_manage(action="save")`로 저장합니다.
* **프리팹이 백그라운드에 있는 경우(열려 있지 않음):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")`로 대상 노드를 검색합니다.
  3. `component_manage(action="update")`로 변경 사항을 적용합니다.
  4. `prefab_manage(action="save")`로 저장합니다.
  5. `prefab_manage(action="exit")`로 빠져나옵니다.
* 또는 원자적 편집을 직접 사용: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. 클래스 리플렉션 및 타입 정보 조회
* 값을 할당하기 전에 `component_manage(action="query_class_info")`를 사용하여 컴포넌트의 `@ccclass` 리플렉션 속성, 기본값 및 `@property` 메타데이터를 확인합니다.

### E. 선언적 UI 생성
* `ui_builder(action="build_tree", parent="Canvas", tree={...})`를 호출하여 패널, 버튼, 라벨, 스프라이트, 스크롤뷰 등 전체 UI 트리를 단 한 번의 호출로 생성하며, UITransform 및 Widget 제약 조건이 자동으로 계산됩니다.

### F. 타임라인 키프레임 애니메이션 및 FBX 슬라이싱
* 속성 곡선을 사용하여 `.anim` 클립 저작: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* 모션 프리셋 적용: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* 멀티 테이크 FBX 모델 슬라이싱: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. 씬 & 에셋 진단 및 스냅샷 회귀 비교
* 수정 전 기준 씬 스냅샷 캡처: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* 편집 후 씬과 스냅샷 비교: `validation_manage(action="diff_snapshot")`.
* 씬 계층 구조 레이아웃 결함 감사: `validation_manage(action="check_scene")`.
* 프로젝트 및 씬 내 유효하지 않은 GUID 에셋 참조 스캔: `validation_manage(action="check_assets")`.

---

## ⚡ 빠른 시작

`pts-cc-mcp`는 기본적으로 포트 `3121`에서 실행되며 **Streamable HTTP**(`/mcp`) 및 **Server-Sent Events (SSE)**(`/sse`) 듀얼 전송을 지원합니다.

### 1. Claude CLI 설정

```bash
# Streamable HTTP (기본 권장)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# 또는 Server-Sent Events (SSE) 사용
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Claude Desktop 클라이언트 설정

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

*또는 SSE 프로토콜로 설정할 경우:*

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

### 3. Cursor 및 Windsurf 설정

Cursor 또는 Windsurf의 MCP 설정(`.cursor/mcp.json`)에 추가:

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

## ⚠️ 사전 요구사항 및 필수 피어 의존성

> **중요: `pts-cc-mcp`를 사용하려면 프로젝트에 `pts-core` 확장 프로그램이 설치되어 있어야 합니다.**
>
> **왜 `pts-core`가 필수인가요?**  
> Cocos Creator 3.8+는 멀티 프로세스 아키텍처를 채택하여 **에디터 메인 프로세스**(`pts-cc-mcp`가 실행되는 환경)와 **씬 실행 프로세스**(게임 씬, 컴포넌트 및 라이브 `@ccclass` 엔진 런타임이 실행되는 환경)가 완전히 분리되어 있습니다.  
>
> `pts-cc-mcp`는 엔진에 IPC 요청을 전달하여 씬 명령을 실행합니다: `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. 이 씬 스크립트 실행기(`src/_cc.js`)는 `pts-core` 플러그인 내에 직접 호스팅되어 있습니다.  
>
> `pts-core`가 없으면 라이브 씬 런타임이 필요한 도구(`component_*`, `node_manage`, `scene_manage`, `ui_builder`, `validation_manage` 등)가 씬 노드와 상호작용할 수 없습니다.

---

## 설치 및 설정

### 1. 확장 프로그램 파일 배치
Cocos Creator 프로젝트의 `extensions/` 디렉터리 안에 `pts-core`와 `pts-cc-mcp` 두 확장 프로그램이 모두 배치되어 있는지 확인합니다:

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 필수: 코어 엔진 및 씬 스크립트 런타임 (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP 서버 및 도구 제공자
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. 의존성 설치 및 빌드
```bash
# 1. pts-core 설정 (소스에서 빌드하는 경우)
cd extensions/pts-core
npm install
npm run build

# 2. pts-cc-mcp 설정
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Cocos Creator에서 확장 프로그램 활성화
1. Cocos Creator를 재시작하거나 확장 프로그램 관리자(**확장 > 확장 관리자**)를 새로 고칩니다.
2. **pts-core**와 **pts-cc-mcp**가 모두 활성화되어 있는지 확인합니다.
3. 상단 메뉴 `확장 > pTS MCP Server`를 클릭하여 제어판을 엽니다.
4. 서버는 기본적으로 포트 `3121`에서 실행됩니다(제어판에서 변경 가능).

---

## 프로젝트 구조

```
pts-cc-mcp/
├── source/                    # TypeScript 소스 코드
│   ├── main.ts               # 플러그인 진입점 및 부트스트랩 검증
│   ├── mcp-server.ts         # Streamable HTTP 및 SSE 전송 계층
│   ├── settings.ts           # 설정 및 구성 관리
│   ├── types/                # TypeScript 타입 정의
│   ├── utils/                # 유틸리티 라이브러리
│   │   ├── agents-doc-generator.ts # AGENTS.md 템플릿 및 문서 동기화 생성기
│   │   ├── asset-resolver.ts       # 스마트 서브 에셋 UUID 리졸버
│   │   ├── json-utils.ts           # 방어적 JSON 파싱 및 복구
│   │   └── i18n.ts                 # 다국어 번역 엔진
│   ├── tools/                # 서브시스템 및 통합 인텐트 도구 구현체
│   │   ├── intent-dispatcher.ts    # 16개 인텐트 API 디스패처 및 연산 코드 라우터
│   │   ├── ui-builder-tools.ts     # 선언적 원샷 UI 빌더
│   │   ├── knowledge-tools.ts      # 오프라인 리플렉션 지식 베이스
│   │   ├── animation-tools.ts      # AnimationClip 및 FBX 슬라이싱 에디터
│   │   ├── validation-tools.ts     # 씬 진단 및 스냅샷 회귀 비교
│   │   ├── batch-tools.ts          # 원자적 배치 실행 엔진
│   │   ├── scene-tools.ts          # 씬 수명 주기 관리
│   │   ├── node-tools.ts           # 노드 변환 및 계층 조작
│   │   ├── component-tools.ts      # 컴포넌트 리플렉션 및 속성 업데이터
│   │   ├── prefab-tools.ts         # 프리팹 세션 스택 및 원자적 편집
│   │   ├── asset-advanced-tools.ts # 에셋 데이터베이스 검색 및 스마트 해석
│   │   ├── project-tools.ts        # 빌드 및 프리뷰 실행
│   │   ├── debug-tools.ts          # 콘솔 로그 및 TS 컴파일러 감시
│   │   └── preferences-tools.ts    # 사용자 환경설정 관리
│   └── panels/               # Vue 3 UI 제어판 및 도구 테스터
├── dist/                     # 컴파일된 JavaScript 출력 디렉터리
├── static/                   # 정적 리소스 (아이콘, 스타일, 템플릿)
├── i18n/                     # 다국어 사전
├── package.json              # 확장 프로그램 매니페스트 및 기여 항목
└── tsconfig.json             # TypeScript 빌드 설정
```

---

## 라이선스

본 플러그인은 MIT 라이선스 하에 오픈소스로 제공되며 Cocos Creator 게임 개발용으로 설계되었습니다.
