# Ingénierie agentique — Fondé 44

## 1. Objectif

Faire évoluer Fondé 44 vers un environnement où un agent peut prendre une tâche depuis son besoin métier jusqu'à une PR vérifiable.

L'agent doit pouvoir :

- comprendre une issue ;
- inspecter le dépôt ;
- planifier le changement ;
- modifier le code ;
- lancer les validations ;
- vérifier le résultat dans un navigateur ;
- corriger les problèmes détectés ;
- produire une PR claire.

## 2. Architecture de l'atelier

```
                    ┌────────────────────┐
                    │   Besoin métier    │
                    │ Client / Mère /    │
                    │ Livreur            │
                    └─────────┬──────────┘
                              ↓
                    ┌────────────────────┐
                    │ Agent orchestrateur│
                    └─────────┬──────────┘
                              │
       ┌──────────────┬───────┼───────────┬──────────────┐
       ↓              ↓       ↓           ↓              ↓
    GitHub         Terminal  Browser     Figma        Backend
       │              │       │           │              │
       └──────────────┴───────┴───────────┴──────────────┘
                              ↓
                         Validation
                              ↓
                             PR
                              ↓
                    Validation humaine
                              ↓
                            Merge
```

## 3. Pourquoi un orchestrateur

On ne veut pas simplement demander à plusieurs agents de modifier les mêmes fichiers.

L'orchestrateur doit décider :

- quel outil utiliser ;
- dans quel ordre ;
- quelles informations sont nécessaires ;
- quand arrêter une tâche ;
- quand demander une validation humaine.

## 4. Les outils ont des responsabilités distinctes

### GitHub

Source de vérité du travail logiciel :

- issues ;
- branches ;
- commits ;
- pull requests ;
- revues.

### Terminal

Environnement d'exécution :

- npm ;
- build ;
- tests ;
- lint ;
- migrations ;
- serveurs locaux.

### Browser

Vérification comportementale :

- navigation ;
- formulaires ;
- responsive ;
- console ;
- parcours de commande ;
- QR ;
- géolocalisation ;
- microphone.

### Figma

Source de référence pour le design :

- écrans ;
- composants ;
- variantes ;
- responsive ;
- états.

### Backend

Source de vérité métier :

- commandes ;
- clients ;
- stock ;
- disponibilité ;
- paiements ;
- livraison ;
- notifications.

## 5. Futur découpage des agents

Au départ, un seul agent orchestrateur suffit.

Ensuite, si le projet devient assez grand :

```
                Orchestrateur
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
   Product       Developer        QA
       │             │             │
       └─────────────┼─────────────┘
                     ↓
                   DevOps
```

### Product agent

Transforme une demande métier en spécification exploitable.

### Developer agent

Implémente la fonctionnalité et ses tests.

### QA agent

Teste le comportement réel et recherche les régressions.

### DevOps agent

S'occupe du build, de l'environnement et du déploiement.

Le découpage multi-agent ne sera introduit que lorsque le mono-agent devient réellement limitant.

## 6. MCP

Le protocole MCP peut servir de couche standardisée entre l'agent et ses outils.

Exemple :

```
Agent
  │
  ├── MCP → GitHub
  ├── MCP → Figma
  ├── MCP → Browser
  ├── MCP → PostgreSQL
  └── MCP → Services internes
```

L'intérêt est de séparer le raisonnement de l'agent de l'implémentation concrète des outils.

## 7. Sécurité

Les permissions doivent être progressives.

### Niveau lecture

- dépôt ;
- issues ;
- logs ;
- base en lecture.

### Niveau développement

- branche ;
- fichiers ;
- tests ;
- PR.

### Niveau opérationnel

- déploiement ;
- migrations ;
- intégrations externes.

### Niveau critique

Les actions destructives ou irréversibles nécessitent une validation humaine explicite.

## 8. Exemple de tâche complète

Demande :

> « Un client scanne le QR présent sur un pot et veut commander trois pots de Fondé pour livraison. »

L'agent doit pouvoir :

1. identifier le parcours QR ;
2. vérifier la règle des 3 pots ;
3. inspecter le frontend ;
4. vérifier le contrat d'API nécessaire ;
5. implémenter l'écran ou le flux ;
6. ajouter les tests ;
7. lancer le build ;
8. ouvrir le parcours dans le navigateur ;
9. corriger les erreurs ;
10. créer une PR ;
11. laisser le merge à l'humain.

## 9. Roadmap d'activation

### Étape A — maintenant

- contrat agentique ;
- documentation ;
- Git workflow ;
- permissions.

### Étape B

Connecter un environnement d'exécution réel :

- terminal ;
- serveur Vite ;
- tests ;
- navigateur.

### Étape C

Construire le backend :

- API ;
- PostgreSQL ;
- authentification ;
- commandes ;
- stock ;
- livraison.

### Étape D

Connecter les services :

- paiement ;
- notifications ;
- géolocalisation ;
- livraison.

### Étape E

Automatiser le cycle :

```
Issue → Agent → Code → Tests → Browser QA → PR
```

Puis seulement, si nécessaire :

```
PR → CI → Review → Human approval → Deploy
```

## 10. Principe directeur

Le but n'est pas de laisser une IA « coder toute seule ».

Le but est de construire une **chaîne d'ingénierie observable, testable et contrôlée**, dans laquelle l'IA peut réellement agir sur le projet sans perdre la maîtrise humaine.
