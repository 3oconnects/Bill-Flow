const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const res = path.resolve(dir, file);
    if (fs.statSync(res).isDirectory()) {
      getFiles(res, files);
    } else if (res.endsWith('.jsx')) {
      files.push(res);
    }
  }
  return files;
}

const files = getFiles('frontend/src/features');
let filesUpdated = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('window.confirm')) {
    let updated = content;

    // Pattern 1: `window.confirm('msg') && action(...)`
    updated = updated.replace(/window\.confirm\((['`].+?['`])\)\s*&&\s*([a-zA-Z0-9_\.]+\.mutate\([^\)]*\))/g, "confirmAction($1, () => $2)");
    updated = updated.replace(/window\.confirm\((['`].+?['`])\)\s*&&\s*([a-zA-Z0-9_\.]+\.mutate\(\))/g, "confirmAction($1, () => $2)");

    if (updated !== content) {
      if (!updated.includes('confirmStore')) {
        const importStatement = `import { confirmAction } from '@/store/confirmStore'\n`;
        const lastImportIndex = updated.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLine = updated.indexOf('\n', lastImportIndex);
          updated = updated.slice(0, endOfLine + 1) + importStatement + updated.slice(endOfLine + 1);
        } else {
          updated = importStatement + updated;
        }
      }
      
      fs.writeFileSync(file, updated, 'utf8');
      filesUpdated++;
      console.log('Updated', file);
    }
  }
}
console.log('Total files updated:', filesUpdated);
