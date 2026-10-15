# Плагин MCP-сервера для Cocos Creator (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Русский** · [Tiếng Việt](README.vi.md)

Комплексный плагин сервера Model Context Protocol (MCP) с открытым исходным кодом для Cocos Creator 3.8+, позволяющий AI-ассистентам программирования (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) инспектировать, создавать, валидировать и модифицировать игры Cocos Creator по стандартизированному протоколу.

**🚀 Включает двойной транспорт Streamable HTTP и SSE, 16 унифицированных инструментов намерений (231 опкод), декларативное создание UI за один запрос, встроенную базу знаний рефлексии без подключения к сети, редактирование покадровой анимации на таймлайне и визуальное сравнение снимков сцен/ассетов для контроля регрессий!**

---

## 🙏 Благодарности и авторы

Этот проект возник как открытый форк [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server), созданного **LiDaxian**. Мы выражаем искреннюю благодарность и признательность **LiDaxian** и всем контрибьюторам сообщества за создание базовой архитектуры и открытие пути к разработке в Cocos Creator с помощью AI.

`pts-cc-mcp` развивает этот фундамент как полностью открытое, управляемое сообществом расширение, заменяя все закрытые и коммерческие функции превосходящими аналогами с открытым исходным кодом.

---

## 🚀 История изменений версии 1.6.0: Унифицированная Pro-архитектура

### 1. Двойной транспорт Streamable HTTP и Server-Sent Events (SSE) (Фаза 1)
- Полная нативная поддержка `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) и Server-Sent Events (`/sse` и `/messages`) на порту `3121`.
- Изолированное управление жизненным циклом сессий клиентов, heartbeat для поддержания соединения (keep-alive) и CORS-заголовки для современных AI-клиентов.

### 2. Унифицированная архитектура опкодов на уровне намерений (Фаза 2)
- Замена более 50 разрозненных схем на **16 унифицированных инструментов намерений**, покрывающих 231 операцию (диспетчеризация опкодов через `action`).
- Сокращение расхода токенов схем более чем на 70% в окне контекста LLM с сохранением обратной совместимости с устаревшими вызовами инструментов.

### 3. Декларативный конструктор UI и сцен за один запрос (Фаза 3)
- `ui_builder`: Построение сложных графов интерфейса (`build_tree`, `create_dialog`, `create_button`, `create_list`) с автоматическим созданием `UITransform`, разрешением ограничений (якоря Widget, отступы Layout) и автоматическим откатом по снимку при ошибке.

### 4. Встроенная база знаний рефлексии Cocos Creator 3.8 (Фаза 4)
- `knowledge_query`: Находящиеся в оперативной памяти архитектурные правила и словари `@property` для встроенных 2D/3D компонентов (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), руководства по расчетному разрешению и формулы преобразования координат.
- Автоматизированная проверка `AGENTS.md` и генератор документации (`get_mcp_guide`, `sync_agents_doc`).

### 5. Редактор покадровой анимации на таймлайне и кривых Безье (Фаза 5)
- `anim_manage`: Прямое создание дорожек `.anim` (`cc.AnimationClip`) с кубической интерполяцией Безье, линейной и константной интерполяцией.
- Триггеры событий анимации, быстрые пресеты движения (`bounce_pop`, `fade_in`, `fade_out`, `shake`) и автоматическое разбиение анимационных дублей multi-take FBX.

### 6. Диагностика сцен/ассетов и сравнение снимков (Фаза 6)
- `validation_manage`: Обнаружение коллизий имен одноуровневых узлов, диагностика отсутствующих `UITransform` и глубокое рекурсивное сканирование ассетов со сверкой ссылок `__uuid__` компонентов сцены с `asset-db`.
- Создание снимков состояния сцены с хешем SHA-256 (`capture_snapshot`) и таблицы визуального сравнения регрессий в формате Markdown (`diff_snapshot`).

---

## 🛠️ Шпаргалка по 16 унифицированным инструментам намерений

| Инструмент намерения | Ключевые аргументы | Назначение и рекомендации |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Жизненный цикл сцены, полная инспекция дерева и скрипты сцены. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Универсальный поиск узлов, создание, трансформация и управление иерархией. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Добавление/удаление компонентов, глубокое обновление свойств с автосохранением, привязка кликов и рефлексия @ccclass. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Полный жизненный цикл префабов, неразрушающие сессии редактирования и атомарное пакетное редактирование. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Декларативная генерация UI за 1 шаг с автосозданием UITransform, ограничениями Widget и Layout. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Редактирование AnimationClip на таймлайне, кривые свойств, режимы плавности (easing), события анимации, пресеты, разбиение FBX и конечные автоматы AnimGraph. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Обнаружение ассетов, инспекция зависимостей и умное разрешение подассетов (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Офлайн-справочник по архитектуре компонентов, координатам, правилам и актуальная документация MCP. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Автоматизированный аудит отсутствующих UITransform, поврежденных ассетов, узлов вне области видимости и визуальное сравнение снимков. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Внутрипроцессное атомарное пакетное выполнение нескольких операций в одной IPC-транзакции. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Настройки сборки, управление сервером предпросмотра и наблюдение за компиляцией TypeScript. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Управление камерой в окне редактора и наложения (overlays). |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Быстрая настройка скелетов Spine или FastSpine в один вызов. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Мониторинг консоли редактора и телеметрия производительности. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Управление настройками редактора. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Мониторинг событий редактора и широковещание. |

---

## 📖 Стандартные рабочие процессы MCP

### A. Инспекция графа сцены или префаба
* Используйте `scene_manage(action="inspect")` для инспекции иерархии сцены, компонентов и свойств в виде отформатированных деревьев JSON или Markdown.
* Используйте `scene_manage(action="hierarchy", includeComponents=true)` для получения списка активных узлов в текущей сцене или открытом префабе.

### B. Модификация компонентов в активной сцене
* Используйте `component_manage(action="update")` для глубокого обновления свойств (`config.sid`, `config.data`), инстанцирования вложенных объектов `@ccclass` и массивов ассетов (`onUpdates`, `onChanged`).
* Используйте `scene_manage(action="save")` для сохранения изменений в сцене.

### C. Модификация компонентов / узлов в префабах
* **Если префаб в данный момент открыт / инспектируется:**
  1. `node_manage(action="query")` для поиска целевого узла.
  2. `component_manage(action="add")` (для добавления скрипта) или `component_manage(action="update")` (для установки данных).
  3. `prefab_manage(action="save")` для сохранения.
* **Если префаб в фоновом режиме (не открыт):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` для поиска целевого узла.
  3. `component_manage(action="update")` для применения изменений.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Либо используйте атомарное редактирование: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Рефлексия классов и типы
* Используйте `component_manage(action="query_class_info")` для проверки атрибутов рефлексии `@ccclass`, значений по умолчанию и метаданных `@property` перед присвоением значений.

### E. Декларативная генерация UI
* Используйте `ui_builder(action="build_tree", parent="Canvas", tree={...})` для создания полноценных UI-иерархий (панели, кнопки, надписи, спрайты, списки с прокруткой) с автоматически рассчитанными UITransform и ограничениями Widget за один атомарный вызов.

### F. Покадровая анимация на таймлайне и нарезка FBX
* Создание клипов `.anim` с кривыми свойств: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Применение пресетов движения: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Нарезка составных моделей FBX с несколькими дублями: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Диагностика сцен/ассетов и сравнение снимков
* Сделайте базовый снимок сцены перед внесением правок: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Сравните сцену со снимком после правок: `validation_manage(action="diff_snapshot")`.
* Проверьте иерархию сцены на наличие ошибок верстки: `validation_manage(action="check_scene")`.
* Просканируйте проект и сцену на наличие поврежденных ссылок GUID: `validation_manage(action="check_assets")`.

---

## ⚡ Быстрый старт

`pts-cc-mcp` по умолчанию работает на порту `3121` с поддержкой двойного транспорта: **Streamable HTTP** (`/mcp`) и **Server-Sent Events (SSE)** (`/sse`).

### 1. Конфигурация Claude CLI

```bash
# Streamable HTTP (по умолчанию)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Либо через Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Конфигурация Claude Desktop

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

*Либо с транспортом SSE:*

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

### 3. Конфигурация Cursor и Windsurf

В настройках MCP Cursor или Windsurf (`.cursor/mcp.json`):

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

## ⚠️ Предварительные требования и обязательная peer-зависимость

> **ВАЖНО: Для работы `pts-cc-mcp` необходимо, чтобы в проекте было установлено расширение `pts-core`.**
>
> **Почему `pts-core` обязателен?**  
> Cocos Creator 3.8+ использует многопроцессную архитектуру, в которой **Основной процесс редактора** (где запущен `pts-cc-mcp`) полностью отделен от **Процесса выполнения сцены** (где функционируют игровая сцена, компоненты и среда выполнения `@ccclass`).  
>
> `pts-cc-mcp` выполняет команды сцены через вызов `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. Скрипт сцены (`src/_cc.js`) расположен непосредственно внутри `pts-core`.  
>
> Без `pts-core` инструменты, требующие среды выполнения активной сцены (такие как `component_*`, `node_manage`, `scene_manage`, `ui_builder` и `validation_manage`), не смогут взаимодействовать с узлами сцены.

---

## Установка и настройка

### 1. Размещение файлов расширений
Убедитесь, что ОБА расширения `pts-core` и `pts-cc-mcp` находятся в каталоге `extensions/` вашего проекта Cocos Creator:

```
ВашПроект/
├── assets/
├── extensions/
│   ├── pts-core/                  <- ОБЯЗАТЕЛЬНО: Ядро движка и среда скриптов сцены (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- MCP-сервер и провайдер инструментов
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Установка зависимостей и сборка расширений
```bash
# 1. Сборка pts-core (если собирается из исходников)
cd extensions/pts-core
npm install
npm run build

# 2. Сборка pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Включение расширения в Cocos Creator
1. Перезапустите Cocos Creator или обновите диспетчер расширений (**Расширения > Диспетчер расширений**).
2. Убедитесь, что включены оба расширения: **pts-core** и **pts-cc-mcp**.
3. Выберите `Расширения > pTS MCP Server`, чтобы открыть панель управления.
4. По умолчанию сервер работает на порту `3121` (настраивается в панели).

---

## Структура проекта

```
pts-cc-mcp/
├── source/                    # Исходные файлы TypeScript
│   ├── main.ts               # Точка входа в плагин и проверка инициализации
│   ├── mcp-server.ts         # Транспортный уровень Streamable HTTP и SSE
│   ├── settings.ts           # Управление параметрами и конфигурацией
│   ├── types/                # Определения типов TypeScript
│   ├── utils/                # Утилиты
│   │   ├── agents-doc-generator.ts # Генератор и синхронизатор шаблонов AGENTS.md
│   │   ├── asset-resolver.ts       # Умный резолвер UUID подассетов
│   │   ├── json-utils.ts           # Защитный парсинг и исправление JSON
│   │   └── i18n.ts                 # Движок многоязычной локализации
│   ├── tools/                # Подсистемы и унифицированные реализации инструментов
│   │   ├── intent-dispatcher.ts    # Маршрутизатор опкодов и 16 API намерений
│   │   ├── ui-builder-tools.ts     # Декларативный конструктор UI за 1 шаг
│   │   ├── knowledge-tools.ts      # Офлайн-база знаний рефлексии
│   │   ├── animation-tools.ts      # Редактор AnimationClip и нарезка FBX
│   │   ├── validation-tools.ts     # Диагностика сцены и сравнение регрессий
│   │   ├── batch-tools.ts          # Движок атомарного пакетного выполнения
│   │   ├── scene-tools.ts          # Управление жизненным циклом сцены
│   │   ├── node-tools.ts           # Операции трансформации и дерева узлов
│   │   ├── component-tools.ts      # Рефлексия компонентов и обновление свойств
│   │   ├── prefab-tools.ts         # Стек сессий префабов и атомарное редактирование
│   │   ├── asset-advanced-tools.ts # Поиск и разрешение в базе ассетов
│   │   ├── project-tools.ts        # Выполнение сборки и предпросмотра
│   │   ├── debug-tools.ts          # Логи консоли и отслеживание компилятора TS
│   │   └── preferences-tools.ts    # Управление пользовательскими настройками
│   └── panels/               # UI-панель на Vue 3 с тестером инструментов
├── dist/                     # Скомпилированный JavaScript
├── static/                   # Статические ресурсы (иконки, стили, шаблоны)
├── i18n/                     # Словари локализации
├── package.json              # Манифест расширения и точки расширения
└── tsconfig.json             # Конфигурация сборки TypeScript
```

---

## Лицензия

Этот плагин имеет открытый исходный код под лицензией MIT и разработан для создания игр на Cocos Creator.
