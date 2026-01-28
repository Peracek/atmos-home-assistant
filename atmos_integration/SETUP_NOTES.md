# Home Assistant Atmos Integration - Setup Notes

> **Credentials are stored in `.env` file (gitignored)**

## 1. SSH Access to Home Assistant

```
Host: $HA_HOST ($HA_IP)
Port: 22
Username: $HA_SSH_USER
Password: $HA_SSH_PASSWORD
```

### Connect via SSH:
```bash
source .env
ssh $HA_SSH_USER@$HA_HOST
```

### Or with sshpass (for scripting):
```bash
source .env
sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST
```

### Copy files via tar over SSH (scp doesn't work):
```bash
tar czf - <files> | sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST "cd /destination && tar xzf -"
```

---

## 2. InfluxDB Setup

**Addon**: InfluxDB (a0d7b954_influxdb)

**Internal hostname** (from other addons): `$INFLUXDB_HOST`

```
Host: $INFLUXDB_HOST
Port: $INFLUXDB_PORT
Database: $INFLUXDB_DATABASE
Username: $INFLUXDB_USERNAME
Password: $INFLUXDB_PASSWORD
```

### Query via curl:
```bash
source .env
curl -s -u $INFLUXDB_USERNAME:$INFLUXDB_PASSWORD \
  "http://$INFLUXDB_HOST:$INFLUXDB_PORT/query?db=$INFLUXDB_DATABASE" \
  --data-urlencode 'q=SHOW MEASUREMENTS'
```

### Write data:
```bash
curl -s -u $INFLUXDB_USERNAME:$INFLUXDB_PASSWORD \
  -XPOST "http://$INFLUXDB_HOST:$INFLUXDB_PORT/write?db=$INFLUXDB_DATABASE" \
  --data-binary 'measurement_name,tag=value field=123'
```

### Current measurements:
- `measurements` - contains all temperature sensor data with `entity_id` tag

---

## 3. Grafana Setup

**Addon**: Grafana (a0d7b954_grafana)

**Internal hostname**: `$GRAFANA_HOST:$GRAFANA_PORT`

### Service Account:
```
Name: $GRAFANA_SERVICE_ACCOUNT
Token: $GRAFANA_TOKEN
```

### API calls:
```bash
source .env
curl -s "http://$GRAFANA_HOST:$GRAFANA_PORT/api/dashboards/db" \
  -H "Authorization: Bearer $GRAFANA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dashboard": {...}, "overwrite": true}'
```

### Data Source:
- Name: atmos
- Type: InfluxDB
- UID: $GRAFANA_DATASOURCE_UID
- URL: http://addon_a0d7b954_influxdb:8086
- Database: atmos

### Dashboard:
- Name: Atmos Temperatures
- UID: $GRAFANA_DASHBOARD_UID
- Panels:
  1. **Akumulace** - akumulace_top, akumulace_mid, akumulace_bot
  2. **Bojler & Termostat** - bojler, termostat

---

## 4. Home Assistant Configuration

**Config file**: `/homeassistant/configuration.yaml`

### REST Sensors:

The Atmos addon exposes a REST API at `http://localhost:8099/api/sensors`. Configure REST sensors in `configuration.yaml`:

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

      - name: "Atmos Bojler"
        value_template: "{{ value_json.sensors.sf }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement

      - name: "Atmos Termostat"
        value_template: "{{ value_json.sensors.roomTemp }}"
        unit_of_measurement: "°C"
        device_class: temperature
        state_class: measurement
```

### InfluxDB integration:
```yaml
influxdb:
  host: a0d7b954-influxdb
  port: 8086
  database: atmos
  username: atmos
  password: atmos
  max_retries: 3
  override_measurement: measurements
  include:
    entities:
      - sensor.atmos_akumulace_top
      - sensor.atmos_akumulace_mid
      - sensor.atmos_akumulace_bottom
      - sensor.atmos_bojler
      - sensor.atmos_termostat
```

---

## 5. Atmos Integration Addon

**Location**: `/addons/atmos_integration`

**REST API**: `http://localhost:8099/api/sensors`

**Configuration** (in HA addon settings):
- username: (your Atmos Cloud username)
- password: (your Atmos Cloud password)
- poll_interval: 120

---

## 6. Useful Commands

### Test REST API:
```bash
curl http://localhost:8099/api/sensors
```

### Check InfluxDB measurements:
```bash
source .env
sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST \
  "curl -s -u $INFLUXDB_USERNAME:$INFLUXDB_PASSWORD 'http://$INFLUXDB_HOST:$INFLUXDB_PORT/query?db=$INFLUXDB_DATABASE' --data-urlencode 'q=SHOW MEASUREMENTS'"
```

### View HA config:
```bash
source .env
sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST "cat /homeassistant/configuration.yaml"
```

### Edit HA config:
```bash
source .env
sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST "sudo tee /homeassistant/configuration.yaml > /dev/null" << 'EOF'
# config content here
EOF
```

### Restart Home Assistant:
Do it from UI: Settings → System → Restart

---

## 7. Sensor Reference

| Sensor Key | Description |
|------------|-------------|
| pf | Accumulator tank top |
| pf2 | Accumulator tank middle |
| pf3 | Accumulator tank bottom |
| af | Outdoor temperature |
| wf | Boiler temperature |
| sf | Hot water (Bojler) |
| vf1 | Heating circuit 1 |
| vf3 | Heating circuit 3 |
| agf | Flue gas temperature |
| roomTemp | Room temperature |
| humidity | Room humidity |
