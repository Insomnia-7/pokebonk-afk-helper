function profileId(run){return run?.player?.roster?.id??run?.player?.speciesId??null;}
function pokemonLabel(run){const id=run?.player?.speciesId??profileId(run);return catalog.pokemon.get(id)?.name||run?.player?.data?.name||(id!=null?'宝可梦 #'+id:'等待进入对局');}
function readBuildPlan(run){
 const id=profileId(run);if(id==null)return cleanPlan(null);
 try{return planFor(localStorage.getItem('pokebonk.buildPlan.'+(run.meta?.account?.id??'local')),id);}catch(_){return cleanPlan(null);}
}
function attributeOrder(run){
 const order=[...(opt.pokemonAttributes?.[profileId(run)]?.length?opt.pokemonAttributes[profileId(run)]:opt.attributes)];
 if(!opt.adaptStats)return order;
 const classes=new Set((run?.player?.moves||[]).filter(Boolean).map(m=>m.def?.cls));
 // Prefer the damage category actually present; configured build membership remains mandatory.
 const physical=classes.has('physical'),special=classes.has('special');
 if(physical!==special){const unused=physical?'special':'physical',i=order.indexOf(unused);if(i>=0){order.splice(i,1);order.push(unused);}}
 return order;
}
function itemHasRoom(run,id){
 const player=run?.player;if(!player||!id)return false;
 if(typeof player.canHold==='function')return player.canHold(id);
 const definition=catalog.items.get(id);if(!definition||!player.items?.get)return false;
 const maximum=definition.max??10;return Number.isFinite(maximum)&&(player.items.get(id)||0)<maximum;
}
function itemCandidates(cards,plan,run){
 if(opt.itemMode==='manual')return [];
 return cards.filter(c=>!named(opt.manualItems,c.label,c.id)&&!named(opt.itemNever,c.label,c.id)&&itemHasRoom(run,c.id)).filter(c=>c.el?.classList.contains('bp-on')||plan.items.includes(c.id)||named(opt.itemPriority,c.label,c.id)||opt.itemMode==='auto'&&opt.itemStatFallback);
}
function plannedLevel(cards,info,run,plan){
 const details=cards.map(el=>({...cardInfo(el),planned:el.classList.contains('bp-on'),ingredient:!!el.querySelector('.bp-badge.ing')}));
 return chooseUpgrade(details,info?.offers,currentRoute(run,plan),run?.player||{},opt,plannerDefinitions());
}
function pickPlannedItem(cards,plan,run){
 const eligible=itemCandidates(cards,plan,run),order=attributeOrder(run);
 const types=new Set((run?.player?.moves||[]).filter(Boolean).map(m=>m.def?.type));
 return rankCards(eligible,opt,order).map(c=>({...c,synergy:(catalog.items.get(c.id)?.tags||[]).some(t=>t.startsWith('type:')&&types.has(t.slice(5)))?1:0})).sort((a,b)=>Number(b.el?.classList.contains('bp-on')||plan.items.includes(b.id))-Number(a.el?.classList.contains('bp-on')||plan.items.includes(a.id))||a.priority-b.priority||a.rank-b.rank||b.synergy-a.synergy||compareCards(a,b))[0];
}
const upgradeAttempts=new WeakMap,pendingBanish=new WeakMap;
function levelFallback(modal,cards,info,run,plan,now){
 if(!run||!info?.offers)return false;
 const key=String(run.player.level??text(modal.querySelector('h1')));let state=upgradeAttempts.get(run);
 if(!state||state.key!==key){state={key,rerolls:0};upgradeAttempts.set(run,state);}
 const all=[...modal.querySelectorAll('.actions > button')],buttonFor={reroll:all.find(b=>b.classList.contains('blue')),banish:all.find(b=>b.classList.contains('red')),skip:all.find(b=>!b.classList.contains('blue')&&!b.classList.contains('red')&&/跳过|跳過|skip|saltar/i.test(text(b)))};
 const details=cards.map(el=>cardInfo(el)),candidate=banishCandidate(details,info.offers,currentRoute(run,plan),run.player,opt,plannerDefinitions());
 for(const action of opt.noMatchOrder){
  const button=buttonFor[action];if(!available(button)||!resourceAllowed(action,ledger[action+'Used']||0,opt,state.rerolls))continue;
  if(action==='banish'){
   if(!candidate)continue;
   pendingBanish.set(modal,{button,el:candidate.el,label:candidate.label,stage:1});lastModalAction=now;button.click();log('进入放逐：'+candidate.label);return true;
  }
  if(action==='reroll')state.rerolls++;
  ledger[action+'Used']=(ledger[action+'Used']||0)+1;lastModalAction=now;persist();button.click();log(action==='reroll'?'无匹配选项，刷新（本等级 '+state.rerolls+' 次）':'无匹配选项，跳过升级');return true;
 }
 return false;
}
function attachModalInfo(ui,name,args){
 const kind=({showParty:'party',showShinySwap:'shinySwap',showItem:'item',showItemChoice:'items',showLevelUp:'level',showFusion:'fusion',showDitto:'ditto',showTrade:'trade',showShop:'shop',showSlots:'slots',showBlessing:'blessing'})[name];
 const info={kind,args,run:args[0]};
 if(kind==='party'){info.existing=args[0].allies.list.slice();info.incoming=args[1];}
 if(kind==='shinySwap'){info.old=args[1];info.incoming=args[2];}
 if(kind==='item')info.item=args[1];if(kind==='items')info.items=args[1];
 if(kind==='level')info.offers=args[1];if(kind==='fusion')info.fusions=args[1];
 if(kind==='trade')info.trade=args[1];if(kind==='ditto')info.items=[...args[0].player.items.keys()];
 if(kind==='slots')info.actions=args[1];
 if(ui.modalEl){modalInfo.set(ui.modalEl,info);if(kind==='shop')watchShop(ui.modalEl,args[0]);}
}

function physicalCode(code){const input=app?.run?.input;if(input?.remap)for(const[from,to]of input.remap)if(to===code)return from;return code;}
function keyEvent(type,code){const key=code==='Space'?' ':code.startsWith('Key')?code.slice(3).toLowerCase():code;window.dispatchEvent(new KeyboardEvent(type,{code,key,bubbles:true,cancelable:true}));}
function releaseKeys(){for(const code of held)keyEvent('keyup',code);held.clear();}
function drive(codes){const desired=new Set(codes.map(physicalCode));for(const code of [...held])if(!desired.has(code)){keyEvent('keyup',code);held.delete(code);}for(const code of desired){const canonical=app?.run?.input?.canon?.(code)||code;if(!held.has(code)||!app?.run?.input?.down?.(canonical)){keyEvent('keydown',code);held.add(code);}}}
function tap(code){const now=performance.now();if(now-lastPulse<550)return false;lastPulse=now;const actual=physicalCode(code);keyEvent('keydown',actual);setTimeout(()=>keyEvent('keyup',actual),80);return true;}
const visible=e=>!!e&&e.isConnected&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length>0;
const available=e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
const text=e=>norm(e?.textContent);
const shopSnapshots=new WeakMap,watchedShops=new WeakSet;
function syncShopLedger(run){
 const total=run?.econ?.shop;if(!Number.isFinite(total))return false;
 const before=shopSnapshots.get(run);shopSnapshots.set(run,total);
 if(before!==undefined&&total>before){ledger.shopSpent+=total-before;persist();}
 return true;
}
function watchShop(modal,run){
 if(!run||watchedShops.has(modal))return;watchedShops.add(modal);syncShopLedger(run);
 modal.addEventListener('click',event=>{
  const card=event.target.closest?.('.cards > button.card');if(!card||!modal.contains(card))return;
  const index=[...modal.querySelectorAll('.cards > button.card')].indexOf(card),entry=run.shop?.stock?.[index];
  if(!entry||entry.sold)return;const price=entry.price;
  queueMicrotask(()=>{if(syncShopLedger(run))return;if(entry.sold&&Number.isFinite(price)){ledger.shopSpent+=price;persist();}});
 },true);
}
function uiFusionMethod(ui){
 if(typeof ui.showFusion==='function')return 'showFusion';
 const found=[];for(let proto=ui;proto&&proto!==Object.prototype;proto=Object.getPrototypeOf(proto))for(const name of Object.getOwnPropertyNames(proto)){
  if(name==='constructor')continue;const value=Object.getOwnPropertyDescriptor(proto,name)?.value;if(typeof value==='function'&&String(value).includes('fu-cards')&&String(value).includes('fusion'))found.push(name);
 }
 return found.length===1?found[0]:null;
}
function patchRun(run){
 if(connectedRun!==run){connectedRun=run;connectedTerrain=null;target=null;path=[];const key=String(run.seed);if(ledger.key!==key){ledger={key,spent:0,paid:0,free:0,shopSpent:0,slotSpent:0,slotSpins:0,rerollUsed:0,skipUsed:0,banishUsed:0};persist();}log('已连接生存模式，预算按本局单独计数');}
 syncShopLedger(run);
 const ui=run.ui;
 if(ui&&!patchedUi.has(ui)){
  patchedUi.add(ui);
  for(const name of ['showParty','showShinySwap','showItem','showItemChoice','showLevelUp','showFusion','showDitto','showTrade','showShop','showSlots','showBlessing']){
   const actual=name==='showFusion'?uiFusionMethod(ui):name;
   const original=actual&&ui[actual];if(typeof original!=='function')continue;
   ui[actual]=function(...args){
    if(name==='showSlots'){
     const actions=args[1],spin=actions.spin;
     actions.spin=function(...rest){const price=actions.cost(),result=spin.apply(this,rest);if(result){ledger.slotSpent+=price;ledger.slotSpins++;persist();}return result;};
    }
    const result=original.apply(this,args);attachModalInfo(this,name,args);return result;
   };
  }
 }
 const inter=run.interactables;
 if(inter&&!patchedInter.has(inter)){
  patchedInter.add(inter);const original=inter.openChest;
  if(typeof original==='function')inter.openChest=function(item,free,gift,...rest){const wasUsed=item.used;const cost=!wasUsed&&item.kind==='chest'&&!free&&!gift?this.chestCost():0;const result=original.call(this,item,free,gift,...rest);
   if(!wasUsed&&item.used){if(cost){ledger.spent+=cost;ledger.paid++;}else if(item.kind==='freechest'||item.kind==='chest'&&gift)ledger.free++;persist();}return result;};
 }
 if(connectedTerrain!==run.terrain){connectedTerrain=run.terrain;target=null;path=[];pathGoal=null;lastPlan=0;}
}
async function loadCatalog(mod){
 const factory=Object.values(mod).find(v=>typeof v==='function'&&/data\//.test(String(v))&&(()=>{try{return new URL(v('pokemon.json'),location.href).pathname.endsWith('/data/pokemon.json');}catch(_){return false;}})());
 if(!factory)throw Error('游戏资料入口结构变化，使用内置 '+CATALOG.version+' 目录');
 const json=async path=>{const r=await fetch(new URL(factory(path),location.href));if(!r.ok)throw Error('游戏资料加载失败：'+path);return r.json();};
 const [names,pokemon,moves]=await Promise.all([json('i18n/zh.json'),json('pokemon.json'),json('moves.json').catch(()=>[])]);
 for(const p of pokemon)catalog.pokemon.set(p.id,{...p,name:names.pokemon?.[p.id]||p.name});
 const definitions=Object.values(mod).find(v=>Array.isArray(v)&&v.some(i=>i?.key==='muscle-band')&&v.every(i=>i&&typeof i.key==='string'&&typeof i.rarity==='number'))||[];
 const vitamins=Object.values(mod).find(v=>Array.isArray(v)&&v.some(i=>i?.key==='star-piece-v')&&v.every(i=>i&&typeof i.stat==='string'&&typeof i.per==='number'))||[];
 for(const item of definitions)catalog.items.set(item.key,{...catalog.items.get(item.key),...item,name:names.items?.[item.key]?.name||item.name||item.key,desc:item.desc||catalog.items.get(item.key)?.desc||names.items?.[item.key]?.desc});
 for(const v of vitamins)catalog.vitamins.set(v.key,{...catalog.vitamins.get(v.key),...v,name:names.items?.[v.icon]?.name||v.name||v.key});
 for(const m of moves)catalog.moves.set(m.id,{...m,name:names.moves?.[m.id]||m.name||m.key});
 log('已载入 '+catalog.items.size+' 件道具、'+catalog.vitamins.size+' 种维生素与宝可梦资料');
}
let bridgeBusy=false,bridgeTries=0;
async function connectGame(){
 if(app||bridgeBusy||bridgeTries>=5)return;bridgeBusy=true;bridgeTries++;connectionState='正在连接（'+bridgeTries+'/5）';
 try{
  const currentBuild=document.querySelector('meta[name="pokebonk-build"]')?.content;
  const entry=[...document.querySelectorAll('script[type="module"][src]')].map(s=>s.src).find(s=>new URL(s).origin===location.origin&&/\/assets\/main-/.test(s));
  if(!entry)throw Error('尚未找到游戏加载入口');
  const fetchText=async url=>{const r=await fetch(url);if(!r.ok)throw Error('游戏模块暂不可读');return r.text();};
  const boot=await fetchText(entry);
  const imports=[...boot.matchAll(/import\(\s*['"\x60]([^'"\x60]*main-[^'"\x60]+\.js)['"\x60]\s*\)/g)].map(m=>new URL(m[1],entry).href);
  if(!imports.length)throw Error('未识别到游戏主模块；请检查脚本更新');
  const mainUrl=imports[imports.length-1],source=await fetchText(mainUrl);
  const dataPath=/['"\x60](\.\/(?:defineProperty|news)-[^'"\x60]+\.js)['"\x60]/.exec(source)?.[1]||/['"\x60](\.\/news-[^'"\x60]+\.js)['"\x60]/.exec(boot)?.[1];
  if(!dataPath)throw Error('游戏资料模块结构变化；请检查脚本更新');
  const [exports,data]=await Promise.all([import(mainUrl),import(new URL(dataPath,mainUrl).href)]);
  const proto=exports.App?.prototype;if(typeof proto?.frameGap!=='function')throw Error('当前版本没有可识别的游戏实例入口');
  dataModule=data;const original=proto.frameGap;
  const capture=function(...args){app=this;connectionState=SUPPORTED_BUILDS.has(currentBuild)?'已连接':'已连接（新构建，需留意兼容性）';monitorAccount(this);if(proto.frameGap===capture)proto.frameGap=original;mode='已连接游戏';return original.apply(this,args);};
  proto.frameGap=capture;cleanupHooks.push(()=>{if(proto.frameGap===capture)proto.frameGap=original;});
  loadCatalog(dataModule).catch(e=>log(e.message+'；使用内置目录，未知助手保留手动'));
 }catch(e){connectionState=bridgeTries>=5?'连接失败，可点重新连接':'等待游戏实例';mode=e.message;}finally{bridgeBusy=false;updatePanel();}
}
function runContract(run){return !!run?.player?.pos&&typeof run.terrain?.height==='function'&&typeof run.terrain?.inBounds==='function'&&typeof run.terrain?.inSolid==='function'&&Array.isArray(run.interactables?.list)&&typeof run.input?.down==='function'&&!!run.ui;}
function cardInfo(el,blessing=false){
 const label=text(el.querySelector('.bd h3'));
 const effects=[...el.querySelectorAll('.bd > ul > li, .bd > p:not(.muted)')].map(text).join('\n');
 const item=[...catalog.items.values()].find(i=>norm(i.name)===label||i.key===label);
 return {el,label,text:blessing?label:(effects||label),rarity:text(el.querySelector('.rar')),id:item?.key};
}
function clickAction(el,label){if(!available(el))return false;el.click();choices++;log(label);return true;}
function handleModal(){
 const modals=[...document.querySelectorAll('#ui .modal')].filter(visible),modal=modals[modals.length-1];
 if(!modal){modalSeen=null;return false;}releaseKeys();const now=performance.now();
 if(modalSeen!==modal){modalSeen=modal;modalAt=now;lastModalAction=0;}
 if(now-modalAt<800||now-lastModalAction<1200)return true;
 const title=text(modal.querySelector('h1')),help=text(modal.querySelector('.help'));
 const cards=[...modal.querySelectorAll('.cards > button.card')].filter(available);
 const run=app?.run,plan=readBuildPlan(run);
 const info=modalInfo.get(modal)||(modal.classList.contains('shop-modal')&&run?{kind:'shop',run}:null);
 let action=null,label='';
 const manual=reason=>{mode='待手动：'+reason;return true;};
 const exit=()=>modal.querySelector('.shop-exit, .actions > button.btn.ghost');
 const pending=pendingBanish.get(modal);
 if(pending){
  if(!modal.querySelector('.cards.banning')||!available(pending.el)||!available(pending.button)){pendingBanish.delete(modal);return manual('放逐状态变化，请核对');}
  lastModalAction=now;
  if(pending.stage===1){pending.stage=2;pending.el.click();log('放逐已选中：'+pending.label);}
  else{pendingBanish.delete(modal);ledger.banishUsed=(ledger.banishUsed||0)+1;persist();pending.button.click();log('确认放逐：'+pending.label);}
  return true;
 }
 if(modal.querySelector('.cards.banning'))return manual('玩家正在放逐选项');
if(info?.kind==='party'&&cards.length){
  const current=info.existing.filter(x=>!x.shiny);
  if(cards.length===current.length+1){
   const incoming=info.incoming;const decision=helperDecision(incoming,info.existing,app.run.allies.cap,opt);
   let index=cards.length-1;
   if(decision.keep){const choices=current.map((x,i)=>({x,i})).filter(({x})=>!named(opt.helperKeep,x.name,x.species));choices.sort((a,b)=>helperCompare(b.x,a.x,opt));if(choices.length)index=choices[0].i;}
   action=cards[index];label=index===cards.length-1?'新助手不入队：'+incoming.name:'替换助手：'+current[index].name+' → '+incoming.name;
  }
 }else if(info?.kind==='shinySwap'&&cards.length===2){
  const useNew=opt.shinySwap==='new'||opt.shinySwap==='best'&&helperCompare(info.incoming,info.old,opt)<0;
  action=cards[useNew?1:0];label='异色已完成收录；随从使用 '+(useNew?info.incoming.name:info.old.name);

 }else if(info?.kind==='shop'){
  watchShop(modal,run);syncShopLedger(run);
  if(!opt.autoShop)return manual('商店自动购买已关闭');
  if(!['shopMaxPrice','shopReserve','shopRunCap'].some(k=>norm(opt[k])!==''))return manual('商店预算未填写');
  if(!plan.items.length&&!opt.itemPriority.length&&!opt.itemStatFallback)return manual('没有道具配置');
  const stock=run.shop?.stock||[];
  const offers=cards.map((el,i)=>({...cardInfo(el),id:stock[i]?.key,entry:stock[i]})).filter(c=>c.entry&&!c.entry.sold&&itemHasRoom(run,c.id)&&spendingAllowed('shop',c.entry.price,run.gold,ledger.shopSpent,opt).ok);
  const chosen=pickPlannedItem(offers,plan,run);
  if(chosen){action=chosen.el;label='喵喵购买 '+chosen.label+' · '+chosen.entry.price+' ₽';}
  else{action=exit();label='商店没有符合配置和预算的商品，离开';}
 }else if(info?.kind==='slots'){
  if(!opt.autoSlots)return manual('自动抽奖已关闭');
  if(!['slotMaxPrice','slotReserve','slotRunCap'].some(k=>norm(opt[k])!==''))return manual('老虎机预算未填写');
  if(modal.querySelector('.sl-cab.spinning')){mode='等待老虎机动画与派奖';return true;}
  const allowed=slotAllowed(info.actions.cost(),run.gold,ledger,opt);
  if(allowed.ok){action=modal.querySelector('.actions > button.btn.green.big');label='老虎机抽奖 · '+info.actions.cost()+' ₽';}
  else{action=exit();label=allowed.reason+'，离开老虎机';}
 }else if(info?.kind==='trade'){
  if(info.trade.species!==142)return manual(title);
  if(!opt.autoFossil||!opt.fossilChoice)return manual('化石遗迹未配置交换规则');
  const index=info.trade.offers.findIndex(o=>o.key===opt.fossilChoice&&!o.off);
  if(index>=0){action=cards[index];label='化石交换：'+info.trade.offers[index].name+'（最大 HP 永久降低）';}
 }else if(info?.kind==='fusion'||cards.some(c=>c.classList.contains('fusion'))){
  const fusionPlan=currentRoute(run,plan).pendingFusions;if(!opt.autoFusion||!fusionPlan.length)return manual('没有融合计划');
  const chosen=cards.map((el,i)=>({el,value:info?.fusions?.[i]})).filter(c=>!c.el.classList.contains('locked')&&(c.value?c.value.ready&&fusionPlan.includes(c.value.r.key):c.el.classList.contains('bp-on'))).sort((a,b)=>fusionPlan.indexOf(a.value?.r.key)-fusionPlan.indexOf(b.value?.r.key))[0];
  if(chosen){action=chosen.el;label='执行已配置融合：'+text(action.querySelector('h3'));}
  else return manual('已配置融合暂未满足材料条件');
 }else if(info?.kind==='ditto'){
  if(!opt.autoDitto)return manual('自动复制已关闭');
  const offers=cards.map((el,i)=>({...cardInfo(el),id:info.items[i]}));
  const chosen=pickPlannedItem(offers,plan,run);
  if(chosen){action=chosen.el;label='百变怪复制：'+chosen.label;}
  else return manual('没有符合道具配置且可继续持有的复制选项');
 }else if(cards.some(c=>c.classList.contains('pact'))){
  if(opt.declinePacts&&!cards.some(c=>c.classList.contains('trade'))){action=[...modal.querySelectorAll('.actions > button')].find(b=>/拒绝|拒絕|Reject|Decline|Rechazar/i.test(text(b)));label='拒绝契约';}
 }else{
  const blessing=info?.kind==='blessing'||/祝福|blessing|bendici[oó]n/i.test(help);
  const level=info?.kind==='level'||/等级\s*\d|等級\s*\d|level\s*\d|nivel\s*\d/i.test(title)&&cards.length&&cards.every(c=>c.classList.contains('offer'));
  const item=info?.kind==='item'||info?.kind==='items'||/你发现了(?:一件)?道具|found (?:an? )?items?|encontrado (?:un )?objetos?/i.test(title);
  if(level&&opt.autoSelect){
   const chosen=plannedLevel(cards,info,run,plan);
   if(chosen){action=chosen.el;label=chosen.why+'：'+chosen.label;}
   else if(levelFallback(modal,cards,info,run,plan,now))return true;
   else return manual('无匹配选项；刷新/跳过/放逐未启用或次数不足，请自行选择');
  }else if(blessing&&opt.autoSelect&&cards.length){
   const chosen=rankBlessings(cards.map(c=>cardInfo(c,true)),opt.blessingAttributes)[0];
   if(chosen){action=chosen.el;label='祝福：'+chosen.label+'（'+chosen.reason+'）';}
  }else if(item&&opt.autoItems&&cards.length){
   const offers=cards.map((el,i)=>({...cardInfo(el),id:info?.items?.[i]||cardInfo(el).id}));
   const chosen=pickPlannedItem(offers,plan,run);
   if(chosen){action=chosen.el;label='按道具配置选择：'+chosen.label;}
   else if(opt.itemMode!=='manual'&&offers.every(c=>named(opt.itemNever,c.label,c.id)||c.id&&!itemHasRoom(run,c.id))){action=exit();label='道具均被排除或达到上限，换宝可币';}
   else return manual('道具按规则交给玩家选择');
  }else if(item&&opt.autoItems&&modal.querySelector('div.card')){
   const c=cardInfo(modal.querySelector('div.card'));c.id=info?.item||c.id;
   if(opt.itemMode==='manual'||named(opt.manualItems,c.label,c.id))return manual('此道具交给玩家：'+c.label);
   if(named(opt.itemNever,c.label,c.id)||c.id&&!itemHasRoom(run,c.id)){action=exit();label='按规则卖出：'+c.label;}
   else if(itemCandidates([c],plan,run).length){action=modal.querySelector('.actions > button.btn.green');label='按配置领取：'+c.label;}
   else return manual('未配置此道具，请自行选择');
  }
 }
 if(action&&available(action)){lastModalAction=now;action.click();choices++;log(label);mode=label;}
 else return manual(title||'未识别页面');
 return true;
}

function captureWanted(cap){return !!cap&&(cap.shiny||cap.classic?opt.catchShiny:opt.catchLeague);}
function enemyHelper(run,index){const p=catalog.pokemon.get(run.enemies.species[index]);if(!p)return null;return {...p,species:p.id,types:p.types||run.enemies.typesOf(index),shiny:!!(run.enemies.flags[index]&(2048|131072))};}
function freeBall(item){return item.kind==='freechest'||item.kind==='chest'&&item.data?.gift;}
function paidOkay(run){return budgetAllowed(run.interactables.chestCost(),run.gold,ledger.spent,opt);}
function canOpen(run,item){return !item.used&&(freeBall(item)?opt.freeBalls:item.kind==='chest'&&paidOkay(run).ok);}
function helperPoint(run,index){
 const E=run.enemies,x=E.x[index],z=E.z[index],p=run.player.pos;
 if(run.allies.canThrow()&&!run.interactables.nearest)return {x:p.x,z:p.z};
 const angle=Math.atan2(p.z-z,p.x-x);const options=[];
 for(let i=0;i<16;i++){const a=angle+i*Math.PI/8,point={x:x+Math.cos(a)*6,z:z+Math.sin(a)*6};
  if(!run.terrain.inBounds(point.x,point.z,2)||run.terrain.inSolid(point.x,point.z))continue;
  const blocked=run.interactables.list.some(o=>(!o.used||['meowth','hypno','portal'].includes(o.kind))&&!['altar','shroom'].includes(o.kind)&&Math.hypot(o.x-point.x,o.z-point.z)<o.r+1);
  if(!blocked)options.push(point);
 }
 return options.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||{x,z};
}
function gatherTargets(run){
 const list=[],E=run.enemies,cap=run.capture,p=run.player.pos,now=performance.now();
 if(captureWanted(cap)&&['roaming','weakened'].includes(cap.state)&&cap.index>=0&&E.alive[cap.index]){
  list.push({key:'capture:'+E.gen[cap.index],ref:cap,type:'capture',index:cap.index,x:E.x[cap.index],z:E.z[cap.index],radius:5.5,priority:cap.shiny||cap.classic?0:2,label:(cap.shiny||cap.classic?'异色捕捉：':'永久收录：')+(catalog.pokemon.get(cap.species)?.name||cap.species)});
 }
 if(run.allies.state==='down'){
  const h=enemyHelper(run,run.allies.down);if(h&&helperDecision(h,run.allies.list,run.allies.cap,opt).keep){const point=helperPoint(run,run.allies.down);list.push({key:'helper:'+E.gen[run.allies.down],ref:run.allies,type:'helper',index:run.allies.down,...point,radius:1,priority:h.shiny?0:1,label:'局内助手：'+h.name});}
 }
 const plan={...readBuildPlan(run),fus:currentRoute(run).pendingFusions};
 const order=[...new Set([...opt.taskOrder,...DEFAULTS.taskOrder])];
 for(const item of run.interactables.list){
  if((skipped.get(item)||0)>now)continue;
  const task=mapTaskPolicy(item,opt,plan,run,ledger);
  if(canOpen(run,item)){
   const kind=freeBall(item)?'freechest':'chest';list.push({key:item,ref:item,type:'ball',x:item.x,z:item.z,radius:Math.min(2,item.r||2.6),priority:3+order.indexOf(kind),label:freeBall(item)?'免费超级球/赠球':'普通精灵球'});
  }else if(task){
   const holding=item.kind==='altar'&&target?.ref===item&&Math.hypot(item.x-p.x,item.z-p.z)<item.r;
   list.push({key:item,ref:item,type:'task',kind:item.kind,x:item.x,z:item.z,...task,priority:holding?2.5:3+order.indexOf(item.kind)});
  }
 }
 for(const t of list)t.distance=Math.hypot(t.x-p.x,t.z-p.z);
 list.sort((a,b)=>a.priority-b.priority||a.distance-b.distance);
 const current=target&&list.find(t=>t.key===target.key);
 if(current&&list[0]?.priority===current.priority&&current.distance<list[0].distance*1.4+4)return [current,...list.filter(t=>t!==current)];
 return list;
}
function discardUnwanted(run){
 if(!opt.rejectUnwanted||run.allies.state!=='down')return;
 const index=run.allies.down,flags=run.enemies.flags[index];
 if(!(flags&2)||flags&(128|4|2048|131072))return;
 const h=enemyHelper(run,index);if(!h)return;
 if(!helperDecision(h,run.allies.list,run.allies.cap,opt).keep&&tap('KeyG'))log('放弃虚弱头目 '+h.name+'；等待其免费超级球掉落');
}
function selectTarget(run){
 const now=performance.now();if(now-lastTargetScan<300)return;lastTargetScan=now;
 const candidates=gatherTargets(run);const next=candidates[0];
 if(!next){target=null;path=[];mode=opt.paidBalls&&!paidOkay(run).ok?'等待免费球/异色；'+paidOkay(run).reason:'等待已启用且符合配置/预算的地图目标';return;}
 if(target?.key!==next.key){path=[];pathGoal=null;lastPlan=0;targetAt=now;lastMotion={x:run.player.pos.x,z:run.player.pos.z,at:now};}
 target=next;mode=next.kind==='altar'&&next.distance<next.ref.r?'祭坛充能 '+Math.floor((next.ref.charge||0)*100)+'%':'前往 '+next.label;
 if(!opt.autoMove){path=[];return;}
 const p=run.player.pos,dist=Math.hypot(p.x-next.x,p.z-next.z);
 if(dist<=next.radius){path=[];return;}
 if(now-lastPlan>1500&&(!path.length||!pathGoal||Math.hypot(next.x-pathGoal.x,next.z-pathGoal.z)>4)){
  lastPlan=now;const hazards=opt.avoidHazards?(run.endless?.hazards?.list||[]):[];
  const result=routePath(p,{...next,bodyRadius:run.player.radius},run.terrain,hazards);
  if(!result){if(next.ref&&typeof next.ref==='object')skipped.set(next.ref,now+20000);log('暂时无法到达 '+next.label+'，稍后重试');target=null;path=[];return;}
  path=result;pathGoal={x:next.x,z:next.z};
 }
}
function interact(run){
 const cap=run.capture,ally=run.allies,nearest=run.interactables.nearest;
 if(cap.canThrow?.()){
  if(captureWanted(cap)){releaseKeys();if(tap('KeyE'))log('投球：'+(cap.shiny||cap.classic?'异色':'永久收录')+'目标');}
  return;
 }
 if(ally.state==='down'&&ally.canThrow?.()&&!nearest){const h=enemyHelper(run,ally.down);if(h&&helperDecision(h,ally.list,ally.cap,opt).keep){releaseKeys();if(tap('KeyE'))log('投友友球：'+h.name);}return;}
 if(nearest&&target?.ref===nearest){
  if(target.type==='ball'&&canOpen(run,nearest)){
   releaseKeys();if(tap('KeyE'))log('打开 '+(freeBall(nearest)?'免费球':('普通球 · '+run.interactables.chestCost()+' ₽')));
  }else if(target.type==='task'&&nearest.kind!=='altar'&&mapTaskPolicy(nearest,opt,{...readBuildPlan(run),fus:currentRoute(run).pendingFusions},run,ledger)){
   releaseKeys();if(tap('KeyE')){log('交互：'+target.label);skipped.set(nearest,performance.now()+(['meowth','slots','bill'].includes(nearest.kind)?90000:15000));}
  }
 }

}
function steer(){
 requestAnimationFrame(steer);
 const run=app?.run;
 if(!opt.enabled||editOpen||!run?.endless||run.state!=='play'||run.player.dead||!opt.autoMove||!target||!path.length||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')){releaseKeys();return;}
 const p=run.player.pos;
 if(target.type==='capture'&&run.enemies.alive[target.index]){target.x=run.enemies.x[target.index];target.z=run.enemies.z[target.index];}
 const distance=Math.hypot(p.x-target.x,p.z-target.z);
 if(distance<=target.radius){releaseKeys();return;}
 while(path.length>1&&Math.hypot(p.x-path[0].x,p.z-path[0].z)<Math.max(.45,Math.min(.7,run.player.speedNow/50)))path.shift();
 const point=path[0]||target;
 if(Math.hypot(p.x-point.x,p.z-point.z)<.7){path.shift();releaseKeys();return;}
 drive(movementKeys(point.x-p.x,point.z-p.z,run.camYaw));
 const now=performance.now();
 if(Math.hypot(p.x-lastMotion.x,p.z-lastMotion.z)>1){lastMotion={x:p.x,z:p.z,at:now};}
 else if(now-lastMotion.at>2200&&now-jumpAt>1800){jumpAt=now;tap('Space');path=[];lastPlan=0;log('尝试跳跃并重算路线');}
 if(now-targetAt>12000&&now-lastMotion.at>5000){if(target.ref&&typeof target.ref==='object')skipped.set(target.ref,now+30000);log('目标暂时卡住，跳过 '+target.label);target=null;path=[];releaseKeys();}
}
function controlTick(){
 try{
  const run=app?.run;
  if(run?.endless&&!runContract(run)){releaseKeys();connectionState='寻路接口不完整';mode='当前游戏结构变化，暂不自动移动；可更新脚本后重新连接';return;}
  if(run?.endless)patchRun(run);
  if(!opt.enabled||editOpen){releaseKeys();return;}
  if(handleModal())return;
  if(!run){releaseKeys();if(app)mode='等待进入生存模式';return;}
  if(!run.endless){releaseKeys();mode='自动寻路/捕捉仅在生存模式启用';return;}
  if(run.state!=='play'||run.player.dead){releaseKeys();mode='游戏状态：'+run.state;return;}
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')){releaseKeys();return;}
  discardUnwanted(run);interact(run);selectTarget(run);
  if(opt.autoUlt&&run.ult?.ready&&performance.now()-lastPulse>1000)tap('KeyR');
 }catch(e){releaseKeys();mode='操作暂停：'+e.message;log(mode);opt.enabled=false;persist();}
}
function stopForRestriction(reason){
 if(stoppedReason)return;stoppedReason=reason;opt.enabled=false;releaseKeys();mode='已停止全部自动操作';log(reason);persist();updatePanel();
}
const monitoredBackends=new WeakSet;
function monitorAccount(instance){
 const backend=instance.backend;if(!backend||monitoredBackends.has(backend))return;monitoredBackends.add(backend);
 const original=backend.onBanned;
 if(typeof original==='function')backend.onBanned=function(...args){stopForRestriction('游戏返回账号封禁/限制状态，请手动核对');return original.apply(this,args);};
}
function scanGameNotices(){
 if(stoppedReason)return;
 const ban=document.querySelector('.ban-ribbon');if(visible(ban)){stopForRestriction('游戏显示账号封禁提示，已停止全部自动操作');return;}
 for(const el of document.querySelectorAll('.sm-note.warn, .app-notice, #ui .modal, .auth-card .mt-body')){
  if(visible(el)&&restrictionMessage(text(el))){stopForRestriction('游戏显示账号限制或服务器校验警告，请手动核对');return;}
 }
}
let versionBusy=false;
async function checkGameVersion(){
 if(versionBusy)return;versionBusy=true;
 try{
  const response=await fetch(new URL('/version.json?t='+Date.now(),location.href),{cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);
  const version=await response.json();const pageBuild=document.querySelector('meta[name="pokebonk-build"]')?.content;
  updateNotice=version.build===pageBuild?'官网版本 '+version.version+' · 与本页一致':'官网有新版本 '+version.version+'；本局不会自动刷新';
 }catch(_){updateNotice='游戏版本检查暂不可用；未自动刷新';}finally{versionBusy=false;updatePanel();}
}
setInterval(scanGameNotices,500);setInterval(checkGameVersion,300000);checkGameVersion();
setInterval(controlTick,100);setInterval(updatePanel,500);setInterval(()=>{if(!app)connectGame();},4000);
requestAnimationFrame(steer);connectGame();
window.addEventListener('pagehide',releaseKeys);
})();

