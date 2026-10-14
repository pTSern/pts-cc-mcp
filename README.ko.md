# Cocos Creator MCP 서버 플러그인

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · **한국어** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Cocos Creator 3.8+ 용으로 제작된 종합 MCP(Model Context Protocol) 서버 플러그인으로, AI 어시스턴트가 표준화된 프로토콜을 통해 Cocos Creator 에디터와 상호작용할 수 있게 해줍니다. 원클릭 설치 및 사용으로 번거로운 환경 구성을 모두 생략할 수 있습니다. Claude 데스크톱 클라이언트, Claude CLI, Cursor 및 Windsurf에서 테스트를 마쳤으며, 다른 MCP 호환 에디터에서도 원활하게 작동합니다.

**🚀 통합 도구 아키텍처, 원자적 배치 실행 및 네이티브 애니메이션 그래프 지원을 갖추어 99%의 에디터 제어를 구현합니다!**

## 🙏 감사의 글 및 출처 표기

본 프로젝트는 **LiDaxian** 님이 제작한 오픈소스 프로젝트 [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server)의 포크로 시작되었습니다. Cocos Creator를 위한 AI 모델 컨텍스트 프로토콜(MCP)의 기반 아키텍처를 구축하고 길을 열어주신 **LiDaxian** 님과 모든 커뮤니티 기여자분들께 진심으로 감사와 경의를 표합니다.

`pts-cc-mcp`는 이 기반 위에서 발전하는 완전한 오픈소스 커뮤니티 주도 확장 프로그램으로, 다음 기능을 지원합니다:
- **100% 영어 코드베이스** 및 다국어 i18n 현지화 지원
- **프로세스 내 원자적 배치 실행 엔진** (`batch_execute` / `editor_batch_execute`)
- **네이티브 애니메이션 그래프** (`.animgraph`) 상태 머신 검사 및 편집
- **안전한 프리팹 세션 스택**과 자동 복구를 통한 씬 종료 시 크래시 방지
- **스마트 재귀 에셋 리졸버** (`@spriteFrame`, `@texture`, 원시 경로, UUID)
- **Spine 및 FastSpine** 캐릭터 리그 자동 설정
- **TypeScript 컴파일러 감시기** (`compile_status`)를 통한 스크립트 컴파일 동시성 충돌 해결

## 오픈소스 버전 업데이트 로그

### 🚀 주요 업데이트 v1.6.0 (1단계: Dual Streamable HTTP 및 SSE 전송)

- **듀얼 전송 엔진: 네이티브 Streamable HTTP 및 Server-Sent Events (SSE)**: 상태 비저장 직통 JSON-RPC 대체 엔드포인트와 함께 `@modelcontextprotocol/sdk`의 Streamable HTTP(`/mcp`) 및 Server-Sent Events(`/sse` 및 `/messages`)를 완전하게 네이티브 지원합니다. 클라이언트별 독립 세션 라이프사이클 관리, 유휴 세션 자동 정리, 최신 AI IDE(Claude CLI, Cursor, Windsurf, VS Code)를 위한 완벽한 CORS 지원을 제공합니다.
- **씬 스크립트 코어 분리 및 `pts-core` 피어 의존성 명시**: 씬 스크립트 실행(`src/_cc.js`)을 위한 `pts-core` 피어 의존성을 검증하고 문서화하여, MCP 프로토콜 변환과 Cocos Creator 엔진의 씬 조작 간의 명확한 분리를 구축했습니다.

### 🚀 주요 업데이트 v1.5.4

- **프로세스 내 원자적 배치 실행 (`batch_execute` / `editor_batch_execute`)**: 여러 도구 작업을 단일 프로세스 내 순차 IPC 트랜잭션으로 실행합니다. HTTP 왕복 시간과 Token 소비를 대폭 줄이며, `stopOnError`(오류 시 중단) 및 씬/프리팹 자동 저장을 지원합니다.
- **애니메이션 그래프 엔진 (`animgraph_manage`)**: `.animgraph` 파일의 네이티브 검사 및 수정을 지원합니다. 상태 머신, 상태(State), 전이(Transition), 매개변수 조사, `StateMachineComponent` 추가·업데이트·제거, 그리고 에셋 데이터베이스 자동 동기화를 통한 컴포넌트 클래스 타입 일괄 마이그레이션을 지원합니다.
- **프리팹 세션 스택 및 안전한 복구**: `enter` 실행 시 활성 씬의 URL/UUID를 기록하고 `exit` 시 이전 씬을 자동으로 복원하며, 기록이 없는 경우 프로젝트 내 유효한 씬을 자동 검색하여 "대상 씬이 존재하지 않습니다(Target scene does not exist)" 충돌을 완전히 제거했습니다. 원활한 enter $\to$ edit $\to$ save $\to$ exit 사이클을 위한 `atomic_edit` 작업도 포함되었습니다.
- **스마트 에셋 및 서브 에셋 리졸버 (`asset_query(action="resolve")`)**: 원시 경로, UUID 및 서브 에셋(`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`)을 자동으로 해석합니다. `set_component_property` 및 `update_component`에 완전히 통합되어 심층적인 자동 해석을 제공합니다.
- **Spine / FastSpine 설정 헬퍼 (`spine_setup`)**: 단 한 번의 호출로 신속하게 캐릭터 리그를 초기화합니다. `FastSpine` 또는 `sp.Skeleton`을 마운트하고, 스켈레톤 데이터 에셋을 바인딩하며, 기본 애니메이션 및 루프 모드를 구성하고 UITransform을 자동 동기화합니다.
- **컴파일러 감시기 (`compile_status`) 및 방어적 기본값**: 스크립트 편집 후 Cocos Creator의 TypeScript/JavaScript 컴파일 완료를 모니터링하고 대기하여 경쟁 상태를 제거합니다. 디버그 및 서버 도구 전반에 안전한 방어적 기본값을 추가하고, 알 수 없는 작업에 대해 명확한 지침을 제공합니다.
- **100% 영어 코드베이스 및 완전한 i18n 아키텍처**: 모든 확장 프로그램 소스 코드, 주석, 오류 메시지 및 로그를 전문적인 영어로 표준화하고 원활한 다국어 i18n 현지화를 완벽하게 지원합니다.

---

## 도구 체계와 작업 코드

- 모든 도구는 "카테고리_작업" 명명 규칙을 따르며, 매개변수는 통일된 Schema를 사용하고 여러 작업 코드(`action`) 전환을 지원하여 유연성과 확장성을 대폭 향상시켰습니다.
- 씬, 노드, 컴포넌트, 프리팹, 에셋, 애니메이션 그래프, 배치 트랜잭션, 프로젝트, 디버깅, 환경설정, 서버 상태 및 메시지 브로드캐스트 등 에디터 작업 전반을 포괄합니다.
- 도구 호출 예시:

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

## 주요 기능 카테고리

- **batch_execute / editor_batch_execute**: 단일 IPC 트랜잭션에서 여러 도구 작업을 실행하는 원자적 배치 실행 엔진
- **animgraph_manage**: 네이티브 `.animgraph` 검사, 상태 머신 전이 및 컴포넌트 CRUD
- **scene_management / scene_hierarchy**: 씬 라이프사이클(가져오기/열기/저장/새로 만들기/닫기) 및 계층 트리
- **node_query / node_lifecycle / node_transform**: 노드 검색, 생성, 삭제, 계층 구조 및 변환
- **component_manage / set_component_property / spine_setup**: 컴포넌트 라이프사이클, 속성 설정 및 FastSpine 리그 설정
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: 프리팹 관리, 인스턴스화, 세션 스택 및 원자적 편집
- **asset_manage / asset_analyze / asset_query**: 에셋 CRUD, 의존성 추적 및 스마트 서브 에셋 해석
- **debug_console / debug_logs / compile_status**: 콘솔 모니터링, 프로젝트 로그 검색 및 TS 컴파일러 감시기
- **project_manage / project_build_system**: 프로젝트 실행, 빌드 패널 제어 및 미리보기 서버
- **preferences_manage**: 에디터 환경설정 관리
- **server_information / server_connectivity**: 서버 IP 목록, 포트 검사 및 연결 진단
- **broadcast_log_management / broadcast_listener_management**: 에디터 내부 이벤트 모니터링 및 브로드캐스트

---

## 빠른 시작

`pts-cc-mcp`는 **Streamable HTTP**(`/mcp`) 및 **Server-Sent Events (SSE)**(`/sse`) 듀얼 전송 방식을 지원합니다.

### 1. Claude CLI 설정

```bash
# Streamable HTTP (기본 권장)
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# 또는 Server-Sent Events (SSE) 사용
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Claude 데스크톱 설정

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

*또는 SSE 전송 방식 설정:*

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

### 3. Cursor 및 Windsurf 설정

Cursor 또는 Windsurf의 MCP 설정(`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*(필요한 경우 `"url": "http://127.0.0.1:3000/sse"`로 지정할 수도 있습니다).*

---

## ⚠️ 필수 선결 조건 및 피어 의존성

> **중요: `pts-cc-mcp`를 사용하려면 프로젝트에 `pts-core` 확장 프로그램이 설치되어 있어야 합니다.**
>
> **왜 `pts-core`가 필수인가요?**  
> Cocos Creator 3.8+는 **에디터 메인 프로세스**(`pts-cc-mcp`가 실행되는 곳)와 **씬 실행 프로세스**(게임 씬, 컴포넌트 및 live `@ccclass` 엔진 런타임이 실행되는 곳)가 완전히 분리된 멀티 프로세스 아키텍처를 사용합니다.  
>
> `pts-cc-mcp`는 `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`를 호출하여 엔진에 IPC 요청을 보내 씬 명령을 실행합니다. 이 씬 스크립트(`src/_cc.js`)는 `pts-core` 확장 프로그램 내부에 직접 호스팅되어 있습니다.  
>
> `pts-core`가 없으면 라이브 씬 런타임이 필요한 도구(`component_*`, `node_node_transform`, `scene_inspect_scene`, `game_*`, `component_query_class_info` 등)가 씬 노드와 상호작용할 수 없습니다.

> **최초 설치 또는 업그레이드 전 주의사항:**  
> 반드시 프로젝트의 `settings/` 디렉터리 아래에 있는 `mcp-server.json`과 `tool-manager.json` 두 파일을 삭제하세요. 그렇지 않으면 도구 목록 캐시로 인해 표시 이상이 발생할 수 있습니다!  
> 파일 경로: `<Project>/settings/mcp-server.json` 및 `<Project>/settings/tool-manager.json`.  
> 이 두 파일을 삭제한 후 확장 프로그램 패널을 다시 열면 모든 도구가 깨끗하게 재동기화됩니다.

## 설치 안내

### 1. 확장 프로그램 파일 배치

`pts-core`와 `pts-cc-mcp` 두 확장 프로그램이 모두 Cocos Creator 프로젝트의 `extensions/` 디렉터리 내에 배치되어 있는지 확인합니다:

```
YourProject/
├── assets/
├── extensions/
│   ├── pts-core/                  <- 필수: 코어 엔진 및 씬 스크립트 런타임 (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- MCP 서버 및 도구 제공 확장 프로그램
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
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

1. Cocos Creator를 재시작하거나 확장 프로그램 관리자를 새로고침합니다(**확장 > 확장 관리자**).
2. **pts-core**와 **pts-cc-mcp**가 모두 활성화되어 있는지 확인합니다.
3. `확장 > pTS MCP Server`를 클릭하여 제어판을 엽니다.
4. 서버는 기본적으로 `3000` 포트에서 실행됩니다(패널에서 변경 가능).

---

## 개발

### 프로젝트 구조
```
pts-cc-mcp/
├── source/                    # TypeScript 소스 파일
│   ├── main.ts               # 플러그인 진입점
│   ├── mcp-server.ts         # MCP 서버 구현
│   ├── settings.ts           # 설정 관리
│   ├── types/                # TypeScript 타입 정의
│   ├── utils/                # 유틸리티 (에셋 리졸버, Schema 호환, JSON 유틸리티)
│   ├── tools/                # 도구 구현
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
│   ├── panels/               # UI 패널 구현
│   └── test/                 # 테스트 파일
├── dist/                     # 컴파일된 JavaScript 출력
├── static/                   # 정적 에셋(아이콘 등)
├── i18n/                     # 다국어 리소스 파일
├── package.json              # 플러그인 설정
└── tsconfig.json             # TypeScript 설정
```

### 소스에서 빌드

```bash
# 개발용 감시 모드
npm run watch

# 프로덕션 빌드
npm run build
```

---

## 시스템 요구 사항

- Cocos Creator 3.8.6 이상
- Node.js (Cocos Creator 내장)
- TypeScript (개발 의존성으로 설치)

## 라이선스

본 플러그인은 Cocos Creator 프로젝트용으로 설계되었으며, 학습 및 개발 목적으로 전체 소스 코드가 포함되어 있습니다.
