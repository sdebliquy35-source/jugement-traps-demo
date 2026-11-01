# Jugement TRAPS — démonstration interactive

Une course fictive tourne automatiquement dans le navigateur. Aucune installation, aucun compte pour le visiteur et aucun accès à Manager, aux téléphones ou au Serveur Jugement ne sont nécessaires.

## Découvrir

- 30 dossards, cinq postes de quatre portes, départs toutes les 20 secondes et parcours d’environ une minute.
- La simulation commence à 1 min 45 pour proposer immédiatement des fiches. Vitesse ×5 par défaut, temps réel ou ×20 au choix ; pause et recommencer disponibles.
- Piles, filtres, détail par dossard, comparaison de sources, agrandissement commun schéma/notes, exemple audio synthétique (signal sonore de cinq secondes), chronos, journal et aperçu d’impression.
- Absence du dossard 4 ; dessalage du 8 avant la porte 8 ; réception retardée d’une porte du 2 ; correction du 5 de 2 à 50. L’alerte manquante s’efface à réception ou par Vu.
- Deux archives fictives sont disponibles, dont un Time Trial Kayak Cross.
- Les juges déportés servent à illustrer la comparaison : cette fonction n’est pas activée dans l’APK de course actuelle.

Les noms, identifiants, données et audio sont inventés. Chaque visiteur possède sa propre simulation en mémoire ; actualiser la page repart de l’état initial. Les actions d’administration restent dans cette simulation. Les exports ou impressions ne contiennent que ces exemples. Cette démonstration ne valide pas la liaison réseau, la réplication JA ou le comportement des appareils réels.

## Utilisation sans Internet

Ouvrir `jugement-demo-hors-ligne.html` dans un navigateur récent. Ce fichier contient les styles, scripts, dessin et audio ; il peut être partagé comme un document. Il faut le télécharger puis l’ouvrir, pas utiliser l’aperçu Drive. Les navigateurs de bureau récents sont recommandés pour découvrir une interface de gestion prévue pour un grand écran.

## Publication sur GitHub Pages

Créer un dépôt public distinct `jugement-traps-demo`, sans recopier de données ou configuration de production. Déposer **le contenu de `dist/` à la racine** (et non le dossier lui-même). Dans Settings → Pages, choisir Deploy from a branch, branche main, dossier / (root), puis Save. Le visiteur n’a pas besoin de compte GitHub. Le fichier `.nojekyll` évite toute transformation Jekyll.

Aucun processus Python, dépendance npm, service externe ou clé n’est nécessaire. Tous les chemins d’assets sont relatifs, compatibles avec une URL de projet GitHub Pages. La CSP interdit les connexions de l’application (`connect-src 'none'`) et son API est simulée exclusivement en mémoire.

Sources dérivées de l’interface Jugement 0.20/layout55 ; programme de production inchangé. `build.py` régénère le fichier autonome et l’archive. Les tests du moteur se trouvent dans `work/web-demo/test-demo.cjs` dans l’espace de développement.
