# Plugin de servidor MCP para Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Um plugin de servidor MCP (Model Context Protocol) abrangente para o Cocos Creator 3.8+ que permite a assistentes de IA interagir com o editor do Cocos Creator por meio de um protocolo padronizado. Instalação e uso com um clique — sem necessidade de configurações de ambiente tediosas. Testado com o cliente desktop do Claude, Claude CLI, Cursor e Windsurf; outros editores compatíveis com MCP também funcionam perfeitamente.

**🚀 Agora com arquitetura unificada de ferramentas, execução atômica em lote e suporte nativo a Animation Graph para 99% de controle do editor!**

## 🙏 Agradecimentos e créditos

Este projeto originou-se como um fork de código aberto do [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) criado por **LiDaxian**. Expressamos nossa sincera gratidão e apreço a **LiDaxian** e a todos os colaboradores da comunidade por estabelecerem a arquitetura fundamental e abrirem o caminho para o desenvolvimento no Cocos Creator orientado por IA.

O `pts-cc-mcp` baseia-se nessa fundação como uma extensão totalmente open source e conduzida pela comunidade com:
- **Base de código 100% em inglês** com suporte à localização multilíngue i18n
- **Motor de execução atômica em lote no mesmo processo** (`batch_execute` / `editor_batch_execute`)
- **Inspeção e edição nativa de máquinas de estado de Animation Graph** (`.animgraph`)
- **Pilha de sessões de prefab segura** com recuperação automática que elimina falhas ao sair da cena
- **Resolvedor recursivo inteligente de ativos** (`@spriteFrame`, `@texture`, caminhos diretos, UUIDs)
- **Configuração automatizada de rigs de personagens para Spine e FastSpine**
- **Monitor do compilador TypeScript** (`compile_status`) eliminando condições de corrida na compilação de scripts

## Changelog da versão open source

### 🚀 Atualização importante v1.6.0 (Fase 1: Transporte dual Streamable HTTP e SSE)

- **Motor de transporte dual Streamable HTTP e Server-Sent Events (SSE)**: Suporte nativo completo a `@modelcontextprotocol/sdk` Streamable HTTP (`/mcp`) e Server-Sent Events (`/sse` e `/messages`), além do endpoint direto JSON-RPC de fallback sem estado. Oferece gerenciamento isolado do ciclo de vida de sessões por cliente, limpeza automática de sessões inativas e cabeçalhos CORS completos para IDEs de IA modernos (Claude CLI, Cursor, Windsurf, VS Code).
- **Desacoplamento do núcleo de scripts de cena**: Dependência de pares verificada e documentada com `pts-core` para execução de scripts de cena (`src/_cc.js`), assegurando uma separação clara entre a tradução do protocolo MCP e a manipulação da cena no motor do Cocos Creator.

### 🚀 Atualização importante v1.5.4

- **Execução atômica em lote no mesmo processo (`batch_execute` / `editor_batch_execute`)**: Execute múltiplas operações de ferramentas em uma única transação sequencial IPC no mesmo processo. Reduz drasticamente as idas e vindas HTTP e o consumo de tokens, com suporte a `stopOnError` e salvamento automático de cenas/prefabs.
- **Motor de gráficos de animação (`animgraph_manage`)**: Inspeção e modificação nativa de arquivos `.animgraph`. Inspecione máquinas de estado, estados, transições e parâmetros; adicione, atualize ou remova `StateMachineComponent`s; e migre em lote tipos de classe de componentes com sincronização automática do banco de dados de ativos.
- **Pilha de sessões de prefab e recuperação segura**: Registra a URL/UUID da cena ativa ao entrar (`enter`), restaura automaticamente a cena anterior ao sair (`exit`) e pesquisa cenas válidas no projeto caso ausentes — eliminando totalmente falhas por `"Target scene does not exist"`. Inclui `atomic_edit` para ciclos integrados de entrar $\to$ editar $\to$ salvar $\to$ sair.
- **Resolvedor inteligente de ativos e subativos (`asset_query(action="resolve")`)**: Resolve automaticamente caminhos diretos, UUIDs e subativos (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`). Totalmente integrado em `set_component_property` e `update_component` para resolução automática recursiva profunda.
- **Assistente de configuração Spine e FastSpine (`spine_setup`)**: Inicialização rápida de rigs de personagens em uma única chamada. Anexa `FastSpine` ou `sp.Skeleton`, vincula o ativo de dados do esqueleto, define a animação padrão, o modo de loop e sincroniza o UITransform.
- **Monitor do compilador (`compile_status`) e padrões defensivos**: Monitore e aguarde a conclusão da compilação de TypeScript/JavaScript do Cocos Creator para eliminar condições de corrida após editar scripts. Adicionados valores padrão defensivos nas ferramentas de depuração e servidor, com orientações claras para ações desconhecidas.
- **Base de código 100% em inglês e arquitetura completa de i18n**: Padronização de todo o código-fonte da extensão, comentários, mensagens de erro e logs para inglês profissional, com suporte completo à localização multilíngue i18n.

---

## Sistema de ferramentas e códigos de operação

- Todas as ferramentas são nomeadas no padrão "categoria_operação", com parâmetros seguindo um schema unificado e suporte à alternância entre múltiplos códigos de operação (`action`), aumentando consideravelmente a flexibilidade e a extensibilidade.
- Cobertura completa entre cenas, nós, componentes, prefabs, ativos, gráficos de animação, transações em lote, projetos, depuração, preferências, status do servidor e transmissão de mensagens.
- Exemplo de chamada de ferramenta:

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

## Principais categorias de recursos

- **batch_execute / editor_batch_execute**: Motor de execução atômica em lote que executa múltiplas operações de ferramentas em uma única transação IPC
- **animgraph_manage**: Inspeção nativa de `.animgraph`, transições de máquina de estados e CRUD de componentes
- **scene_management / scene_hierarchy**: Ciclo de vida de cenas (obter/abrir/salvar/criar/fechar) e árvores de hierarquia
- **node_query / node_lifecycle / node_transform**: Busca, criação, exclusão, hierarquia e transformações de nós
- **component_manage / set_component_property / spine_setup**: Ciclo de vida de componentes, atribuição estrita de propriedades e configuração de rigs FastSpine
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit**: Gerenciamento de prefabs, instanciação, pilha de sessões e edição atômica
- **asset_manage / asset_analyze / asset_query**: CRUD de ativos, rastreamento de dependências e resolução inteligente de subativos
- **debug_console / debug_logs / compile_status**: Monitoramento de console, busca em logs do projeto e monitor do compilador TS
- **project_manage / project_build_system**: Execução de projeto, controle do painel de build e servidor de preview
- **preferences_manage**: Gerenciamento de preferências do editor
- **server_information / server_connectivity**: Lista de IPs do servidor, inspeção de portas e diagnóstico de conectividade
- **broadcast_log_management / broadcast_listener_management**: Monitoramento de eventos do editor e transmissão de mensagens

---

## Início rápido

`pts-cc-mcp` oferece suporte a transporte dual: **Streamable HTTP** (`/mcp`) e **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuração do Claude CLI

```bash
# Streamable HTTP (Padrão)
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# Ou via Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Configuração do Claude Desktop

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

*Ou configurado com transporte SSE:*

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

### 3. Configuração do Cursor e Windsurf

Nas configurações de MCP do Cursor ou Windsurf (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*(Você também pode especificar `"url": "http://127.0.0.1:3000/sse"` se preferir).*

---

## ⚠️ Pré-requisitos e dependência de pares obrigatória

> **IMPORTANTE: O `pts-cc-mcp` exige a extensão `pts-core` instalada em seu projeto.**
>
> **Por que o `pts-core` é obrigatório?**  
> O Cocos Creator 3.8+ utiliza uma arquitetura multiprocesso na qual o **Processo principal do editor** (onde o `pts-cc-mcp` é executado) é totalmente separado do **Processo de execução da cena** (onde a cena do jogo, os componentes e o runtime ao vivo do motor `@ccclass` executam).  
>
> O `pts-cc-mcp` executa comandos de cena chamando `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. O script de cena (`src/_cc.js`) é hospedado diretamente dentro do `pts-core`.  
>
> Sem o `pts-core`, ferramentas que requerem o runtime da cena ao vivo (como `component_*`, `node_node_transform`, `scene_inspect_scene`, `game_*` e `component_query_class_info`) não conseguem interagir com os nós da cena.

> **Antes de instalar pela primeira vez ou atualizar:**  
> Certifique-se de excluir `mcp-server.json` e `tool-manager.json` dentro do diretório `settings/` do seu projeto; caso contrário, o cache da lista de ferramentas poderá causar problemas de exibição!  
> Caminhos dos arquivos: `<Projeto>/settings/mcp-server.json` e `<Projeto>/settings/tool-manager.json`.  
> Reabrir o painel da extensão após excluir esses dois arquivos sincronizará todas as ferramentas de forma limpa.

## Instalação

### 1. Posicionar os arquivos das extensões

Certifique-se de que TANTO `pts-core` quanto `pts-cc-mcp` estejam dentro do diretório `extensions/` do seu projeto Cocos Creator:

```
SeuProjeto/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBRIGATÓRIO: Motor principal e runtime do script de cena (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- Servidor MCP e provedor de ferramentas
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Instalar e compilar as extensões

```bash
# 1. Configurar o pts-core (se compilando a partir do código-fonte)
cd extensions/pts-core
npm install
npm run build

# 2. Configurar o pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Habilitar plugins no Cocos Creator

1. Reinicie o Cocos Creator ou recarregue o Gerenciador de Extensões (**Extensões > Gerenciador de Extensões**).
2. Verifique se tanto **pts-core** quanto **pts-cc-mcp** estão habilitados.
3. Clique em `Extensões > pTS MCP Server` para abrir o painel de controle.
4. O servidor é executado na porta `3000` por padrão (configurável no painel).

---

## Desenvolvimento

### Estrutura do projeto
```
pts-cc-mcp/
├── source/                    # Arquivos-fonte TypeScript
│   ├── main.ts               # Ponto de entrada do plugin
│   ├── mcp-server.ts         # Implementação do servidor MCP
│   ├── settings.ts           # Gerenciamento de configurações
│   ├── types/                # Definições de tipos TypeScript
│   ├── utils/                # Utilitários (resolvedor de ativos, compatibilidade de schema, utilitários JSON)
│   ├── tools/                # Implementações das ferramentas
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
│   ├── panels/               # Implementação do painel de UI
│   └── test/                 # Arquivos de teste
├── dist/                     # Saída JavaScript compilada
├── static/                   # Ativos estáticos (ícones, etc.)
├── i18n/                     # Arquivos de internacionalização
├── package.json              # Configuração do plugin
└── tsconfig.json             # Configuração do TypeScript
```

### Compilar a partir do código-fonte

```bash
# Modo de observação para desenvolvimento
npm run watch

# Build de produção
npm run build
```

---

## Requisitos do sistema

- Cocos Creator 3.8.6 ou superior
- Node.js (incluído no Cocos Creator)
- TypeScript (instalado como dependência de desenvolvimento)

## Licença

Este plugin é projetado para projetos Cocos Creator com código-fonte completo incluído para aprendizado e desenvolvimento.
