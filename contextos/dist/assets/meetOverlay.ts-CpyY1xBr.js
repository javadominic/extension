(function(){let t=null,n=null,d=!1,c={x:0,y:0};const h=`
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }

  .panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 280px;
    background: #161616;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,160,52,0.1);
    z-index: 2147483647;
    color: #e2e8f0;
    overflow: hidden;
    animation: fadeIn 0.4s ease forwards;
    cursor: default;
    user-select: none;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 18px;
    font-weight: 400;
    color: #e8a034;
    flex: 1;
  }
  .icon-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 16px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .icon-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }
  .panel-body {
    max-height: 320px;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(232,160,52,0.3) transparent;
  }
  .panel-body.minimized { display: none; }
  .bm-item {
    display: flex;
    align-items: start;
    gap: 10px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s;
    border-radius: 0;
  }
  .bm-item:hover { background: rgba(255,255,255,0.04); }
  .favicon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .bm-info { flex: 1; min-width: 0; }
  .bm-title {
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-note {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-state {
    padding: 24px 14px;
    text-align: center;
    color: #475569;
    font-size: 12px;
  }
  .quick-save {
    display: flex;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .save-btn {
    flex: 1;
    padding: 7px;
    background: #e8a034;
    color: #0c0c0c;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .save-btn:hover { background: #d08c2a; }
`;function g(o){var m,b,u;const r=document.createElement("div");r.id="contextos-meet-panel-host",document.body.appendChild(r),n=r.attachShadow({mode:"open"});const s=document.createElement("style");s.textContent=`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
    ${h}
  `,t=document.createElement("div"),t.className="panel";const a=o.slice(0,8);t.innerHTML=`
    <div class="panel-header" id="bm-drag-handle">
      <span class="panel-title">🧠 Contextos</span>
      <button class="icon-btn" id="bm-minimize" title="Minimize">−</button>
      <button class="icon-btn" id="bm-close-panel" title="Close">×</button>
    </div>
    <div class="panel-body" id="bm-panel-body">
      ${a.length?a.map(e=>{const i=(()=>{try{return new URL(e.url).hostname}catch{return""}})();return`
              <div class="bm-item" data-url="${e.url}">
                <img class="favicon" src="https://www.google.com/s2/favicons?domain=${i}&sz=32" alt="" onerror="this.style.display='none'"/>
                <div class="bm-info">
                  <div class="bm-title">${e.title}</div>
                  <div class="bm-note">${e.note||"No note"}</div>
                </div>
              </div>
            `}).join(""):'<div class="empty-state">No relevant bookmarks found for this meeting.</div>'}
    </div>
    <div class="quick-save">
      <button class="save-btn" id="bm-quick-save">＋ Save this page</button>
    </div>
  `,n.appendChild(s),n.appendChild(t);const p=n.getElementById("bm-panel-body");let l=!1;(m=n.getElementById("bm-minimize"))==null||m.addEventListener("click",()=>{l=!l,p.classList.toggle("minimized",l);const e=n.getElementById("bm-minimize");e.textContent=l?"▲":"−"}),(b=n.getElementById("bm-close-panel"))==null||b.addEventListener("click",()=>{r.remove()}),(u=n.getElementById("bm-quick-save"))==null||u.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"ADD_BOOKMARK",payload:{title:document.title,url:location.href}})}),n.querySelectorAll(".bm-item").forEach(e=>{e.addEventListener("click",()=>{const i=e.dataset.url;i&&window.open(i,"_blank")})}),n.getElementById("bm-drag-handle").addEventListener("mousedown",e=>{const i=e;d=!0;const f=t.getBoundingClientRect();c={x:i.clientX-f.left,y:i.clientY-f.top}}),document.addEventListener("mousemove",e=>{!d||!t||(t.style.left=`${e.clientX-c.x}px`,t.style.top=`${e.clientY-c.y}px`,t.style.right="auto",t.style.bottom="auto")}),document.addEventListener("mouseup",()=>{d=!1})}function x(){document.getElementById("contextos-meet-panel-host")||chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},o=>{if(!(o!=null&&o.success)||!Array.isArray(o.data)){g([]);return}const s=o.data.filter(a=>a.note?!(a.note.startsWith("Interesting ")||a.note.startsWith("Saved for ")):!1);g(s)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x();
})()
