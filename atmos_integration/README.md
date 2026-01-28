# Atmos Integration - Home Assistant Addon

This addon integrates your Atmos Cloud heating system with Home Assistant via a REST API, providing temperature monitoring capabilities.

## Features

- Polls temperature and sensor data from Atmos Cloud at configurable intervals
- Exposes data via REST API for Home Assistant's REST sensor integration
- Tracks 35+ sensor values including:
  - Temperature sensors (PF, PF2, PF3, AF, WF, SF, VF1, VF3, AGF, room temp)
  - Equipment status (pumps, fan, servos)
  - Heating/boiler modes
  - Operating statistics

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `username` | Atmos Cloud username | (required) |
| `password` | Atmos Cloud password | (required) |
| `poll_interval` | Seconds between polls | 120 |

## REST API

The addon exposes sensor data at:

```
http://localhost:8099/api/sensors
```

### Response Format

```json
{
  "timestamp": "2024-01-28T12:00:00.000Z",
  "sensors": {
    "pf": 65.2,
    "pf2": 58.1,
    "pf3": 45.0,
    "af": -2.5,
    "wf": 72.0,
    "sf": 55.0,
    "vf1": 42.0,
    "agf": 120.0,
    "roomTemp": 21.5,
    "humidity": 45,
    "fan": 1,
    "mkp1": 0,
    "heating_mode": "Auto (Komfort)",
    ...
  }
}
```

## Home Assistant Configuration

Add to your `configuration.yaml`:

```yaml
rest:
  - resource: http://localhost:8099/api/sensors
    scan_interval: 120
    sensor:
      - name: "Atmos Akumulace Top"
        value_template: "{{ value_json.sensors.pf }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Akumulace Mid"
        value_template: "{{ value_json.sensors.pf2 }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Akumulace Bottom"
        value_template: "{{ value_json.sensors.pf3 }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Outdoor Temperature"
        value_template: "{{ value_json.sensors.af }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Boiler Temperature"
        value_template: "{{ value_json.sensors.wf }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Hot Water"
        value_template: "{{ value_json.sensors.sf }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Room Temperature"
        value_template: "{{ value_json.sensors.roomTemp }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Humidity"
        value_template: "{{ value_json.sensors.humidity }}"
        unit_of_measurement: "%"
        device_class: humidity
        state_class: measurement

      - name: "Atmos Flue Gas Temperature"
        value_template: "{{ value_json.sensors.agf }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Heating Mode"
        value_template: "{{ value_json.sensors.heating_mode }}"

      - name: "Atmos Boiler Mode"
        value_template: "{{ value_json.sensors.boiler_mode }}"
```

After editing `configuration.yaml`, restart Home Assistant to apply changes.

## Sensor Reference

| Sensor Key | Description |
|------------|-------------|
| pf | Accumulator tank top temperature |
| pf2 | Accumulator tank middle temperature |
| pf3 | Accumulator tank bottom temperature |
| af | Outdoor temperature |
| wf | Boiler temperature |
| sf | Hot water tank temperature |
| vf1 | Heating circuit 1 temperature |
| vf3 | Heating circuit 3 temperature |
| agf | Flue gas temperature |
| roomTemp | Room temperature (thermostat) |
| humidity | Room humidity |
| fan | Fan status |
| mkp1, mkp2, mkp3 | Pump status |
| s1, s2, s3 | Servo status |
| heating_mode | Current heating mode |
| boiler_mode | Current boiler mode |

See the API response for all available sensors.
