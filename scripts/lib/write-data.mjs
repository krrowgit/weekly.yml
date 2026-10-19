import fs from 'node:fs';
import path from 'node:path';

export function serialize(data) {
  return (
    '/* 由 data.json 生成，请勿直接修改。每周自动采集会重写此文件。 */\n' +
    'window.WEEKLY_DATA = ' + JSON.stringify(data, null, 2) + ';\n'
  );
}

export function writeData(root, data, { dry = false } = {}) {
  const json = JSON.stringify(data, null, 2) + '\n';
  const js = serialize(data);
  fs.writeFileSync(path.join(root, dry ? 'data.preview.json' : 'data.json'), json);
  fs.writeFileSync(path.join(root, dry ? 'data.preview.js' : 'data.js'), js);
  return { jsonFile: dry ? 'data.preview.json' : 'data.json', jsFile: dry ? 'data.preview.js' : 'data.js' };
}
