# Accès équipe — Fondé 44

## Adresse

L’espace réservé au personnel est accessible à **/equipe**.

L’application client reste sur les autres chemins. /equipe charge une application équipe séparée et ne donne aucun raccourci depuis le storefront.

## Correspondance des rôles

| Rôle serveur | Espace |
|---|---|
| livreur | Tableau de bord Livreur |
| mere-fonde | Tableau de bord Mère Fondé |
| superadmin | Espace Superadmin |

Il n’existe pas de navigation permettant de passer directement d’un rôle à un autre.

## Première connexion et activation

1. Ouvrir /equipe.
2. Choisir « Première connexion ? J’ai un code d’activation ».
3. Saisir le code de 24 caractères remis par l’administrateur.
4. Saisir l’email, le nom affiché, un mot de passe d’au moins 12 caractères et sa confirmation.
5. Après une activation réussie, le serveur ouvre directement la session du rôle du code.

Le code d’activation et le mot de passe ne sont jamais enregistrés dans localStorage, sessionStorage ou les logs navigateur.

## Sécurité

L’adresse /equipe n’est pas une mesure de sécurité. Elle sépare simplement les interfaces.

La sécurité réelle repose sur le serveur : session HTTP-only, vérification du rôle par requireRole, limites de tentatives et contrôles des actions administratives. Un utilisateur qui connaît /equipe ne reçoit donc aucun privilège supplémentaire.

## Déconnexion

Chaque espace affiche une action « Se déconnecter ». Elle appelle POST /api/auth/logout puis revient à l’écran de connexion.

## Superadmin

Le superadmin dispose de trois vues : tables en lecture seule, journal d’audit et gestion de l’équipe. Les actions d’administration passent par les actions nommées de l’API serveur ; elles ne donnent pas accès à du SQL libre.
