# Atmos History Scraper - Home Assistant Addon

This addon scrapes temperature data from Atmos Cloud and saves it to a CSV file.

## Installation

### Option 1: Local Addon

1. Run `./build.sh` to prepare the addon files
2. Copy the entire `ha-addon` folder to `/addons/atmos_history_scraper` on your Home Assistant
3. Go to Settings → Add-ons → Add-on Store
4. Click the three dots menu → Check for updates
5. Find "Atmos History Scraper" in "Local add-ons" and install

### Option 2: Git Repository

1. Add this repository as a custom addon repository in Home Assistant
2. Install from the addon store

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `username` | Atmos Cloud username | (required) |
| `password` | Atmos Cloud password | (required) |
| `poll_interval` | Seconds between polls | 60 |
| `output_file` | Path to CSV output | /share/atmos_history.csv |

## Output

The CSV file is written to the Home Assistant `/share` directory by default, making it accessible to other addons and integrations.
