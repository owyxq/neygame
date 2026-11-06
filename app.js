const tg = window.Telegram?.WebApp;
tg?.ready(); tg?.expand();
const API = (window.NEY_CONFIG?.API_URL || "").replace(/\/$/,"");
let tab = "home", me = null, rooms = [], currentRoom = null, socket = null;
const app = document.getElementById("app");
const games = [
 ["❌","Крестики-нолики","2 игрока","tic_tac_toe"],
 ["♟","Шахматы","2 игрока","chess"],
 ["⚫","Шашки","2 игрока","checkers"],
 ["🎲","Монополия","2–6 игроков","monopoly"],
 ["💣","Сапёр","1 игрок","minesweeper"],
 ["🚀","Rocket","Аркада","rocket"]
];
function auth(){return tg?.initData || ""}
async function api(path,opts={}) {
 const r=await fetch(API+path,{...opts,headers:{"Content-Type":"application/json","Authorization":"tma "+auth(),...(opts.headers||{})}});
 if(!r.ok) throw new Error((await r.json().catch(()=>({detail:"Request failed"}))).detail||"Request failed");
 return r.json();
}
function render(){
 document.querySelectorAll(".dock button").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
 if(tab==="home") home(); else if(tab==="games") gamesPage(); else if(tab==="live") livePage(); else if(tab==="profile") profilePage(); else friendsPage();
}
function home(){
 const u=tg?.initDataUnsafe?.user;
 app.innerHTML=`<div class="eyebrow">WELCOME BACK / PLAYER</div><div class="hello">Привет, ${esc(u?.first_name||"Игрок")}.</div><div class="sub">Твоя территория. Твои правила.</div>
 <section class="hero"><div class="eyebrow">NΞY NETWORK</div><div class="hero-title">Играй. Побеждай. Оставляй след.</div><p>Вход в закрытую игровую сеть начинается здесь.</p><button class="btn" onclick="tab='games';render()">Исследовать игры ↗</button></section>
 <div class="stats"><div class="stat"><strong>${me?.xp??0}</strong><span>XP</span></div><div class="stat"><strong>${me?.coins??100}</strong><span>NΞY COINS</span></div><div class="stat"><strong>${me?.wins??0}</strong><span>ПОБЕДЫ</span></div></div>
 <div class="section-head"><h3>В центре внимания</h3><span class="muted">GAMES</span></div><div class="grid">${games.slice(0,4).map(g=>gameCard(g)).join("")}</div>
 <div class="section-head"><h3>Текущие матчи</h3><span class="muted">LIVE</span></div><div id="home-live" class="empty">Загружаем матчи…</div>`;
 loadMe(); loadRooms("home-live");
}
function gameCard(g){return `<div class="game" onclick="launch('${g[3]}')"><div class="emoji">${g[0]}</div><strong>${g[1]}</strong><small>${g[2]}</small></div>`}
function gamesPage(){app.innerHTML=`<div class="eyebrow">ARCADE / 001</div><div class="hello">Выбери игру.</div><div class="sub">Каждый матч — новая история.</div><div class="grid" style="margin-top:20px">${games.map(gameCard).join("")}</div>`}
function livePage(){app.innerHTML=`<div class="eyebrow">SPECTATOR NETWORK</div><div class="hello">LIVE GAMES<span style="color:var(--red)">.</span></div><div class="sub">Смотри матчи. Не вмешивайся в игру.</div><div id="live-list" style="margin-top:18px" class="empty">Загружаем активные матчи…</div>`;loadRooms("live-list")}
function profilePage(){const u=tg?.initDataUnsafe?.user;app.innerHTML=`<div class="eyebrow">PLAYER IDENTITY</div><div class="row" style="margin:18px 0"><div class="avatar">${esc((u?.first_name||"N")[0])}</div><div><div class="hello" style="font-size:23px">${esc(u?.first_name||"Игрок")}</div><div class="sub">@${esc(u?.username||"telegram_user")}</div></div></div><div class="stats"><div class="stat"><strong>${me?.xp??0}</strong><span>ОПЫТ</span></div><div class="stat"><strong>${me?.coins??100}</strong><span>МОНЕТЫ</span></div><div class="stat"><strong>${me?.games_played??0}</strong><span>МАТЧИ</span></div></div><div class="section-head"><h3>Уровень 1</h3><span class="muted">0 / 500 XP</span></div><div class="progress"><i></i></div><div class="section-head"><h3>Достижения</h3><span class="muted">LOCKED</span></div><div class="empty">Твои первые достижения ещё впереди.</div>`}
function friendsPage(){app.innerHTML=`<div class="eyebrow">SOCIAL NETWORK</div><div class="hello">Твой круг.</div><div class="sub">Друзья и совместные матчи появятся здесь.</div><div class="empty" style="margin-top:20px">Социальный модуль готов к следующему этапу разработки.</div>`}
async function loadMe(){if(!auth())return;try{me=await api("/api/me");if(tab==="home"||tab==="profile")render()}catch(e){console.warn(e)}}
async function loadRooms(target){try{rooms=await api("/api/rooms");const el=document.getElementById(target);if(!el)return;if(!rooms.length){el.textContent="Пока нет активных публичных матчей.";return}el.className="";el.innerHTML=rooms.map(r=>`<div class="live-card"><div class="live-head"><b>❌ Крестики-нолики</b><span class="pill">● ${r.status.toUpperCase()}</span></div><p class="muted">${r.players.length} / 2 игроков · ${r.id}</p><button class="btn ghost" onclick="watch('${r.id}')">👁 Наблюдать</button></div>`).join("")}catch(e){const el=document.getElementById(target);if(el)el.textContent="Не удалось загрузить матчи: "+e.message}}
async function launch(game){if(game!=="tic_tac_toe"){alert("Эта игра появится в следующем игровом обновлении. Сейчас доступен рабочий движок крестиков-ноликов.");return}try{const r=await api("/api/rooms",{method:"POST",body:JSON.stringify({game})});openRoom(r.id)}catch(e){alert(e.message)}}
async function openRoom(id){currentRoom=id;const r=await api("/api/rooms/"+id).catch(()=>null);if(!r){watch(id);return}showBoard(r,true)}
async function watch(id){currentRoom=id;const r=await api("/api/rooms").then(a=>a.find(x=>x.id===id));if(r)showBoard(r,false);connectSocket(id)}
function showBoard(r,canPlay){const b=r.state.board||[];app.innerHTML=`<div class="eyebrow">${canPlay?"MATCH ROOM":"SPECTATOR MODE"}</div><div class="hello">TIC TAC TOE<span style="color:var(--red)">.</span></div><div class="sub">Комната ${esc(r.id)} · ${r.status}</div><div class="board">${b.map((v,i)=>`<button class="cell ${v.toLowerCase()}" ${!canPlay||v||r.status!=="active"?"disabled":""} onclick="move(${i})">${v}</button>`).join("")}</div><div class="tile"><b>${r.state.winner?"Победитель: "+r.state.winner:r.state.draw?"Ничья": "Ход: "+r.state.turn}</b><p class="muted">${canPlay?"Сделай ход на поле.":"Ты наблюдаешь за матчем. Ходы недоступны."}</p></div>${!canPlay && r.status==="waiting" ? `<button class="btn" style="margin-top:14px" onclick="joinCurrent()">➕ Присоединиться к матчу</button>` : ""}<button class="btn ghost" style="margin-top:14px" onclick="tab='live';render()">← К LIVE GAMES</button>`}
async function joinCurrent(){try{const r=await api(`/api/rooms/${currentRoom}/join`,{method:"POST"});showBoard(r,true);connectSocket(currentRoom)}catch(e){alert(e.message)}}
async function move(cell){try{const r=await api(`/api/rooms/${currentRoom}/move`,{method:"POST",body:JSON.stringify({cell})});showBoard(r,true)}catch(e){alert(e.message)}}
function connectSocket(id){if(socket)socket.close();const base=API.replace(/^http/,"ws");if(!base)return;socket=new WebSocket(base+"/ws/rooms/"+id);socket.onmessage=e=>{const d=JSON.parse(e.data);if(d.room&&currentRoom===id)showBoard(d.room,false)}}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
document.querySelectorAll(".dock button").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;render()}));
const requested=new URLSearchParams(location.search).get("room");
if(requested){tab="live";render();watch(requested)}else render();
