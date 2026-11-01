const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const parts=['core','ui','catalog-ui','runtime'].map(name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'));
fs.writeFileSync(path.join(root,'pokebonk-afk.user.js'),parts.join(''));
fs.writeFileSync(path.join(root,'pokebonk-afk.meta.js'),parts[0].slice(0,parts[0].indexOf('(function')));
console.log('Built pokebonk-afk.user.js and update metadata');
