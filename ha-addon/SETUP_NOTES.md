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

### Sensors (command_line):
| Sensor | Entity ID | CSV Column | Description |
|--------|-----------|------------|-------------|
| Akumulace top | sensor.akumulace_top | 2 (pf) | Tank top temp |
| Akumulace mid | sensor.akumulace_mid | 3 (pf2) | Tank mid temp |
| Akumulace bot | sensor.akumulace_bot | 4 (pf3) | Tank bottom temp |
| Bojler | sensor.bojler | 7 (sf) | Hot water tank |
| Termostat | sensor.termostat | 12 (roomTemp) | Room temperature |

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
      - sensor.akumulace_top
      - sensor.akumulace_mid
      - sensor.akumulace_bot
      - sensor.bojler
      - sensor.termostat
```

---

## 5. Atmos Scraper Addon

**Location**: `/addons/atmos_history_scraper`

**Output file**: `/share/atmos_history.csv`

**Configuration** (in HA addon settings):
- username: (your Atmos Cloud username)
- password: (your Atmos Cloud password)
- poll_interval: 60
- output_file: /share/atmos_history.csv

---

## 6. Useful Commands

### Check CSV data:
```bash
source .env
sshpass -p "$HA_SSH_PASSWORD" ssh $HA_SSH_USER@$HA_HOST "tail -5 /share/atmos_history.csv"
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

## 7. CSV Column Reference

| Column | Index | Description |
|--------|-------|-------------|
| timestamp | 1 | ISO 8601 timestamp |
| pf | 2 | Akumulace top |
| pf2 | 3 | Akumulace mid |
| pf3 | 4 | Akumulace bot |
| af | 5 | Outdoor temp |
| wf | 6 | Boiler temp |
| sf | 7 | Hot water (Bojler) |
| vf1 | 8 | Heating circuit 1 |
| vf3 | 9 | Heating circuit 3 |
| agf | 10 | Flue gas temp |
| info1 | 11 | Info value |
| roomTemp | 12 | Room temperature |
| humidity | 13 | Humidity |
| ... | ... | (see CSV header for full list) |
