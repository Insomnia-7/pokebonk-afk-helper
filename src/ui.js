if(document.getElementById('pb-afk-helper')) {
 const old=document.getElementById('pb-afk-helper');
 if(window.PokeBonkAFK){window.PokeBonkAFK.configure();return;}
 old.querySelector('[data-toggle]')?.textContent?.includes('运行中')&&old.querySelector('[data-toggle]').click();
 old.remove();
}
const STORE='local.pokebonk.afk.v2';
let opt=structuredClone(DEFAULTS),ledger={key:'',spent:0,free:0,paid:0,shopSpent:0,slotSpent:0,slotSpins:0};
try {const saved=JSON.parse(localStorage.getItem(STORE)||'{}');opt={...opt,...saved.options};if(saved.ledger)ledger=saved.ledger;if(!saved.options?.selectionVersion){opt.itemMode='auto';opt.itemStatFallback=true;opt.selectionVersion=31;}}catch(_){}
ledger={shopSpent:0,slotSpent:0,slotSpins:0,rerollUsed:0,skipUsed:0,banishUsed:0,...ledger};
let stoppedReason='',updateNotice='',connectionState='等待连接';
let app=null,dataModule=null,catalog={pokemon:new Map,items:new Map(CATALOG.items.map(v=>[v.key,v])),vitamins:new Map(CATALOG.vitamins.map(v=>[v.key,v])),moves:new Map(CATALOG.moves.map(v=>[v.id,v])),fusions:new Map(CATALOG.fusions.map(v=>[v.key,v]))};
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
headline.title='助手 3.2.0 · 游戏 0.8.87 · 客户端加载器 1.2.0';
const startBtn=h('button',{'data-toggle':'',onclick:()=>setEnabled(!opt.enabled)},'启动');
const configBtn=h('button',{'data-config':'',onclick:()=>configure()},'设置');
const foldBtn=h('button',{'data-fold':'','aria-expanded':'true',onclick:()=>{panelBody.hidden=!panelBody.hidden;foldBtn.textContent=panelBody.hidden?'展开':'收起';foldBtn.setAttribute('aria-expanded',String(!panelBody.hidden));}},'收起');
const statusBox=h('div',{'data-status':'',style:'color:#bdcbed;word-break:break-word;white-space:pre-line'});
const panelBody=h('div',{},h('div',{style:'display:flex;gap:5px;margin:8px 0'},startBtn,configBtn),statusBox);
panelBody.append(h('button',{onclick:()=>checkGameVersion()},'检查游戏更新'),h('button',{onclick:()=>{bridgeTries=0;connectGame();}},'重新连接')); 
panel.append(h('div',{style:'display:flex;align-items:center;justify-content:space-between;gap:8px'},headline,foldBtn),h('small',{style:'color:#99add5;display:block'},'F8 启动/暂停 · 先设置预算和偏好'),panelBody);
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
 box.append(fs('当前宝可梦的配置计划',h('b',{},pokemonLabel(run)),h('p',{},'招式 '+plan.moves.length+' · 维生素 '+plan.vits.length+' · 融合 '+plan.fus.length+' · 道具 '+plan.items.length),h('small',{},'读取游戏「联盟 → 宝可梦 → 配置计划」。已计划的招式与融合素材优先；招式与融合没有配置时不擅自学习。维生素可按下方属性偏好选择；无匹配时遵循刷新/放逐/跳过规则。进化后沿用联盟成员的计划。'),h('label',{},'此宝可梦专用属性优先级（留空沿用全局；每行一个）',profile),field('道具按现有招式的物理/特殊类别调整属性优先级','adaptStats','checkbox')));
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
 addSelectionSettings(box,controls,field,fs,buttons,run,plan);
 const policy=h('select',{},h('option',{value:'support'},'按辅助属性择优，满队替换较弱助手'),h('option',{value:'list'},'只保留名单中的助手'),h('option',{value:'ignore'},'非异色头目只取免费球掉落'));policy.name='helperPolicy';policy.value=opt.helperPolicy;controls.helperPolicy=policy;
 const shiny=h('select',{},h('option',{value:'best'},'已抓到的异色随从：按辅助属性择优'),h('option',{value:'old'},'已抓到的异色随从：保留旧随从'),h('option',{value:'new'},'已抓到的异色随从：使用新随从'));shiny.name='shinySwap';shiny.value=opt.shinySwap;controls.shinySwap=shiny;
 box.append(fs('捕捉与局内助手',h('b',{},'异色目标始终优先捕捉。红球/大师球的永久收录与绿色友友球助手分开处理。'),field('普通的可永久收录目标也自动捕捉','catchLeague','checkbox'),h('label',{},'局内非异色助手取舍 ',policy),field('不要的虚弱头目按 G 放弃，领取其免费球掉落','rejectUnwanted','checkbox'),h('div',{class:'pb-afk-grid'},field('优先保留助手名单（每行名称或图鉴编号）','helperKeep','textarea'),field('放弃助手名单（每行名称或编号）','helperRelease','textarea')),h('label',{},'助手辅助属性优先级',helperAttr),h('details',{},h('summary',{},'添加助手属性'),buttons(helperAttr)),h('label',{},shiny),h('small',{},'异色保护优先于名单。辅助属性主要由第一属性决定；异色随从选择不影响已完成的图鉴收录。已入队助手的放生不会再给超级球。')));
 box.append(fs('寻路',field('绕开已知持续伤害地面','avoidHazards','checkbox'),h('small',{},'根据地形、障碍物和坡度寻路；卡住会尝试跳跃、重算路线并暂时跳过目标。未启用的任务与迁移传送门不交互。连接状态必须显示“已连接”才能寻路；选卡识别与寻路连接分别显示。')));
 const error=h('div',{'data-error':''});box.append(error);
 const close=()=>{editOpen=false;box.remove();settingsEl=null;target=null;path=[];};
 box.append(h('div',{style:'display:flex;gap:10px;position:sticky;bottom:0;background:#111c30;padding:12px 0'},h('button',{onclick:()=>{try{
  const next={...opt};for(const[name,el]of Object.entries(controls)){if(name==='currentPokemonAttributes'){if(member!=null){next.pokemonAttributes={...next.pokemonAttributes,[member]:parseOrder(el.value)};}continue;}else if(['attributes','helperAttributes','blessingAttributes','vitaminAttributes'].includes(name))next[name]=parseOrder(el.value);else if(['helperKeep','helperRelease','itemPriority','itemNever','taskOrder','movePriority','moveNever','vitaminPriority','vitaminNever','fusionPriority','fusionNever','banishMoves','banishVitamins','manualItems','noMatchOrder'].includes(name))next[name]=lines(el.value);else next[name]=el.type==='checkbox'?el.checked:el.value;}
  for(const name of ['maxPrice','reserve','runCap','shopMaxPrice','shopReserve','shopRunCap','slotMaxPrice','slotReserve','slotRunCap','slotMaxSpins'])if(norm(next[name])!==''&&(!Number.isFinite(Number(next[name]))||Number(next[name])<0))throw Error('金额必须为非负数字或留空。');
  if(!next.attributes.length||!next.helperAttributes.length)throw Error('请至少保留一个优先属性。');
  const overlap=next.helperKeep.filter(x=>next.helperRelease.includes(x));if(overlap.length)throw Error('保留与放弃名单重复：'+overlap.join('、'));
  if(next.taskOrder.some(k=>!DEFAULTS.taskOrder.includes(k)))throw Error('任务顺序包含未知 ID。');
  if(norm(next.slotMaxSpins)!==''&&!Number.isInteger(Number(next.slotMaxSpins)))throw Error('抽奖次数必须是整数。');
  for(const name of ['rerollPerLevel','rerollRunCap','skipRunCap','banishRunCap'])if(norm(next[name])!==''&&(!Number.isInteger(Number(next[name]))||Number(next[name])<0))throw Error('刷新、跳过、放逐次数必须为非负整数或留空。');
  if(next.noMatchOrder.some(k=>!['reroll','skip','banish'].includes(k)))throw Error('无匹配顺序只能填写 reroll、banish、skip。');
  next.selectionVersion=31;opt=next;skipped=new WeakMap;persist();close();updatePanel();
 }catch(e){error.textContent=e.message;}}},'保存设置'),h('button',{onclick:close},'取消')));
 document.body.append(box);
}
window.addEventListener('keydown',e=>{if(e.code==='F8'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))setEnabled(!opt.enabled);}},true);
function getStatus(){return {helperVersion:'3.2.0',clientVersion:window.pokebonkDesktop?.version||null,catalogVersion:CATALOG.version,enabled:opt.enabled,connected:!!app,connectionState,plan:readBuildPlan(app?.run),pokemon:pokemonLabel(app?.run),build:document.querySelector('meta[name="pokebonk-build"]')?.content,mode,target:target?.label||null,ledger:{...ledger},choices,lastLog,stoppedReason,updateNotice};}
window.PokeBonkAFK={start:()=>setEnabled(true),stop:()=>setEnabled(false),configure,status:getStatus};
updatePanel();

