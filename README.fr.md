# Plugin serveur MCP pour Cocos Creator (pts-cc-mcp)

🌐 [English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Português](README.pt.md) · **Français** · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Tiếng Việt](README.vi.md)

Un plugin de serveur MCP (Model Context Protocol) complet et open-source pour Cocos Creator 3.8+ permettant aux assistants de codage IA (Claude CLI, Claude Desktop, Cursor, Windsurf, Antigravity) d'inspecter, créer, valider et manipuler des jeux Cocos Creator via un protocole standardisé.

**🚀 Doté d'un double transport Streamable HTTP et SSE, de 16 outils d'intention unifiés (231 opcodes), d'une génération déclarative d'UI en une seule passe, d'une base de connaissances de réflexion hors ligne, de l'édition d'animations par images clés sur timeline et de la comparaison différentielle d'instantanés pour la régression des scènes et ressources !**

---

## 🙏 Remerciements et crédits

Ce projet est à l'origine un fork open source de [`cocos-mcp-server`](https://github.com/LiDaxian/cocos-mcp-server) créé par **LiDaxian**. Nous exprimons notre sincère gratitude et reconnaissance à **LiDaxian** ainsi qu'à tous les contributeurs de la communauté pour avoir posé les bases architecturales et ouvert la voie au développement Cocos Creator assisté par l'IA.

`pts-cc-mcp` s'appuie sur ces fondations en tant qu'extension entièrement open source portée par la communauté, remplaçant toutes les fonctionnalités propriétaires ou commerciales par des équivalents open-source supérieurs.

---

## 🚀 Journal des modifications de la version 1.6.0 : L'architecture Pro unifiée

### 1. Double transport Streamable HTTP et Server-Sent Events (SSE) (Phase 1)
- Prise en charge native intégrale de Streamable HTTP (`/mcp`) et Server-Sent Events (`/sse` & `/messages`) de `@modelcontextprotocol/sdk` sur le port `3121`.
- Gestion isolée du cycle de vie des sessions par client, pulsation d'activité (heartbeat keep-alive) et en-têtes CORS pour les clients IA modernes.

### 2. Architecture d'opcodes unifiée au niveau de l'intention (Phase 2)
- Remplacement de plus de 50 schémas dispersés par **16 outils d'intention unifiés** couvrant 231 opérations (dispatch d'opcodes via `action`).
- Réduit la consommation de tokens de schéma de plus de 70 % dans la fenêtre de contexte des LLM, tout en maintenant la rétrocompatibilité avec les anciens appels d'outils.

### 3. Générateur déclaratif d'UI et de scènes en une seule passe (Phase 3)
- `ui_builder` : Construction de graphes d'UI complexes (`build_tree`, `create_dialog`, `create_button`, `create_list`) avec création automatique d'un `UITransform`, résolution des contraintes (ancres de Widget, marges de Layout) et instantanés de restauration automatique en cas d'erreur.

### 4. Base de connaissances de réflexion intégrée de Cocos Creator 3.8 (Phase 4)
- `knowledge_query` : Règles d'architecture en mémoire et dictionnaires `@property` pour les composants natifs 2D/3D (`cc.Sprite`, `cc.Label`, `cc.Widget`, `cc.Layout`, `sp.Skeleton`), guides de résolution de conception et formules de conversion de coordonnées.
- Vérification automatisée d'`AGENTS.md` et générateur de documentation (`get_mcp_guide`, `sync_agents_doc`).

### 5. Éditeur d'animation timeline et de courbes d'images clés (Phase 5)
- `anim_manage` : Création directe de pistes `.anim` (`cc.AnimationClip`) avec interpolation de courbes de Bézier cubiques, linéaires et constantes.
- Déclencheurs d'événements d'animation, préréglages de mouvement rapide (`bounce_pop`, `fade_in`, `fade_out`, `shake`) et découpage automatisé des prises d'animation FBX multi-takes.

### 6. Diagnostic de scènes/ressources et comparaison différentielle d'instantanés (Phase 6)
- `validation_manage` : Détection des collisions de noms entre nœuds frères, diagnostic des `UITransform` manquants et analyse récursive approfondie des ressources vérifiant les références `__uuid__` des composants de scène par rapport à l'`asset-db`.
- Instantanés d'état de scène hachés en SHA-256 (`capture_snapshot`) et tableaux comparatifs visuels de régression en Markdown (`diff_snapshot`).

---

## 🛠️ Tableau de référence rapide des 16 outils d'intention

| Outil d'intention | Arguments clés | Rôle et bonnes pratiques |
| :--- | :--- | :--- |
| **`scene_manage`** | `action: "get_current" \| "hierarchy" \| "inspect" \| "open" \| "save" \| "create"`, `includeComponents: true` | Cycle de vie de la scène, inspection complète de l'arbre et scripts de scène. |
| **`node_manage`** | `action: "query" \| "create" \| "delete" \| "duplicate" \| "transform" \| "reparent"`, `nodeUuid`, `position`, `size`, `queryType` | Recherche universelle de nœuds, création, transformation et manipulation de la hiérarchie. |
| **`component_manage`** | `action: "add" \| "remove" \| "get" \| "update" \| "bind_event" \| "query_class_info"`, `nodeUuid`, `componentType`, `properties` | Ajout/suppression de composants, mise à jour en profondeur des propriétés avec sauvegarde automatique, liaison d'événements de clic et réflexion @ccclass. |
| **`prefab_manage`** | `action: "list" \| "info" \| "validate" \| "enter" \| "exit" \| "save" \| "instantiate" \| "atomic_edit"`, `prefabPath`, `nodeUuid` | Cycle de vie complet des prefabs, sessions d'édition non destructives et éditions atomiques par lot. |
| **`ui_builder`** | `action: "build_tree" \| "create_dialog" \| "create_button" \| "create_list"`, `tree`, `parent` | Génération déclarative d'UI en 1 passe avec auto-UITransform, contraintes Widget et Layouts. |
| **`anim_manage`** | `action: "clip_inspect" \| "clip_create" \| "clip_add_track" \| "clip_add_keyframe" \| "clip_apply_preset" \| "slice_fbx" \| "graph_inspect"`, `animPath`, `property`, `time`, `value` | Édition d'AnimationClip de timeline, courbes de propriétés, modes d'interpolation (easing), événements d'animation, préréglages, découpage de FBX et machines d'états AnimGraph. |
| **`asset_manage`** | `action: "query" \| "resolve" \| "import" \| "delete" \| "dependencies"`, `folder`, `assetPath`, `assets` | Découverte de ressources, inspection des dépendances et résolution intelligente des sous-ressources (`@spriteFrame`, `@texture`). |
| **`knowledge_query`** | `action: "query_component" \| "query_rules" \| "query_layout_patterns" \| "get_mcp_guide" \| "list_topics"`, `className`, `topic` | Référence architecturale hors ligne pour les composants, les coordonnées, les règles et documentation MCP en direct. |
| **`validation_manage`**| `action: "check_scene" \| "check_assets" \| "check_viewport" \| "capture_snapshot" \| "diff_snapshot" \| "list_snapshots" \| "restore_snapshot"`, `threshold`, `tag`, `snapshotId` | Audit automatisé des UITransforms manquants, ressources corrompues, nœuds hors limites et comparaison visuelle de régression d'instantanés. |
| **`batch_execute`** | `operations: [{ tool, args }]`, `autoSave: true` | Exécution atomique par lot in-process de plusieurs opérations dans une seule transaction IPC. |
| **`project_manage`** | `action: "get_info" \| "build" \| "run" \| "compile_watch"` | Paramètres de build, contrôle du serveur de prévisualisation et surveillance de compilation TypeScript. |
| **`scene_view_control`**| `action: "camera_focus" \| "camera_view" \| "grid_toggle" \| "gizmo_mode"`, `nodeUuid`, `viewMode` | Manipulation de la caméra de vue d'éditeur et superpositions. |
| **`spine_manage`** | `action: "setup_rig" \| "query_animations" \| "set_animation"`, `nodeUuid`, `spineAssetPath`, `defaultAnimation` | Configuration rapide de rigs de squelettes Spine ou FastSpine en un seul appel. |
| **`debug_manage`** | `action: "get_logs" \| "search_logs" \| "get_stats"` | Surveillance de la console de l'éditeur et télémétrie des performances. |
| **`preferences_manage`**| `action: "get" \| "set" \| "backup"`, `key`, `value` | Configuration des préférences de l'éditeur. |
| **`broadcast_manage`** | `action: "subscribe" \| "emit" \| "history"`, `channel`, `message` | Surveillance des événements de l'éditeur et diffusion. |

---

## 📖 Flux de travail standards de MCP

### A. Inspection du graphe de scène ou prefab
* Utilisez `scene_manage(action="inspect")` pour inspecter la hiérarchie de la scène, les composants et les propriétés sous forme d'arbres JSON ou Markdown formatés.
* Utilisez `scene_manage(action="hierarchy", includeComponents=true)` pour lister les nœuds actifs dans la scène en direct ou le prefab ouvert.

### B. Modification de composants dans la scène active
* Utilisez `component_manage(action="update")` pour des mises à jour approfondies de propriétés (`config.sid`, `config.data`), l'instanciation d'objets `@ccclass` imbriqués et des tableaux de ressources (`onUpdates`, `onChanged`).
* Utilisez `scene_manage(action="save")` pour persister les modifications de la scène.

### C. Modification de composants / nœuds dans les prefabs
* **Si le prefab est actuellement ouvert / en cours d'inspection :**
  1. `node_manage(action="query")` pour localiser le nœud cible.
  2. `component_manage(action="add")` (pour attacher de nouveaux scripts) ou `component_manage(action="update")` (pour définir des données).
  3. `prefab_manage(action="save")` pour enregistrer.
* **Si le prefab est en arrière-plan (non ouvert) :**
  1. `prefab_manage(action="enter", prefabPath="db://assets/...")`
  2. `scene_manage(action="hierarchy")` / `node_manage(action="query")` pour localiser le nœud cible.
  3. `component_manage(action="update")` pour appliquer les modifications.
  4. `prefab_manage(action="save")`
  5. `prefab_manage(action="exit")`
* Ou utilisez l'édition atomique : `prefab_manage(action="atomic_edit", prefabPath="db://assets/...", operations=[...])`

### D. Réflexion de classe & types
* Utilisez `component_manage(action="query_class_info")` pour inspecter les attributs de réflexion `@ccclass`, les valeurs par défaut et les métadonnées `@property` avant d'assigner des valeurs.

### E. Génération déclarative d'UI
* Utilisez `ui_builder(action="build_tree", parent="Canvas", tree={...})` pour construire des hiérarchies d'UI complètes (panneaux, boutons, étiquettes, sprites, vues défilantes) avec des UITransforms calculés automatiquement et des contraintes de Widget en un seul appel atomique.

### F. Animation par images clés sur timeline et découpage de FBX
* Créez des clips `.anim` avec des courbes de propriétés : `anim_manage(action="clip_create", animPath="db://assets/anims/fade.anim", tracks=[...])`.
* Appliquez des préréglages de mouvement : `anim_manage(action="clip_apply_preset", animPath="db://assets/anims/btn_pop.anim", preset="bounce_pop")`.
* Découpez des modèles FBX multi-takes : `anim_manage(action="slice_fbx", fbxPath="db://assets/models/char.fbx", takes=[...])`.

### G. Diagnostic de scènes/ressources et comparaison différentielle d'instantanés
* Capturez un instantané de référence de la scène avant toute modification : `validation_manage(action="capture_snapshot", tag="PreEdit")`.
* Comparez la scène à l'instantané après modification : `validation_manage(action="diff_snapshot")`.
* Auditez la hiérarchie de la scène pour détecter d'éventuels bugs d'agencement : `validation_manage(action="check_scene")`.
* Analysez le projet et la scène à la recherche de références GUID brisées : `validation_manage(action="check_assets")`.

---

## ⚡ Démarrage rapide

`pts-cc-mcp` s'exécute par défaut sur le port `3121` avec prise en charge du double transport : **Streamable HTTP** (`/mcp`) et **Server-Sent Events (SSE)** (`/sse`).

### 1. Configuration de Claude CLI

```bash
# Streamable HTTP (Par défaut)
claude mcp add --transport http cocos-creator http://127.0.0.1:3121/mcp

# Ou via Server-Sent Events (SSE)
claude mcp add --transport sse cocos-creator http://127.0.0.1:3121/sse
```

### 2. Configuration de Claude Desktop

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

*Ou configuré avec le transport SSE :*

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

### 3. Configuration de Cursor et Windsurf

Dans les paramètres MCP de Cursor ou Windsurf (`.cursor/mcp.json`) :

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

## ⚠️ Prérequis & Dépendance de pairs obligatoire

> **IMPORTANT : `pts-cc-mcp` nécessite l'installation de l'extension `pts-core` dans votre projet.**
>
> **Pourquoi `pts-core` est-il obligatoire ?**  
> Cocos Creator 3.8+ utilise une architecture multi-processus où le **Processus principal de l'éditeur** (où s'exécute `pts-cc-mcp`) est totalement isolé du **Processus d'exécution de la scène** (où s'exécutent la scène du jeu, les composants et le runtime live du moteur `@ccclass`).  
>
> `pts-cc-mcp` exécute les commandes de scène en appelant `Editor.Message.request('scene', 'execute-scene-script', { name: 'pts-core', method: '...' })`. Le script de scène (`src/_cc.js`) est hébergé directement au sein de `pts-core`.  
>
> Sans `pts-core`, les outils nécessitant le runtime de la scène en direct (tels que `component_*`, `node_manage`, `scene_manage`, `ui_builder` et `validation_manage`) ne peuvent pas interagir avec les nœuds de la scène.

---

## Installation et configuration

### 1. Placer les fichiers d'extension
Assurez-vous que les DEUX extensions `pts-core` et `pts-cc-mcp` sont bien situées dans le répertoire `extensions/` de votre projet Cocos Creator :

```
VotreProjet/
├── assets/
├── extensions/
│   ├── pts-core/                  <- OBLIGATOIRE : Moteur principal et runtime du script de scène (_cc.js)
│   │   ├── src/_cc.js
│   │   └── package.json
│   └── pts-cc-mcp/                <- Serveur MCP et fournisseur d'outils
│       ├── source/
│       ├── dist/
│       └── package.json
└── settings/
```

### 2. Installer et compiler les extensions
```bash
# 1. Configurer pts-core (en cas de compilation depuis les sources)
cd extensions/pts-core
npm install
npm run build

# 2. Configurer pts-cc-mcp
cd ../pts-cc-mcp
npm install
npm run build
```

### 3. Activer l'extension dans Cocos Creator
1. Redémarrez Cocos Creator ou rechargez le Gestionnaire d'extensions (**Extensions > Gestionnaire d'extensions**).
2. Vérifiez que **pts-core** et **pts-cc-mcp** sont tous les deux activés.
3. Cliquez sur `Extensions > pTS MCP Server` pour ouvrir le panneau de contrôle.
4. Le serveur tourne par défaut sur le port `3121` (configurable dans le panneau).

---

## Structure du projet

```
pts-cc-mcp/
├── source/                    # Fichiers sources TypeScript
│   ├── main.ts               # Point d'entrée du plugin et vérification d'initialisation
│   ├── mcp-server.ts         # Couche de transport Streamable HTTP & SSE
│   ├── settings.ts           # Gestion des paramètres et de la configuration
│   ├── types/                # Définitions de types TypeScript
│   ├── utils/                # Utilitaires
│   │   ├── agents-doc-generator.ts # Générateur de modèles et synchroniseur AGENTS.md
│   │   ├── asset-resolver.ts       # Résolveur intelligent d'UUID de sous-ressources
│   │   ├── json-utils.ts           # Analyse et réparation défensive du JSON
│   │   └── i18n.ts                 # Moteur de traduction multilingue
│   ├── tools/                # Implémentations des sous-systèmes et outils unifiés
│   │   ├── intent-dispatcher.ts    # Routeur d'opcodes et 16 APIs d'intention
│   │   ├── ui-builder-tools.ts     # Générateur déclaratif d'UI en 1 passe
│   │   ├── knowledge-tools.ts      # Base de connaissances de réflexion hors ligne
│   │   ├── animation-tools.ts      # Éditeur d'AnimationClip et découpage de FBX
│   │   ├── validation-tools.ts     # Diagnostics de scène et différences de régression
│   │   ├── batch-tools.ts          # Moteur d'exécution atomique par lot
│   │   ├── scene-tools.ts          # Gestion du cycle de vie de scène
│   │   ├── node-tools.ts           # Opérations de transformation et d'arbre de nœuds
│   │   ├── component-tools.ts      # Réflexion de composants et mise à jour de propriétés
│   │   ├── prefab-tools.ts         # Pile de sessions de prefab et édition atomique
│   │   ├── asset-advanced-tools.ts # Recherche et résolution dans la base de ressources
│   │   ├── project-tools.ts        # Exécution de build et prévisualisation
│   │   ├── debug-tools.ts          # Journaux de console et surveillance du compilateur TS
│   │   └── preferences-tools.ts    # Gestion des préférences utilisateur
│   └── panels/               # Panneau d'interface Vue 3 avec testeur d'outils
├── dist/                     # Sortie JavaScript compilée
├── static/                   # Ressources statiques (icônes, styles, modèles)
├── i18n/                     # Dictionnaires d'internationalisation
├── package.json              # Manifeste de l'extension et contributions
└── tsconfig.json             # Configuration de build TypeScript
```

---

## Licence

Ce plugin est open-source sous licence MIT et conçu pour le développement de jeux sur Cocos Creator.
