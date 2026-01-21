import { XMLParser } from 'fast-xml-parser';

export function parseTemperatures(xmlString) {
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    cdataPropName: '#cdata',
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsed = xmlParser.parse(xmlString);
  const partialResponse = parsed['partial-response'];
  if (!partialResponse?.changes) {
    return { timestamp: new Date() };
  }

  const updates = Array.isArray(partialResponse.changes.update)
    ? partialResponse.changes.update
    : [partialResponse.changes.update];

  let html = '';
  for (const u of updates) {
    const id = u?.['@_id'] || '';
    if (id.includes('infoPanel') || id.includes('homePartId') || id === 'fDeviceHome') {
      html = u['#text'] || u['#cdata'] || '';
      if (html) break;
    }
  }

  if (!html) {
    return { timestamp: new Date() };
  }

  return parseAllValues(html);
}

function parseAllValues(html) {
  const data = { timestamp: new Date() };

  // Define all sensors to extract with their patterns
  const sensors = [
    // Primary temperatures (from Teploty group)
    { key: 'af', pattern: /<div class="item-info-left">AF<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'wf', pattern: /<div class="item-info-left">WF<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'sf', pattern: /<div class="item-info-left">SF<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'vf1', pattern: /<div class="item-info-left">VF1<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'agf', pattern: /<div class="item-info-left">AGF<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'pf', pattern: /<div class="item-info-left">PF<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'vf3', pattern: /<div class="item-info-left">VI1<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },

    // Tank sensors (from caption)
    { key: 'pf2', pattern: /PF2 - 2\. čidlo aku[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'pf3', pattern: /PF3 - 3\. čidlo aku[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'info1', pattern: /INFO1 - informační[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },

    // Room climate
    { key: 'roomTemp', pattern: /<div class="item-info-left">EFWa<\/div>[\s\S]*?<div class="item-info-right"[^>]*>([^<]+)/ },
    { key: 'humidity', pattern: /Vlhkost[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+[,.]?\d*)\s*%/ },

    // Request/setpoint values
    { key: 'aku_request', pattern: /Požadavek akumulační[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+[,.]?\d*)/ },
    { key: 'wf_request', pattern: /Teplota vody kotle WF \/ požadavek[\s\S]*?\/\s*(\d+[,.]?\d*)\s*°C/ },
    { key: 'sf_request', pattern: /Teplota SF \/ požadavek[\s\S]*?\/\s*(\d+[,.]?\d*)\s*°C/ },
    { key: 'vf1_request', pattern: /VF1 - aktuální \/ požadavek[\s\S]*?\/\s*(\d+[,.]?\d*)\s*°C/ },
    { key: 'vf3_request', pattern: /VF3 - aktuální \/ požadavek[\s\S]*?\/\s*(\d+[,.]?\d*)\s*°C/ },
    { key: 'roomTemp_request', pattern: /Pokojová teplota \/ požadavek[\s\S]*?\/\s*(\d+[,.]?\d*)\s*°C/ },

    // Outdoor stats
    { key: 'af_avg', pattern: /AF - aktuální \/ průměr[\s\S]*?\/\s*([+-]?\d+[,.]?\d*)\s*°C/ },
    { key: 'af_min', pattern: /AF - min \/ max[\s\S]*?nowrap;">([+-]?\d+[,.]?\d*)/ },
    { key: 'af_max', pattern: /AF - min \/ max[\s\S]*?\/\s*([+-]?\d+[,.]?\d*)\s*°C/ },
    { key: 'af_heating_avg', pattern: /Venkovní teplota průměrná[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?([+-]?\d+[,.]?\d*)/ },

    // Equipment status (ON=1, OFF=0)
    { key: 'fan', pattern: /Odtahový ventilátor[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(ON|OFF)/, isStatus: true },
    { key: 'dkp', pattern: /Čerpadlo DKP[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(ON|OFF)/, isStatus: true },
    { key: 'slp', pattern: /Čerpadlo SLP[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(ON|OFF)/, isStatus: true },
    { key: 'mkp1', pattern: /Čerpadlo MKP1[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(ON|OFF)/, isStatus: true },

    // Servo positions
    { key: 'mk1_pos', pattern: /Servopohon MK1[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+)\s*%/ },
    { key: 'rla3_pos', pattern: /Servopohon RLA3[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+)\s*%/ },

    // Operating stats
    { key: 'dkp_hours', pattern: /Provozní hodiny DKP[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+)\s*h/ },
    { key: 'dkp_starts', pattern: /Počet startů DKP[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+)\s*x/ },

    // External unit
    { key: 'external_temp', pattern: /EFWa \/ ARU5W[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+[,.]?\d*)\s*°C/ },
    { key: 'external_humidity', pattern: /EFWa \/ ARU5W[\s\S]*?\/\s*(\d+[,.]?\d*)\s*%/ },

    // Wireless signal
    { key: 'wireless_signal', pattern: /Bezdrátová jednotka[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?(\d+)\s*%/ },

    // Modes (as strings)
    { key: 'boiler_mode', pattern: /Bojler[\s\S]*?<div class="item-info-left">Režim[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?nowrap;">([^<]+)</, isString: true },
    { key: 'heating_mode', pattern: /Topení[\s\S]*?<div class="item-info-left">Režim[\s\S]*?<div class="item-info-right"[^>]*>[\s\S]*?nowrap;">([^<]+)</, isString: true },
  ];

  for (const sensor of sensors) {
    const match = html.match(sensor.pattern);
    if (match && match[1]) {
      if (sensor.isStatus) {
        data[sensor.key] = match[1] === 'ON' ? 1 : 0;
      } else if (sensor.isString) {
        data[sensor.key] = match[1].trim();
      } else {
        const value = parseValue(match[1]);
        if (value !== null) {
          data[sensor.key] = value;
        }
      }
    }
  }

  // Fallback to home page format if no info page data found
  if (Object.keys(data).length <= 1) {
    parseHomePageFormat(html, data);
  }

  return data;
}

function parseValue(value) {
  if (!value) return null;
  value = value.trim().replace(',', '.');
  const match = value.match(/^([+-]?\d+\.?\d*)/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return isNaN(parsed) ? null : parsed;
}

function parseHomePageFormat(html, data) {
  const outdoorMatch = html.match(/class="box-temperature"[^>]*>.*?<span>([^<]+)</s);
  if (outdoorMatch && !data.af) {
    const val = parseValue(outdoorMatch[1]);
    if (val !== null) data.af = val;
  }

  const circuitMatch = html.match(/id="fDeviceHome:currCircuitTempId"[^>]*>([^<]+)</);
  if (circuitMatch && !data.vf1) {
    const val = parseValue(circuitMatch[1]);
    if (val !== null) data.vf1 = val;
  }

  const humidityMatch = html.match(/class="place-perc"[^>]*>.*?(\d+[,.]?\d*)%/s);
  if (humidityMatch && !data.humidity) {
    data.humidity = parseFloat(humidityMatch[1].replace(',', '.'));
  }
}

export const KNOWN_COLUMNS = [
  'timestamp',
  'pf', 'pf2', 'pf3', 'af', 'wf', 'sf', 'vf1', 'vf3', 'agf', 'info1',
  'roomTemp', 'humidity',
  'aku_request', 'wf_request', 'sf_request', 'vf1_request', 'vf3_request', 'roomTemp_request',
  'af_avg', 'af_min', 'af_max', 'af_heating_avg',
  'fan', 'dkp', 'slp', 'mkp1',
  'mk1_pos', 'rla3_pos',
  'dkp_hours', 'dkp_starts',
  'external_temp', 'external_humidity', 'wireless_signal',
  'boiler_mode', 'heating_mode',
];
