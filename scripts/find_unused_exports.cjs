const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');

function getAllFiles(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      res = res.concat(getAllFiles(full));
    } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
      res.push(full);
    }
  }
  return res;
}

const files = getAllFiles(srcDir);
const exportRegex = /export\s+(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+)/g;

const exportsFound = [];
files.forEach(file => {
  const rel = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const name = match[1];
    exportsFound.push({ file: rel, name });
  }
});

const unusedExports = [];
exportsFound.forEach(({ file, name }) => {
  let count = 0;
  for (const targetFile of files) {
    const content = fs.readFileSync(targetFile, 'utf8');
    if (content.includes(name)) {
      count++;
    }
  }
  // If count is 1, it's only in the file where it is defined
  if (count === 1) {
    unusedExports.push({ file, name });
  }
});

console.log(`Found ${unusedExports.length} unused exports:`);
unusedExports.forEach(e => {
  console.log(` - ${e.file}: ${e.name}`);
});
