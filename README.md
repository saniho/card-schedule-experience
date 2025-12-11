# Card Schedule Experience

Une carte personnalisée pour Home Assistant qui permet de programmer des plages horaires et déclencher des automations selon un calendrier.

## 🚀 Installation

### Via HACS
1. Allez dans HACS → Frontend
2. Recherchez "Card Schedule Experience"
3. Installez et redémarrez

### Manuel
1. Créez le dossier `www/` dans votre dossier `config` s'il n'existe pas
2. Copiez `card-schedule-experience.js` dans `www/`
3. Ajoutez la ressource dans votre configuration Lovelace
4. Installez le custom_component (voir ci-dessous)

## 🔧 Installation du Custom Component

1. Copiez le dossier `custom_components/card_schedule_experience/` dans votre dossier `config/custom_components/`
2. Redémarrez Home Assistant
3. Le composant sera automatiquement détecté

## 📋 Configuration

### Configuration Lovelace minimale :

```yaml
type: custom:card-schedule-experience
schedule_id: default
```

### Avec un ID personnalisé :

```yaml
type: custom:card-schedule-experience
schedule_id: my_schedule
```

## 💾 Comment ça marche

### Sauvegarde et chargement automatiques

La configuration est automatiquement sauvegardée chaque fois que vous :
- ✅ Créez une nouvelle plage horaire
- ✅ Modifiez les heures de début/fin
- ✅ Changez l'automation associée
- ✅ Modifiez la couleur
- ✅ Supprimez une plage

Les données sont stockées dans Home Assistant via le service `card_schedule_experience.save_schedule`.

### Services disponibles

#### `card_schedule_experience.save_schedule`
Sauvegarde une configuration de planning.

**Paramètres :**
- `schedule_id` (optionnel) : Identifiant du planning (défaut: "default")
- `timeslots` : Liste des plages horaires
- `automation_colors` : Couleurs assignées aux automations

**Exemple :**
```yaml
service: card_schedule_experience.save_schedule
data:
  schedule_id: my_schedule
  timeslots: []
  automation_colors: {}
```

#### `card_schedule_experience.get_schedule`
Récupère une configuration de planning.

**Paramètres :**
- `schedule_id` (optionnel) : Identifiant du planning (défaut: "default")

## 🎨 Utilisation

### Créer une plage horaire

1. Cliquez et glissez-déposez sur la timeline pour créer une plage
2. Cliquez sur la plage pour ouvrir l'éditeur
3. Définissez les heures de début et fin
4. Sélectionnez une automation
5. Choisissez une couleur (optionnel)

### Modifier une plage

- **Déplacer** : Glissez-déposez la plage
- **Redimensionner** : Utilisez les poignées gauche/droite
- **Éditer** : Cliquez pour ouvrir l'éditeur

### Changer la couleur d'une automation

Quand vous changez la couleur d'une automation, **toutes les plages** utilisant cette automation changent de couleur automatiquement.

## 📦 Structure du projet

```
card-schedule-experience/
├── custom_components/
│   └── card_schedule_experience/
│       ├── __init__.py
│       ├── config_flow.py
│       ├── const.py
│       └── manifest.json
├── www/
│   └── card-schedule-experience.js
├── hacs.json
└── README.md
```

## 🐛 Dépannage

### Les données ne sont pas sauvegardées

- Vérifiez que le custom_component est installé et activé
- Allez dans Paramètres → Appareils et services → Intégrations
- Vérifiez que "Card Schedule Experience" est listée

### La card n'apparaît pas

- Redémarrez Home Assistant après l'installation
- Videz le cache du navigateur (Ctrl+F5)
- Vérifiez que `card-schedule-experience.js` est dans le dossier `www/`

## 📄 Licence

MIT License

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

