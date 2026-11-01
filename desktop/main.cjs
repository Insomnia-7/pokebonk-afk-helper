'use strict';
const {app}=require('electron');
const fs=require('node:fs'),path=require('node:path'),https=require('node:https');
const root=path.resolve(__dirname,'..');
if(path.parse(root).root.toUpperCase()!=='D:\\')throw Error('Install and run this loader from D:');
const selftest=process.argv.some(a=>a.startsWith('--selftest='));
const testProfile=process.argv.find(a=>a.startsWith('--afk-test-profile='))?.split('=').slice(1).join('=');
const profile=selftest&&testProfile?path.resolve(testProfile):path.join(__dirname,'profile');
if(!profile.toUpperCase().startsWith('D:\\'))throw Error('Client profile must be on D:');
for(const dir of [profile,path.join(profile,'Session'),path.join(__dirname,'temp'),path.join(__dirname,'logs'),path.join(__dirname,'crash-dumps'),path.join(__dirname,'downloads')])fs.mkdirSync(dir,{recursive:true});
app.setPath('userData',profile);
app.setPath('sessionData',path.join(profile,'Session'));
app.setPath('temp',path.join(__dirname,'temp'));
app.setPath('logs',path.join(__dirname,'logs'));
app.setPath('crashDumps',path.join(__dirname,'crash-dumps'));
app.setPath('downloads',path.join(__dirname,'downloads'));
process.env.TEMP=process.env.TMP=path.join(__dirname,'temp');
const scriptPath=path.join(root,'pokebonk-afk.user.js');
const script=fs.readFileSync(scriptPath,'utf8');
fs.writeFileSync(path.join(__dirname,'logs','paths.json'),JSON.stringify({userData:app.getPath('userData'),sessionData:app.getPath('sessionData'),temp:app.getPath('temp'),logs:app.getPath('logs'),crashDumps:app.getPath('crashDumps'),downloads:app.getPath('downloads')},null,2));
const versionOf=s=>/\/\/\s*@version\s+(\d+\.\d+\.\d+)/.exec(s)?.[1];
const newer=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i];return false;};
const base='https://raw.githubusercontent.com/Insomnia-7/pokebonk-afk-helper/main/';
const updateDir=path.join(__dirname,'updates');
function log(message){fs.appendFileSync(path.join(__dirname,'logs','helper.log'),new Date().toISOString()+' '+message+'\n');}
if(selftest){process.on('uncaughtException',error=>{log('Test exception: '+error.stack);app.exit(1)});process.on('unhandledRejection',error=>{log('Test rejection: '+(error?.stack||error));app.exit(1)});}
function fetchText(url,max){return new Promise((resolve,reject)=>{
 const req=https.get(url,{headers:{'User-Agent':'pokebonk-afk-desktop-loader'}},res=>{
  if(res.statusCode!==200){res.resume();reject(Error('HTTP '+res.statusCode));return;}
  let count=0;const chunks=[];res.on('data',chunk=>{count+=chunk.length;if(count>max){req.destroy(Error('Update file exceeds limit'));return;}chunks.push(chunk);});
  res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));res.on('error',reject);
 });req.setTimeout(7000,()=>req.destroy(Error('Update request timed out')));req.on('error',reject);
});}
async function updateForNextLaunch(){
 try{
  const metadata=await fetchText(base+'pokebonk-afk.meta.js?desktop='+Date.now(),12000);
  const next=versionOf(metadata),current=versionOf(script);if(!next||!current||!newer(next,current))return;
  const code=await fetchText(base+'pokebonk-afk.user.js?desktop='+Date.now(),2000000);
  if(versionOf(code)!==next||!code.includes('@namespace    local.pokebonk.afk')||!code.includes('@match        https://pokebonk.com/*'))throw Error('Update identity or version mismatch');
  fs.mkdirSync(updateDir,{recursive:true});fs.writeFileSync(path.join(updateDir,'helper-'+current+'.user.js'),script);
  const staging=path.join(root,'pokebonk-afk.user.js.next');fs.writeFileSync(staging,code);fs.renameSync(staging,scriptPath);
  log('Downloaded helper '+next+'; it will take effect on the next client launch.');
 }catch(e){log('Update deferred: '+e.message);}
}
app.on('web-contents-created',(_event,wc)=>{
 if(selftest){wc.on('did-finish-load',()=>log('Test page loaded: '+wc.getURL().split('?')[0]));wc.on('did-fail-load',(_event,code,description)=>log('Test page load failed '+code+': '+description));}
 wc.on('dom-ready',()=>{
  let url;try{url=new URL(wc.getURL());}catch{return;}
  const official=url.protocol==='https:'&&(url.hostname==='pokebonk.com'||url.hostname==='www.pokebonk.com');
  const test=selftest&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(!official&&!test)return;
  // The helper operates in the page world. Node integration and the client's isolated preload remain unchanged.
  wc.executeJavaScript(script+'\n//# sourceURL=pokebonk-afk.user.js',true).catch(e=>log('Helper injection failed: '+e.message));
 });
});
// Keep test windows painting so the official splash/WebGL bootstrap can finish, without taking the user's focus.
if(selftest)app.on('browser-window-created',(_event,win)=>{win.setFocusable(false);win.setSkipTaskbar(true);win.setOpacity(0);});
if(!selftest)void updateForNextLaunch();
const original=path.join(__dirname,'client','resources','app.official.asar','out','main.js');
if(!fs.existsSync(original))throw Error('Official client is missing. Run Install-Desktop.ps1 first.');
require(original);
