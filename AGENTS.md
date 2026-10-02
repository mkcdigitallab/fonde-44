# AGENTS.md — Fondé 44

## Mission

Fondé 44 est une application mobile-first destinée à transformer l'activité de Mère Fondé en service commandable et livrable.

Un agent qui travaille sur ce dépôt agit comme un **ingénieur logiciel contrôlé**, pas comme un générateur de code isolé.

## Priorités

1. Comprendre le besoin métier avant de modifier le code.
2. Préserver les parcours client et les règles métier existantes.
3. Préférer une architecture simple, testable et évolutive.
4. Ne jamais présenter une fonctionnalité mockée comme une fonctionnalité réellement connectée.
5. Vérifier les changements avant de proposer une fusion.

## Workflow obligatoire

```
Issue
  ↓
Branch dédiée
  ↓
Inspection du code
  ↓
Implémentation minimale
  ↓
Tests / build / lint
  ↓
Revue du diff
  ↓
Pull Request
  ↓
Validation humaine
  ↓
Merge
```

### Règle absolue

Un agent ne doit pas modifier directement `main` pour une fonctionnalité ou une correction.

La fusion reste une décision humaine, sauf si une politique explicite du dépôt autorise ultérieurement un automatisme précis.

## Contexte technique actuel

- Frontend : React + Vite + JavaScript/JSX
- UI : CSS + Lucide React
- Déploiement prévu : Vercel
- Backend : à construire
- Base de données : à construire
- Paiements : à connecter ultérieurement
- Notifications : à connecter ultérieurement
- Livraison : à connecter ultérieurement

## Règles métier connues

- Fondé : 200 FCFA / pot.
- Thiakry : 300 FCFA / pot.
- Livraison : minimum 3 pots.
- Le scan QR doit d'abord permettre de découvrir Fondé 44 ; il ne doit pas imposer une création de compte.
- Les informations personnelles doivent être demandées au moment où elles deviennent nécessaires, notamment pour commander/livrer.
- Les horaires métier ne doivent pas être inventés par l'agent.
- Une commande programmée doit être traitée comme une demande à vérifier tant que le backend n'a pas confirmé la disponibilité réelle.

## Distinction des états

Toujours distinguer :

- **UI/prototype** : comportement local ou données simulées ;
- **intégration** : appel réel vers un service ;
- **production** : flux persistant, sécurisé, observé et vérifié.

## Permissions de l'agent

### Autorisé

- lire et analyser le dépôt ;
- créer une issue ;
- créer une branche de travail ;
- modifier les fichiers nécessaires ;
- ajouter des tests et de la documentation ;
- lancer les validations disponibles ;
- créer une PR ;
- commenter/documenter les résultats.

### Interdit par défaut

- pousser directement une fonctionnalité sur `main` ;
- merger une PR sans validation humaine ;
- supprimer des données de production ;
- exposer ou committer des secrets ;
- inventer des règles métier ;
- ajouter une dépendance importante sans justification ;
- remplacer une vraie intégration par une fausse réussite UI.

## Règle des changements

Avant toute modification :

1. identifier le problème ;
2. localiser les fichiers responsables ;
3. comprendre les dépendances ;
4. choisir le plus petit changement cohérent ;
5. vérifier les régressions ;
6. documenter ce qui reste volontairement mocké.

## Qualité

Pour chaque PR, fournir :

- objectif ;
- fichiers importants modifiés ;
- comportement ajouté/corrigé ;
- tests exécutés ;
- limites connues ;
- risques éventuels ;
- étapes manuelles restantes.

## Architecture cible

L'application évoluera progressivement vers :

```
Client / Mère Fondé / Livreur
            ↓
        API Backend
            ↓
        PostgreSQL
            ↓
 ┌──────────┼──────────┐
Paiement  Notifications  Livraison
            ↓
        Production
            ↓
          Stock
            ↓
         Finance
```

L'agent peut aider à construire cette architecture par étapes, mais ne doit pas créer prématurément des services inutiles.

## Outils

Les outils seront ajoutés progressivement :

- GitHub : dépôt, issues, branches, PR, revue ;
- terminal : installation, build, tests, migrations et exécution locale ;
- navigateur : validation réelle des parcours ;
- Figma : design et vérification visuelle ;
- backend/API : logique métier et intégrations ;
- PostgreSQL : persistance ;
- paiement : Wave / Orange Money / autres intégrations validées ;
- notifications : WhatsApp/SMS/email selon les besoins réels ;
- Vercel : déploiement et vérification.

Le principe est **un agent avec des outils spécialisés et des permissions explicites**, plutôt qu'un ensemble d'agents autonomes qui modifient le projet sans contrôle.
