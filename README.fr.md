# Plugin serveur MCP pour Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un plugin serveur MCP (Model Context Protocol) complet pour Cocos Creator 3.8+ permettant aux assistants IA d'interagir avec l'éditeur Cocos Creator via un protocole standardisé. Installation et utilisation en un clic — aucune configuration d'environnement fastidieuse requise. Testé avec le client de bureau Claude, Claude CLI, Cursor et Windsurf ; les autres éditeurs compatibles MCP fonctionnent également parfaitement.

**🚀 Intègre désormais une architecture d'outils unifiée, l'exécution atomique par lot et la prise en charge native des Animation Graphs pour un contrôle de l'éditeur à 99 % !**

## 🙏 Remerciements et crédits

Ce projet est à l'origine un fork open source de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) créé par **LiDaxian**. Nous exprimons notre sincère gratitude et reconnaissance à **LiDaxian** ainsi qu'à tous les contributeurs de la communauté pour avoir posé les bases architecturales et ouvert la voie au développement Cocos Creator assisté par l'IA.

`pts-cc-mcp` s'appuie sur ces fondations en tant qu'extension entièrement open source portée par la communauté avec :
- **Code source 100 % en anglais** avec prise en charge complète de la localisation multilingue i18n
- **Moteur d'exécution atomique par lot in-process** (`batch_execute` / `editor_batch_execute`)
- **Inspection et modification natives des machines d'états d'Animation Graph** (`.animgraph`)
- **Pile de sessions de prefab sécurisée** avec récupération automatique éliminant les plantages à la sortie de scène
- **Résolveur récursif intelligent de ressources** (`@spriteFrame`, `@texture`, chemins bruts, UUIDs)
- **Configuration automatisée de rigs de personnages pour Spine et FastSpine**
- **Surveillance du compilateur TypeScript** (`compile_status`) éliminant les conditions de concurrence lors de la compilation des scripts

## Journal des modifications de la version open source

### 🚀 Mise à jour majeure v1.6.0 (Phase 1 : Double transport Streamable HTTP et SSE)

- **Moteur de transport double Streamable HTTP et Server-Sent Events (SSE)** : Prise en charge native intégrale de `@modelcontextprotocol/sdk` pour Streamable HTTP (`/mcp`) et Server-Sent Events (`/sse` & `/messages`), aux côtés de l'endpoint direct JSON-RPC de secours sans état. Offre une gestion isolée du cycle de vie des sessions par client, un nettoyage automatique des sessions inactives et des en-têtes CORS complets pour les IDEs IA modernes (Claude CLI, Cursor, Windsurf, VS Code).
- **Découplage du cœur de scripts de scène** : Dépendance de pairs vérifiée et documentée envers `pts-core` pour l'exécution des scripts de scène (`src/_cc.js`), garantissant une séparation nette entre la traduction du protocole MCP et la manipulation de la scène dans le moteur Cocos Creator.

### 🚀 Mise à jour majeure v1.5.4

- **Exécution atomique par lot in-process (`batch_execute` / `editor_batch_execute`)** : Exécutez plusieurs opérations d'outils en une seule transaction séquentielle IPC in-process. Réduit considérablement les allers-retours HTTP et la consommation de tokens, avec prise en charge de `stopOnError` et sauvegarde automatique de la scène/du prefab.
- **Moteur d'Animation Graph (`animgraph_manage`)** : Inspection et modification natives des fichiers `.animgraph`. Inspectez les machines d'états, les états, les transitions et les paramètres ; attachez, mettez à jour ou supprimez des `StateMachineComponent`s ; et migrez en bloc les types de classes de composants avec synchronisation automatique de la base de données de ressources.
- **Pile de sessions de prefab et récupération sécurisée** : Enregistre l'URL/UUID de la scène active lors de l'entrée (`enter`), restaure automatiquement la scène précédente lors de la sortie (`exit`) et recherche les scènes valides du projet en cas d'absence — éliminant totalement les plantages `"Target scene does not exist"`. Inclut `atomic_edit` pour des cycles fluides entrée $\to$ édition $\to$ sauvegarde $\to$ sortie.
- **Résolveur intelligent de ressources et de sous-ressources (`asset_query(action="resolve")`)** : Résout automatiquement les chemins bruts, les UUIDs et les sous-ressources (`@spriteFrame` $\to$ `@f9941`, `@texture` $\to$ `@6c48a`). Entièrement intégré à `set_component_property` et `update_component` pour une résolution automatique récursive profonde.
- **Assistant de configuration Spine et FastSpine (`spine_setup`)** : Initialisation rapide du rig de personnage en un seul appel. Attache `FastSpine` ou `sp.Skeleton`, lie la ressource de données de squelette, configure l'animation par défaut, le mode de boucle et synchronise le UITransform.
- **Surveillance de compilation (`compile_status`) et valeurs par défaut défensives** : Surveille et attend la fin de la compilation TypeScript/JavaScript de Cocos Creator pour éliminer les conditions de concurrence après l'édition de scripts. Ajout de valeurs par défaut défensives sur l'ensemble des outils de débogage et de serveur, avec des instructions claires en cas d'actions inconnues.
- **Base de code 100 % en anglais et architecture complète i18n** : Standardisation de l'intégralité du code source de l'extension, des commentaires, des messages d'erreur et des journaux en anglais professionnel, avec prise en charge complète de la localisation multilingue i18n.

---

## Système d'outils et opcodes

- Tous les outils sont nommés selon la convention « catégorie_opération », avec des paramètres conformes à un schéma unifié et la prise en charge du basculement entre plusieurs opcodes (`action`), améliorant grandement la flexibilité et l'extensibilité.
- Couverture complète des scènes, nœuds, composants, prefabs, ressources, graphes d'animation, transactions par lot, projets, débogage, préférences, état du serveur et diffusion de messages.
- Exemple d'appel d'outil :

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

## Principales catégories de fonctionnalités

- **batch_execute / editor_batch_execute** : Moteur d'exécution atomique par lot exécutant plusieurs opérations d'outils en une seule transaction IPC
- **animgraph_manage** : Inspection native de `.animgraph`, transitions de machines d'états et CRUD de composants
- **scene_management / scene_hierarchy** : Cycle de vie des scènes (obtenir/ouvrir/sauvegarder/créer/fermer) et arbres hiérarchiques
- **node_query / node_lifecycle / node_transform** : Recherche, création, suppression, hiérarchie et transformations de nœuds
- **component_manage / set_component_property / spine_setup** : Cycle de vie des composants, définition stricte des propriétés et configuration de rigs FastSpine
- **prefab_browse / prefab_lifecycle / prefab_instance / prefab_edit** : Gestion des prefabs, instanciation, pile de sessions et édition atomique
- **asset_manage / asset_analyze / asset_query** : CRUD des ressources, suivi des dépendances et résolution intelligente des sous-ressources
- **debug_console / debug_logs / compile_status** : Surveillance de la console, recherche dans les journaux du projet et observateur du compilateur TS
- **project_manage / project_build_system** : Exécution du projet, contrôle du panneau de build et serveur de prévisualisation
- **preferences_manage** : Gestion des préférences de l'éditeur
- **server_information / server_connectivity** : Liste des IP du serveur, inspection des ports et diagnostic de connectivité
- **broadcast_log_management / broadcast_listener_management** : Surveillance des événements de l'éditeur et diffusion de messages

---

## Démarrage rapide

`pts-cc-mcp` fournit une prise en charge de transport double : **Streamable HTTP** (`/mcp`) et **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuration de Claude CLI

```bash
# Streamable HTTP (Par défaut)
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp

# Ou via Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3000/sse
```

### 2. Configuration de Claude Desktop

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

*Ou configuré avec le transport SSE :*

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

### 3. Configuration de Cursor et Windsurf

Dans les paramètres MCP de Cursor ou Windsurf (`.cursor/mcp.json`) :

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

*(Vous pouvez également spécifier `"url": "http://127.0.0.1:3000/sse"` si vous préférez).*

---

## ⚠️ Prérequis et dépendance de pairs obligatoire

> **IMPORTANT : `pts-cc-mcp` nécessite que l'extension `pts-core` soit installée dans votre projet.**
>
> **Pourquoi `pts-core` est-il obligatoire ?**  
> Cocos Creator 3.8+ utilise une architecture multi-processus où le **Processus principal de l'éditeur** (où tourne `pts-cc-mcp`) est totalement séparé du **Processus d'exécution de la scène** (où s'exécutent la scène de jeu, les composants et le runtime live du moteur `@ccclass`).  
>
> `pts-cc-mcp` exécute les commandes de scène en appelant `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. Le script de scène (`src/_cc.js`) est hébergé directement au sein de `pts-core`.  
>
> Sans `pts-core`, les outils qui dépendent du runtime de la scène en direct (comme `component_*`, `node_node_transform`, `scene_inspect_scene`, `game_*` et `component_query_class_info`) ne peuvent pas interagir avec les nœuds de la scène.

> **Avant d'installer pour la première fois ou de mettre à jour :**  
> Veuillez impérativement supprimer les deux fichiers `mcp-server.json` et `tool-manager.json` situés dans le répertoire `settings/` de votre projet, sinon la mise en cache de la liste des outils pourrait provoquer des anomalies d'affichage !  
> Chemins des fichiers : `<Projet>/settings/mcp-server.json` et `<Projet>/settings/tool-manager.json`.  
> La réouverture du panneau de l'extension après la suppression de ces deux fichiers resynchronisera proprement tous les outils.

## Installation

### 1. Positionner les fichiers des extensions

Assurez-vous de placer À LA FOIS `pts-core` et `pts-cc-mcp` dans le répertoire `extensions/` de votre projet Cocos Creator :

```
VotreProjet/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBLIGATOIRE : Moteur central et runtime de script de scène (_cc.js)
│   │   ├── src/_cc.js
│   │   ├── package.json
│   │   └── ...
│   └── pts-cc-mcp/                <- Serveur MCP et fournisseur d'outils
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Installer et compiler les extensions

```bash
# 1. Configurer pts-core (si compilation depuis les sources)
cd extensions/pts-core
npm install
npm run build

# 2. Configurer pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Activer les plugins dans Cocos Creator

1. Redémarrez Cocos Creator ou actualisez le Gestionnaire d'extensions (**Extensions > Gestionnaire d'extensions**).
2. Vérifiez que **pts-core** et **pts-cc-mcp** sont tous deux activés.
3. Cliquez sur `Extensions > pTS MCP Server` pour ouvrir le panneau de contrôle.
4. Le serveur fonctionne par défaut sur le port `3000` (configurable dans le panneau).

---

## Développement

### Structure du projet
```
pts-cc-mcp/
├── source/                    # Fichiers sources TypeScript
│   ├── main.ts               # Point d'entrée du plugin
│   ├── mcp-server.ts         # Implémentation du serveur MCP
│   ├── settings.ts           # Gestion des paramètres
│   ├── types/                # Définitions des types TypeScript
│   ├── utils/                # Utilitaires (résolveur de ressources, compatibilité de schéma, utilitaires JSON)
│   ├── tools/                # Implémentations des outils
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
│   ├── panels/               # Implémentation du panneau UI
│   └── test/                 # Fichiers de test
├── dist/                     # Fichiers JavaScript compilés
├── static/                   # Ressources statiques (icônes, etc.)
├── i18n/                     # Fichiers d'internationalisation
├── package.json              # Configuration du plugin
└── tsconfig.json             # Configuration TypeScript
```

### Compilation depuis les sources

```bash
# Mode surveillance pour le développement
npm run watch

# Compilation de production
npm run build
```

---

## Configuration requise

- Cocos Creator 3.8.6 ou supérieur
- Node.js (inclus avec Cocos Creator)
- TypeScript (installé en dépendance de développement)

## Licence

Ce plugin est conçu pour les projets Cocos Creator avec le code source complet inclus pour l'apprentissage et le développement.
