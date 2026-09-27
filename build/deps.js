// Locates the build-time packages (fonts, icons, opentype.js).
// Looks in build/node_modules first (after `npm install`), then in the folders
// listed in README_TOOLS (path-separated), each of which holds a node_modules/.
const fs = require('fs');
const path = require('path');

const roots = [__dirname, ...(process.env.README_TOOLS || '').split(path.delimiter).filter(Boolean)]
  .map(r => path.join(path.resolve(r), 'node_modules'));

function dir(pkg) {
  for (const r of roots) {
    const d = path.join(r, pkg);
    if (fs.existsSync(path.join(d, 'package.json'))) return d;
  }
  throw new Error(`"${pkg}" not found. Run \`npm install\` in build/ (or set README_TOOLS).`);
}
const mod = pkg => require(dir(pkg));
const file = (pkg, rel) => path.join(dir(pkg), rel);

module.exports = { dir, mod, file };
