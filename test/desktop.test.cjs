const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawn}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),C=require(path.join(root,'pokebonk-afk.user.js'));
const tmp=path.join(root,'test-temp','desktop');fs.mkdirSync(tmp,{recursive:true});process.env.TEMP=process.env.TMP=tmp;
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/game.mjs'),'utf8');
const version={version:'0.8.87',build:'mvxmqseg'};
const routes={
 '/':{type:'text/html',body:'<html><head><meta name="pokebonk-build" content="mvxmqseg"><script>window.nativeRefs={random:Math.random,toString:Function.prototype.toString};</script></head><body><div id="ui"></div><script type="module" src="/assets/main-entry-mvxmqseg.js"></script></body></html>'},
 '/assets/main-entry-mvxmqseg.js':{body:'import("./main-runtime-mvxmqseg.js");'},
 '/assets/main-runtime-mvxmqseg.js':{body:'import * as data from "./defineProperty-mvxmqseg.js";'+fixture},
 '/assets/defineProperty-mvxmqseg.js':{body:'export const items='+JSON.stringify(C.CATALOG.items)+';export const vitamins='+JSON.stringify(C.CATALOG.vitamins)+';export const _=p=>"/data/"+p;'},
 '/version.json':{type:'application/json',body:JSON.stringify(version)},
 '/data/pokemon.json':{type:'application/json',body:JSON.stringify([{id:113,name:'吉利蛋',types:['normal']}])},
 '/data/moves.json':{type:'application/json',body:JSON.stringify(C.CATALOG.moves)},
 '/data/i18n/zh.json':{type:'application/json',body:JSON.stringify({items:Object.fromEntries(C.CATALOG.items.map(v=>[v.key,{name:v.name}]))})}
};
(async()=>{
 const server=http.createServer((req,res)=>{const route=routes[new URL(req.url,'http://localhost').pathname];if(!route){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':route.type||'text/javascript'});res.end(route.body);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let child;
 try{
  const reportDir=path.join(tmp,'report'),profile=path.join(tmp,'profile');fs.mkdirSync(reportDir,{recursive:true});fs.mkdirSync(profile,{recursive:true});
  fs.writeFileSync(path.join(profile,'window.json'),JSON.stringify({width:1200,height:800,fullscreen:false}));
  const reportPath=path.join(reportDir,'report.json');if(fs.existsSync(reportPath))fs.unlinkSync(reportPath);
  const exe=path.join(root,'desktop/client/PokeBonk.exe');assert(fs.existsSync(exe),'Run desktop/Install-Desktop.ps1 first');
  child=spawn(exe,['--url=http://127.0.0.1:'+server.address().port,'--selftest='+reportDir,'--selftest-js='+path.join(__dirname,'desktop-selftest.js'),'--selftest-wait=1200','--afk-test-profile='+profile],{cwd:path.join(root,'desktop'),windowsHide:true,env:{...process.env,TEMP:tmp,TMP:tmp}});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  const exit=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Electron test timed out')),60000);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('exit',code=>{clearTimeout(timer);resolve(code)});});
  fs.writeFileSync(path.join(tmp,'electron.log'),output);
  assert.equal(exit,0,output.slice(-3000));assert(fs.existsSync(reportPath),'Missing Electron report: '+output.slice(-3000));
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));
  assert.equal(report.script?.success,true,JSON.stringify(report.script));assert.equal(report.version,'1.2.0');assert.match(report.webgl.desktop,/1\.2\.0/);assert.equal(report.script.helper.helperVersion,'3.2.0');assert.equal(report.script.helper.catalogVersion,'0.8.87');assert.equal(report.script.helper.ledger.shopSpent,22);assert.equal(report.script.nodeIntegration,'undefined');assert.equal(report.script.nativeFunctionsUnchanged,true);
  const storage=JSON.parse(fs.readFileSync(path.join(root,'desktop/logs/paths.json'),'utf8'));for(const value of Object.values(storage))assert(value.toUpperCase().startsWith('D:\\'),value);
  console.log('PASS: real Electron 1.2.0 client, D: profile, automatic helper injection, renamed fusion, actual shop ledger, luck vitamin, expand control, isolated preload, native functions unchanged');
 }finally{if(child&&child.exitCode===null)child.kill();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
