"""Card Schedule Experience Integration."""
import logging
from typing import Any
from datetime import datetime
import os
import yaml
import json

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, SERVICE_SAVE_SCHEDULE, SERVICE_GET_SCHEDULE, SERVICE_TRIGGER_SCHEDULE

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = vol.Schema(
    {DOMAIN: vol.Schema({vol.Optional(CONF_NAME, default="Schedule"): cv.string})},
    extra=vol.ALLOW_EXTRA,
)

PLATFORMS = []

# ID de l'automation créée automatiquement
TRIGGER_AUTOMATION_ID = "card_schedule_experience_trigger"
STORAGE_FILE = ".storage/card_schedule_experience_schedules.json"


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Card Schedule Experience component."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["schedules"] = {}
    hass.data[DOMAIN]["hass"] = hass

    # Créer l'automation de déclenchement
    await _setup_trigger_automation(hass)

    # Charger les schedules depuis le fichier de stockage
    await _load_schedules_from_file(hass)

    async def save_schedule_service(call: ServiceCall) -> None:
        """Handle save schedule service call."""
        schedule_id = call.data.get("schedule_id", "default")
        timeslots = call.data.get("timeslots", [])
        automation_colors = call.data.get("automation_colors", {})

        hass.data[DOMAIN]["schedules"][schedule_id] = {
            "timeslots": timeslots,
            "automation_colors": automation_colors,
        }

        # Sauvegarder dans le fichier
        await _save_schedules_to_file(hass)

        _LOGGER.debug(f"Schedule {schedule_id} saved with {len(timeslots)} timeslots")

    async def get_schedule_service(call: ServiceCall) -> dict:
        """Handle get schedule service call."""
        schedule_id = call.data.get("schedule_id", "default")

        schedule = hass.data[DOMAIN]["schedules"].get(schedule_id, {
            "timeslots": [],
            "automation_colors": {},
        })

        _LOGGER.debug(f"Schedule {schedule_id} retrieved with {len(schedule.get('timeslots', []))} timeslots")
        return schedule

    async def trigger_schedule_service(call: ServiceCall) -> None:
        """Trigger automations based on schedule."""
        schedule_id = call.data.get("schedule_id", "default")

        schedule = hass.data[DOMAIN]["schedules"].get(schedule_id)
        if not schedule:
            _LOGGER.warning(f"Schedule {schedule_id} not found")
            return

        timeslots = schedule.get("timeslots", [])

        # Get current time and day
        now = datetime.now()
        current_time = f"{now.hour:02d}:{now.minute:02d}"
        current_day = now.weekday()  # 0 = Monday, 6 = Sunday

        # Convert to calendar day format (0 = Sunday, 1 = Monday, ...)
        calendar_day = (current_day + 1) % 7

        triggered_automations = []

        # Find and trigger matching automations
        for timeslot in timeslots:
            # Check if timeslot is for today
            if timeslot.get("day") != calendar_day:
                continue

            # Check if current time is within the timeslot
            start_time = timeslot.get("startTime", "00:00")
            end_time = timeslot.get("endTime", "23:59")

            if start_time <= current_time < end_time:
                automation_id = timeslot.get("automationId")
                if automation_id and automation_id not in triggered_automations:
                    try:
                        # Trigger the automation
                        await hass.services.async_call(
                            'automation',
                            'trigger',
                            {'entity_id': automation_id},
                        )
                        triggered_automations.append(automation_id)
                        _LOGGER.info(f"Triggered automation: {automation_id}")
                    except Exception as e:
                        _LOGGER.error(f"Error triggering automation {automation_id}: {e}")

        if triggered_automations:
            _LOGGER.info(f"Triggered {len(triggered_automations)} automations from schedule {schedule_id}")
        else:
            _LOGGER.debug(f"No automations to trigger for schedule {schedule_id} at {current_time} on day {calendar_day}")

    # Register services
    hass.services.async_register(
        DOMAIN,
        SERVICE_SAVE_SCHEDULE,
        save_schedule_service,
        schema=vol.Schema({
            vol.Optional("schedule_id", default="default"): cv.string,
            vol.Optional("timeslots", default=[]): cv.ensure_list,
            vol.Optional("automation_colors", default={}): dict,
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_SCHEDULE,
        get_schedule_service,
        schema=vol.Schema({
            vol.Optional("schedule_id", default="default"): cv.string,
        }),
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_TRIGGER_SCHEDULE,
        trigger_schedule_service,
        schema=vol.Schema({
            vol.Optional("schedule_id", default="default"): cv.string,
        }),
    )

    _LOGGER.info("Card Schedule Experience component loaded")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up from a config entry."""
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return True


async def _load_schedules_from_file(hass: HomeAssistant) -> None:
    """Load schedules from storage file."""
    try:
        storage_path = hass.config.path(STORAGE_FILE)

        # Créer le dossier .storage s'il n'existe pas
        storage_dir = os.path.dirname(storage_path)
        os.makedirs(storage_dir, exist_ok=True)

        if os.path.exists(storage_path):
            with open(storage_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                hass.data[DOMAIN]["schedules"] = data
                _LOGGER.info(f"Loaded {len(data)} schedules from file")
        else:
            _LOGGER.debug("No existing schedules file found, starting with empty schedules")
    except Exception as e:
        _LOGGER.error(f"Error loading schedules from file: {e}")


async def _save_schedules_to_file(hass: HomeAssistant) -> None:
    """Save schedules to storage file."""
    try:
        storage_path = hass.config.path(STORAGE_FILE)

        # Créer le dossier s'il n'existe pas
        storage_dir = os.path.dirname(storage_path)
        os.makedirs(storage_dir, exist_ok=True)

        with open(storage_path, 'w', encoding='utf-8') as f:
            json.dump(hass.data[DOMAIN]["schedules"], f, indent=2, ensure_ascii=False)

        _LOGGER.debug(f"Schedules saved to file: {storage_path}")
    except Exception as e:
        _LOGGER.error(f"Error saving schedules to file: {e}")


async def _setup_trigger_automation(hass: HomeAssistant) -> None:
    """Create or update the trigger automation."""
    try:
        config_dir = hass.config.path()
        automations_file = os.path.join(config_dir, "automations.yaml")

        # Lire le fichier automations.yaml s'il existe
        automations = []
        if os.path.exists(automations_file):
            try:
                with open(automations_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if content.strip():
                        automations = yaml.safe_load(content) or []
            except Exception as e:
                _LOGGER.warning(f"Error reading automations.yaml: {e}")
                automations = []

        # Vérifier si l'automation existe déjà et la supprimer
        automations = [a for a in automations if a.get('id') != TRIGGER_AUTOMATION_ID]

        # Créer la nouvelle automation
        trigger_automation = {
            'id': TRIGGER_AUTOMATION_ID,
            'alias': 'Card Schedule Experience - Déclencher le planning',
            'description': 'Automation créée automatiquement par Card Schedule Experience',
            'trigger': {
                'platform': 'time_pattern',
                'minutes': '/1'  # Toutes les minutes
            },
            'action': {
                'service': f'{DOMAIN}.{SERVICE_TRIGGER_SCHEDULE}',
                'data': {
                    'schedule_id': 'default'
                }
            },
            'mode': 'single'
        }

        # Ajouter la nouvelle automation
        automations.append(trigger_automation)

        # Écrire le fichier automations.yaml
        with open(automations_file, 'w', encoding='utf-8') as f:
            yaml.dump(automations, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

        _LOGGER.info(f"Created/Updated trigger automation: {TRIGGER_AUTOMATION_ID}")

        # Recharger les automations dans Home Assistant
        await hass.services.async_call('automation', 'reload')
        _LOGGER.info("Automations reloaded")

    except Exception as e:
        _LOGGER.error(f"Error setting up trigger automation: {e}")

