// node dev/set-password.js <new password>   -> writes the password hash into dev/app.html and rebuilds ../index.html
// Use '' (empty) to switch the lecturer password off.   Then commit + push index.html.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const pw = process.argv[2];
if (pw === undefined) { console.log('usage: node dev/set-password.js <new password>'); process.exit(1); }
const f = path.join(__dirname, 'app.html'); let s = fs.readFileSync(f, 'utf8');
const hash = pw === '' ? '' : crypto.createHash('sha256').update('lq-lecturer|' + pw).digest('hex');
const re = /(window\.SBQ_LECT_HASH : ')[0-9a-f]*(';)/;
if (!re.test(s)) { console.log('LECTURER_HASH line not found in app.html'); process.exit(1); }
fs.writeFileSync(f, s.replace(re, (m, a, b) => a + hash + b));
require('./build.js');
console.log(pw === '' ? 'Password switched off.' : 'Password changed.');
