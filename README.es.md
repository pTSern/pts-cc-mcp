# Plugin de servidor MCP para Cocos Creator (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un plugin de servidor MCP (Model Context Protocol) completo y de código abierto para Cocos Creator 3.8+ que permite a los asistentes de codificación con IA (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) inspeccionar, crear, validar y manipular juegos de Cocos Creator mediante un protocolo estandarizado.

**🚀 ¡Con transporte dual Streamable HTTP y SSE, 16 herramientas de intención unificadas (231 códigos de operación), generación declarativa de UI en un solo paso, base de conocimiento de reflexión sin conexión, edición de animaciones por fotogramas clave en línea de tiempo y comparación de instantáneas para regresión de escenas/recursos!**

---

## 🙏 Agradecimientos y créditos

Este proyecto se originó como una bifurcación de código abierto de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) creado por **LiDaxian**. Expresamos nuestra sincera gratitud y aprecio a **LiDaxian** y a todos los colaboradores de la comunidad por sentar las bases arquitectónicas y abrir el camino para el desarrollo de Cocos Creator impulsado por IA.

`pts-cc-mcp` se basa en estos cimientos como una extensión 100% de código abierto e impulsada por la comunidad, reemplazando todas las funciones de código cerrado o comerciales con equivalentes superiores de código abierto.

---

## 🚀 Registro de cambios de la versión 1.6.0: La arquitectura profesional unificada

### 1. Transporte dual Streamable HTTP y Server-Sent Events (SSE) (Fase 1)
- Soporte nativo completo para Streamable HTTP (`/mcp`) y Server-Sent Events (`/sse` y `/messages`) de `@modelcontextprotocol/sdk` en el puerto `3121`.
- Gestión de sesiones aislada por cliente, pulso de actividad (heartbeat keep-alive) y encabezados CORS para clientes de IA modernos.

### 2. Arquitectura de códigos de operación unificada a nivel de intención (Fase 2)
- Reemplazo de más de 50 esquemas dispersos por **16 herramientas de intención unificadas** que cubren 231 operaciones (despacho de códigos de operación `action`).
- Reduce el consumo de tokens de esquema en más de un 70% en las ventanas de contexto de los LLM, manteniendo compatibilidad retrospectiva con llamadas de herramientas heredadas.

### 3. Generador declarativo de UI y escenas en un solo paso (Fase 3)
- `ui_builder`: Construye grafos de interfaz de usuario complejos (`build_tree`, `create_dialog`, `create_button`, `create_list`) con creación automática de `UITransform`, resolución de restricciones (anclas de Widget, márgenes de Layout) e instantáneas automáticas de reversión ante errores.

### 4. Base de conocimiento de reflexión integrada de Cocos Creator 3.8 (Fase 4)
- `knowledge_query`: Reglas arquitectónicas en memoria y diccionarios `@property` para componentes integrados 2D/3D (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), guías de resolución de diseño y fórmulas de conversión de coordenadas.
- Verificación automatizada de `AGENTS.md` y generador de documentación (`get_mcp_guide`, `sync_agents_doc`).

### 5. Editor de animación de línea de tiempo y curvas de fotogramas clave (Fase 5)
- `anim_manage`: Creación directa de pistas `.anim` (`cc.AnimationClip`) con interpolación de curvas Bézier cúbica, lineal y constante.
- Disparadores de eventos de animación, ajustes preestablecidos de movimiento rápido (`bounce_pop`, `fade_in`, `fade_out`, `shake`) y recorte automatizado de tomas de animación FBX multi-toma.

### 6. Diagnóstico de escenas/recursos y comparación de instantáneas (Fase 6)
- `validation_manage`: Detección de colisiones de nombres entre hermanos, diagnóstico de `UITransform` faltantes y escaneo recursivo profundo de recursos verificando referencias `__uuid__` de componentes de escena contra `asset-db`.
- Creación de instantáneas del estado de la escena con hash SHA-256 (`capture_snapshot`) y tablas comparativas de regresión visuales en Markdown (`diff_snapshot`).

---

## 🛠️ Tabla de referencia rápida de las 16 herramientas de intención

| Herramienta de intención | Argumentos clave | Propósito y mejores prácticas |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Ciclo de vida de la escena, inspección completa del árbol y scripts de escena. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Búsqueda universal de nodos, creación, transformación y manipulación de la jerarquía. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Añadir/eliminar componentes, actualización profunda de propiedades con autoguardado, vinculación de eventos de clic y reflexión @ccclass. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Ciclo de vida completo de prefabs, sesiones de edición no destructivas y edición atómica por lotes. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Generación declarativa de UI en un solo paso con auto-UITransform, restricciones Widget y Layouts. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Edición de AnimationClip de línea de tiempo, curvas de propiedad, modos de aceleración (easing), eventos de animación, preajustes, recorte de FBX y máquinas de estado AnimGraph. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Descubrimiento de recursos, inspección de dependencias y resolución inteligente de subrecursos (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Referencia arquitectónica sin conexión para componentes, coordenadas, reglas y documentación MCP en vivo. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Auditoría automatizada de UITransforms faltantes, recursos corruptos, nodos fuera de límites y comparación de regresión visual de instantáneas. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Ejecución atómica por lotes en el mismo proceso de múltiples operaciones en una única transacción IPC. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Configuración de compilación, control del servidor de previsualización y monitor de compilación de TypeScript. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Manipulación de la cámara de la vista del editor y superposiciones. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Configuración rápida de rigs de esqueletos Spine o FastSpine en una sola llamada. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Monitoreo de la consola del editor y telemetría de rendimiento. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Configuración de preferencias del editor. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Monitoreo de eventos del editor y difusión. |

---

## 📖 Flujos de trabajo estándar de MCP

### A. Inspección de grafos de escena o prefab
* Use `scene_manage(action="inspect")` para inspeccionar la jerarquía de la escena, componentes y propiedades en árboles JSON o Markdown formateados.
* Use `scene_manage(action="hierarchy", includeComponents=true)` para listar los nodos activos en la escena en vivo o prefab abierto.

### B. Modificación de componentes en la escena activa
* Use `component_manage(action="update")` para actualizaciones profundas de propiedades (`config.sid`, `config.data`), instanciación de objetos `@ccclass` anidados y arrays de recursos (`onUpdates`, `onChanged`).
* Use `scene_manage(action="save")` para guardar los cambios en la escena.

### C. Modificación de componentes / nodos en prefabs
* **Si el prefab está abierto / en inspección actualmente:**
  1. `node_manage(action="query")` para localizar el nodo de destino.
  2. `component_manage(action="add")` (para adjuntar nuevos scripts) o `component_manage(action="update")` (para establecer datos).
  3. `prefab_manage(action="save")` para guardar.
* **Si el prefab está en segundo plano (no abierto):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` para localizar el nodo de destino.
  3. `component_manage(action="update")` para aplicar los cambios.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* O use edición atómica: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Reflexión de clases y tipos
* Use `component_manage(action="query_class_info")` para inspeccionar atributos de reflexión `@ccclass`, valores predeterminados y metadatos `@property` antes de asignar valores.

### E. Generación declarativa de UI
* Use `ui_builder(action="build_tree", parent="Canvas", tree={...})` para construir jerarquías de UI completas (paneles, botones, etiquetas, sprites, vistas con scroll) con UITransforms calculados automáticamente y restricciones Widget en una sola llamada atómica.

### F. Animación por fotogramas clave en línea de tiempo y recorte de FBX
* Cree clips `.anim` con curvas de propiedades: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Aplique ajustes preestablecidos de movimiento: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Recorte modelos FBX multi-toma: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Diagnóstico de escenas/recursos y comparación de regresión de instantáneas
* Capture una instantánea base de la escena antes de realizar modificaciones: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Compare la escena contra la instantánea tras las ediciones: `validation_manage(action="diff_snapshot")`.
* Audite la jerarquía de la escena para detectar errores de diseño: `validation_manage(action="check_scene")`.
* Escanee el proyecto y la escena para encontrar referencias GUID rotas: `validation_manage(action="check_assets")`.

---

## ⚡ Inicio rápido

`pts-cc-mcp` utiliza por defecto el puerto `3121` con soporte de transporte dual: **Streamable HTTP** (`/mcp`) y **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuración de Claude CLI

```bash
# Streamable HTTP (Predeterminado)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# O mediante Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Configuración de Claude Desktop

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

*O configurado con transporte SSE:*

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

### 3. Configuración de Cursor y Windsurf

En la configuración MCP de Cursor o Windsurf (`.cursor/mcp.json`):

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

## ⚠️ Requisitos previos y dependencia de pares obligatoria

> **IMPORTANTE: `pts-cc-mcp` requiere que la extensión `pts-core` esté instalada en su proyecto.**
>
> **¿Por qué es obligatorio `pts-core`?**  
> Cocos Creator 3.8+ utiliza una arquitectura multiproceso en la que el **Proceso principal del editor** (donde se ejecuta `pts-cc-mcp`) está completamente separado del **Proceso de ejecución de la escena** (donde se ejecutan la escena del juego, los componentes y el runtime activo del motor `@ccclass`).  
>
> `pts-cc-mcp` ejecuta comandos de escena llamando a `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. El script de escena (`src/_cc.js`) se aloja directamente dentro de `pts-core`.  
>
> Sin `pts-core`, las herramientas que requieren el runtime de la escena en vivo (como `component_*`, `node_manage`, `scene_manage`, `ui_builder` y `validation_manage`) no pueden interactuar con los nodos de la escena.

---

## Instalación y configuración

### 1. Ubicar los archivos de las extensiones
Asegúrese de colocar TANTO `pts-core` como `pts-cc-mcp` dentro del directorio `extensions/` de su proyecto Cocos Creator:

```
SuProyecto/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBLIGATORIO: Motor central y runtime del script de escena (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- Servidor MCP y proveedor de herramientas
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Instalar y compilar extensiones
```bash
# 1. Configurar pts-core (si compila desde el código fuente)
cd extensions/pts-core
npm install
npm run build

# 2. Configurar pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Habilitar la extensión en Cocos Creator
1. Reinicie Cocos Creator o recargue el Administrador de extensiones (**Extensiones > Administrador de extensiones**).
2. Verifique que tanto **pts-core** como **pts-cc-mcp** estén habilitados.
3. Haga clic en `Extensiones > pTS MCP Server` para abrir el panel de control.
4. El servidor se ejecuta en el puerto `3121` por defecto (configurable en el panel).

---

## Estructura del proyecto

```
pts-cc-mcp/
├── source/                    # Archivos fuente de TypeScript
│   ├── main.ts               # Punto de entrada del plugin y verificación de arranque
│   ├── mcp-server.ts         # Capa de transporte Streamable HTTP y SSE
│   ├── settings.ts           # Gestión de ajustes y configuración
│   ├── types/                # Definiciones de tipos de TypeScript
│   ├── utils/                # Utilidades
│   │   ├── agents-doc-generator.ts # Generador y sincronizador de plantillas AGENTS.md
│   │   ├── asset-resolver.ts       # Resolutor inteligente de UUID de subrecursos
│   │   ├── json-utils.ts           # Análisis y reparación defensiva de JSON
│   │   └── i18n.ts                 # Motor de traducción multilingüe
│   ├── tools/                # Implementaciones de subsistemas y herramientas unificadas
│   │   ├── intent-dispatcher.ts    # Enrutador de códigos de operación y 16 APIs de intención
│   │   ├── ui-builder-tools.ts     # Generador declarativo de UI en un solo paso
│   │   ├── knowledge-tools.ts      # Base de conocimiento de reflexión sin conexión
│   │   ├── animation-tools.ts      # Editor de AnimationClip y recorte de FBX
│   │   ├── validation-tools.ts     # Diagnóstico de escenas y diferencias de regresión
│   │   ├── batch-tools.ts          # Motor de ejecución atómica por lotes
│   │   ├── scene-tools.ts          # Gestión del ciclo de vida de la escena
│   │   ├── node-tools.ts           # Operaciones de árbol y transformación de nodos
│   │   ├── component-tools.ts      # Reflexión de componentes y actualizador de propiedades
│   │   ├── prefab-tools.ts         # Pila de sesiones de prefab y edición atómica
│   │   ├── asset-advanced-tools.ts # Búsqueda y resolución en base de datos de recursos
│   │   ├── project-tools.ts        # Ejecución de compilación y vista previa
│   │   ├── debug-tools.ts          # Logs de consola y monitor del compilador de TS
│   │   └── preferences-tools.ts    # Gestión de ajustes del usuario
│   └── panels/               # Implementación del panel UI de Vue 3 con evaluador de herramientas
├── dist/                     # Salida de JavaScript compilado
├── static/                   # Recursos estáticos (iconos, estilos, plantillas)
├── i18n/                     # Diccionarios de internacionalización
├── package.json              # Manifiesto de extensión y contribuciones
└── tsconfig.json             # Configuración de compilación de TypeScript
```

---

## Licencia

Este plugin es de código abierto bajo la Licencia MIT y está diseñado para el desarrollo de juegos con Cocos Creator.
