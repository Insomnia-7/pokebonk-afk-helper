// ==UserScript==
// @name         PokéBonk 无尽挂机助手·完整配置版
// @namespace    local.pokebonk.afk
// @version      3.0.0
// @description  地图任务寻路、宝可梦配置计划、复制道具、商店与抽奖预算。F8 开关。
// @match        https://pokebonk.com/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/Insomnia-7/pokebonk-afk-helper/main/pokebonk-afk.meta.js
// @downloadURL  https://raw.githubusercontent.com/Insomnia-7/pokebonk-afk-helper/main/pokebonk-afk.user.js
// @supportURL   https://github.com/Insomnia-7/pokebonk-afk-helper/issues
// @grant        none
// ==/UserScript==
(function () {
'use strict';
const SUPPORTED_BUILDS = new Set(['mvob1c8t','mvpdimhl','mvpjh5lt']);
const STAT_RULES = [
 ['luck','幸运',/幸运|幸運|\bluck\b|suerte/i],
 ['special','特殊伤害',/特殊伤害|特殊傷害|special damage/i],
 ['physical','物理伤害',/物理伤害|物理傷害|physical damage/i],
 ['statusDamage','异常状态伤害',/异常状态伤害|異常狀態傷害|status damage|daño de estado/i],
 ['eliteDamage','对精英伤害',/对精英伤害|對精英傷害|对精英|damage to elites|daño a élites/i],
 ['damage','伤害',/伤害|傷害|\bdamage\b|daño/i],
 ['attackSpeed','攻击速度',/攻速|攻击速度|攻擊速度|attack speed|velocidad de ataque/i],
 ['critDamage','暴击伤害',/暴击伤害|暴擊傷害|crit(?:ical)? damage|daño cr[ií]tico/i],
 ['critChance','暴击率',/暴击|暴擊|critical|cr[ií]tic/i],
 ['projectiles','弹丸',/弹丸|彈丸|projectil/i],
 ['area','范围',/范围|範圍|\barea\b|área/i],
 ['duration','持续时间',/持续时间|持續時間|duration|duración/i],
 ['xpGain','经验',/经验|經驗|experience|experiencia/i],
 ['regen','再生',/再生|regener/i],
 ['lifesteal','吸血',/生命偷取|吸血|lifesteal/i],
 ['armor','护甲',/护甲|護甲|armor|armadura/i],
 ['maxHp','最大生命',/最大\s*(?:HP|生命)|PS máximos|max(?:imum)?\s*(?:HP|health)/i],
 ['moveSpeed','移动速度',/速度|speed|velocidad/i],
 ['statusChance','异常几率',/异常状态|異常狀態|status|estado/i],
 ['gold','宝可币',/宝可币|寶可幣|gold|coin|pok[eé]d[oó]llar/i],
 ['pickupRange','拾取范围',/拾取|拾取范围|rang[eo].*(?:recogida|pickup)/i],
 ['healing','治疗',/治疗|治療|curación|healing/i],
 ['evasion','闪避',/闪避|閃避|evas/i]
];
const DEFAULTS = {
 enabled:false, autoMove:true, freeBalls:true, paidBalls:true,
 maxPrice:'', reserve:'', runCap:'',
 autoSelect:true, autoItems:true, declinePacts:true, autoUlt:true,
 catchShiny:true, catchLeague:true, helperPolicy:'support', rejectUnwanted:true,
 helperKeep:[], helperRelease:[], shinySwap:'best',
 itemPriority:[], itemNever:[],
 attributes:['luck','damage','special','physical','attackSpeed','critDamage','critChance','statusDamage','eliteDamage',...STAT_RULES.map(r=>r[0]).filter(id=>!['luck','damage','special','physical','attackSpeed','critDamage','critChance','statusDamage','eliteDamage'].includes(id))], helperAttributes:['luck','damage','attackSpeed','statusDamage','eliteDamage','duration','xpGain','regen','healing','armor','maxHp','moveSpeed','critChance','area','statusChance','pickupRange','gold','evasion'],
 autoAltar:true, autoDitto:true, autoFossil:true, autoSnorlax:true, autoFusion:true, autoShop:true, autoSlots:true,
 shopMaxPrice:'', shopReserve:'', shopRunCap:'', slotMaxPrice:'', slotReserve:'', slotRunCap:'', slotMaxSpins:'',
 fossilChoice:'', itemStatFallback:false, adaptStats:true, pokemonAttributes:{},
 taskOrder:['altar','freechest','chest','ditto','fossil','snorlax','bill','meowth','slots'],
 avoidHazards:true
};
const norm=s=>String(s??'').replace(/\u00a0/g,' ').replace(/＋/g,'+').trim();
const lines=s=>String(s||'').split(/[\n,，]/).map(norm).filter(Boolean);
const named=(list,name,id)=>list.some(s=>norm(s).toLowerCase()===norm(name).toLowerCase()||String(s)===String(id));
function budgetAllowed(price,gold,spent,opt) {
 if (!opt.paidBalls) return {ok:false,reason:'普通球已关闭'};
 const fields=['maxPrice','reserve','runCap'];
 if (!fields.some(k=>norm(opt[k])!=='')) return {ok:false,reason:'普通球预算尚未填写'};
 for(const k of fields) if(norm(opt[k])!==''&&(!Number.isFinite(Number(opt[k]))||Number(opt[k])<0)) return {ok:false,reason:'预算必须是非负数字'};
 if(!Number.isFinite(price)||price<0||!Number.isFinite(gold)) return {ok:false,reason:'价格尚不可读'};
 if(gold<price) return {ok:false,reason:'宝可币不足'};
 if(norm(opt.maxPrice)!==''&&price>Number(opt.maxPrice)) return {ok:false,reason:'超过单球上限'};
 if(norm(opt.reserve)!==''&&gold-price<Number(opt.reserve)) return {ok:false,reason:'低于保留余额'};
 if(norm(opt.runCap)!==''&&spent+price>Number(opt.runCap)) return {ok:false,reason:'达到本局球费上限'};
 return {ok:true,reason:'符合预算'};
}
function statScore(text,order=DEFAULTS.attributes) {
 let result={rank:999,amount:0,reason:'品质兜底'};
 const clauses=norm(text).split(/[\n。；;，,]/);
 for(const clause of clauses) {
  if(/受到|所受|承受|减伤|減傷|damage (?:taken|received)|daño recibido/i.test(clause)) continue;
  if(/[−–-]\s*\d/.test(clause)&&!/\+\s*\d/.test(clause)) continue;
  // More specific kinds win before the general "damage/speed" expressions.
  const specific=['critDamage','attackSpeed','pickupRange','special','physical','statusDamage','eliteDamage'].find(id=>STAT_RULES.find(r=>r[0]===id)[2].test(clause));
  const rule=specific?STAT_RULES.find(r=>r[0]===specific):STAT_RULES.find(r=>r[2].test(clause));
  if(!rule) continue;
  const rank=order.indexOf(rule[0]);if(rank<0) continue;
  const match=rule[2].exec(clause);const prefix=clause.slice(0,match.index);
  const amount=Number(/\+?\s*(\d+(?:\.\d+)?)\s*%?\s*$/.exec(prefix)?.[1]||0);
  if(rank<result.rank||rank===result.rank&&amount>result.amount) result={rank,amount,reason:rule[1]};
 }
 return result;
}
function rarity(text){return /传奇|傳奇|legend/i.test(text)?4:/史诗|史詩|epic|épico/i.test(text)?3:/稀有|rare|raro/i.test(text)?2:/罕见|罕見|uncommon/i.test(text)?1:0;}
function compareCards(a,b){return a.priority-b.priority||a.rank-b.rank||b.amount-a.amount||b.quality-a.quality||a.index-b.index;}
function rankCards(cards,opt=DEFAULTS,order=opt.attributes) {
 return cards.map((c,index)=>{
  const p=opt.itemPriority.findIndex(s=>named([s],c.label,c.id));
  return {...c,index,...statScore(c.text,order),priority:p<0?999:p,quality:typeof c.rarity==='number'?c.rarity:rarity(c.rarity||'')};
 }).sort(compareCards);
}
const SUPPORT={normal:['gold',10],fire:['statusDamage',15],water:['healing',15],grass:['regen',.5],electric:['attackSpeed',5],ice:['duration',10],fighting:['eliteDamage',10],poison:['statusChance',12],ground:['armor',4],flying:['moveSpeed',5],psychic:['xpGain',8],bug:['pickupRange',1],rock:['maxHp',15],ghost:['evasion',3],dragon:['damage',5],dark:['critChance',4],steel:['area',8],fairy:['luck',8]};
function helperValue(h,opt=DEFAULTS){
 const type=h.types?.[0];const pair=SUPPORT[type]||['unknown',0];let rank=opt.helperAttributes.indexOf(pair[0]);if(rank<0)rank=999;
 const pin=named(opt.helperKeep,h.name,h.species);
 return {pin,rank,amount:pair[1]*(h.shiny?2:1),bond:h.bond||0,bst:h.bst||0};
}
function helperCompare(a,b,opt=DEFAULTS){const x=helperValue(a,opt),y=helperValue(b,opt);return Number(y.pin)-Number(x.pin)||x.rank-y.rank||y.amount-x.amount||y.bond-x.bond||y.bst-x.bst;}
function helperDecision(candidate,team,capacity,opt=DEFAULTS){
 if(candidate.shiny) return {keep:true,reason:'异色保护'};
 if(named(opt.helperRelease,candidate.name,candidate.species)) return {keep:false,reason:'放弃名单'};
 if(named(opt.helperKeep,candidate.name,candidate.species)) return {keep:true,reason:'保留名单'};
 if(opt.helperPolicy==='ignore') return {keep:false,reason:'只取头目掉落'};
 if(opt.helperPolicy==='list') return {keep:false,reason:'未列入保留名单'};
 const current=team.filter(h=>!h.shiny);
 if(current.length<capacity) return {keep:true,reason:'助手有空位'};
 const weakest=current.slice().sort((a,b)=>helperCompare(b,a,opt))[0];
 return {keep:!!weakest&&helperCompare(candidate,weakest,opt)<0,reason:'比较助手辅助属性'};
}
function movementKeys(dx,dz,yaw){
 const len=Math.hypot(dx,dz);if(!len)return[];dx/=len;dz/=len;
 const f=-Math.sin(yaw)*dx-Math.cos(yaw)*dz,r=Math.cos(yaw)*dx-Math.sin(yaw)*dz;
 const keys=[];if(Math.abs(f)>.38)keys.push(f>0?'KeyW':'KeyS');if(Math.abs(r)>.38)keys.push(r>0?'KeyD':'KeyA');return keys;
}
class MinHeap {
 constructor(){this.a=[];}push(v){const a=this.a;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}
 pop(){const a=this.a;if(!a.length)return null;const top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return top;}
 get length(){return this.a.length;}
}
function routePath(start,goal,terrain,hazards=[],limit=18000) {
 const cell=2.5;const id=(x,z)=>x+','+z;const sx=Math.round(start.x/cell),sz=Math.round(start.z/cell),gx=Math.round(goal.x/cell),gz=Math.round(goal.z/cell);
 const h=(x,z)=>Math.hypot(x-gx,z-gz);const open=new MinHeap,seen=new Map,closed=new Set;
 const first={x:sx,z:sz,g:0,f:h(sx,sz),parent:null};open.push(first);seen.set(id(sx,sz),first);
 const body=Math.max(.65,goal.bodyRadius||.65)+.6;
 const sample=(x,z)=>{
  if(!terrain.inBounds(x,z,2)||terrain.hitProp?.(x,terrain.height(x,z)+.3,z,body))return false;
  for(let i=0;i<8;i++)if(terrain.inSolid?.(x+Math.cos(i*Math.PI/4)*body,z+Math.sin(i*Math.PI/4)*body))return false;
  return !terrain.inSolid?.(x,z);
 };
 const edge=(ax,az,bx,bz)=>{let prev=terrain.height(ax,az);const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.5);for(let k=1;k<=n;k++){const x=ax+(bx-ax)*k/n,z=az+(bz-az)*k/n;if(!sample(x,z))return false;const y=terrain.height(x,z);if(y-prev>.65||prev-y>1.6)return false;prev=y;}return true;};
 let count=0,end=null;
 while(open.length&&count++<limit){const cur=open.pop(),key=id(cur.x,cur.z);if(closed.has(key))continue;closed.add(key);
  const remaining=Math.hypot(cur.x*cell-goal.x,cur.z*cell-goal.z);
  if(remaining<=(goal.radius||.7)||remaining<=cell&&edge(cur.x*cell,cur.z*cell,goal.x,goal.z)){end=cur;break;}
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const x=cur.x+dx,z=cur.z+dz,k=id(x,z);if(closed.has(k))continue;
   const wx=x*cell,wz=z*cell,ax=cur.parent?cur.x*cell:start.x,az=cur.parent?cur.z*cell:start.z;
   if(!edge(ax,az,wx,wz))continue;
   let cost=Math.hypot(dx,dz);if(terrain.waterAt&&terrain.height(wx,wz)<terrain.waterAt(wx,wz))cost+=3;
   for(const hazard of hazards)if(Math.hypot(wx-hazard.x,wz-hazard.z)<hazard.r+1)cost+=12;
   const g=cur.g+cost;if(seen.has(k)&&seen.get(k).g<=g)continue;const node={x,z,g,f:g+h(x,z),parent:cur};seen.set(k,node);open.push(node);
  }
 }
 if(!end)return null;const path=[];for(let n=end;n.parent;n=n.parent)path.push({x:n.x*cell,z:n.z*cell});path.reverse();
 const finish=path[path.length-1]||start;
 if(Math.hypot(finish.x-goal.x,finish.z-goal.z)>(goal.radius||.7)){if(!edge(finish.x,finish.z,goal.x,goal.z))return null;path.push({x:goal.x,z:goal.z});}
 return path;
}
function restrictionMessage(value){return /账号已(?:被)?封禁|账号已被排行榜封禁|你无法使用此账号游戏|未通过服务器校验|反作弊(?:警告|检测)|检测到(?:作弊|外挂|脚本|自动化)|account (?:has been )?suspended|cuenta suspendida|suspendido tu cuenta|No cumple las comprobaciones del servidor/i.test(String(value||''));}

function cleanPlan(value){
 const p=value&&typeof value==='object'?value:{};
 return Object.fromEntries(['moves','vits','fus','items'].map(k=>[k,[...new Set((Array.isArray(p[k])?p[k]:[]).filter(v=>k==='moves'?Number.isInteger(v):typeof v==='string'))]]));
}
function planFor(raw,member){try{return cleanPlan(JSON.parse(raw||'{}')?.[String(member)]);}catch(_){return cleanPlan(null);}}
function spendingAllowed(kind,price,gold,spent,settings){
 const prefix=kind==='shop'?'shop':'slot';
 const mapped={paidBalls:true,maxPrice:settings[prefix+'MaxPrice'],reserve:settings[prefix+'Reserve'],runCap:settings[prefix+'RunCap']};
 const r=budgetAllowed(price,gold,spent,mapped);
 return {...r,reason:r.reason.replaceAll('普通球',kind==='shop'?'商店':'老虎机').replace('单球','单次').replace('球费','支出')};
}
function slotAllowed(price,gold,ledger,settings){
 if(norm(settings.slotMaxSpins)!==''){
  const n=Number(settings.slotMaxSpins);
  if(!Number.isInteger(n)||n<0||ledger.slotSpins>=n)return {ok:false,reason:'达到本局抽奖次数上限'};
 }
 return spendingAllowed('slot',price,gold,ledger.slotSpent||0,settings);
}
function mapTaskPolicy(item,settings,plan,run,ledger){
 if(item.used&&!['meowth'].includes(item.kind))return null;
 const kind=item.kind;
 if(kind==='altar'&&(!settings.autoAltar||item.data?.sealed))return null;
 if(kind==='ditto'&&(!settings.autoDitto||!plan.items.length&&!settings.itemPriority.length&&!settings.itemStatFallback))return null;
 if(kind==='fossil'&&(!settings.autoFossil||!['helix','dome','amber'].includes(settings.fossilChoice)))return null;
 if(kind==='snorlax'&&!settings.autoSnorlax)return null;
 if(kind==='bill'&&(!settings.autoFusion||!plan.fus.length||!item.data?.ready))return null;
 if(kind==='meowth'&&(!settings.autoShop||!plan.items.length&&!settings.itemPriority.length&&!settings.itemStatFallback||!spendingAllowed('shop',0,run.gold,ledger.shopSpent||0,settings).ok))return null;
 if(kind==='slots'&&(!settings.autoSlots||!slotAllowed(0,run.gold,ledger,settings).ok))return null;
 if(!['altar','ditto','fossil','snorlax','bill','meowth','slots'].includes(kind))return null;
 return {label:({altar:'未知祭坛充能',ditto:'百变怪复制',fossil:'化石遗迹',snorlax:'卡比兽',bill:'融合机器',meowth:'喵喵商店',slots:'老虎机'})[kind],radius:kind==='altar'?Math.max(.7,(item.r||3)*.45):Math.min(2,item.r||2)};
}

const CORE={cleanPlan,planFor,spendingAllowed,slotAllowed,mapTaskPolicy,restrictionMessage,DEFAULTS,STAT_RULES,budgetAllowed,statScore,rankCards,helperDecision,helperCompare,movementKeys,routePath};
if(typeof document==='undefined'){if(typeof module!=='undefined')module.exports=CORE;return;}


if(document.getElementById('pb-afk-helper')) {
 const old=document.getElementById('pb-afk-helper');
 if(window.PokeBonkAFK){window.PokeBonkAFK.configure();return;}
 old.querySelector('[data-toggle]')?.textContent?.includes('运行中')&&old.querySelector('[data-toggle]').click();
 old.remove();
}
const STORE='local.pokebonk.afk.v2';
let opt=structuredClone(DEFAULTS),ledger={key:'',spent:0,free:0,paid:0,shopSpent:0,slotSpent:0,slotSpins:0};
try {const saved=JSON.parse(localStorage.getItem(STORE)||'{}');opt={...opt,...saved.options};if(saved.ledger)ledger=saved.ledger;}catch(_){}
ledger={shopSpent:0,slotSpent:0,slotSpins:0,...ledger};
let stoppedReason='',updateNotice='',connectionState='等待连接';
let app=null,dataModule=null,catalog={pokemon:new Map,items:new Map};
let connectedRun=null,connectedTerrain=null,mode='等待连接游戏',lastLog='',target=null,path=[],pathGoal=null;
let modalSeen=null,modalAt=0,lastModalAction=0,choices=0,lastPulse=-1e9,lastPlan=0,lastTargetScan=0;
let lastMotion={x:0,z:0,at:0},jumpAt=0,targetAt=0,editOpen=false;
let skipped=new WeakMap;
const held=new Set,modalInfo=new WeakMap,patchedUi=new WeakSet,patchedInter=new WeakSet;
const cleanupHooks=[];
function persist(){localStorage.setItem(STORE,JSON.stringify({options:opt,ledger}));}
function log(s){if(lastLog!==s){lastLog=s;console.info('[PokéBonk AFK]',s);}}
function h(tag,attrs={},...children){const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')e.className=v;else if(k==='style')e.style.cssText=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==null)e.setAttribute(k,v);}for(const c of children.flat()){if(c!=null)e.append(c);}return e;}
const panel=h('div',{id:'pb-afk-helper',style:'position:fixed;left:12px;top:155px;z-index:2147483646;width:245px;box-sizing:border-box;padding:12px;border:1px solid #6876ae;border-radius:12px;background:#151d30ed;color:#eef4ff;font:13px/1.6 system-ui;pointer-events:auto;box-shadow:0 6px 24px #0007'});
const headline=h('b',{},'PokéBonk 无尽挂机助手');
const startBtn=h('button',{'data-toggle':'',onclick:()=>setEnabled(!opt.enabled)},'启动');
const configBtn=h('button',{'data-config':'',onclick:()=>configure()},'设置');
const foldBtn=h('button',{onclick:()=>{panelBody.hidden=!panelBody.hidden;}},'收起/展开');
const statusBox=h('div',{'data-status':'',style:'color:#bdcbed;word-break:break-word;white-space:pre-line'});
const panelBody=h('div',{},h('div',{style:'display:flex;gap:5px;margin:8px 0'},startBtn,configBtn,foldBtn),statusBox);
panelBody.append(h('button',{onclick:()=>checkGameVersion()},'检查游戏更新'),h('button',{onclick:()=>{bridgeTries=0;connectGame();}},'重新连接')); 
panel.append(headline,h('small',{style:'color:#99add5;display:block'},'F8 启动/暂停 · 先设置预算和偏好'),panelBody);
const css=h('style',{},'#pb-afk-helper button,.pb-afk-settings button{padding:5px 9px;border:1px solid #56698b;border-radius:6px;color:#eaf2ff;background:#294365;cursor:pointer;font:inherit}.pb-afk-settings{position:fixed;inset:5vh max(16px,12vw);z-index:2147483647;overflow:auto;border:1px solid #6c87ae;border-radius:16px;background:#111c30;color:#e9f2ff;padding:22px;font:14px/1.6 system-ui;box-shadow:0 12px 80px #000c}.pb-afk-settings h2{margin:0 0 12px}.pb-afk-settings fieldset{border:1px solid #456080;border-radius:10px;margin:14px 0;padding:14px}.pb-afk-settings input:not([type=checkbox]),.pb-afk-settings textarea,.pb-afk-settings select{background:#1c2f49;border:1px solid #627fa6;border-radius:6px;color:#f4f7ff;padding:7px;font:inherit;box-sizing:border-box;max-width:100%}.pb-afk-settings textarea{width:100%;min-height:95px}.pb-afk-settings label{display:block;margin:7px 0}.pb-afk-settings small{color:#a7bbd9}.pb-afk-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:15px}.pb-afk-catalog{max-height:260px;overflow:auto}.pb-afk-catalog>div{border-bottom:1px solid #304865;padding:7px 0}.pb-afk-settings [data-error]{color:#ff9da7;white-space:pre-line}');
document.head.append(css);document.body.append(panel);
let settingsEl=null;
function updatePanel(){
 startBtn.textContent=opt.enabled?'运行中 · 暂停':'启动';startBtn.style.background=opt.enabled?'#25694f':'#294365';
 const run=app?.run;const gold=Number.isFinite(run?.gold)?Math.floor(run.gold).toLocaleString():'—';
 const price=run?.interactables?.chestCost?.();
 const plan=readBuildPlan(run);
 statusBox.textContent='寻路连接：'+connectionState+'\n'+(run?.player?pokemonLabel(run)+' · 计划 '+['moves','vits','fus','items'].map(k=>plan[k].length).join('/')+'\n':'')+mode+'\n宝可币 '+gold+' · 普通球 '+(Number.isFinite(price)?price.toLocaleString():'—')+'\n球费 '+ledger.spent.toLocaleString()+' · 商店 '+ledger.shopSpent.toLocaleString()+'\n抽奖 '+ledger.slotSpent.toLocaleString()+' ₽ / '+ledger.slotSpins+' 次'+'\n免费球 '+ledger.free+' · 普通球 '+ledger.paid+' · 选择 '+choices+(lastLog?'\n'+lastLog:'')+(updateNotice?'\n'+updateNotice:'');
}
function setEnabled(on){if(on&&stoppedReason){mode=stoppedReason;updatePanel();return;}opt.enabled=!!on;releaseKeys();target=null;path=[];modalSeen=null;mode=on?'正在寻找目标':'已暂停';persist();updatePanel();}
function keyNames(ids){return ids.map(id=>STAT_RULES.find(r=>r[0]===id)?.[1]||id).join('\n');}
function parseOrder(value){const ids=lines(value).map(s=>STAT_RULES.find(r=>r[0]===s||r[1]===s)?.[0]);if(ids.some(x=>!x))throw Error('属性列表包含未识别的名称，请从下方属性按钮加入。');return [...new Set(ids)];}
function configure(){
 if(settingsEl?.isConnected)return;editOpen=true;releaseKeys();
 const box=h('section',{class:'pb-afk-settings'});settingsEl=box;
 box.append(h('h2',{},'挂机设置'),h('p',{},'免费超级球不受预算限制；异色优先捕捉。所有金额默认留空。设置期间暂停脚本操作。'));
 const controls={};const field=(label,name,type='text',note='')=>{const el=h(type==='textarea'?'textarea':'input',type==='textarea'?{rows:'5'}:{type});controls[name]=el;el.name=name;
  if(type==='checkbox')el.checked=!!opt[name];else el.value=Array.isArray(opt[name])?opt[name].join('\n'):opt[name];
  if(type==='number'){el.min='0';el.step='1';el.placeholder='留空';}
  return h('label',{},type==='checkbox'?el:label,type==='checkbox'?' '+label:el,note?h('small',{style:'display:block'},note):null);
 };
 const fs=(title,...children)=>h('fieldset',{},h('legend',{},title),...children);
 box.append(fs('自动操作',h('div',{class:'pb-afk-grid'},h('div',{},field('自动寻路寻找已启用目标','autoMove','checkbox'),field('自动打开免费球（不限数量）','freeBalls','checkbox'),field('自动打开付费普通球','paidBalls','checkbox')),h('div',{},field('自动选择祝福；升级遵循配置计划','autoSelect','checkbox'),field('自动选择/领取道具','autoItems','checkbox'),field('自动拒绝契约','declinePacts','checkbox'),field('终极技就绪自动释放','autoUlt','checkbox')))));
 box.append(fs('普通球预算（单位：宝可币 ₽）',h('div',{class:'pb-afk-grid'},field('单球最高价格','maxPrice','number'),field('购买后至少剩余','reserve','number'),field('本局球费总上限','runCap','number')),h('small',{},'全部留空＝不自动买普通球。至少填一项才启用；其他空白项不设限制。填 0 与留空不同。本局球费从助手连接本局起计，手动买球也计入。')));

 const run=app?.run, member=profileId(run), plan=readBuildPlan(run);
 const profile=h('textarea',{rows:'4'});profile.name='currentPokemonAttributes';profile.value=keyNames(opt.pokemonAttributes?.[member]||[]);profile.disabled=member==null;
 controls.currentPokemonAttributes=profile;
 box.append(fs('当前宝可梦的配置计划',h('b',{},pokemonLabel(run)),h('p',{},'招式 '+plan.moves.length+' · 维生素 '+plan.vits.length+' · 融合 '+plan.fus.length+' · 道具 '+plan.items.length),h('small',{},'读取游戏「联盟 → 宝可梦 → 配置计划」。已计划的招式与融合素材优先；没有配置的类别、没有匹配选项时，保持页面等你手选。进化后沿用联盟成员的计划。'),h('label',{},'此宝可梦专用属性优先级（留空沿用全局；每行一个）',profile),field('同等计划优先级下，参考现有招式的物理/特殊类别','adaptStats','checkbox')));
 box.append(fs('地图任务',h('div',{class:'pb-afk-grid'},...[
 ['未知祭坛：到达后驻留充能','autoAltar'],['百变怪：按配置复制道具','autoDitto'],['化石遗迹：按下方选择交换','autoFossil'],['卡比兽：交互领取奖励','autoSnorlax'],['融合机器：仅执行已计划且材料就绪的融合','autoFusion'],['喵喵：仅购买符合配置和预算的道具','autoShop'],['老虎机：在独立预算内抽奖','autoSlots']
 ].map(([label,key])=>field(label,key,'checkbox'))),field('任务优先顺序（每行一个 ID）','taskOrder','textarea','altar 祭坛、freechest 免费球、chest 普通球、ditto 百变怪、fossil 化石、snorlax 卡比兽、bill 融合、meowth 喵喵、slots 抽奖。异色仍最优先。'),h('small',{},'封印未解的祭坛暂不前往；充能途中保持驻留。商店不自动刷新货品、不卖出已有道具。')));
 const fossil=h('select',{},h('option',{value:''},'未配置：手动选择'),h('option',{value:'helix'},'贝壳化石：道具，永久最大 HP −15%'),h('option',{value:'dome'},'甲壳化石：祝福，永久最大 HP −20%'),h('option',{value:'amber'},'秘密琥珀：化石翼龙助手，入队后最大 HP −25%'));fossil.name='fossilChoice';fossil.value=opt.fossilChoice;controls.fossilChoice=fossil;
 box.append(fs('化石遗迹交换',fossil,h('small',{},'选择后即允许每处化石遗迹按此规则交换，扣除效果可叠加；默认不交换。助手满队时沿用助手保留规则。')));
 box.append(fs('喵喵商店预算（独立于普通球）',h('div',{class:'pb-afk-grid'},field('单件最高价格','shopMaxPrice','number'),field('购买后至少剩余','shopReserve','number'),field('本局商店总支出上限','shopRunCap','number')),h('small',{},'金额全部留空＝不自动购物。按当前宝可梦道具计划或你明确设置的道具优先名单购买。')));
 box.append(fs('老虎机预算（游戏内宝可币）',h('div',{class:'pb-afk-grid'},field('单次最高价格','slotMaxPrice','number'),field('抽奖后至少剩余','slotReserve','number'),field('本局抽奖总支出上限','slotRunCap','number'),field('本局最多抽奖次数','slotMaxSpins','number')),h('small',{},'至少填写一项金额才自动抽奖；次数可另设上限。每次按当前价格检查，等待动画与奖励完成后才继续。')));

 const attribute=h('textarea',{rows:'7'});attribute.name='attributes';attribute.value=keyNames(opt.attributes);controls.attributes=attribute;
 const helperAttr=h('textarea',{rows:'7'});helperAttr.name='helperAttributes';helperAttr.value=keyNames(opt.helperAttributes);controls.helperAttributes=helperAttr;
 const buttons=(el)=>h('div',{},...STAT_RULES.map(([id,label])=>h('button',{type:'button',onclick:()=>{const list=lines(el.value);if(!list.includes(label)){list.push(label);el.value=list.join('\n');}}},label)));
 box.append(fs('属性优先级（从上到下；可删行并调整顺序）',attribute,h('small',{},'默认幸运＞伤害。未列入的属性不优先；同属性数值高的优先，最后按品质兜底。'),h('details',{},h('summary',{},'添加属性'),buttons(attribute))));
 box.append(fs('道具优先级',field('没有道具计划/优先名单时，允许按属性自动选道具和复制','itemStatFallback','checkbox','默认关闭：没有配置时由玩家自行选择。启用后才按幸运、伤害、速度等属性兜底。'),h('div',{class:'pb-afk-grid'},field('优先道具：每行一个，越靠上越优先','itemPriority','textarea','可填游戏中文名称或道具 ID；优先名单先于属性排序。'),field('不想要的道具：每行一个','itemNever','textarea','多选时排除；单件时卖出。全被排除时选择“都不要”换宝可币。'))));
 const search=h('input',{type:'search',placeholder:'搜索道具名称、效果或 ID'}),listBox=h('div',{class:'pb-afk-catalog'});
 const showCatalog=()=>{listBox.replaceChildren();const query=norm(search.value).toLowerCase();let n=0;for(const item of catalog.items.values()){if(query&&!(item.name+' '+item.desc+' '+item.key).toLowerCase().includes(query))continue;if(++n>100){listBox.append(h('small',{},'请搜索以缩小范围'));break;}listBox.append(h('div',{},h('b',{},item.name+' '),h('small',{},item.key+' · '+(item.max||10)+' 层上限'),h('div',{},item.desc),h('button',{onclick:()=>{const values=lines(controls.itemPriority.value);if(!values.includes(item.name)){values.push(item.name);controls.itemPriority.value=values.join('\n');}}},'加入优先'),h('button',{onclick:()=>{const values=lines(controls.itemNever.value);if(!values.includes(item.name)){values.push(item.name);controls.itemNever.value=values.join('\n');}}},'加入排除')));}if(!n)listBox.append(h('small',{},'目录尚未连接，仍可直接填写名称。'));};search.oninput=showCatalog;showCatalog();
 box.append(fs('道具目录',search,listBox));
 const policy=h('select',{},h('option',{value:'support'},'按辅助属性择优，满队替换较弱助手'),h('option',{value:'list'},'只保留名单中的助手'),h('option',{value:'ignore'},'非异色头目只取免费球掉落'));policy.name='helperPolicy';policy.value=opt.helperPolicy;controls.helperPolicy=policy;
 const shiny=h('select',{},h('option',{value:'best'},'已抓到的异色随从：按辅助属性择优'),h('option',{value:'old'},'已抓到的异色随从：保留旧随从'),h('option',{value:'new'},'已抓到的异色随从：使用新随从'));shiny.name='shinySwap';shiny.value=opt.shinySwap;controls.shinySwap=shiny;
 box.append(fs('捕捉与局内助手',h('b',{},'异色目标始终优先捕捉。红球/大师球的永久收录与绿色友友球助手分开处理。'),field('普通的可永久收录目标也自动捕捉','catchLeague','checkbox'),h('label',{},'局内非异色助手取舍 ',policy),field('不要的虚弱头目按 G 放弃，领取其免费球掉落','rejectUnwanted','checkbox'),h('div',{class:'pb-afk-grid'},field('优先保留助手名单（每行名称或图鉴编号）','helperKeep','textarea'),field('放弃助手名单（每行名称或编号）','helperRelease','textarea')),h('label',{},'助手辅助属性优先级',helperAttr),h('details',{},h('summary',{},'添加助手属性'),buttons(helperAttr)),h('label',{},shiny),h('small',{},'异色保护优先于名单。辅助属性主要由第一属性决定；异色随从选择不影响已完成的图鉴收录。已入队助手的放生不会再给超级球。')));
 box.append(fs('寻路',field('绕开已知持续伤害地面','avoidHazards','checkbox'),h('small',{},'根据地形、障碍物和坡度寻路；卡住会尝试跳跃、重算路线并暂时跳过目标。未启用的任务与迁移传送门不交互。连接状态必须显示“已连接”才能寻路；选卡识别与寻路连接分别显示。')));
 const error=h('div',{'data-error':''});box.append(error);
 const close=()=>{editOpen=false;box.remove();settingsEl=null;target=null;path=[];};
 box.append(h('div',{style:'display:flex;gap:10px;position:sticky;bottom:0;background:#111c30;padding:12px 0'},h('button',{onclick:()=>{try{
  const next={...opt};for(const[name,el]of Object.entries(controls)){if(name==='currentPokemonAttributes'){if(member!=null){next.pokemonAttributes={...next.pokemonAttributes,[member]:parseOrder(el.value)};}continue;}else if(name==='attributes'||name==='helperAttributes')next[name]=parseOrder(el.value);else if(['helperKeep','helperRelease','itemPriority','itemNever','taskOrder'].includes(name))next[name]=lines(el.value);else next[name]=el.type==='checkbox'?el.checked:el.value;}
  for(const name of ['maxPrice','reserve','runCap','shopMaxPrice','shopReserve','shopRunCap','slotMaxPrice','slotReserve','slotRunCap','slotMaxSpins'])if(norm(next[name])!==''&&(!Number.isFinite(Number(next[name]))||Number(next[name])<0))throw Error('金额必须为非负数字或留空。');
  if(!next.attributes.length||!next.helperAttributes.length)throw Error('请至少保留一个优先属性。');
  const overlap=next.helperKeep.filter(x=>next.helperRelease.includes(x));if(overlap.length)throw Error('保留与放弃名单重复：'+overlap.join('、'));
  if(next.taskOrder.some(k=>!DEFAULTS.taskOrder.includes(k)))throw Error('任务顺序包含未知 ID。');
  if(norm(next.slotMaxSpins)!==''&&!Number.isInteger(Number(next.slotMaxSpins)))throw Error('抽奖次数必须是整数。');
  opt=next;skipped=new WeakMap;persist();close();updatePanel();
 }catch(e){error.textContent=e.message;}}},'保存设置'),h('button',{onclick:close},'取消')));
 document.body.append(box);
}
window.addEventListener('keydown',e=>{if(e.code==='F8'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))setEnabled(!opt.enabled);}},true);
function getStatus(){return {enabled:opt.enabled,connected:!!app,connectionState,plan:readBuildPlan(app?.run),pokemon:pokemonLabel(app?.run),build:document.querySelector('meta[name="pokebonk-build"]')?.content,mode,target:target?.label||null,ledger:{...ledger},choices,lastLog,stoppedReason,updateNotice};}
window.PokeBonkAFK={start:()=>setEnabled(true),stop:()=>setEnabled(false),configure,status:getStatus};
updatePanel();


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
function itemCandidates(cards,plan,run){
 return cards.filter(c=>!named(opt.itemNever,c.label,c.id)&&(!c.id||!run?.player?.canHold||run.player.canHold(c.id))).filter(c=>c.el?.classList.contains('bp-on')||plan.items.includes(c.id)||named(opt.itemPriority,c.label,c.id)||opt.itemStatFallback);
}
function plannedLevel(cards,info,run,plan){
 return cards.map((el,i)=>{
  const offer=info?.offers?.[i],c=cardInfo(el);let priority=999;
  if(offer){
   if(offer.kind==='newVit'||offer.kind==='upVit'){const index=plan.vits.indexOf(offer.vit);if(index>=0)priority=index;}
   else{const id=offer.kind==='newMove'?offer.id:run?.player?.moves?.[offer.slot]?.def?.id;const index=plan.moves.indexOf(id);if(index>=0)priority=index;
    else if(plan.fus.length&&el.classList.contains('bp-on'))priority=20;}
  }else if(el.classList.contains('bp-on'))priority=el.querySelector('.bp-badge.ing')?20:0;
  return {...c,priority};
 }).filter(c=>c.priority<999).map(c=>({...c,...statScore(c.text,attributeOrder(run)),quality:rarity(c.rarity)})).sort(compareCards)[0];
}
function pickPlannedItem(cards,plan,run){
 const eligible=itemCandidates(cards,plan,run),order=attributeOrder(run);
 return rankCards(eligible,opt,order).sort((a,b)=>Number(b.el?.classList.contains('bp-on')||plan.items.includes(b.id))-Number(a.el?.classList.contains('bp-on')||plan.items.includes(a.id))||compareCards(a,b))[0];
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
 if(ui.modalEl)modalInfo.set(ui.modalEl,info);
}

function physicalCode(code){const input=app?.run?.input;if(input?.remap)for(const[from,to]of input.remap)if(to===code)return from;return code;}
function keyEvent(type,code){const key=code==='Space'?' ':code.startsWith('Key')?code.slice(3).toLowerCase():code;window.dispatchEvent(new KeyboardEvent(type,{code,key,bubbles:true,cancelable:true}));}
function releaseKeys(){for(const code of held)keyEvent('keyup',code);held.clear();}
function drive(codes){const desired=new Set(codes.map(physicalCode));for(const code of [...held])if(!desired.has(code)){keyEvent('keyup',code);held.delete(code);}for(const code of desired){const canonical=app?.run?.input?.canon?.(code)||code;if(!held.has(code)||!app?.run?.input?.down?.(canonical)){keyEvent('keydown',code);held.add(code);}}}
function tap(code){const now=performance.now();if(now-lastPulse<550)return false;lastPulse=now;const actual=physicalCode(code);keyEvent('keydown',actual);setTimeout(()=>keyEvent('keyup',actual),80);return true;}
const visible=e=>!!e&&e.isConnected&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length>0;
const available=e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true';
const text=e=>norm(e?.textContent);
const patchedPurchases=new WeakSet;
function patchRun(run){
 if(connectedRun!==run){connectedRun=run;connectedTerrain=null;target=null;path=[];const key=String(run.seed);if(ledger.key!==key){ledger={key,spent:0,paid:0,free:0,shopSpent:0,slotSpent:0,slotSpins:0};persist();}log('已连接生存模式，预算按本局单独计数');}
 const ui=run.ui;
 if(ui&&!patchedUi.has(ui)){
  patchedUi.add(ui);
  for(const name of ['showParty','showShinySwap','showItem','showItemChoice','showLevelUp','showFusion','showDitto','showTrade','showShop','showSlots','showBlessing']){
   const original=ui[name];if(typeof original!=='function')continue;
   ui[name]=function(...args){
    if(name==='showSlots'){
     const actions=args[1],spin=actions.spin;
     actions.spin=function(...rest){const price=actions.cost(),result=spin.apply(this,rest);if(result){ledger.slotSpent+=price;ledger.slotSpins++;persist();}return result;};
    }
    const result=original.apply(this,args);attachModalInfo(this,name,args);return result;
   };
  }
 }
 if(!patchedPurchases.has(run)&&typeof run.buyShopItem==='function'){
  patchedPurchases.add(run);const buy=run.buyShopItem;
  run.buyShopItem=function(item,...args){const price=item.price,result=buy.call(this,item,...args);if(result){ledger.shopSpent+=price;persist();}return result;};
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
 const names=await fetch(new URL(mod.g('i18n/zh.json'),location.href)).then(r=>{if(!r.ok)throw Error('中文资料加载失败');return r.json();});
 const pokemon=await fetch(new URL(mod.g('pokemon.json'),location.href)).then(r=>{if(!r.ok)throw Error('宝可梦资料加载失败');return r.json();});
 for(const p of pokemon)catalog.pokemon.set(p.id,{...p,name:names.pokemon?.[p.id]||p.name});
 const definitions=Object.values(mod).find(v=>Array.isArray(v)&&v.some(i=>i?.key==='muscle-band')&&v.every(i=>i&&typeof i.key==='string'&&typeof i.rarity==='number'))||[];
 for(const item of definitions)catalog.items.set(item.key,{...item,name:names.items?.[item.key]?.name||item.key,desc:names.items?.[item.key]?.desc||item.desc});
 log('已载入 '+catalog.items.size+' 件道具与宝可梦资料');
}
let bridgeBusy=false,bridgeTries=0;
async function connectGame(){
 if(app||bridgeBusy||bridgeTries>=5)return;bridgeBusy=true;bridgeTries++;connectionState='正在连接（'+bridgeTries+'/5）';
 try{
  const currentBuild=document.querySelector('meta[name="pokebonk-build"]')?.content;
  if(!SUPPORTED_BUILDS.has(currentBuild)){connectionState='此版本未适配';mode='需更新脚本；仅按游戏计划标记识别选卡';return;}
  const entry=[...document.querySelectorAll('script[type="module"][src]')].map(s=>s.src).find(s=>new URL(s).origin===location.origin&&/\/assets\/main-/.test(s));
  if(!entry)throw Error('尚未找到游戏加载入口');
  const boot=await fetch(entry).then(r=>{if(!r.ok)throw Error('游戏入口暂不可读');return r.text();});
  const imports=[...boot.matchAll(/import\(\s*['"\x60]([^'"\x60]*main-[^'"\x60]+\.js)['"\x60]\s*\)/g)].map(m=>new URL(m[1],entry).href);
  const newsPath=/['"\x60](\.\/news-[^'"\x60]+\.js)['"\x60]/.exec(boot)?.[1];
  if(!imports.length||!newsPath)throw Error('当前游戏模块结构与已核对版本不同');
  const exports=await import(imports[imports.length-1]);
  const proto=exports.App?.prototype;if(typeof proto?.frameGap!=='function')throw Error('当前版本没有可识别的游戏实例入口');
  dataModule=await import(new URL(newsPath,entry).href);
  const original=proto.frameGap;
  const capture=function(...args){app=this;connectionState='已连接';monitorAccount(this);if(proto.frameGap===capture)proto.frameGap=original;mode='已连接游戏';return original.apply(this,args);};
  proto.frameGap=capture;cleanupHooks.push(()=>{if(proto.frameGap===capture)proto.frameGap=original;});
  loadCatalog(dataModule).catch(e=>{log(e.message+'；暂不自动放弃未知助手');});
 }catch(e){connectionState=bridgeTries>=5?'连接失败，可点重新连接':'等待游戏实例';mode=e.message;}finally{bridgeBusy=false;updatePanel();}
}
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
 if(modal.querySelector('.cards.banning'))return manual('正在放逐招式');
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
  if(!opt.autoShop)return manual('商店自动购买已关闭');
  if(!['shopMaxPrice','shopReserve','shopRunCap'].some(k=>norm(opt[k])!==''))return manual('商店预算未填写');
  if(!plan.items.length&&!opt.itemPriority.length&&!opt.itemStatFallback)return manual('没有道具配置');
  const stock=run.shop?.stock||[];
  const offers=cards.map((el,i)=>({...cardInfo(el),id:stock[i]?.key,entry:stock[i]})).filter(c=>c.entry&&!c.entry.sold&&run.player.canHold(c.id)&&spendingAllowed('shop',c.entry.price,run.gold,ledger.shopSpent,opt).ok);
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
  if(!opt.autoFusion||!plan.fus.length)return manual('没有融合计划');
  const chosen=cards.map((el,i)=>({el,value:info?.fusions?.[i]})).filter(c=>!c.el.classList.contains('locked')&&(c.value?c.value.ready&&plan.fus.includes(c.value.r.key):c.el.classList.contains('bp-on'))).sort((a,b)=>plan.fus.indexOf(a.value?.r.key)-plan.fus.indexOf(b.value?.r.key))[0];
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
   if(chosen){action=chosen.el;label='按宝可梦计划选择：'+chosen.label;}
   else return manual('升级选项没有匹配配置计划，请自行选择');
  }else if(blessing&&opt.autoSelect&&cards.length){
   const chosen=rankCards(cards.map(c=>cardInfo(c,true)),{...opt,itemPriority:[]},attributeOrder(run))[0];
   if(chosen){action=chosen.el;label='祝福：'+chosen.label+'（'+chosen.reason+'）';}
  }else if(item&&opt.autoItems&&cards.length){
   const offers=cards.map((el,i)=>({...cardInfo(el),id:info?.items?.[i]||cardInfo(el).id}));
   const chosen=pickPlannedItem(offers,plan,run);
   if(chosen){action=chosen.el;label='按道具配置选择：'+chosen.label;}
   else return manual('道具选项没有匹配配置，请自行选择');
  }else if(item&&opt.autoItems&&modal.querySelector('div.card')){
   const c=cardInfo(modal.querySelector('div.card'));c.id=info?.item||c.id;
   if(named(opt.itemNever,c.label,c.id)){action=exit();label='按排除名单卖出：'+c.label;}
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
 const plan=readBuildPlan(run);
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
  }else if(target.type==='task'&&nearest.kind!=='altar'&&mapTaskPolicy(nearest,opt,readBuildPlan(run),run,ledger)){
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
