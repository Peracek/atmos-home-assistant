import { appendFileSync, existsSync, writeFileSync } from 'fs';

const COLUMNS = ['timestamp', 'pf', 'pf2', 'pf3', 'af', 'wf', 'sf', 'vf1', 'agf', 'roomTemp', 'humidity'];

export function initCsv(filePath) {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, COLUMNS.join(',') + '\n');
  }
}

export function appendRow(filePath, data) {
  const row = COLUMNS.map((col) => {
    if (col === 'timestamp') {
      return data.timestamp.toISOString();
    }
    return data[col] ?? '';
  }).join(',');

  appendFileSync(filePath, row + '\n');
}
