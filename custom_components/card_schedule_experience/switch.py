"""Switch platform for Card Schedule Experience."""
import logging
from datetime import datetime
from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.entity import DeviceInfo

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up schedule switches from YAML config (not used, we use async_setup_entry)."""
    pass


async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up switches for Card Schedule Experience from a config entry."""

    # Nous allons créer les switches dynamiquement quand les schedules sont sauvegardés
    # Pour l'instant, on initialize juste le système
    _LOGGER.info("Card Schedule Experience switch platform initialized")


class ScheduleSwitch(SwitchEntity):
    """Représente une plage horaire du planning."""

    def __init__(self, hass: HomeAssistant, schedule_id: str, timeslot: dict, color: str):
        """Initialize the schedule switch."""
        self.hass = hass
        self._schedule_id = schedule_id
        self._timeslot = timeslot
        self._color = color
        self._is_on = False
        self._attr_unique_id = f"schedule_experience_{schedule_id}_{timeslot.get('id', 'unknown')}"

    @property
    def entity_id(self) -> str:
        """Return the entity_id of the switch."""
        return f"switch.schedule_experience_{self._schedule_id}_{self._timeslot.get('id')}"

    @property
    def name(self) -> str:
        """Return the name of the switch."""
        automation_id = self._timeslot.get('automationId', '')
        friendly_name = self._timeslot.get('name', 'Schedule')

        if automation_id and self.hass and automation_id in self.hass.states:
            friendly_name = self.hass.states[automation_id].attributes.get('friendly_name', automation_id)

        return f"Schedule - {friendly_name}"

    @property
    def is_on(self) -> bool:
        """Return True if the switch is on."""
        # Le switch est "on" si nous sommes actuellement dans le créneau horaire
        return self._is_on_in_timeslot()

    @property
    def extra_state_attributes(self) -> dict:
        """Return the state attributes."""
        now = datetime.now()
        current_time = f"{now.hour:02d}:{now.minute:02d}"
        current_day = now.weekday()
        calendar_day = (current_day + 1) % 7

        start_time = self._timeslot.get("startTime", "00:00")
        end_time = self._timeslot.get("endTime", "23:59")
        is_in_range = (
            self._timeslot.get("day") == calendar_day and
            start_time <= current_time < end_time
        )

        return {
            "schedule_id": self._schedule_id,
            "timeslot_id": self._timeslot.get("id"),
            "day": self._timeslot.get("day"),
            "start_time": start_time,
            "end_time": end_time,
            "automation_id": self._timeslot.get("automationId"),
            "color": self._color,
            "current_time": current_time,
            "current_day": calendar_day,
            "is_in_range": is_in_range,
            "enabled": self._timeslot.get("enabled", True),
        }

    @property
    def icon(self) -> str:
        """Return the icon."""
        if self.is_on:
            return "mdi:play-circle"
        return "mdi:clock-outline"

    @property
    def device_info(self) -> DeviceInfo:
        """Return device information."""
        return DeviceInfo(
            identifiers={(DOMAIN, f"schedule_{self._schedule_id}")},
            name=f"Schedule Experience ({self._schedule_id})",
            manufacturer="Card Schedule Experience",
        )

    def _is_on_in_timeslot(self) -> bool:
        """Check if current time is within the timeslot."""
        now = datetime.now()
        current_time = f"{now.hour:02d}:{now.minute:02d}"
        current_day = now.weekday()

        # Convertir au format de jour du calendrier (0 = dimanche, 1 = lundi, ...)
        calendar_day = (current_day + 1) % 7

        # Vérifier si c'est le bon jour
        if self._timeslot.get("day") != calendar_day:
            return False

        # Vérifier si l'heure est dans le créneau
        start_time = self._timeslot.get("startTime", "00:00")
        end_time = self._timeslot.get("endTime", "23:59")

        return start_time <= current_time < end_time

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on the switch (trigger the automation)."""
        automation_id = self._timeslot.get("automationId")

        if automation_id:
            try:
                await self.hass.services.async_call(
                    'automation',
                    'trigger',
                    {'entity_id': automation_id},
                )
                _LOGGER.info(f"Manually triggered automation: {automation_id}")
            except Exception as e:
                _LOGGER.error(f"Error triggering automation {automation_id}: {e}")

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the switch (no action needed)."""
        _LOGGER.debug(f"Schedule switch turned off: {self.entity_id}")


async def async_create_schedule_switches(hass: HomeAssistant, schedule_id: str, timeslots: list, automation_colors: dict) -> list:
    """Create schedule switches for all timeslots."""
    switches = []

    for timeslot in timeslots:
        color = automation_colors.get(timeslot.get("automationId"), "#3b82f6")
        switch = ScheduleSwitch(hass, schedule_id, timeslot, color)
        switches.append(switch)

    _LOGGER.debug(f"Created {len(switches)} switches for schedule {schedule_id}")
    return switches

