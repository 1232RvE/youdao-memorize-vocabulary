const fs = require('fs');
const cp = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '..', 'words_plugin', 'dicts');
const output = path.join(root, 'src', 'assets', 'dicts');
fs.mkdirSync(output, { recursive: true });

// SQLite 里部分释义存的是字面反斜杠 n（0x5C 0x6E）而不是真实换行，
// 直接渲染会在笔上显示成 "\n" 文本。导出时统一还原成真实换行。
function unescapeLiteral(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ');
}

function fixWord(w) {
  return {
    id: w.id,
    word: w.word,
    phonetic: w.phonetic,
    definition: unescapeLiteral(w.definition),
    translation: unescapeLiteral(w.translation),
    pos: w.pos
  };
}

const files = fs.readdirSync(source).filter((name) => name.endsWith('.db'));
for (const file of files) {
  const db = path.join(source, file);
  const metaText = cp.execFileSync('D:/platform-tools/sqlite3.exe', [db, 'select key,value from dict_meta;'], { encoding: 'utf8' });
  const rowsText = cp.execFileSync('D:/platform-tools/sqlite3.exe', [db, 'select id,word,phonetic,definition,translation,pos from words order by id;'], { encoding: 'utf8' });
  const meta = {};
  for (const line of metaText.trim().split(/\r?\n/)) { const p = line.indexOf('|'); if (p >= 0) meta[line.slice(0, p)] = line.slice(p + 1); }
  const rows = rowsText.trim() ? rowsText.trim().split(/\r?\n/).map((line) => {
    const p = line.split('|');
    return fixWord({ id: Number(p[0]), word: p[1] || '', phonetic: p[2] || '', definition: p[3] || '', translation: p[4] || '', pos: p[5] || '' });
  }) : [];
  const out = { id: file.replace(/\.db$/, ''), name: meta.name || file, description: meta.description || '', version: meta.version || '1.0.0', words: rows };
  fs.writeFileSync(path.join(output, file.replace(/\.db$/, '.json')), JSON.stringify(out));
  console.log(file + ': ' + rows.length);
}
