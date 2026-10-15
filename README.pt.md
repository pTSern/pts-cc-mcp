# Plugin de Servidor MCP para Cocos Creator (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Um plugin abrangente e de código aberto de servidor Model Context Protocol (MCP) para Cocos Creator 3.8+ que capacita assistentes de codificação com IA (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) a inspecionar, criar, validar e manipular jogos no Cocos Creator por meio de um protocolo padronizado.

**🚀 Apresentando transporte duplo Streamable HTTP e SSE, 16 ferramentas de intenção unificadas (231 opcodes), geração declarativa de UI em um único comando, base de conhecimento de reflexão offline, edição de animações por quadros-chave em linha do tempo e comparação de regressão de snapshots de cenas/ativos!**

---

## 🙏 Agradecimentos e Créditos

Este projeto originou-se como um fork de código aberto do [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) criado por **LiDaxian**. Expressamos nossa sincera gratidão e apreço a **LiDaxian** e a todos os colaboradores da comunidade por estabelecerem a arquitetura fundamental e abrirem o caminho para o desenvolvimento no Cocos Creator orientado por IA.

O `pts-cc-mcp` baseia-se nessa fundação como uma extensão 100% open source e conduzida pela comunidade, substituindo todos os recursos comerciais ou de código fechado por equivalentes superiores de código aberto.

---

## 🚀 Changelog da Versão 1.6.0: A Arquitetura Pro Unificada

### 1. Transporte Duplo Streamable HTTP e Server-Sent Events (SSE) (Fase 1)
- Suporte nativo completo a `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) e Server-Sent Events (`/sse` e `/messages`) na porta `3121`.
- Gerenciamento isolado do ciclo de vida de sessões por cliente, heartbeat keep-alive e cabeçalhos CORS para clientes de IA modernos.

### 2. Arquitetura de Opcodes Unificada a Nível de Intenção (Fase 2)
- Substituição de mais de 50 esquemas dispersos por **16 ferramentas de intenção unificadas** cobrindo 231 operações (despacho por opcode `action`).
- Reduz o consumo de tokens de esquema em mais de 70% na janela de contexto de LLMs, mantendo compatibilidade retroativa com chamadas de ferramentas legadas.

### 3. Construtor Declarativo de UI e Cenas em Um Comando (Fase 3)
- `ui_builder`: Construção de grafos de interface complexos (`build_tree`, `create_dialog`, `create_button`, `create_list`) com criação automática de `UITransform`, resolução de restrições (âncoras de Widget, margens de Layout) e snapshots de reversão automática em caso de erro.

### 4. Base de Conhecimento de Reflexão Embutida do Cocos Creator 3.8 (Fase 4)
- `knowledge_query`: Regras arquiteturais em memória e dicionários `@property` para componentes 2D/3D nativos (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), guias de resolução de design e fórmulas de conversão de coordenadas.
- Verificação automatizada de `AGENTS.md` e gerador de documentação (`get_mcp_guide`, `sync_agents_doc`).

### 5. Editor de Curvas de Quadros-Chave e Animações em Linha do Tempo (Fase 5)
- `anim_manage`: Criação direta de faixas `.anim` (`cc.AnimationClip`) com interpolação de curvas Bézier Cúbica, Linear e Constante.
- Gatilhos de eventos de animação, predefinições de movimento rápido (`bounce_pop`, `fade_in`, `fade_out`, `shake`) e divisão automatizada de tomadas de animação FBX multi-take.

### 6. Diagnóstico de Cenas/Ativos e Comparação de Snapshots (Fase 6)
- `validation_manage`: Detecção de colisão de nomes entre nós irmãos, diagnóstico de `UITransform` ausentes e scanner recursivo profundo de ativos verificando referências `__uuid__` de componentes de cena contra o `asset-db`.
- Snapshots de estado de cena com hash SHA-256 (`capture_snapshot`) e tabelas de diferenças visuais de regressão em Markdown (`diff_snapshot`).

---

## 🛠️ Tabela de Referência Rápida das 16 Ferramentas de Intenção

| Ferramenta de Intenção | Argumentos Principais | Propósito e Boas Práticas |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Ciclo de vida da cena, inspeção completa da árvore e scripts de cena. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Busca universal de nós, criação, transformação e manipulação da hierarquia. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Adicionar/remover componentes, atualização profunda de propriedades com salvamento automático, vinculação de cliques e reflexão @ccclass. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Ciclo de vida completo de prefabs, sessões de edição não destrutivas e edições atômicas em lote. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Geração declarativa de UI em 1 comando com auto-UITransform, restrições Widget e Layouts. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Edição de AnimationClip na linha do tempo, curvas de propriedades, modos de amortecimento (easing), eventos de animação, predefinições, fatiamento de FBX e máquinas de estado AnimGraph. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Descoberta de ativos, inspeção de dependências e resolução inteligente de subativos (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Referência arquitetural offline para componentes, coordenadas, regras e documentação MCP ao vivo. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Auditoria automatizada para UITransforms ausentes, ativos corrompidos, nós fora dos limites e comparação de regressão visual de snapshots. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Execução atômica em lote no mesmo processo de múltiplas operações em uma única transação IPC. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Configurações de compilação, controle do servidor de pré-visualização e monitor do compilador TypeScript. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Manipulação da câmera da viewport e sobreposições do editor. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Configuração rápida de rigs de esqueletos Spine ou FastSpine em uma única chamada. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Monitoramento do console do editor e telemetria de desempenho. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Configuração de preferências do editor. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Monitoramento de eventos do editor e transmissão. |

---

## 📖 Fluxos de Trabalho Padrão do MCP

### A. Inspeção de grafos de cena ou prefab
* Use `scene_manage(action="inspect")` para inspecionar a hierarquia da cena, componentes e propriedades em árvores formatadas em JSON ou Markdown.
* Use `scene_manage(action="hierarchy", includeComponents=true)` para listar nós ativos na cena em execução ou no prefab aberto.

### B. Modificação de componentes na cena ativa
* Use `component_manage(action="update")` para atualizações profundas de propriedades (`config.sid`, `config.data`), instanciação de objetos `@ccclass` aninhados e arrays de ativos (`onUpdates`, `onChanged`).
* Use `scene_manage(action="save")` para salvar as alterações na cena.

### C. Modificação de componentes / nós em prefabs
* **Se o prefab estiver atualmente aberto / em inspeção:**
  1. `node_manage(action="query")` para localizar o nó de destino.
  2. `component_manage(action="add")` (para anexar novos scripts) ou `component_manage(action="update")` (para definir dados).
  3. `prefab_manage(action="save")` para salvar.
* **Se o prefab estiver em segundo plano (não aberto):**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` para localizar o nó de destino.
  3. `component_manage(action="update")` para aplicar as modificações.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Ou use edição atômica: `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Reflexão de classes e tipos
* Use `component_manage(action="query_class_info")` para inspecionar atributos de reflexão `@ccclass`, valores padrão e metadados `@property` antes de atribuir valores.

### E. Geração declarativa de UI
* Use `ui_builder(action="build_tree", parent="Canvas", tree={...})` para construir hierarquias de UI completas (painéis, botões, rótulos, sprites, visões de rolagem) com UITransforms calculados automaticamente e restrições Widget em uma única chamada atômica.

### F. Animação por quadros-chave em linha do tempo e fatiamento de FBX
* Crie clipes `.anim` com curvas de propriedades: `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Aplique predefinições de movimento: `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Fatie modelos FBX multi-take: `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Diagnóstico de cenas/ativos e comparação de regressão de snapshots
* Capture um snapshot base da cena antes das modificações: `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Compare a cena com o snapshot após as edições: `validation_manage(action="diff_snapshot")`.
* Audite a hierarquia da cena contra falhas de layout: `validation_manage(action="check_scene")`.
* Escaneie o projeto e a cena em busca de referências GUID corrompidas: `validation_manage(action="check_assets")`.

---

## ⚡ Início Rápido

O `pts-cc-mcp` opera por padrão na porta `3121` com suporte a transporte duplo: **Streamable HTTP** (`/mcp`) e **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuração do Claude CLI

```bash
# Streamable HTTP (Padrão)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Ou via Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Configuração do Claude Desktop

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

*Ou configurado com transporte SSE:*

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

### 3. Configuração do Cursor e Windsurf

Nas configurações de MCP do Cursor ou Windsurf (`.cursor/mcp.json`):

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

## ⚠️ Pré-requisitos e Dependência de Pares Obrigatória

> **IMPORTANTE: O `pts-cc-mcp` requer a extensão `pts-core` instalada em seu projeto.**
>
> **Por que o `pts-core` é obrigatório?**  
> O Cocos Creator 3.8+ utiliza uma arquitetura multiprocesso onde o **Processo Principal do Editor** (onde o `pts-cc-mcp` é executado) é totalmente separado do **Processo de Execução da Cena** (onde a cena do jogo, os componentes e o runtime do motor `@ccclass` ao vivo são executados).  
>
> O `pts-cc-mcp` executa comandos de cena chamando `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. O script de cena (`src/_cc.js`) está hospedado diretamente dentro de `pts-core`.  
>
> Sem o `pts-core`, ferramentas que requerem o runtime da cena ao vivo (como `component_*`, `node_manage`, `scene_manage`, `ui_builder` e `validation_manage`) não conseguem interagir com os nós da cena.

---

## Instalação e Configuração

### 1. Posicionar os arquivos das extensões
Certifique-se de que TANTO `pts-core` quanto `pts-cc-mcp` estejam localizados na pasta `extensions/` do seu projeto Cocos Creator:

```
SeuProjeto/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBRIGATÓRIO: Motor principal e runtime de script de cena (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- Servidor MCP e provedor de ferramentas
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Instalar e compilar extensões
```bash
# 1. Configurar pts-core (se estiver compilando do código-fonte)
cd extensions/pts-core
npm install
npm run build

# 2. Configurar pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Habilitar a extensão no Cocos Creator
1. Reinicie o Cocos Creator ou recarregue o Gerenciador de Extensões (**Extensões > Gerenciador de Extensões**).
2. Verifique se tanto **pts-core** quanto **pts-cc-mcp** estão ativados.
3. Clique em `Extensões > pTS MCP Server` para abrir o painel de controle.
4. O servidor é executado na porta `3121` por padrão (configurável no painel).

---

## Estrutura do Projeto

```
pts-cc-mcp/
├── source/                    # Arquivos de código-fonte TypeScript
│   ├── main.ts               # Ponto de entrada do plugin e verificação de inicialização
│   ├── mcp-server.ts         # Camada de transporte Streamable HTTP e SSE
│   ├── settings.ts           # Gerenciamento de configurações
│   ├── types/                # Definições de tipos TypeScript
│   ├── utils/                # Utilitários
│   │   ├── agents-doc-generator.ts # Gerador e sincronizador de modelos AGENTS.md
│   │   ├── asset-resolver.ts       # Resolvedor inteligente de UUID de subativos
│   │   ├── json-utils.ts           # Análise e reparo defensivo de JSON
│   │   └── i18n.ts                 # Motor de tradução multilíngue
│   ├── tools/                # Implementações de subsistemas e ferramentas unificadas
│   │   ├── intent-dispatcher.ts    # Roteador de opcodes e 16 APIs de intenção
│   │   ├── ui-builder-tools.ts     # Construtor declarativo de UI em 1 comando
│   │   ├── knowledge-tools.ts      # Base de conhecimento de reflexão offline
│   │   ├── animation-tools.ts      # Editor de AnimationClip e fatiamento de FBX
│   │   ├── validation-tools.ts     # Diagnóstico de cenas e diferenças de regressão
│   │   ├── batch-tools.ts          # Motor de execução atômica em lote
│   │   ├── scene-tools.ts          # Gerenciamento de ciclo de vida da cena
│   │   ├── node-tools.ts           # Operações de árvore e transformação de nós
│   │   ├── component-tools.ts      # Reflexão de componentes e atualizador de propriedades
│   │   ├── prefab-tools.ts         # Pilha de sessões de prefab e edição atômica
│   │   ├── asset-advanced-tools.ts # Pesquisa e resolução no banco de dados de ativos
│   │   ├── project-tools.ts        # Execução de compilação e pré-visualização
│   │   ├── debug-tools.ts          # Logs de console e monitor do compilador TS
│   │   └── preferences-tools.ts    # Gerenciamento de configurações do usuário
│   └── panels/               # Painel de UI em Vue 3 com testador de ferramentas
├── dist/                     # Saída de JavaScript compilado
├── static/                   # Ativos estáticos (ícones, estilos, modelos)
├── i18n/                     # Dicionários de internacionalização
├── package.json              # Manifesto da extensão e contribuições
└── tsconfig.json             # Configuração de compilação TypeScript
```

---

## Licença

Este plugin é de código aberto sob a Licença MIT e projetado para desenvolvimento de jogos no Cocos Creator.
