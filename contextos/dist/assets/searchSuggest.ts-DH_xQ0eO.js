(function(){const Y=`
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  :host { font-family: 'DM Mono', system-ui, sans-serif; }

  .wrapper {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
    user-select: none;
  }
  .wrapper.dragging { pointer-events: all; }
  .wrapper * { pointer-events: all; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes collapse {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(6px) scale(0.96); }
  }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #161616;
    border: 1px solid rgba(232,160,52,0.4);
    border-radius: 99px;
    padding: 6px 12px 6px 8px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: fadeUp 0.4s 0.4s cubic-bezier(0.34,1.2,0.64,1) both;
    transition: border-color 0.15s, background 0.15s;
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .badge-pill:hover { border-color: rgba(232,160,52,0.7); background: #1a1a1a; }

  .badge-count {
    background: rgba(232,160,52,0.2);
    color: #e8a034;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    min-width: 18px;
    text-align: center;
  }

  .panel {
    background: #161616;
    border: 1px solid #2a2a2a;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,160,52,0.06);
    min-width: 280px;
    max-width: 320px;
    animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    overflow: hidden;
  }
  .panel.collapsing { animation: collapse 0.25s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px 9px;
    border-bottom: 1px solid #222;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .brand-text {
    font-size: 13px;
    font-weight: 700;
    color: #e8a034;
    flex: 1;
  }
  .header-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 17px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.15s;
  }
  .header-close:hover { color: #e2e8f0; }

  .result-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.12s;
    border-bottom: 1px solid #1e1e1e;
    text-decoration: none;
  }
  .result-item:last-child { border-bottom: none; }
  .result-item:hover { background: rgba(255,255,255,0.04); }
  .result-item:focus { outline: 2px solid rgba(232,160,52,0.5); outline-offset: -2px; }

  .result-favicon { width: 16px; height: 16px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }

  .result-body { flex: 1; min-width: 0; }
  .result-title { font-size: 12px; font-weight: 600; color: #e2e8f0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; margin-bottom: 2px; }
  .result-domain { font-size: 10px; color: #475569; margin-bottom: 3px; }
  .result-reason { font-size: 10px; color: #e8a034; font-weight: 500; }
  .result-note { font-size: 10px; color: #64748b; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .ext-icon { color: #475569; flex-shrink: 0; margin-top: 3px; }

  .panel-footer {
    padding: 8px 14px;
    border-top: 1px solid #1e1e1e;
    display: flex;
    gap: 6px;
    align-items: center;
    background: #111;
  }
  .mute-btn {
    font-size: 10px;
    color: #475569;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 0;
    transition: color 0.12s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .mute-btn:hover { color: #94a3b8; }
  .sep { color: #2a2a2a; font-size: 10px; }

  .privacy-note { font-size: 9px; color: #334155; margin-left: auto; }
`;let R="",m=null,u=null;function T(t){switch(t){case"top-left":return{top:"80px",left:"24px",right:"auto",bottom:"auto"};case"bottom-left":return{bottom:"24px",left:"24px",right:"auto",top:"auto"};case"bottom-right":return{bottom:"24px",right:"24px",left:"auto",top:"auto"};case"top-right":default:return{top:"80px",right:"24px",left:"auto",bottom:"auto"}}}function B(){const t=location.hostname.toLowerCase();return t.includes("google.")?"google":t.includes("bing.com")?"bing":t.includes("duckduckgo")?"duckduckgo":t.includes("brave.com")?"brave":t.includes("opera.com")?"opera":null}function D(){try{const t=new URL(location.href);return t.searchParams.get("q")||t.searchParams.get("query")||null}catch{return null}}async function P(){return((await chrome.storage.sync.get("settings")).settings??{}).searchSuggest??{enabled:!0,engines:{google:!0,bing:!0,duckduckgo:!0,brave:!0,opera:!0},threshold:2.5,badgeStyle:"collapsed",mutedSearches:[],mutedSites:[]}}function d(){m==null||m.remove(),m=null}function I(t,r){var S,C,M,$;d();const n=document.createElement("div");n.id="contextos-search-host",n.style.cssText="position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; overflow: visible;",(document.fullscreenElement||document.body||document.documentElement).appendChild(n),m=n;const l=n.attachShadow({mode:"open"}),a=document.createElement("style");a.textContent=Y,l.appendChild(a);const p=`ctx_search_corner_${location.hostname}`;async function g(){const s=(await chrome.storage.local.get(p))[p];return s==="top-left"||s==="bottom-left"||s==="bottom-right"||s==="top-right"?s:"top-right"}async function A(e){await chrome.storage.local.set({[p]:e})}const o=document.createElement("div");o.className="wrapper",l.appendChild(o),g().then(e=>{Object.assign(o.style,T(e),{position:"fixed"})});let y=!1;const c=document.createElement("div");c.className="badge-pill",c.setAttribute("role","button"),c.setAttribute("tabindex","0"),c.setAttribute("aria-label",`${t.length} related saved bookmark${t.length>1?"s":""}`),c.innerHTML=`<span>🧠</span><span>Related saves</span><span class="badge-count">${t.length}</span>`,o.appendChild(c);const i=document.createElement("div");i.className="panel",i.style.display="none",i.setAttribute("role","region"),i.setAttribute("aria-label","Related saved bookmarks");const H=`
    <div class="panel-header" id="ss-drag-handle" role="toolbar" aria-label="Contextos suggestions panel">
      <span>🧠</span>
      <span class="brand-text">Contextos · Related saves</span>
      <button class="header-close" id="ss-close" aria-label="Close panel">×</button>
    </div>
  `,_=t.map((e,s)=>{const b=(()=>{try{return new URL(e.bookmark.url).hostname}catch{return""}})(),w=`https://www.google.com/s2/favicons?domain=${b}&sz=32`,f=e.bookmark.note?`<div class="result-note">${e.bookmark.note.replace(/</g,"&lt;").replace(/>/g,"&gt;").substring(0,80)}…</div>`:"";return`
      <a class="result-item" href="${e.bookmark.url}" target="_blank" rel="noopener noreferrer"
         id="ss-result-${s}" tabindex="0"
         aria-label="${e.bookmark.title}">
        <img class="result-favicon" src="${w}" alt="" onerror="this.style.display='none'" />
        <div class="result-body">
          <div class="result-title">${e.bookmark.title.replace(/</g,"&lt;")}</div>
          <div class="result-domain">${b}</div>
          <div class="result-reason">${e.matchReason}</div>
          ${f}
        </div>
        <svg class="ext-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    `}).join(""),U=`
    <div class="panel-footer">
      <button class="mute-btn" id="ss-mute-search" title="Don't show for this search">Mute search</button>
      <span class="sep">·</span>
      <button class="mute-btn" id="ss-mute-site" title="Don't show on this site">Mute site</button>
      <span class="privacy-note">🔒 Local only</span>
    </div>
  `;i.innerHTML=H+`<div role="list">${_}</div>`+U,o.appendChild(i);function v(){y||(y=!0,c.style.display="none",i.style.display="block")}function k(){y=!1,i.classList.add("collapsing"),setTimeout(()=>{i.classList.remove("collapsing"),i.style.display="none",c.style.display="flex"},250)}(u==null?void 0:u.badgeStyle)==="auto-expand"&&v(),c.addEventListener("click",v),c.addEventListener("keydown",e=>{(e.key==="Enter"||e.key===" ")&&v()}),(S=l.getElementById("ss-close"))==null||S.addEventListener("click",()=>{k()}),(C=l.getElementById("ss-mute-search"))==null||C.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_QUERY",payload:{query:r}}),d()}),(M=l.getElementById("ss-mute-site"))==null||M.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_SITE",payload:{site:location.hostname}}),d()});let h=!1,E=0,L=0;($=l.getElementById("ss-drag-handle"))==null||$.addEventListener("mousedown",e=>{h=!0,o.classList.add("dragging");const s=o.getBoundingClientRect();o.style.right="auto",o.style.bottom="auto",o.style.left=`${s.left}px`,o.style.top=`${s.top}px`,E=e.clientX-s.left,L=e.clientY-s.top,e.preventDefault()}),document.addEventListener("mousemove",e=>{h&&(o.style.left=`${e.clientX-E}px`,o.style.top=`${e.clientY-L}px`)}),document.addEventListener("mouseup",()=>{if(!h)return;h=!1,o.classList.remove("dragging");const e=o.getBoundingClientRect(),s=window.innerWidth/2,b=window.innerHeight/2,w=e.left+e.width/2>=s,f=e.top+e.height/2>=b,z=w?f?"bottom-right":"top-right":f?"bottom-left":"top-left";Object.assign(o.style,T(z)),A(z)}),i.addEventListener("keydown",e=>{e.key==="Escape"&&k()})}async function j(t){var p;if(t===R)return;if(t.length<3){d();return}const r=u;if(!(r!=null&&r.enabled)){d();return}const n=B();if(!n||((p=r.engines)==null?void 0:p[n])===!1){d();return}const l=t.toLowerCase().trim();if(r.mutedSearches.some(g=>g.toLowerCase()===l)){d();return}if(r.mutedSites.some(g=>g===location.hostname)){d();return}R=t;const a=await chrome.runtime.sendMessage({type:"FIND_RELATED",payload:{query:t}});if(!(a!=null&&a.success)||!Array.isArray(a.data)||a.data.length===0){d();return}I(a.data,t)}function x(){const t=D();if(!t){d();return}j(t)}async function N(){if(u=await P(),chrome.storage.onChanged.addListener((n,l)=>{var a,p;l==="sync"&&((p=(a=n.settings)==null?void 0:a.newValue)!=null&&p.searchSuggest)&&(u=n.settings.newValue.searchSuggest)}),!u.enabled)return;x();const t=history.pushState.bind(history),r=history.replaceState.bind(history);history.pushState=(...n)=>{t(...n),setTimeout(x,100)},history.replaceState=(...n)=>{r(...n),setTimeout(x,100)},window.addEventListener("popstate",()=>setTimeout(x,100))}N();
})()
