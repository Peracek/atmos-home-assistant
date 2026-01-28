#!/usr/bin/with-contenv bashio

# Read options from Home Assistant
export ATMOS_USERNAME=$(bashio::config 'username')
export ATMOS_PASSWORD=$(bashio::config 'password')
export POLL_INTERVAL=$(bashio::config 'poll_interval')
export API_PORT=8099

bashio::log.info "Starting Atmos Integration..."
bashio::log.info "Polling every ${POLL_INTERVAL} seconds"
bashio::log.info "REST API available at http://localhost:${API_PORT}/api/sensors"

cd /app
exec node index.js
