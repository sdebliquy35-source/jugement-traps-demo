# Démonstration publique Jugement TRAPS · interface 0.70

Lien conservé : https://sdebliquy35-source.github.io/jugement-traps-demo/

La course fictive tourne dans le navigateur : 30 dossards, départ toutes les 20 secondes, durée d’environ une minute. La simulation commence à 1 min 45 et avance à vitesse ×5. Slalom ou Time Trial Cross, vitesse, pause et recommencer se choisissent dans le bandeau violet de démonstration.

## Découvrir

- Présentation actuelle : trois cadres repliables, réceptions et alertes compactes, tri/impression repliable, piles violettes par poste, dix dossards par fiche, ordre dossards ou départs.
- Filtres avec accès direct, agrandissement commun schéma/notes, note manuscrite et texte, audio synthétique d’exemple de cinq secondes.
- Tableaux des pénalités et liste des chronos dans des fenêtres séparées. Sur le même navigateur et la même origine, elles partagent la simulation locale ; leurs filtres et affichages restent indépendants.
- Contrôle des téléphones : noms courts, batterie/charge, canaux de transmission, libération simulée. Une attente disparaît à 02:54 ; une batterie faible apparaît entre 02:00 et 03:30, puis disparaît.
- Absence du dossard 4, dessalage du 8, correction du 5, alertes manquantes et bouton Vu. Ces exemples n’agissent jamais sur de vrais appareils.
- Messages à un juge ou à tous les téléphones fictifs, chronométreurs compris ; progression automatique envoyé/reçu/en attente/lu/effacé.
- Chargement de course pas à pas, liste et parcours préremplis par une source fictive, postes, activation, archives et remise à zéro. Import PCE illustratif : aucun contenu du fichier choisi n’est envoyé ou interprété.
- Connexion CompetFFCK, protections, renvois et récupération sont simulés. Les IP réservées aux exemples ne sont jamais contactées. Un renvoi affiche un bilan fictif, sans reproduire tous les contrôles d’un serveur de course.
- Vue Juge Arbitre accessible via Poste et connexion. Dans cette même fenêtre, « Revenir à la vue Serveur Jugement » permet de retrouver directement la vue Serveur sans réinitialiser les données fictives. Deux archives fictives restent consultables. Les juges déportés illustrent la comparaison future, encore inactive sur les téléphones de course.

## Données et limites

Noms, identifiants et données inventés. Aucune communication vers Manager, CompetFFCK, Jugement ou un téléphone. La politique CSP `connect-src 'none'` et l’interception de tous les appels API interdisent les échanges de l’application. Pas de serveur Python, clé, base SQLite ou configuration réelle dans ce dépôt public.

Les données fictives sont conservées dans le stockage local du navigateur pour coordonner les fenêtres et reprendre une découverte. **Recommencer** relance la course d’exemple. Ce n’est ni une installation du programme complet, ni un test de réseau, de réplication réelle ou de chronométrage.

## Sans Internet

Télécharger `jugement-demo-hors-ligne.html` et l’ouvrir dans un navigateur récent. Il contient styles, scripts, schéma et audio. Les tableaux s’ouvrent dans des fenêtres distinctes si le navigateur l’autorise ; le partage entre fenêtres dépend de l’accès au stockage local pour les fichiers locaux. Un écran d’ordinateur est recommandé.

## Maintenance privée

Sources de préparation canoniques : `TRAPS/Demo-Jugement/`. `python3 build.py` copie l’interface statique actuelle depuis `../Jugement/static`, ajoute l’adaptateur fictif et régénère la version autonome et le ZIP local. `node test-demo.cjs` vérifie syntaxe, scénarios et isolation. Publier uniquement le contenu de `dist/` dans le dépôt public existant `jugement-traps-demo`, branche main, sans modifier son réglage GitHub Pages. Ne pas confondre cette présentation web et l’APK TRAPS 2.0 TEST.
