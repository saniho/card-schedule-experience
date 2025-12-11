"""Config flow for Card Schedule Experience."""
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.core import callback

from .const import DOMAIN


class CardScheduleExperienceConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Card Schedule Experience."""

    VERSION = 1
    CONNECTION_CLASS = config_entries.CONN_CLASS_LOCAL_POLL

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Handle the initial step."""
        if user_input is not None:
            await self.async_set_unique_id(user_input.get(CONF_NAME, DOMAIN))
            self._abort_if_unique_id_configured()

            return self.async_create_entry(
                title=user_input.get(CONF_NAME, "Card Schedule Experience"),
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Optional(CONF_NAME, default="Card Schedule Experience"): str,
            }),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow."""
        return CardScheduleExperienceOptionsFlow(config_entry)


class CardScheduleExperienceOptionsFlow(config_entries.OptionsFlow):
    """Handle options for Card Schedule Experience."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        if user_input is not None:
            return self.async_abort(reason="success")

        return self.async_show_form(step_id="init")

