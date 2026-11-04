(function(){let t=null,n=null,d=!1,c={x:0,y:0};const h=`
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }

  .panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 280px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    z-index: 2147483647;
    color: #F3EEE4;
    overflow: hidden;
    animation: fadeIn 0.25s ease-out forwards;
    cursor: default;
    user-select: none;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .panel-header {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    background: #14120E;
    border-bottom: 1px solid #2C2820;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .panel-title {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 16px;
    font-weight: 400;
    color: #E5A53A;
    flex: 1;
  }
  .icon-btn {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }
  .panel-body {
    max-height: 320px;
    overflow-y: auto;
    padding: 6px 0;
    scrollbar-width: thin;
    scrollbar-color: #2C2820 transparent;
  }
  .panel-body.minimized { display: none; }
  .bm-item {
    display: flex;
    align-items: start;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background-color 0.12s;
    border-radius: 0;
  }
  .bm-item:hover { background: rgba(243,238,228,0.04); }
  .favicon { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
  .bm-info { flex: 1; min-width: 0; }
  .bm-title {
    font-size: 12px;
    font-weight: 500;
    color: #F3EEE4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bm-note {
    font-size: 11px;
    color: #958D7D;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty-state {
    padding: 20px 12px;
    text-align: center;
    color: #958D7D;
    font-size: 11px;
  }
  .quick-save {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: #14120E;
    border-top: 1px solid #2C2820;
  }
  .save-btn {
    flex: 1;
    padding: 6px 10px;
    background: #E5A53A;
    color: #0F0E0C;
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
  }
  .save-btn:hover { background: #D49429; }
`;function g(o){var m,u,b;const r=document.createElement("div");r.id="contextos-meet-panel-host",document.body.appendChild(r),n=r.attachShadow({mode:"open"});const l=document.createElement("style");l.textContent=`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
    ${h}
  `,t=document.createElement("div"),t.className="panel";const a=o.slice(0,8);t.innerHTML=`
    <div class="panel-header" id="bm-drag-handle">
      <span class="panel-title">Contextos</span>
      <button class="icon-btn" id="bm-minimize" title="Minimize">−</button>
      <button class="icon-btn" id="bm-close-panel" title="Close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
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
      <button class="save-btn" id="bm-quick-save">Save this page</button>
    </div>
  `,n.appendChild(l),n.appendChild(t);const p=n.getElementById("bm-panel-body");let s=!1;(m=n.getElementById("bm-minimize"))==null||m.addEventListener("click",()=>{s=!s,p.classList.toggle("minimized",s);const e=n.getElementById("bm-minimize");e.textContent=s?"▲":"−"}),(u=n.getElementById("bm-close-panel"))==null||u.addEventListener("click",()=>{r.remove()}),(b=n.getElementById("bm-quick-save"))==null||b.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"ADD_BOOKMARK",payload:{title:document.title,url:location.href}})}),n.querySelectorAll(".bm-item").forEach(e=>{e.addEventListener("click",()=>{const i=e.dataset.url;i&&window.open(i,"_blank")})}),n.getElementById("bm-drag-handle").addEventListener("mousedown",e=>{const i=e;d=!0;const f=t.getBoundingClientRect();c={x:i.clientX-f.left,y:i.clientY-f.top}}),document.addEventListener("mousemove",e=>{!d||!t||(t.style.left=`${e.clientX-c.x}px`,t.style.top=`${e.clientY-c.y}px`,t.style.right="auto",t.style.bottom="auto")}),document.addEventListener("mouseup",()=>{d=!1})}function x(){document.getElementById("contextos-meet-panel-host")||chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},o=>{if(!(o!=null&&o.success)||!Array.isArray(o.data)){g([]);return}const l=o.data.filter(a=>a.note?!(a.note.startsWith("Interesting ")||a.note.startsWith("Saved for ")):!1);g(l)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x();
})()
