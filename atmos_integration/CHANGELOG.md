# Changelog

## [1.1.1] - 2025-01-29

### Fixed
- Auto-recovery on session expiration or consecutive poll failures
- After 3 consecutive failures, automatically re-authenticates and restores the session
- Handles session expiration, network timeouts, server errors, and other transient failures

## [1.1.0] - 2025-01-28

### Changed
- Replaced CSV file output with REST API
- Addon now exposes sensor data at `http://localhost:8099/api/sensors`
- Use Home Assistant's built-in REST sensor integration instead of file reader
- Removed `output_file` configuration option
- Added `host_network: true` for easier access from Home Assistant

### Removed
- CSV file writing functionality
- Dependency on shared folder access

## [1.0.0] - 2025-01-23

### Added
- Initial release
- Poll temperature and sensor data from Atmos Cloud
- Write data to CSV file for historical analysis
- Configurable polling interval
- Support for 35+ sensor values
