const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const aiCommentRegex1 = /\/\/ ============================================================\n/g;
const aiCommentRegex2 = /\/\/ Contextos — .*\n/g;
const aiCommentRegex3 = /\/\/ ── .*\n/g;
const aiCommentRegex4 = /\/\* ── .* ── \*\/\n/g;
const aiCommentRegex5 = /\/\/ Contextos.*\n/g;

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    content = content.replace(aiCommentRegex1, '');
    content = content.replace(aiCommentRegex2, '');
    content = content.replace(aiCommentRegex3, '');
    content = content.replace(aiCommentRegex4, '');
    content = content.replace(aiCommentRegex5, '');
    
    // Remove consecutive empty lines at the top of file
    content = content.replace(/^[\s\n]+/, '');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log('Cleaned:', filePath);
    }
  }
});
