(function(){let t=null,n=null,d=!1,l={x:0,y:0};const h=`
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }

  .panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 280px;
    background: linear-gradient(160deg, #1a1a35 0%, #0f0f23 100%);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 16px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
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
    background: rgba(99,102,241,0.1);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .panel-title {
    font-size: 13px;
    font-weight: 700;
    color: #a5b4fc;
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
    scrollbar-color: rgba(99,102,241,0.4) transparent;
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
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .save-btn:hover { background: #4f46e5; }
`;function g(i){var p,m,b;const a=document.createElement("div");a.id="brainmark-meet-panel-host",document.body.appendChild(a),n=a.attachShadow({mode:"open"});const s=document.createElement("style");s.textContent=h,t=document.createElement("div"),t.className="panel";const c=i.slice(0,8);t.innerHTML=`
    <div class="panel-header" id="bm-drag-handle">
      <span class="panel-title">🧠 BrainMark</span>
      <button class="icon-btn" id="bm-minimize" title="Minimize">—</button>
      <button class="icon-btn" id="bm-close-panel" title="Close">×</button>
    </div>
    <div class="panel-body" id="bm-panel-body">
      ${c.length?c.map(e=>{const o=(()=>{try{return new URL(e.url).hostname}catch{return""}})();return`
              <div class="bm-item" data-url="${e.url}">
                <img class="favicon" src="https://www.google.com/s2/favicons?domain=${o}&sz=32" alt="" onerror="this.style.display='none'"/>
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
  `,n.appendChild(s),n.appendChild(t);const x=n.getElementById("bm-panel-body");let r=!1;(p=n.getElementById("bm-minimize"))==null||p.addEventListener("click",()=>{r=!r,x.classList.toggle("minimized",r);const e=n.getElementById("bm-minimize");e.textContent=r?"▲":"—"}),(m=n.getElementById("bm-close-panel"))==null||m.addEventListener("click",()=>{a.remove()}),(b=n.getElementById("bm-quick-save"))==null||b.addEventListener("click",()=>{chrome.bookmarks.create({title:document.title,url:location.href},()=>{})}),n.querySelectorAll(".bm-item").forEach(e=>{e.addEventListener("click",()=>{const o=e.dataset.url;o&&window.open(o,"_blank")})}),n.getElementById("bm-drag-handle").addEventListener("mousedown",e=>{const o=e;d=!0;const u=t.getBoundingClientRect();l={x:o.clientX-u.left,y:o.clientY-u.top}}),document.addEventListener("mousemove",e=>{!d||!t||(t.style.left=`${e.clientX-l.x}px`,t.style.top=`${e.clientY-l.y}px`,t.style.right="auto",t.style.bottom="auto")}),document.addEventListener("mouseup",()=>{d=!1})}function f(){document.getElementById("brainmark-meet-panel-host")||chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},i=>{if(!(i!=null&&i.success)||!Array.isArray(i.data)){g([]);return}g(i.data)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();
})()
