#!/usr/bin/with-contenv bashio

# Read options from Home Assistant
export ATMOS_USERNAME=$(bashio::config 'username')
export ATMOS_PASSWORD=$(bashio::config 'password')
export POLL_INTERVAL=$(bashio::config 'poll_interval')
export OUTPUT_FILE=$(bashio::config 'output_file')

bashio::log.info "Starting Atmos History Scraper..."
bashio::log.info "Polling every ${POLL_INTERVAL} seconds"
bashio::log.info "Writing to ${OUTPUT_FILE}"

cd /app
exec node index.js
