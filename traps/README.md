# TRAPS 2.0 · démonstration web manuelle

Adaptation indépendante de TRAPS 2.0 TEST v3 pour un navigateur, sans installation Android. Les applications Android et Jugement de course ne sont pas modifiées.

## Essayer

1. Choisir Slalom ou Time Trial Kayak Cross, puis une fonction.
2. En Slalom, choisir un poste et renseigner son nom. Le retour permet de changer de poste avant de commencer.
3. Dans les cases blanches du mode Fiches, écrire avec la souris, le doigt ou un stylet : 0 ou un trait → 0 ; 2, Z ou deux traits → 2 ; 5, S ou une croix → 50. La reconnaissance utilise une adaptation du moteur de TEST et se déclenche après une seconde sans geste. Les signes ambigus sont à confirmer.
4. Après renseignement de toutes les portes, ouvrir une porte à justifier. Dessiner, poser des croix rouges, choisir un motif 50 A–E, écrire dans les notes ou utiliser le clavier. Valider rend la fiche consultable. Un retour avec des changements conserve un brouillon ; l’annulation des traits permet de revenir à l’état initial.
5. Le menu permet de choisir Fiches ou Boutons. En mode Boutons, les cases neutres sont noires avec des chiffres blancs ; la valeur choisie devient verte (0), jaune (2) ou rouge (50). Un appui long sur la nouvelle valeur permet de corriger ; sur la valeur déjà choisie il permet de la supprimer. En mode Fiches, maintenir la valeur puis la réécrire, ou choisir Annuler la pénalité dans la confirmation d’un signe ambigu.
6. Maintenir le numéro de porte pour justifier un 0. L’œil permet de consulter directement une justification protégée.
7. Changer de fonction/poste avec la libération simulée. Les fiches restent accessibles en reprenant ce poste ou en Juge Arbitre. Les fiches commencées conservent le nom du premier juge.

## Courses incluses

- Slalom : 30 dossards, 10 portes. Poste 1 : 1–5 ; poste 2 : 6–8 ; poste 3 : 9–10. Rouges : 3, 4, 7, 10.
- Cross : 10 dossards. Contrôles dans l’ordre START, porte 1 verte, E, porte 2 rouge. Choix des contrôles à juger puis du nom ; saisie CLR/FLT, sans justification Slalom.
- Chrono départ/arrivée : heure de l’ordinateur ou du téléphone, bouton fermé/ouvert, saisie manuelle. Une absence bloque l’arrivée ; les pénalités saisies se protègent dix minutes après une arrivée enregistrée dans cet essai.
- Absence, dessalage et annulations restent locaux. Deux messages fictifs apparaissent après trois puis huit saisies manuelles ; mise en attente, lecture et action réalisée sont démontrables. Aucun compétiteur, chrono ou pénalité n’est généré automatiquement.

## Sauvegarde et confidentialité

Stockage local de ce navigateur : pénalités, justifications, brouillons, noms saisis, chronos et messages. Les dessins sont sauvegardés après le geste et les autres changements après l’action. Le micro facultatif demande l’autorisation du navigateur ; audio local de 60 secondes maximum, sans transcription ni envoi. Si le stockage est plein ou indisponible, un avertissement indique que l’essai reste seulement en mémoire dans la page. Le mode privé et l’effacement du stockage du navigateur peuvent supprimer les données.

Réinitialiser les deux compétitions efface uniquement cette démonstration, après confirmation. Les archives et les échanges réels ne sont pas reproduits. Les rôles, ACK et libérations sont illustrés localement ; il n’y a pas de communication entre appareils ni avec la démonstration Jugement.

La CSP interdit les connexions applicatives (`connect-src 'none'`). Aucun fetch, serveur, API, clé, base réelle ou accès Manager/CompetFFCK/Jugement. Seuls les fichiers statiques de cette page sont chargés. Ce site ne remplace pas l’application de course et ne permet pas de valider un réseau.

## Publication et maintenance

Fichiers publics dans `dist/`, sans dépendance externe. Source canonique privée `TRAPS/Demo-TRAPS/`. Publication sous `traps/` du dépôt public existant `sdebliquy35-source/jugement-traps-demo` pour utiliser GitHub Pages sans créer de nouveau compte ni serveur. L’URL de la démo Jugement reste inchangée ; les deux simulations sont indépendantes.

Validation : `node test.cjs` pour le modèle, les signes, les protections, les blocages et l’isolation ; contrôles navigateur pour les parcours, les dessins et notes, la sauvegarde, les rôles et le rendu. Les gestes et la reconnaissance au navigateur peuvent différer d’un écran Android physique. La couleur des portes et les dimensions reprennent les styles de TEST, sans émulation Android.
