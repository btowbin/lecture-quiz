// node dev/build.js  ->  stamps the version into dev/app.html and writes ../index.html
// (only needed when the APP changes; adding or editing courses needs no build)
const fs = require('fs'), path = require('path');
const dir = __dirname;
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const out = fs.readFileSync(path.join(dir, 'app.html'), 'utf8').replace('__BUILD__', stamp);
fs.writeFileSync(path.join(dir, '..', 'index.html'), out);
console.log('wrote index.html, version', stamp);
