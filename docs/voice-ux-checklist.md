# Liste de contrôle manuelle — vocaux Fondé 44

**À tester en HTTPS (le micro exige une connexion sécurisée, sauf sur localhost).** Aucun test Android/iPhone réel n'est déclaré réussi avant une vérification physique.

## Android et iPhone
- [ ] Ouvrir « Commander par vocal » depuis l'accueil et vérifier « Comment faire ? ».
- [ ] Vérifier les trois étapes, l'exemple adapté et la phrase sur la langue.
- [ ] Appuyer sur le grand micro et autoriser le micro dans le système.
- [ ] Parler : vérifier le minuteur et les barres sonores qui bougent.
- [ ] Mettre en pause puis reprendre.
- [ ] Annuler et vérifier que le micro est libéré et qu'aucun vocal n'est envoyé.
- [ ] Enregistrer jusqu'à 3 minutes : arrêt automatique à 180 s et compte à rebours visible pendant les 15 dernières secondes.
- [ ] Écouter la bulle, vérifier lecture/pause et durée, puis recommencer.
- [ ] Envoyer avec un numéro sénégalais valide et vérifier les coches de suivi.
- [ ] Recharger la page et vérifier le suivi mémorisé : aucun fichier audio n'est conservé dans localStorage ; la clé de suivi contient uniquement les identifiants, jetons et états des cinq derniers vocaux. Les coordonnées de préremplissage éventuelles restent dans leurs clés séparées.
- [ ] Refuser le micro : vérifier l'aide en 3 étapes et « Réessayer ».
- [ ] Simuler MediaRecorder indisponible : vérifier le message et « Choisir mes produits ».
- [ ] Couper le réseau après l'enregistrement : le vocal reste disponible et « Réessayer » le renvoie sans réenregistrer.
- [ ] Vérifier les messages HTTP 429, 503 et 422.
- [ ] Vérifier les thèmes clair et sombre, un écran de 320 px, le zoom texte et le clavier.
- [ ] Vérifier les boutons de 56 px minimum, les libellés avec icônes et la préférence réduire les animations.
- [ ] Quitter l'écran et vérifier la libération du micro et des URL audio.
- [ ] Répéter les tests dans l'onglet « Parler » du service événement.

## Boîte vocale Mère Fondé
- [ ] Vérifier nom ou « Client sans nom », numéro, ancienneté, type, durée et statut.
- [ ] Démarrer la lecture : le statut passe à « Écouté ».
- [ ] Tester les onglets « Nouveaux » et « Tous ».
- [ ] Tester Appeler, WhatsApp, Marquer traité et Archiver.
- [ ] Vérifier le compteur de nouveaux vocaux, le chargement, l'erreur et l'état vide.
