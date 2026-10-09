const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const extDir = path.join(rootDir, 'extension');

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx', '.css']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (['node_modules', '.next', '.git', 'dist'].includes(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  return results;
}

const allSrcFiles = getAllFiles(srcDir);
const allExtFiles = getAllFiles(extDir);
const allFiles = [...allSrcFiles, ...allExtFiles];

// 1. Dependency Usage in package.json
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const deps = Object.keys(pkg.dependencies || {});
const depUsage = {};
deps.forEach(d => { depUsage[d] = 0; });

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  deps.forEach(dep => {
    if (content.includes(`'${dep}'`) || content.includes(`"${dep}"`) || content.includes(`'${dep}/`) || content.includes(`"${dep}/`)) {
      depUsage[dep]++;
    }
  });
});

console.log('=== DEPENDENCY USAGE ===');
deps.forEach(d => {
  console.log(`${d}: ${depUsage[d]} references across source files`);
});

// 2. Icon Sets Usage
let phosphorImports = 0;
let lucideImports = 0;
const phosphorFiles = [];
const lucideFiles = [];

allSrcFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(rootDir, file);
  if (content.includes('@phosphor-icons/react')) {
    phosphorImports++;
    phosphorFiles.push(relPath);
  }
  if (content.includes('lucide-react')) {
    lucideImports++;
    lucideFiles.push(relPath);
  }
});

console.log('\n=== ICON SET AUDIT ===');
console.log(`@phosphor-icons/react files: ${phosphorImports}`);
console.log(`lucide-react files: ${lucideImports}`);

// 3. Unreferenced Source Files in src/
console.log('\n=== FILE IMPORT AUDIT ===');
const unreferenced = [];
allSrcFiles.forEach(targetFile => {
  const base = path.basename(targetFile, path.extname(targetFile));
  const rel = path.relative(rootDir, targetFile).replace(/\\/g, '/');
  
  // Exclude Next.js special files
  if (rel.startsWith('src/app/') || rel.startsWith('src/pages/')) return;
  
  let imported = false;
  for (const file of allSrcFiles) {
    if (file === targetFile) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes(base)) {
      imported = true;
      break;
    }
  }
  if (!imported) {
    unreferenced.push(rel);
  }
});
console.log(`Unreferenced files in src: ${unreferenced.length}`);
unreferenced.forEach(f => console.log(' - ' + f));

// 4. Commented-out Code (>3 lines)
console.log('\n=== COMMENTED CODE SCAN ===');
let commentedBlocks = 0;
allSrcFiles.forEach(file => {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let commentStreak = 0;
  const rel = path.relative(rootDir, file).replace(/\\/g, '/');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l.startsWith('//') && (l.includes('{') || l.includes('function') || l.includes('const ') || l.includes('return ') || l.includes('<'))) {
      commentStreak++;
    } else {
      if (commentStreak >= 3) {
        commentedBlocks++;
        console.log(`Commented block in ${rel} ~line ${i - commentStreak + 1} (${commentStreak} lines)`);
      }
      commentStreak = 0;
    }
  }
});
