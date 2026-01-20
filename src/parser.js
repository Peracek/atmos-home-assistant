import { XMLParser } from 'fast-xml-parser';
import { Parser as HtmlParser } from 'htmlparser2';

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

  const infoPanel = updates.find(
    (u) => u?.['@_id']?.includes('infoPanel')
  );

  if (!infoPanel) {
    return { timestamp: new Date() };
  }

  const html = infoPanel['#text'] || infoPanel['#cdata'] || '';
  return parseHtmlTemperatures(html);
}

function parseHtmlTemperatures(html) {
  const data = { timestamp: new Date() };
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
          if (value !== null) {
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
  return data;
}

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
