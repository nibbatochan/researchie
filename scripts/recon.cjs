const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const targetDirs = ['src', 'extension', 'public', 'e2e', 'tests'];

const filesList = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
      walk(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.traineddata') || entry.name.endsWith('.png') || entry.name.endsWith('.ico') || entry.name.endsWith('.jpg')) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      const sizeKB = (fs.statSync(fullPath).size / 1024).toFixed(1);
      filesList.push({
        relPath: path.relative(projectRoot, fullPath).replace(/\\/g, '/'),
        lines,
        sizeKB: parseFloat(sizeKB)
      });
    }
  }
}

targetDirs.forEach(d => walk(path.join(projectRoot, d)));

filesList.sort((a, b) => b.lines - a.lines);

const totalLOC = filesList.reduce((acc, f) => acc + f.lines, 0);

console.log(`TOTAL_FILES: ${filesList.length}`);
console.log(`TOTAL_LOC: ${totalLOC}`);
console.log('\n--- TOP 30 LARGEST FILES ---');
console.table(filesList.slice(0, 30));
