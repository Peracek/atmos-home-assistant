import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { KNOWN_COLUMNS } from './parser.js';

let currentColumns = null;

export function initCsv(filePath) {
  if (existsSync(filePath)) {
    // Read existing header to maintain column order
    const firstLine = readFileSync(filePath, 'utf8').split('\n')[0];
    if (firstLine) {
      currentColumns = firstLine.split(',');
    }
  }
}

export function appendRow(filePath, data) {
  // Collect all keys from data (excluding timestamp initially)
  const dataKeys = Object.keys(data).filter(k => k !== 'timestamp');

  // If no columns yet, create header from known columns + any new ones
  if (!currentColumns) {
    currentColumns = buildColumnOrder(dataKeys);
    writeFileSync(filePath, currentColumns.join(',') + '\n');
  } else {
    // Check if we have new columns
    const newKeys = dataKeys.filter(k => !currentColumns.includes(k));
    if (newKeys.length > 0) {
      // Add new columns to the end
      currentColumns = [...currentColumns, ...newKeys];
      // Rewrite file with new header (this is expensive but happens rarely)
      rewriteWithNewHeader(filePath, currentColumns);
    }
  }

  // Build row
  const row = currentColumns.map(col => {
    if (col === 'timestamp') {
      return data.timestamp.toISOString();
    }
    const val = data[col];
    if (val === undefined || val === null) return '';
    // Escape strings containing commas
    if (typeof val === 'string' && val.includes(',')) {
      return `"${val}"`;
    }
    return val;
  }).join(',');

  appendFileSync(filePath, row + '\n');
}

function buildColumnOrder(dataKeys) {
  const columns = ['timestamp'];

  // Add known columns in order (if they exist in data)
  for (const col of KNOWN_COLUMNS) {
    if (col !== 'timestamp' && dataKeys.includes(col)) {
      columns.push(col);
    }
  }

  // Add any unknown columns at the end (sorted)
  const unknownKeys = dataKeys
    .filter(k => !KNOWN_COLUMNS.includes(k))
    .sort();

  return [...columns, ...unknownKeys];
}

function rewriteWithNewHeader(filePath, newColumns) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  if (lines.length < 2) {
    writeFileSync(filePath, newColumns.join(',') + '\n');
    return;
  }

  const oldHeader = lines[0].split(',');
  const newLines = [newColumns.join(',')];

  // Rewrite data rows with new column order
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const oldValues = parseCSVLine(lines[i]);
    const newValues = newColumns.map(col => {
      const oldIdx = oldHeader.indexOf(col);
      return oldIdx >= 0 ? (oldValues[oldIdx] || '') : '';
    });
    newLines.push(newValues.join(','));
  }

  writeFileSync(filePath, newLines.join('\n') + '\n');
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}
