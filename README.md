# Atmos Home Assistant Addon Repository

This repository contains Home Assistant addons for integrating with Atmos Cloud heating systems.

[![Add repository to Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FPeracek%2Fatmos-home-assistant)

## Installation

1. Click the button above, or manually:
2. Open Home Assistant
3. Navigate to **Settings** → **Add-ons** → **Add-on Store**
4. Click the menu (⋮) in the top right corner
5. Select **Repositories**
6. Add this repository URL:
   ```
   https://github.com/Peracek/atmos-home-assistant
   ```
7. Click **Add** and then **Close**
8. Refresh the page, find **Atmos Integration** in the store, and click **Install**

## Available Addons

### Atmos Integration

Integrates your Atmos Cloud heating system with Home Assistant via REST API. Features:

- Polls temperature data from Atmos Cloud at configurable intervals
- Exposes sensor data via REST API for Home Assistant's built-in REST sensor integration
- Tracks 35+ sensor values (temperatures, equipment status, heating modes)
- Works with all Atmos Cloud-connected heating systems

For detailed configuration and setup instructions, see the [addon documentation](atmos_integration/README.md).

## Support

If you encounter issues, please open an issue on GitHub.
