const KEY='tucsonTycoonV1';
const defaults={balance:323222784,goal:3360000000,server:'Tucson',sessions:[],flips:[],market:[],calc:{basePay:36866700,govBonus:20,carBonus:130,vikingBonus:35,vikingCost:6125000,guardBonus:16,guardCost:7800000,duration:3,govActive:false,vikingActive:true,guardActive:true,carActive:true,stackAdditive:true}};
let state=load();
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return structuredClone(defaults)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
const n=v=>Number(v)||0, fmt=v=>Math.round(v).toLocaleString('ru-RU'), pct=v=>(v*100).toFixed(2).replace('.',',')+'%';
function el(id){return document.getElementById(id)}
function page(name){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='page-'+name));document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===name));el('pageTitle').textContent=({dashboard:'Обзор',farm:'Фарм',market:'Маркет',flips:'Перекуп',history:'История',settings:'Настройки'})[name];}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.go)));
function calc(){
 const c=state.calc, base=n(c.basePay);
 const bonuses=[];
 if(c.govActive)bonuses.push(n(c.govBonus)/100);
 if(c.carActive)bonuses.push(n(c.carBonus)/100);
 if(c.vikingActive)bonuses.push(n(c.vikingBonus)/100);
 if(c.guardActive)bonuses.push(n(c.guardBonus)/100);
 // The stacking mode is explicitly a user assumption; additive by default.
 const multiplier=c.stackAdditive?1+bonuses.reduce((a,b)=>a+b,0):bonuses.reduce((a,b)=>a*(1+b),1);
 const gross=base*multiplier;
 const rent=(c.vikingActive?n(c.vikingCost):0)+(c.guardActive?n(c.guardCost):0);
 const net=gross-rent, shift=net*n(c.duration);
 return {gross,rent,net,shift,balance:state.balance+shift,left:Math.max(0,state.goal-state.balance-shift),multiplier};
}
function bindCalc(){
 const keys=['basePay','govBonus','carBonus','vikingBonus','vikingCost','guardBonus','guardCost','duration'];
 keys.forEach(k=>{el(k).value=state.calc[k];el(k).oninput=()=>{state.calc[k]=n(el(k).value);renderCalc()}})
 const checks=['govActive','vikingActive','guardActive','carActive','stackAdditive'];
 checks.forEach(k=>{el(k).checked=!!state.calc[k];el(k).onchange=()=>{state.calc[k]=el(k).checked;renderCalc()}})
 el('calculateBtn').onclick=renderCalc;
 el('resetCalc').onclick=()=>{state.calc=structuredClone(defaults.calc);bindCalc();renderCalc()};
}
function renderCalc(){
 const r=calc();
 el('netHour').textContent=fmt(r.net);el('grossHour').textContent=fmt(r.gross);el('rentHour').textContent=fmt(r.rent);el('netShift').textContent=fmt(r.shift);el('balanceAfter').textContent=fmt(r.balance);el('leftAfter').textContent=fmt(r.left);
}
function addSession(){
 const r=calc(), hours=n(state.calc.duration);
 const actual=prompt('Введи фактическую прибыль за всю смену (вирты), если отличается от расчёта:',String(Math.round(r.shift)));
 if(actual===null)return;
 const profit=n(actual);
 const entry={id:Date.now(),date:new Date().toISOString(),hours,profit,netHour:hours?profit/hours:0,details:'Инкассатор · расчёт скорректирован по факту'};
 state.sessions.unshift(entry);state.balance+=profit;save();
}
el('saveSession').onclick=addSession;
function addMarket(){
 const item=el('marketItem').value.trim();if(!item){alert('Укажи название предмета');return}
 state.market.unshift({id:Date.now(),date:new Date().toISOString(),item,sell:n(el('marketSell').value),buy:n(el('marketBuy').value),count:Math.max(1,n(el('marketCount').value)),seller:el('marketSeller').value.trim(),url:el('marketUrl').value.trim()});
 ['marketItem','marketSell','marketBuy','marketSeller','marketUrl'].forEach(k=>el(k).value='');el('marketCount').value=1;save();
}
el('addMarket').onclick=addMarket;
function dealPreview(){const buy=n(el('flipBuy').value),sell=n(el('flipSell').value),cost=n(el('flipCosts').value),p=sell-buy-cost;el('flipExpected').textContent=fmt(p);el('flipRoi').textContent=buy?((p/buy)*100).toFixed(2).replace('.',',')+'%':'0%'}
['flipBuy','flipSell','flipCosts'].forEach(k=>el(k).addEventListener('input',dealPreview));
el('addFlip').onclick=()=>{
 const item=el('flipItem').value.trim(),buy=n(el('flipBuy').value),sell=n(el('flipSell').value),cost=n(el('flipCosts').value);
 if(!item||buy<=0||sell<=0){alert('Заполни предмет и цены покупки/продажи');return}
 state.flips.unshift({id:Date.now(),date:new Date().toISOString(),item,buy,sell,cost,status:'В процессе',profit:sell-buy-cost});
 ['flipItem','flipBuy','flipSell'].forEach(k=>el(k).value='');el('flipCosts').value=0;dealPreview();save();
};
function closeFlip(id){const f=state.flips.find(x=>x.id===id);if(!f||f.status==='Продана')return;if(!confirm('Отметить сделку как проданную и начислить прибыль '+fmt(f.profit)+'?'))return;f.status='Продана';f.closedAt=new Date().toISOString();state.balance+=f.profit;save()}
function del(type,id){if(!confirm('Удалить запись?'))return;if(type==='session')state.sessions=state.sessions.filter(x=>x.id!==id);if(type==='flip')state.flips=state.flips.filter(x=>x.id!==id);if(type==='market')state.market=state.market.filter(x=>x.id!==id);save()}
function table(headers,rows){if(!rows.length)return '<div class="empty-state">Записей пока нет.</div>';return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`}
function renderTables(){
 el('sessionsTable').innerHTML=table(['Дата','Часы','Фактическая прибыль','Среднее/ч',''],state.sessions.map(s=>`<tr><td>${new Date(s.date).toLocaleString('ru-RU')}</td><td>${s.hours}</td><td class="positive">${fmt(s.profit)}</td><td>${fmt(s.netHour)}</td><td><button class="small-btn" onclick="del('session',${s.id})">Удалить</button></td></tr>`));
 el('recentSessions').innerHTML=state.sessions.length?table(['Дата','Часы','Прибыль'],state.sessions.slice(0,4).map(s=>`<tr><td>${new Date(s.date).toLocaleDateString('ru-RU')}</td><td>${s.hours}</td><td class="positive">${fmt(s.profit)}</td></tr>`)):'<div class="empty-state">Пока нет записанных смен. Добавь первую после фарма.</div>';
 el('marketCountLabel').textContent=state.market.length+' записей';
 el('marketTable').innerHTML=table(['Предмет','Продажа','Скупка','Кол-во','Лавка / ник','Дата'],state.market.map(m=>`<tr><td>${esc(m.item)}</td><td>${fmt(m.sell)}</td><td>${fmt(m.buy)}</td><td>${m.count}</td><td>${esc(m.seller||'—')} ${m.url?`<a href="${safeUrl(m.url)}" target="_blank" rel="noopener">↗</a>`:''}</td><td>${new Date(m.date).toLocaleDateString('ru-RU')} <button class="small-btn" onclick="del('market',${m.id})">×</button></td></tr>`));
 el('flipsTable').innerHTML=table(['Предмет','Покупка','Продажа','Расходы','Ожид. прибыль','Статус','Действия'],state.flips.map(f=>`<tr><td>${esc(f.item)}</td><td>${fmt(f.buy)}</td><td>${fmt(f.sell)}</td><td>${fmt(f.cost)}</td><td class="${f.profit>=0?'positive':'negative'}">${fmt(f.profit)}</td><td>${f.status}</td><td>${f.status!=='Продана'?`<button class="small-btn" onclick="closeFlip(${f.id})">Продано</button>`:''} <button class="small-btn" onclick="del('flip',${f.id})">×</button></td></tr>`));
 const hist=[...state.sessions.map(x=>({date:x.date,type:'Фарм',name:'Инкассатор',amount:x.profit})),...state.flips.filter(x=>x.status==='Продана').map(x=>({date:x.closedAt||x.date,type:'Перекуп',name:x.item,amount:x.profit}))].sort((a,b)=>new Date(b.date)-new Date(a.date));
 el('historyContent').innerHTML=table(['Дата','Тип','Операция','Прибыль'],hist.map(h=>`<tr><td>${new Date(h.date).toLocaleString('ru-RU')}</td><td>${h.type}</td><td>${esc(h.name)}</td><td class="${h.amount>=0?'positive':'negative'}">${fmt(h.amount)}</td></tr>`));
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeUrl(s){try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}}
function renderDashboard(){
 const p=Math.max(0,Math.min(100,state.balance/state.goal*100)),r=calc();
 el('balanceHero').innerHTML=fmt(state.balance)+' <small>вирт.</small>';el('goalLabel').textContent=fmt(state.goal);el('progressLabel').textContent=pct(p/100);el('progressBar').style.width=p+'%';el('remainingHero').textContent=fmt(Math.max(0,state.goal-state.balance));
 el('hourlyStat').textContent=fmt(r.net);el('farmProfitStat').textContent=fmt(state.sessions.reduce((a,x)=>a+x.profit,0));el('flipProfitStat').textContent=fmt(state.flips.filter(x=>x.status==='Продана').reduce((a,x)=>a+x.profit,0));
 el('goalPercentBig').textContent=pct(p/100);el('miniProgress').style.width=p+'%';el('startingBalance').textContent=fmt(323222784);el('targetBalance').textContent=fmt(state.goal);
}
function renderSettings(){el('settingBalance').value=state.balance;el('settingGoal').value=state.goal;el('settingServer').value=state.server}
el('saveSettings').onclick=()=>{state.balance=n(el('settingBalance').value);state.goal=n(el('settingGoal').value)||3360000000;state.server=el('settingServer').value||'Tucson';save();alert('Настройки сохранены')};
function renderAll(){renderDashboard();renderTables();renderCalc();renderSettings()}
el('exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='tucson-tycoon-backup.json';a.click();URL.revokeObjectURL(a.href)};
el('importDataBtn').onclick=()=>el('importFile').click();
el('importFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());state={...defaults,...d};save();alert('Резервная копия импортирована')}catch{alert('Не удалось прочитать JSON-файл')}};
bindCalc();dealPreview();renderAll();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
