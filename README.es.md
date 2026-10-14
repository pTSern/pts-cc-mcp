# Complemento de servidor MCP para Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un completo complemento de servidor MCP (Model Context Protocol) para Cocos Creator 3.8+ que permite a los asistentes de IA interactuar con el editor de Cocos Creator mediante un protocolo estandarizado. Instalación y uso con un solo clic, sin necesidad de entornos ni configuraciones tediosas. Probado con el cliente de escritorio de Claude, Claude CLI, Cursor y Windsurf; otros editores compatibles con MCP también funcionan a la perfección.

**🚀 ¡Ahora cuenta con una arquitectura de herramientas unificada, ejecución atómica por lotes y soporte nativo de Animation Graph para un 99% de control del editor!**

## 🙏 Agradecimientos y créditos

Este proyecto se originó como una bifurcación de código abierto de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) creado por **LiDaxian**. Expresamos nuestra sincera gratitud y aprecio a **LiDaxian** y a todos los colaboradores de la comunidad por establecer la arquitectura fundamental y abrir el camino para el desarrollo de Cocos Creator impulsado por IA.

`pts-cc-mcp` se construye sobre esta base como una extensión totalmente de código abierto e impulsada por la comunidad con:
- **Código base 100% en inglés** con soporte de localización multilingüe i18n
- **Motor de ejecución atómica por lotes en el mismo proceso** (`batch_execute` / `editor_batch_execute`)
- **Inspección y edición nativa de máquinas de estado de Animation Graph** (`.animgraph`)
- **Pila de sesiones de prefab segura** con recuperación automática que elimina bloqueos al salir de la escena
- **Resolutor recursivo inteligente de recursos** (`@spriteFrame`, `@texture`, rutas directas, UUIDs)
- **Configuración automatizada de rigs de personajes para Spine y FastSpine**
- **Monitor del compilador TypeScript** (`compile_status`) que elimina condiciones de carrera en la compilación de scripts

## Registro de cambios de la versión de código abierto

### 🚀 Actualización importante v1.6.0 (Fase 1: Transporte dual Streamable HTTP y SSE)

- **Motor de transporte dual Streamable HTTP y Server-Sent Events (SSE)**: Compatibilidad nativa completa con `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) y Server-Sent Events (`/sse` y `/messages`), junto con el endpoint directo JSON-RPC de respaldo sin estado. Proporciona gestión aislada del ciclo de vida de sesiones por cliente, limpieza automática de sesiones inactivas y encabezados CORS completos para los entornos de desarrollo modernos de IA (Claude CLI, Cursor, Windsurf, VS Code).
- **Desacoplamiento del núcleo de scripts de escena**: Dependencia de pares verificada y documentada sobre `pts-core` para la ejecución de scripts de escena (`src/_cc.js`), asegurando una separación limpia entre la traducción del protocolo MCP y la manipulación de la escena en el motor de Cocos Creator.

### 🚀 Actualización importante v1.5.4

- **Ejecución atómica por lotes en el mismo proceso (`batch_execute` / `editor_batch_execute`)**: Ejecuta múltiples operaciones de herramientas en una única transacción secuencial IPC dentro del mismo proceso. Reduce drásticamente los viajes de ida y vuelta HTTP y el consumo de tokens, con soporte para `stopOnError` y guardado automático de escenas/prefabs.
- **Motor de gráficos de animación (`animgraph_manage`)**: Inspección y modificación nativa de archivos `.animgraph`. Inspecciona máquinas de estado, estados, transiciones y parámetros; añade, actualiza o elimina `StateMachineComponent`s; y migra masivamente tipos de clases de componentes con sincronización automática de la base de datos de recursos.
- **Pila de sesiones de prefab y recuperación segura**: Registra la URL/UUID de la escena activa al entrar (`enter`), restaura automáticamente la escena previa al salir (`exit`) y busca escenas válidas en el proyecto si no se encuentran, eliminando por completo los bloqueos por `"Target scene does not exist"`. Incluye `atomic_edit` para ciclos fluidos de entrar $\to$ editar $\to$ guardar $\to$ salir.
- **Resolutor inteligente de recursos y subrecursos (`asset_query(action="resolve")`)**: Resuelve automáticamente rutas directas, UUIDs y subrecursos (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`). Completamente integrado en `set_component_property` y `update_component` para resolución automática recursiva profunda.
- **Asistente de configuración de Spine y FastSpine (`spine_setup`)**: Inicialización rápida del rig de personajes en una sola llamada. Adjunta `FastSpine` o `sp.Skeleton`, vincula el recurso de datos de esqueleto, configura la animación predeterminada, el modo de bucle y sincroniza el UITransform.
- **Monitor de compilación (`compile_status`) y valores predeterminados defensivos**: Monitorea y espera a que finalice la compilación de TypeScript/JavaScript en Cocos Creator para eliminar condiciones de carrera tras editar scripts. Se añadieron valores predeterminados defensivos en las herramientas de depuración y servidor con orientación clara ante acciones desconocidas.
- **Código base 100% en inglés y arquitectura de internacionalización completa (i18n)**: Todo el código fuente de la extensión, comentarios, mensajes de error y registros se han estandarizado en inglés profesional, con soporte completo de localización multilingüe i18n.

---

## Sistema de herramientas y códigos de operación

- Todas las herramientas se nombran con el patrón "categoría_operación", con parámetros que siguen un esquema unificado y admiten el cambio entre múltiples códigos de operación (`action`), mejorando enormemente la flexibilidad y la extensibilidad.
- Cobertura completa en escenas, nodos, componentes, prefabs, recursos, gráficos de animación, transacciones por lotes, proyectos, depuración, preferencias, estado del servidor y difusión de mensajes.
- Ejemplo de llamada a una herramienta:

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

## Principales categorías de funciones

- **batch_execute / editor_batch_execute**: Motor de ejecución atómica por lotes que ejecuta múltiples operaciones en una única transacción IPC
- **animgraph_manage**: Inspección nativa de `.animgraph`, transiciones de máquinas de estado y operaciones CRUD de componentes
- **scene_management / scene_hierarchy**: Ciclo de vida de escenas (obtener/abrir/guardar/crear/cerrar) y árboles de jerarquía
- **node_query / node_lifecycle / node_transform**: Búsqueda, creación, eliminación, jerarquía y transformaciones de nodos
- **component_manage / set_component_property / spine_setup**: Ciclo de vida de componentes, asignador estricto de propiedades y configuración de rigs FastSpine
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: Gestión de prefabs, instanciación, pila de sesiones y edición atómica
- **asset_manage / asset_analyze / asset_query**: CRUD de recursos, trazado de dependencias y resolución inteligente de subrecursos
- **debug_console / debug_logs / compile_status**: Monitoreo de consola, búsqueda de registros del proyecto y monitor del compilador de TS
- **project_manage / project_build_system**: Ejecución del proyecto, control del panel de compilación y servidor de vista previa
- **preferences_manage**: Gestión de preferencias del editor
- **server_information / server_connectivity**: Lista de IP del servidor, inspección de puertos y diagnóstico de conectividad
- **broadcast_log_management / broadcast_listener_management**: Monitoreo de eventos del editor y difusión de mensajes

---

## Inicio rápido

`pts-cc-mcp` proporciona soporte de transporte dual: **Streamable HTTP** (`/mcp`) y **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuración de Claude CLI

```bash
# Streamable HTTP (Predeterminado)
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# O mediante Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Configuración de Claude Desktop

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

*O configurado con transporte SSE:*

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

### 3. Configuración de Cursor y Windsurf

En la configuración de MCP de Cursor o Windsurf (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*(También puede especificar `"url": "http://127.0.0.1:3000/sse"` si lo prefiere).*

---

## ⚠️ Requisitos previos y dependencia de pares obligatoria

> **IMPORTANTE: `pts-cc-mcp` requiere que la extensión `pts-core` esté instalada en su proyecto.**
>
> **¿Por qué es obligatorio `pts-core`?**  
> Cocos Creator 3.8+ utiliza una arquitectura multiproceso en la que el **Proceso principal del editor** (donde se ejecuta `pts-cc-mcp`) está completamente separado del **Proceso de ejecución de la escena** (donde se ejecutan la escena del juego, los componentes y el runtime activo del motor `@ccclass`).  
>
> `pts-cc-mcp` ejecuta comandos de escena llamando a `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. El script de escena (`src/_cc.js`) se aloja directamente dentro de `pts-core`.  
>
> Sin `pts-core`, las herramientas que requieren el runtime de la escena en vivo (como `component_*`, `node_node_transform`, `scene_inspect_scene`, `game_*` y `component_query_class_info`) no pueden interactuar con los nodos de la escena.

> **Antes de instalar por primera vez o actualizar:**  
> Asegúrese de eliminar `mcp-server.json` y `tool-manager.json` dentro del directorio `settings/` de su proyecto; de lo contrario, el almacenamiento en caché de la lista de herramientas podría causar problemas de visualización.  
> Rutas de los archivos: `<Proyecto>/settings/mcp-server.json` y `<Proyecto>/settings/tool-manager.json`.  
> Al volver a abrir el panel de la extensión tras eliminar estos dos archivos, todas las herramientas se sincronizarán limpiamente.

## Instalación

### 1. Ubicar los archivos de las extensiones

Asegúrese de colocar TANTO `pts-core` como `pts-cc-mcp` dentro del directorio `extensions/` de su proyecto Cocos Creator:

```
SuProyecto/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBLIGATORIO: Motor central y runtime del script de escena (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- Servidor MCP y proveedor de herramientas
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
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

### 3. Habilitar complementos en Cocos Creator

1. Reinicie Cocos Creator o recargue el Administrador de extensiones (**Extensiones > Administrador de extensiones**).
2. Verifique que tanto **pts-core** como **pts-cc-mcp** estén habilitados.
3. Haga clic en `Extensiones > pTS MCP Server` para abrir el panel de control.
4. El servidor se ejecuta en el puerto `3000` por defecto (configurable en el panel).

---

## Desarrollo

### Estructura del proyecto
```
pts-cc-mcp/
├── source/                    # Archivos fuente de TypeScript
│   ├── main.ts               # Punto de entrada del complemento
│   ├── mcp-server.ts         # Implementación del servidor MCP
│   ├── settings.ts           # Gestión de configuración
│   ├── types/                # Definiciones de tipos de TypeScript
│   ├── utils/                # Utilidades (resolutor de recursos, compatibilidad de esquemas, utilidades JSON)
│   ├── tools/                # Implementaciones de herramientas
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
│   ├── panels/               # Implementación del panel de UI
│   └── test/                 # Archivos de prueba
├── dist/                     # Salida de JavaScript compilado
├── static/                   # Recursos estáticos (iconos, etc.)
├── i18n/                     # Archivos de internacionalización
├── package.json              # Configuración del complemento
└── tsconfig.json             # Configuración de TypeScript
```

### Compilar desde el código fuente

```bash
# Modo de vigilancia para desarrollo
npm run watch

# Compilación de producción
npm run build
```

---

## Requisitos del sistema

- Cocos Creator 3.8.6 o superior
- Node.js (incluido con Cocos Creator)
- TypeScript (instalado como dependencia de desarrollo)

## Licencia

Este complemento está diseñado para proyectos de Cocos Creator, e incluye el código fuente completo para el aprendizaje y desarrollo.
