# Complemento de servidor MCP para Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un completo complemento de servidor MCP (Model Context Protocol) para Cocos Creator 3.8+ que permite a los asistentes de IA interactuar con el editor de Cocos Creator mediante un protocolo estandarizado. Instalación y uso con un solo clic, sin necesidad de entornos ni configuraciones tediosas. Probado con el cliente de escritorio de Claude, Claude CLI, Cursor y Windsurf; otros editores compatibles con MCP también funcionan a la perfección.

**🚀 ¡Ahora cuenta con una arquitectura de herramientas unificada, ejecución atómica por lotes y soporte nativo de Animation Graph para un 99% de control del editor!**

## 🙏 Agradecimientos y Créditos (Acknowledgments & Credits)

Este proyecto se originó como una bifurcación de código abierto de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) creado por **LiDaxian**. Expresamos nuestra sincera gratitud y aprecio a **LiDaxian** y a todos los colaboradores de la comunidad por establecer la arquitectura fundamental que hizo posible el desarrollo impulsado por IA en Cocos Creator.

`pts-cc-mcp` continúa esta misión como una extensión de código abierto impulsada por la comunidad, ofreciendo:
- **Código base 100% en inglés** con soporte completo de localización multiidioma i18n
- **Motor de ejecución atómica por lotes en el mismo proceso** (`batch_execute` / `editor_batch_execute`)
- **Edición e inspección nativa de gráficos de animación** (`animgraph_manage`)
- **Pila de sesiones de prefab segura** con autorrecuperación para evitar cierres inesperados
- **Resolutor inteligente recursivo de recursos y subrecursos** (`@spriteFrame`, `@texture`, rutas y UUIDs)
- **Configuración automatizada de rigs de personajes Spine y FastSpine**
- **Monitor de estado del compilador TypeScript** (`compile_status`) para eliminar condiciones de carrera

## Registro de cambios de la versión de código abierto

## 🚀 Actualización importante v1.5.4

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

**Configuración de Claude CLI:**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Configuración de Claude Desktop:**

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

**Configuración de MCP en Cursor o VS Code:**

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

## ⚠️ Leer antes de instalar (Importante)

> **¡Antes de instalar por primera vez o actualizar, asegúrese de eliminar los archivos `mcp-server.json` y `tool-manager.json` dentro del directorio `settings/` de su proyecto; de lo contrario, el almacenamiento en caché de la lista de herramientas podría causar problemas de visualización!**
>
> Rutas de los archivos: `<Proyecto>/settings/mcp-server.json` y `<Proyecto>/settings/tool-manager.json`
> Al volver a abrir el panel de la extensión tras eliminar estos dos archivos, todas las herramientas se sincronizarán limpiamente.

## Instalación

### 1. Copiar los archivos del complemento

Copie la carpeta `pts-cc-mcp` en el directorio `extensions` de su proyecto Cocos Creator:

```
SuProyecto/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- Coloque el complemento aquí
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Instalar dependencias

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. Compilar el complemento

```bash
npm run build
```

### 4. Habilitar el complemento

1. Reinicie Cocos Creator o recargue el Administrador de extensiones
2. El complemento aparecerá en el menú Extensiones
3. Haga clic en `Extensiones > pTS MCP Server` para abrir el panel de control

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
