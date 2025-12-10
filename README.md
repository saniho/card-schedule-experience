# Card Schedule Experience

Une carte Lovelace pour Home Assistant permettant de créer et de gérer des plannings visuels de manière intuitive. Idéal pour les thermostats, l'éclairage, l'arrosage, et plus encore.

![Aperçu de la carte](https://raw.githubusercontent.com/user/repo/main/screenshot.png)
*(Pensez à remplacer cette image par une vraie capture d'écran de votre carte !)*

## Fonctionnalités

- **Timeline visuelle** : Affiche les plages horaires pour chaque jour de la semaine sur une timeline de 24 heures.
- **Glisser-déposer (Drag & Drop)** : Déplacez facilement une plage horaire pour changer son heure de début.
- **Redimensionnement intuitif** : Étirez ou rétrécissez les plages horaires directement sur la timeline.
- **Détection de conflits** : Empêche la création de plages horaires qui se chevauchent.
- **Édition rapide** : Cliquez sur une plage pour ouvrir un panneau d'édition et ajuster précisément les heures ou le scénario associé.
- **Gestion de scénarios** : Associez chaque plage horaire à un scénario (ex: "Chauffage Confort", "Mode Éco").
- **Compatible HACS** : Installation et mises à jour faciles via le Home Assistant Community Store.

## Installation

### Avec HACS (Recommandé)

1.  Assurez-vous d'avoir [HACS](https://hacs.xyz/) installé.
2.  Allez dans votre interface Home Assistant.
3.  Allez dans `HACS` > `Frontend`.
4.  Cliquez sur les 3 points en haut à droite et sélectionnez `Custom repositories`.
5.  Entrez l'URL de votre dépôt GitHub dans le champ `Repository`, sélectionnez `Lovelace` dans la catégorie, puis cliquez sur `ADD`.
6.  La carte "Card Schedule Experience" devrait maintenant apparaître. Cliquez sur `INSTALL`.
7.  HACS vous demandera d'ajouter la ressource à votre configuration Lovelace, confirmez.

### Manuelle

1.  Téléchargez le fichier `card-schedule-experience.js` depuis le dossier `dist/` de la [dernière release](https://github.com/VOTRE_USER/VOTRE_REPO/releases).
2.  Placez ce fichier dans le dossier `www` de votre configuration Home Assistant (créez-le s'il n'existe pas). Par exemple, `/config/www/card-schedule-experience/`.
3.  Ajoutez la ressource à votre configuration Lovelace :
    - Allez dans `Paramètres` > `Tableaux de bord`.
    - Cliquez sur les 3 points en haut à droite et sélectionnez `Ressources`.
    - Cliquez sur `AJOUTER UNE RESSOURCE`.
    - Entrez l'URL : `/local/card-schedule-experience/card-schedule-experience.js` (ou le chemin où vous avez placé le fichier).
    - Choisissez `Module JavaScript` comme type de ressource.

## Configuration

Une fois la carte installée, vous pouvez l'ajouter à votre tableau de bord Lovelace.

1.  Ouvrez un tableau de bord et cliquez sur `Modifier le tableau de bord`.
2.  Cliquez sur `AJOUTER UNE CARTE`.
3.  Cherchez la carte `custom:card-schedule-experience` ou choisissez la carte `Manuelle`.
4.  Entrez la configuration suivante :

```yaml
type: custom:card-schedule-experience
# Pour le moment, aucune configuration supplémentaire n'est requise.
# La carte utilise des données d'exemple internes.
```

## Roadmap

Ce projet est en cours de développement. Voici les prochaines étapes prévues :

- [ ] **Sauvegarde des données** : Permettre de sauvegarder et charger la configuration (plages horaires et scénarios) depuis une entité Home Assistant (ex: `input_text`).
- [ ] **Implémentation complète des scénarios** : Construire l'interface pour créer, modifier et supprimer des scénarios complexes (conditions et actions).
- [ ] **Internationalisation (i18n)** : Traduire l'interface dans plusieurs langues.
- [ ] **Plus d'options de personnalisation** : Permettre de configurer les couleurs, les labels, etc.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue pour signaler un bug ou proposer une nouvelle fonctionnalité.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` for plus de détails.
