# Plugin serveur MCP pour Cocos Creator

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un plugin serveur MCP (Model Context Protocol) complet pour Cocos Creator 3.8+ permettant aux assistants IA d'interagir avec l'éditeur Cocos Creator via un protocole standardisé. Installation et utilisation en un clic — aucune configuration d'environnement fastidieuse requise. Testé avec le client de bureau Claude, Claude CLI, Cursor et Windsurf ; les autres éditeurs compatibles MCP fonctionnent également parfaitement.

**🚀 Intègre désormais une architecture d'outils unifiée, l'exécution atomique par lot et la prise en charge native des Animation Graphs pour un contrôle de l'éditeur à 99 % !**

## 🙏 Remerciements et Crédits (Acknowledgments & Credits)

Ce projet est issu d'un fork open source de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) créé par **LiDaxian**. Nous exprimons notre profonde gratitude et notre respect à **LiDaxian** ainsi qu'à tous les contributeurs de la communauté pour avoir posé l'architecture fondatrice permettant l'intégration de l'IA dans Cocos Creator.

`pts-cc-mcp` poursuit cette mission en tant qu'extension open source communautaire, intégrant désormais :
- **Codebase 100% en anglais** avec prise en charge complète de la localisation multi-langues i18n
- **Moteur d'exécution atomique par lot in-process** (`batch_execute` / `editor_batch_execute`)
- **Édition et inspection natives des graphes d'animation** (`animgraph_manage`)
- **Pile de sessions de prefab sécurisée** avec récupération automatique évitant les crashs
- **Résolveur intelligent récursif de ressources et sous-ressources** (`@spriteFrame`, `@texture`, chemins et UUIDs)
- **Configuration automatisée de rigs de personnages Spine et FastSpine**
- **Surveillance de l'état du compilateur TypeScript** (`compile_status`) éliminant les conflits de concurrence

## Journal des modifications de la version open source

## 🚀 Mise à jour majeure v1.5.4

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

**Configuration de Claude CLI :**

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Configuration de Claude Desktop :**

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

**Configuration MCP pour Cursor ou VS Code :**

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

## ⚠️ À lire avant l'installation (Important)

> **Avant d'installer pour la première fois ou de mettre à jour, veuillez impérativement supprimer les deux fichiers `mcp-server.json` et `tool-manager.json` situés dans le répertoire `settings/` de votre projet, sinon la mise en cache de la liste des outils pourrait provoquer des anomalies d'affichage !**
>
> Chemins des fichiers : `<Projet>/settings/mcp-server.json` et `<Projet>/settings/tool-manager.json`
> La réouverture du panneau de l'extension après la suppression de ces deux fichiers resynchronisera proprement tous les outils.

## Installation

### 1. Copier les fichiers du plugin

Copiez le dossier `pts-cc-mcp` dans le répertoire `extensions` de votre projet Cocos Creator :

```
VotreProjet/
├── assets/
├── extensions/
│   └── pts-cc-mcp/                <- Placez le plugin ici
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Installer les dépendances

```bash
cd extensions/pts-cc-mcp
npm install
```

### 3. Compiler le plugin

```bash
npm run build
```

### 4. Activer le plugin

1. Redémarrez Cocos Creator ou actualisez le Gestionnaire d'extensions
2. Le plugin apparaîtra dans le menu Extensions
3. Cliquez sur `Extensions > pTS MCP Server` pour ouvrir le panneau de contrôle

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
