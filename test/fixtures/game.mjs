// Offline UI contract fixture; no live game, account or network is used.
const keys=new Set,pressed=new Set;
window.addEventListener('keydown',e=>{if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code)});window.addEventListener('keyup',e=>keys.delete(e.code));
const X=(tag,attrs,...children)=>{const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')el.className=v;else if(k==='style')Object.assign(el.style,v);else if(k==='onclick')el.onclick=v;else el.setAttribute(k,v)}for(const child of children.flat()){if(child!=null)el.append(child)}return el};
const c=(s,args={})=>s.replace(/\{([^}]+)\}/g,(_,key)=>args[key]??key);
const Kh={fairy:{label:'+8 幸运'},dragon:{label:'+5% 伤害'},normal:{label:'+10% 宝可币'},water:{label:'+15% 治疗'},ice:{label:'+10% 持续时间'},fire:{label:'+15% 异常状态伤害'}};
const SE=()=>X('span',{}),WV=()=>X('span',{}),hE=t=>X('span',{},t),mE=x=>String(x),N=x=>String(x),ia={fairy:1,dragon:2,normal:3,water:4,fire:5,ice:6};
const Jh=type=>Kh[type].label;const NE=SE,EE=hE,eg=Kh,P=N,TE=mE,ua=ia,aH=WV,ng=Jh;
class UI {
 modal(...children){this.hideModal();this.modalEl=X('div',{class:'modal'},...children);document.querySelector('#ui').append(this.modalEl);return this.modalEl;}
 hideModal(){this.modalEl?.remove();this.modalEl=null;}
 showItem(run,id,callback){this.modal(X('h1',{},'你发现了一件道具！'),X('div',{class:'card'},X('div',{class:'bd'},X('h3',{},({'lucky-egg':'幸运蛋','star-piece':'星星碎片','muscle-band':'力量头带'}[id]||id)),X('p',{},'+20 幸运'))),X('div',{class:'actions'},X('button',{class:'btn green',onclick:()=>{callback(true);this.hideModal()}},'拾取'),X('button',{class:'btn ghost',onclick:()=>{callback(false);this.hideModal()}},'出售')));}
 showItemChoice(run,items,callback){this.modal(X('h1',{},'你发现了道具！'),X('div',{class:'cards'},...items.map(id=>X('button',{class:'card',onclick:()=>{callback(id);this.hideModal()}},X('div',{class:'bd'},X('h3',{},({'lucky-egg':'幸运蛋','star-piece':'星星碎片','muscle-band':'力量头带'}[id]||id)),X('p',{},id==='lucky-egg'?'+30% 经验':id==='star-piece'?'+20 幸运':'+20% 伤害'))))),X('div',{class:'actions'},X('button',{class:'btn ghost',onclick:()=>{callback(null);this.hideModal()}},'都不要')));}

 showLevelUp(run,offers,callback){this.modal(X('h1',{},'等级 12'),X('div',{class:'cards'},...offers.map(o=>X('button',{class:'card offer'+(o.planned?' bp-on':'') ,onclick:()=>{this.hideModal();callback(o)}},X('div',{class:'bd'},X('h3',{},o.name),X('p',{},o.effect||'+50% 伤害')),o.ingredient?X('span',{class:'bp-badge ing'}):''))));}
 showBlessing(run,title,offers,callback){this.modal(X('h1',{},title),X('div',{class:'help'},'为本局选择一项祝福'),X('div',{class:'cards'},...offers.map(o=>X('button',{class:'card',onclick:()=>{this.hideModal();callback(o)}},X('div',{class:'bd'},X('h3',{},o.label))))));}
 showDitto(run,callback){this.modal(X('h1',{},'百变怪：我复制哪件道具？'),X('div',{class:'cards scroll'},...[...run.player.items].map(([id])=>X('button',{class:'card mini',onclick:()=>{if(run.player.canHold(id)){this.hideModal();callback(id)}}},X('div',{class:'bd'},X('h3',{},id),X('p',{},id==='star-piece'?'+20 幸运':'+50% 伤害'))))),X('div',{class:'actions'},X('button',{class:'btn ghost',onclick:()=>{this.hideModal();callback(null)}},'以后再说')));}
 showTrade(run,trade,callback){this.modal(X('h1',{},trade.title),X('div',{class:'cards'},...trade.offers.map(o=>X('button',{class:'card pact trade',onclick:()=>{this.hideModal();callback(o.key)}},X('div',{class:'bd'},X('h3',{},o.name))))),X('div',{class:'actions'},X('button',{class:'btn ghost',onclick:()=>{this.hideModal();callback(null)}},'以后再说')));}
 showFusion(run,offers,callback){this.modal(X('h1',{},'融合机器'),X('div',{class:'cards fu-cards'},...offers.map((o,i)=>X('button',{class:'card fusion'+(o.ready?'':' locked'),onclick:()=>{if(o.ready){this.hideModal();callback(i)}}},X('div',{class:'bd'},X('h3',{},o.r.key))))),X('div',{class:'actions'},X('button',{class:'btn ghost',onclick:()=>{this.hideModal();callback(null)}},'以后再说')));}
 showShop(run,onExit){const render=()=>{this.modal(X('h1',{},'喵喵'),X('div',{class:'cards'},...run.shop.stock.map(o=>X('button',{class:'card',onclick:()=>{if(run.buyShopItem(o))render()}},X('div',{class:'bd'},X('h3',{},o.key),X('p',{},o.key==='star-piece'?'+20 幸运':'+50% 伤害'))))),X('button',{class:'btn shop-exit',onclick:()=>{this.hideModal();onExit()}},'离开'));this.modalEl.classList.add('shop-modal');};render();}
 showSlots(run,actions,onExit){const cab=X('div',{class:'sl-cab'}),spin=X('button',{class:'btn green big',onclick:()=>{if(cab.classList.contains('spinning')){fx.doubleSpin++;return;}const r=actions.spin();if(r){cab.classList.add('spinning');setTimeout(()=>{actions.pay(r);cab.classList.remove('spinning');},300);}}},'抽奖');this.modal(X('h1',{},'老虎机'),cab,X('div',{class:'actions'},spin,X('button',{class:'btn ghost',onclick:()=>{this.hideModal();onExit()}},'离开')));}
}
const makeBall=(x,z,free=false)=>({kind:free?'freechest':'chest',x,y:0,z,r:2.6,used:false,data:{}});
const makeRun=()=>{
 const run={seed:123,endless:{hazards:{list:[]}},state:'play',gold:100,camYaw:0,player:{pos:{x:0,y:0,z:0},dead:false,speedNow:10},ult:{ready:false},cry(){},price:10};
 const E=run.enemies={alive:Array(20).fill(0),species:Array(20).fill(0),x:Array(20).fill(0),y:Array(20).fill(0),z:Array(20).fill(0),gen:Array.from({length:20},(_,i)=>i+1),flags:Array(20).fill(0),typesOf:i=>({35:['fairy'],148:['dragon'],6:['fire'],144:['ice'],113:['normal'],7:['water']}[E.species[i]]||['normal'])};
 run.input={remap:new Map,canon:c=>c,down:c=>keys.has(c)};
 run.terrain={inBounds:(x,z)=>Math.abs(x)<100&&Math.abs(z)<100,inSolid:()=>false,hitProp:()=>false,height:()=>0,waterAt:()=>-99};
 run.ui=new UI;
 run.interactables={list:[],nearest:null,chestCost:()=>run.price,openChest(item,free,gift){if(item.used)return;item.used=true;window.fx.opened.push({free:!!free||!!gift,x:item.x});},interact(item){if(item.used)return;if(item.kind==='chest'&&!item.data.gift){const cost=this.chestCost();if(run.gold<cost)return;run.gold-=cost;this.openChest(item,false,false)}else this.openChest(item,true,false)}};
 run.capture={state:'idle',index:-1,shiny:false,classic:false,species:35,canThrow(){return this.state==='weakened'&&Math.hypot(E.x[this.index]-run.player.pos.x,E.z[this.index]-run.player.pos.z)<9}};
 run.allies={state:'idle',down:-1,list:[],cap:2,canThrow(){return this.state==='down'&&Math.hypot(E.x[this.down]-run.player.pos.x,E.z[this.down]-run.player.pos.z)<9},dismiss(){const i=this.down;if(this.state!=='down')return;this.state='idle';this.down=-1;E.alive[i]=0;this.run.interactables.list.push(makeBall(E.x[i],E.z[i],true));window.fx.dismissed++},run};

 run.meta={account:{id:'offline-account'}};run.player.roster={id:113};run.player.speciesId=113;run.player.moves=[];
 run.player.items=new Map([['star-piece',1],['muscle-band',1]]);run.player.canHold=id=>(run.player.items.get(id)||0)<10;
 run.shop={stock:[{key:'star-piece',price:12,sold:false},{key:'muscle-band',price:10,sold:false},{key:'star-piece',price:19,sold:false}]};
 run.buyShopItem=function(entry){if(entry.sold||run.gold<entry.price||!run.player.canHold(entry.key))return false;entry.sold=true;run.gold-=entry.price;run.player.items.set(entry.key,(run.player.items.get(entry.key)||0)+1);fx.bought.push(entry.key);return true;};
 const rawInteract=run.interactables.interact;
 run.interactables.interact=function(item){
  if(item.kind==='chest'||item.kind==='freechest')return rawInteract.call(this,item);
  if(item.kind==='altar'){fx.altarE++;return;}
  const resume=()=>run.state='play';run.state='modal';fx.visits.push(item.kind);
  if(item.kind==='ditto')run.ui.showDitto(run,id=>{if(id){item.used=true;fx.copies.push(id);}resume();});
  else if(item.kind==='fossil')run.ui.showTrade(run,{title:'化石遗迹',species:142,offers:['helix','dome','amber'].map(key=>({key,name:key}))},key=>{if(key){item.used=true;fx.fossils.push(key);}resume();});
  else if(item.kind==='snorlax'){item.used=true;run.ui.showBlessing(run,'卡比兽祝福',[{label:'+40 幸运'},{label:'+50% 伤害'}],o=>{fx.blessings.push(o.label);resume();});}
  else if(item.kind==='bill')run.ui.showFusion(run,[{r:{key:'unplanned'},ready:true},{r:{key:'fu-113'},ready:false},{r:{key:'fu-113'},ready:true}],i=>{if(i!=null){fx.fusions.push(i);item.used=true;}resume();});
  else if(item.kind==='meowth')run.ui.showShop(run,resume);
  else if(item.kind==='slots')run.ui.showSlots(run,{cost:()=>5+fx.spins*2,spin:()=>{const cost=5+fx.spins*2;if(run.gold<cost)return null;run.gold-=cost;fx.spins++;return {cost};},pay:()=>{fx.paidOut++;}},resume);
  else resume();
 };

 return run;
};
window.fx={visits:[],copies:[],fossils:[],blessings:[],fusions:[],bought:[],spins:0,paidOut:0,doubleSpin:0,altarE:0,opened:[],caught:0,friend:0,dismissed:0,replaced:[],items:[],shinySwaps:[]};
export class App {
 constructor(){this.run=makeRun();this.saver=false;this.backend={onBanned:()=>{window.fx.originalBanHandler=true}};}fpsCap(){return 60}fpsChosen(){return true}
frameGap(){let e=this.run?.state;if(this.saver&&!this.fpsChosen())return e===`paused`||e===`modal`?50:33.3;let t=this.fpsCap();return t?1e3/t:0}
}
const app=new App;window.fixture={app,makeBall,keys,pressed};
let last=performance.now();
function loop(now){app.frameGap();const run=app.run,E=run.enemies,p=run.player.pos,dt=Math.min(.05,(now-last)/1000);last=now;
 if(run.state==='play'){
  let d=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  let dx=-Math.sin(run.camYaw)*f+Math.cos(run.camYaw)*d,dz=-Math.cos(run.camYaw)*f-Math.sin(run.camYaw)*d;const len=Math.hypot(dx,dz);if(len){p.x+=dx/len*10*dt;p.z+=dz/len*10*dt;}
  for(const item of run.interactables.list)if(item.kind==='altar'&&!item.used&&!item.data.sealed&&Math.hypot(item.x-p.x,item.z-p.z)<item.r){item.charge=(item.charge||0)+dt/3.2;if(item.charge>=1){item.used=true;fx.altarDone=true;}}
  const objects=run.interactables.list.filter(i=>i.kind!=='altar'&&!i.used&&Math.hypot(i.x-p.x,i.z-p.z)<i.r+.8).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));run.interactables.nearest=objects[0]||null;
  const cap=run.capture;if(cap.state==='roaming'&&Math.hypot(E.x[cap.index]-p.x,E.z[cap.index]-p.z)<8)cap.state='weakened';
  if(pressed.has('KeyG')&&run.allies.state==='down')run.allies.dismiss();
  if(pressed.has('KeyE')){
   if(cap.canThrow()){window.fx.caught++;E.alive[cap.index]=0;cap.state='done';}
   else if(run.allies.canThrow()&&!run.interactables.nearest){const id=E.species[run.allies.down],incoming={species:id,name:{35:'皮皮',6:'喷火龙'}[id]||String(id),types:E.typesOf(run.allies.down),bond:0,bst:300};run.allies.state='idle';window.fx.friend++;
    if(run.allies.list.length>=run.allies.cap){run.state='modal';run.ui.showParty(run,incoming,index=>{window.fx.replaced.push(index);if(index>=0)run.allies.list.splice(index,1,incoming);run.ui.hideModal();run.state='play'})}else run.allies.list.push(incoming);
   }else if(run.interactables.nearest)run.interactables.interact(run.interactables.nearest);
  }
 }
 pressed.clear();requestAnimationFrame(loop);
}requestAnimationFrame(loop);
