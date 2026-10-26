const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const file=path.join(__dirname,'../pokebonk-afk.user.js');const C=require(file);
const opts=over=>({...structuredClone(C.DEFAULTS),...over});
let assertions=0;function equal(a,b){assert.deepEqual(a,b);assertions++}
equal(C.budgetAllowed(10,100,0,opts({})).ok,false);
equal(C.budgetAllowed(10,100,0,opts({maxPrice:'10'})).ok,true);
equal(C.budgetAllowed(11,100,0,opts({maxPrice:'10'})).ok,false);
equal(C.budgetAllowed(10,100,0,opts({reserve:'90'})).ok,true);
equal(C.budgetAllowed(11,100,0,opts({reserve:'90'})).ok,false);
equal(C.budgetAllowed(10,100,10,opts({runCap:'20'})).ok,true);
equal(C.budgetAllowed(11,100,10,opts({runCap:'20'})).ok,false);
equal(C.budgetAllowed(10,100,0,opts({maxPrice:'0'})).ok,false);
equal(C.budgetAllowed(10,100,0,opts({maxPrice:'NaN'})).ok,false);
equal(C.rankCards([{label:'a',text:'+26 幸运'},{label:'b',text:'+17% 速度'},{label:'c',text:'+29% 异常状态几率'}],opts({}))[0].label,'a');
equal(C.rankCards([{label:'a',text:'+42 最大 HP'},{label:'b',text:'+26% 经验'},{label:'c',text:'+32 幸运'}],opts({}))[0].label,'c');
equal(C.rankCards([{label:'a',text:'+26 幸运'},{label:'b',text:'+32 幸运'},{label:'c',text:'+99% 伤害'}],opts({}))[0].label,'b');
equal(C.rankCards([{label:'幸运蛋',text:'+30% 经验'},{label:'力量头带',text:'+15% 伤害'}],opts({}))[0].label,'力量头带');
equal(C.rankCards([{label:'a',text:'+20 幸运'},{label:'b',text:'+10% 伤害'}],opts({itemPriority:['b']}))[0].label,'b');
equal(C.statScore('+20% 攻击速度').reason,'攻击速度');equal(C.statScore('+20% 特殊伤害').reason,'特殊伤害');
equal(C.statScore('受到的伤害 -15%').rank,999);
equal(C.restrictionMessage('账号已封禁'),true);equal(C.restrictionMessage('未通过服务器校验。'),true);equal(C.restrictionMessage('放逐了一个招式'),false);
const fairy={name:'皮皮',species:35,types:['fairy']},dragon={name:'哈克龙',species:148,types:['dragon']},fire={name:'喷火龙',species:6,types:['fire']};
equal(C.helperDecision(fairy,[dragon],1,opts({})).keep,true);
equal(C.helperDecision(fire,[dragon,fairy],2,opts({})).keep,false);
equal(C.helperDecision({...fire,shiny:true},[dragon,fairy],2,opts({helperPolicy:'ignore',helperRelease:['喷火龙']})).keep,true);
equal(C.helperDecision(fire,[],2,opts({helperPolicy:'list',helperKeep:['6']})).keep,true);
equal(C.helperDecision(fire,[],2,opts({helperPolicy:'list'})).keep,false);
equal(C.movementKeys(0,-10,0),['KeyW']);equal(C.movementKeys(10,0,0),['KeyD']);equal(C.movementKeys(-10,0,Math.PI/2),['KeyW']);
const terrain={height:()=>0,inBounds:(x,z)=>Math.abs(x)<40&&Math.abs(z)<40,inSolid:(x,z)=>x>7&&x<13&&Math.abs(z)<7,hitProp:()=>false,waterAt:()=>-99};
const route=C.routePath({x:0,z:0},{x:25,z:0,radius:2},terrain);assert(route?.length);assertions++;assert(route.some(p=>Math.abs(p.z)>=7));assertions++;assert(route.every(p=>!terrain.inSolid(p.x,p.z)));assertions++;
equal(C.routePath({x:0,z:0},{x:25,z:0,radius:1},{...terrain,inSolid:(x,z)=>Math.abs(x-10)<3}),null);
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined)});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const mock=fs.readFileSync(path.join(__dirname,'fixtures/game.mjs'),'utf8');
 const pkm=[{id:35,name:'皮皮',types:['fairy'],bst:300},{id:148,name:'哈克龙',types:['dragon'],bst:420},{id:6,name:'喷火龙',types:['fire'],bst:530},{id:144,name:'急冻鸟',types:['ice'],bst:580},{id:113,name:'吉利蛋',types:['normal'],bst:450},{id:7,name:'杰尼龟',types:['water'],bst:300}];
 const defs=[{key:'star-piece',rarity:2,desc:'+20 幸运',max:10},{key:'lucky-egg',rarity:2,desc:'+30% 经验',max:10},{key:'muscle-band',rarity:2,desc:'+20% 伤害',max:10}];
 await page.route('**/*',async route=>{const url=new URL(route.request().url());let body,type='text/javascript';
  if(url.pathname==='/'){type='text/html';body='<html><head><meta name="pokebonk-build" content="mvpjh5lt"></head><body><div id="ui"></div><script type="module" src="/assets/main-entry-mvpjh5lt.js"></script></body></html>'}
  else if(url.pathname==='/assets/main-entry-mvpjh5lt.js')body='import("./main-runtime-mvpjh5lt.js"); /* "./news-mvpjh5lt.js" */';
  else if(url.pathname==='/assets/main-runtime-mvpjh5lt.js')body=mock;
  else if(url.pathname==='/assets/news-mvpjh5lt.js')body='export const Vr=()=>3;export const Jr='+JSON.stringify(defs)+';export const g=p=>"/data/"+p;';
  else if(url.pathname==='/version.json'){type='application/json';body=JSON.stringify({build:'mvpjh5lt',version:'0.8.58'})}
  else if(url.pathname==='/data/pokemon.json'){type='application/json';body=JSON.stringify(pkm)}
  else if(url.pathname==='/data/i18n/zh.json'){type='application/json';body=JSON.stringify({pokemon:{35:'皮皮',148:'哈克龙',6:'喷火龙',144:'急冻鸟'},items:{'star-piece':{name:'星星碎片'},'lucky-egg':{name:'幸运蛋'},'muscle-band':{name:'力量头带'}}})}
  else return route.abort();await route.fulfill({contentType:type,body});
 });
 await page.goto('https://pokebonk.com/');await page.waitForFunction(()=>window.fixture);
 await page.addScriptTag({content:fs.readFileSync(file,'utf8')});
 await page.waitForFunction(()=>window.PokeBonkAFK?.status().connected,{timeout:6000});
 await page.waitForFunction(()=>window.PokeBonkAFK.status().lastLog.includes('3 件道具'),{timeout:6000});

 const settings=async values=>{await page.evaluate(()=>PokeBonkAFK.configure());for(const [name,value]of Object.entries(values)){const el=page.locator('[name="'+name+'"]');if(typeof value==='boolean')await el.setChecked(value);else if(await el.evaluate(e=>e.tagName)==='SELECT')await el.selectOption(value);else await el.fill(value);}await page.getByRole('button',{name:'保存设置',exact:true}).click();};
 for(const name of ['maxPrice','reserve','runCap','shopMaxPrice','shopReserve','shopRunCap','slotMaxPrice','slotReserve','slotRunCap','slotMaxSpins']){await page.evaluate(()=>PokeBonkAFK.configure());equal(await page.locator('[name="'+name+'"]').inputValue(),'');}
 await page.getByRole('button',{name:'保存设置',exact:true}).click();
 await page.evaluate(()=>{fx.levels=[];fixture.app.run.state='modal';fixture.app.run.ui.showLevelUp(fixture.app.run,[{kind:'newMove',id:1,name:'未配置技能',effect:'+999 幸运'}],o=>{fx.levels.push(o.id);fixture.app.run.state='play'});PokeBonkAFK.start();});
 await page.waitForTimeout(1800);equal(await page.evaluate(()=>fx.levels.length),0);equal(await page.evaluate(()=>PokeBonkAFK.status().mode.includes('手动')),true);
 await page.evaluate(()=>{fixture.app.run.ui.hideModal();fixture.app.run.state='play';localStorage.setItem('pokebonk.buildPlan.offline-account',JSON.stringify({113:{moves:[2],vits:['speed'],fus:['fu-113'],items:['star-piece','muscle-band']},35:{moves:[1],vits:['luck'],fus:[],items:['lucky-egg']}}));fixture.app.run.player.speciesId=242;});
 equal(await page.evaluate(()=>PokeBonkAFK.status().plan.moves),[2]);
 await page.evaluate(()=>{const r=fixture.app.run;r.state='modal';r.ui.showLevelUp(r,[{kind:'newMove',id:1,name:'不在此宝可梦计划',effect:'+999 幸运'},{kind:'newMove',id:2,name:'已计划招式',effect:'+10 伤害'}],o=>{fx.levels.push(o.id);r.state='play'});});
 await page.waitForFunction(()=>fx.levels.length===1);equal(await page.evaluate(()=>fx.levels[0]),2);
 await page.evaluate(()=>{const r=fixture.app.run;r.state='modal';r.ui.showLevelUp(r,[{kind:'newVit',vit:'luck',name:'非计划维生素'},{kind:'upVit',vit:'speed',name:'速度维生素'}],o=>{fx.levels.push(o.vit);r.state='play'});});
 await page.waitForFunction(()=>fx.levels.length===2);equal(await page.evaluate(()=>fx.levels[1]),'speed');
 await page.evaluate(()=>{const r=fixture.app.run;r.state='modal';r.ui.showLevelUp(r,[{kind:'newMove',id:99,name:'融合材料',planned:true,ingredient:true}],o=>{fx.levels.push(o.id);r.state='play'});});
 await page.waitForFunction(()=>fx.levels.length===3);equal(await page.evaluate(()=>fx.levels[2]),99);
 // Account switch must not use a different account's plan.
 await page.evaluate(()=>{const r=fixture.app.run;r.meta.account.id='other-account';r.state='modal';r.ui.showLevelUp(r,[{kind:'newMove',id:2,name:'另一账号未配置'}],o=>fx.levels.push(o.id));});
 await page.waitForTimeout(1800);equal(await page.evaluate(()=>fx.levels.length),3);
 await page.evaluate(()=>{const r=fixture.app.run;r.ui.hideModal();r.meta.account.id='offline-account';r.state='play';r.player.roster={id:35};});equal(await page.evaluate(()=>PokeBonkAFK.status().plan.moves),[1]);
 await page.evaluate(()=>{fixture.app.run.player.roster={id:113};});
 // A configured list still does not authorize unrelated item choices.
 await page.evaluate(()=>{const r=fixture.app.run;r.state='modal';r.ui.showItemChoice(r,['lucky-egg'],id=>{fx.items.push(id);r.state='play'});});await page.waitForTimeout(1700);equal(await page.evaluate(()=>fx.items.length),0);await page.evaluate(()=>{fixture.app.run.ui.hideModal();fixture.app.run.state='play'});
 // Full stacks cannot be copied, even if first in the plan and attribute order.
 await page.evaluate(()=>{const r=fixture.app.run;r.player.items.set('star-piece',10);r.state='modal';r.ui.showDitto(r,id=>{fx.copies.push(id);r.state='play'});});await page.waitForFunction(()=>fx.copies.length===1);equal(await page.evaluate(()=>fx.copies[0]),'muscle-band');
 // Without fossil policy, keep the costly choice manual.
 await page.evaluate(()=>{const r=fixture.app.run;r.state='modal';r.ui.showTrade(r,{species:142,title:'化石遗迹',offers:[{key:'dome',name:'甲壳化石'}]},id=>fx.fossils.push(id));});await page.waitForTimeout(1700);equal(await page.evaluate(()=>fx.fossils.length),0);await page.evaluate(()=>{fixture.app.run.ui.hideModal();fixture.app.run.state='play';PokeBonkAFK.stop()});
 await settings({fossilChoice:'dome',shopMaxPrice:'12',shopReserve:'50',shopRunCap:'22',slotMaxPrice:'9',slotReserve:'50',slotRunCap:'12',slotMaxSpins:'2'});
 await page.evaluate(()=>{
  const r=fixture.app.run;r.seed=555;r.gold=100;r.player.pos={x:0,y:0,z:0};r.player.items.set('star-piece',1);r.player.moves=[{def:{id:2,cls:'special'},level:8},{def:{id:99,cls:'special'},level:8}];
  r.terrain.inSolid=(x,z)=>x>7&&x<13&&Math.abs(z)<6;
  fx.copies=[];fx.visits=[];fx.trace=[];
  r.interactables.list=[{kind:'altar',x:3,z:0,r:4,used:false,data:{sealed:true}},{kind:'altar',x:25,z:0,r:6,used:false,data:{}},fixture.makeBall(27,2,true),...['ditto','fossil','snorlax','bill','meowth','slots'].map((kind,i)=>({kind,x:34+i*8,z:0,r:2.6,used:false,data:kind==='bill'?{ready:true}:{}}))];
  fx.traceTimer=setInterval(()=>{fx.trace.push({...r.player.pos});},40);PokeBonkAFK.start();
 });
 await page.waitForFunction(()=>fx.altarDone,{timeout:18000});equal(await page.evaluate(()=>fx.altarE),0);equal(await page.evaluate(()=>fixture.app.run.interactables.list[0].used),false);
 await page.waitForFunction(()=>fx.paidOut===2&&fixture.app.run.state==='play',{timeout:35000});
 equal(await page.evaluate(()=>fx.copies),['star-piece']);equal(await page.evaluate(()=>fx.fossils),['dome']);equal(await page.evaluate(()=>fx.fusions),[2]);
 equal(await page.evaluate(()=>fx.bought),['star-piece','muscle-band']);equal(await page.evaluate(()=>PokeBonkAFK.status().ledger.shopSpent),22);
 equal(await page.evaluate(()=>fx.spins),2);equal(await page.evaluate(()=>fx.doubleSpin),0);equal(await page.evaluate(()=>PokeBonkAFK.status().ledger.slotSpent),12);equal(await page.evaluate(()=>fixture.app.run.gold),66);
 equal(await page.evaluate(()=>fx.blessings),['+40 幸运']);equal(await page.evaluate(()=>fx.opened.filter(x=>x.free).length),1);
 equal(await page.evaluate(()=>fx.visits),['ditto','fossil','snorlax','bill','meowth','slots']);
 equal(await page.evaluate(()=>fx.trace.some(p=>p.x>7&&p.x<13&&Math.abs(p.z)<6)),false);
 equal(await page.evaluate(()=>fx.trace.some(p=>p.x>7&&p.x<13&&Math.abs(p.z)>=6)),true);
 await page.evaluate(()=>{clearInterval(fx.traceTimer);PokeBonkAFK.configure()});await page.screenshot({path:path.join(__dirname,'settings-v3-preview.png'),fullPage:true});await page.getByRole('button',{name:'取消',exact:true}).click();
 await page.keyboard.press('F8');equal(await page.evaluate(()=>PokeBonkAFK.status().enabled),false);equal(await page.evaluate(()=>fixture.keys.size),0);
 equal(errors,[]);console.log('PASS: '+assertions+' assertions; v0.8.58 bridge; per-account and per-Pokémon plans; evolution; no-plan manual; moves/vitamins/fusion ingredients; Ditto capped items; fossil explicit policy; actual WASD obstacle detour; altar hold without E; all map tasks; shop re-render and spend limits; slot animations, budgets and spin cap.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
