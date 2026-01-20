import { XMLParser } from 'fast-xml-parser';
import { Parser as HtmlParser } from 'htmlparser2';

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

  // Find homePartId update (home page data)
  const homePartUpdate = updates.find(
    (u) => u?.['@_id']?.includes('homePartId')
  );

  // Also check for infoPanel (detailed info page)
  const infoPanelUpdate = updates.find(
    (u) => u?.['@_id']?.includes('infoPanel')
  );

  const html = homePartUpdate?.['#text'] || homePartUpdate?.['#cdata'] ||
               infoPanelUpdate?.['#text'] || infoPanelUpdate?.['#cdata'] || '';

  if (!html) {
    return { timestamp: new Date() };
  }

  return parseHtmlData(html);
}

function parseHtmlData(html) {
  const data = { timestamp: new Date() };

  // Extract outdoor temperature from box-temperature
  const outdoorMatch = html.match(/class="box-temperature"[^>]*>.*?<span>([^<]+)</s);
  if (outdoorMatch) {
    const temp = parseValue(outdoorMatch[1]);
    if (temp !== null) data.af = temp;
  }

  // Extract circuit temperature from currCircuitTempId
  const circuitMatch = html.match(/id="fDeviceHome:currCircuitTempId"[^>]*>([^<]+)</);
  if (circuitMatch) {
    const temp = parseValue(circuitMatch[1]);
    if (temp !== null) data.vf1 = temp;
  }

  // Extract humidity from place-perc
  const humidityMatch = html.match(/class="place-perc"[^>]*>.*?(\d+[,.]?\d*)%/s);
  if (humidityMatch) {
    const humidity = parseValue(humidityMatch[1] + '%');
    if (humidity !== null) data.humidity = humidity;
  }

  // Also try parsing detailed sensor data (for Info page format)
  parseDetailedSensors(html, data);

  return data;
}

function parseDetailedSensors(html, data) {
  // Parse sensors using dt/dd pattern (Info page format)
  let currentSensor = null;
  let isInCaption = false;
  let isInValue = false;
  let captionText = '';
  let valueText = '';

  const parser = new HtmlParser({
    onopentag(name, attrs) {
      const className = attrs.class || '';
      if (className.includes('caption') || name === 'dt') {
        isInCaption = true;
        captionText = '';
      } else if (className.includes('value') || name === 'dd') {
        isInValue = true;
        valueText = '';
      }
    },
    ontext(text) {
      text = text.trim();
      if (!text) return;
      if (isInCaption) captionText += text;
      else if (isInValue) valueText += text;
    },
    onclosetag(name) {
      if (isInCaption && (name === 'dt' || captionText)) {
        currentSensor = extractSensor(captionText);
        isInCaption = false;
      } else if (isInValue && (name === 'dd' || valueText)) {
        if (currentSensor && valueText) {
          const value = parseValue(valueText);
          if (value !== null && !data[currentSensor]) {
            data[currentSensor] = value;
          }
        }
        isInValue = false;
        currentSensor = null;
      }
    },
  }, { decodeEntities: true });

  parser.write(html);
  parser.end();
}

const SENSOR_MAP = {
  'AF': 'af',
  'WF': 'wf',
  'SF': 'sf',
  'VF1': 'vf1',
  'AGF': 'agf',
  'PF': 'pf',
  'PF2': 'pf2',
  'PF3': 'pf3',
};

function extractSensor(caption) {
  const upper = caption.trim().toUpperCase();

  for (const [key, value] of Object.entries(SENSOR_MAP)) {
    if (upper.includes(key)) return value;
  }

  if (upper.includes('ROOM') || upper.includes('MÍSTNOST')) return 'roomTemp';
  if (upper.includes('HUMIDITY') || upper.includes('VLHKOST')) return 'humidity';

  return null;
}

function parseValue(value) {
  value = value.trim().replace(/[°C%\s]/g, '').replace(',', '.');
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
