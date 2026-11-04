(function(){const _=`
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
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes collapse {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(4px); }
  }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 10px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: fadeUp 0.25s ease-out both;
    transition: border-color 0.15s, background-color 0.15s;
    font-size: 12px;
    font-weight: 500;
    color: #F3EEE4;
  }
  .badge-pill:hover { border-color: #3D372E; background: #211E18; }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #E5A53A;
    flex-shrink: 0;
  }

  .badge-count {
    background: rgba(229,165,58,0.15);
    color: #E5A53A;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    padding: 1px 5px;
    min-width: 16px;
    text-align: center;
  }

  .panel {
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    min-width: 280px;
    max-width: 320px;
    animation: fadeUp 0.25s ease-out forwards;
    overflow: hidden;
  }
  .panel.collapsing { animation: collapse 0.2s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #14120E;
    border-bottom: 1px solid #2C2820;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }
  .brand-text {
    font-size: 12px;
    font-weight: 600;
    color: #F3EEE4;
    flex: 1;
    letter-spacing: -0.01em;
  }
  .brand-sub {
    color: #958D7D;
    font-weight: 400;
    font-size: 11px;
  }
  .header-close {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s, background-color 0.15s;
  }
  .header-close:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .result-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    cursor: pointer;
    transition: background-color 0.12s;
    border-bottom: 1px solid #211E18;
    text-decoration: none;
  }
  .result-item:last-child { border-bottom: none; }
  .result-item:hover { background: rgba(243,238,228,0.04); }
  .result-item:focus { outline: 1px solid #E5A53A; outline-offset: -1px; }

  .result-favicon { width: 15px; height: 15px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }

  .result-body { flex: 1; min-width: 0; }
  .result-title { font-size: 12px; font-weight: 500; color: #F3EEE4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; margin-bottom: 2px; }
  .result-domain { font-size: 10px; color: #958D7D; margin-bottom: 3px; }
  .result-reason { font-size: 10px; color: #E5A53A; font-weight: 500; }
  .result-note { font-size: 10px; color: #B3AB9B; margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; }

  .ext-icon { color: #958D7D; flex-shrink: 0; margin-top: 3px; }

  .panel-footer {
    padding: 8px 12px;
    border-top: 1px solid #2C2820;
    display: flex;
    gap: 8px;
    align-items: center;
    background: #14120E;
  }
  .mute-btn {
    font-size: 10px;
    color: #958D7D;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 0;
    transition: color 0.12s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .mute-btn:hover { color: #F3EEE4; }
  .sep { color: #3D372E; font-size: 10px; }

  .privacy-note { font-size: 10px; color: #958D7D; margin-left: auto; }

`;let $="",m=null,u=null;function z(t){switch(t){case"top-left":return{top:"80px",left:"24px",right:"auto",bottom:"auto"};case"bottom-left":return{bottom:"24px",left:"24px",right:"auto",top:"auto"};case"bottom-right":return{bottom:"24px",right:"24px",left:"auto",top:"auto"};case"top-right":default:return{top:"80px",right:"24px",left:"auto",bottom:"auto"}}}function U(){const t=location.hostname.toLowerCase();return t.includes("google.")?"google":t.includes("bing.com")?"bing":t.includes("duckduckgo")?"duckduckgo":t.includes("brave.com")?"brave":t.includes("opera.com")?"opera":null}function Y(){try{const t=new URL(location.href);return t.searchParams.get("q")||t.searchParams.get("query")||null}catch{return null}}async function P(){return((await chrome.storage.sync.get("settings")).settings??{}).searchSuggest??{enabled:!0,engines:{google:!0,bing:!0,duckduckgo:!0,brave:!0,opera:!0},threshold:2.5,badgeStyle:"collapsed",mutedSearches:[],mutedSites:[]}}function c(){m==null||m.remove(),m=null}function F(t,a){var L,S,M,D;c();const n=document.createElement("div");n.id="contextos-search-host",n.style.cssText="position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; overflow: visible;",(document.fullscreenElement||document.body||document.documentElement).appendChild(n),m=n;const l=n.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=_,l.appendChild(r);const p=`ctx_search_corner_${location.hostname}`;async function g(){const s=(await chrome.storage.local.get(p))[p];return s==="top-left"||s==="bottom-left"||s==="bottom-right"||s==="top-right"?s:"top-right"}async function R(e){await chrome.storage.local.set({[p]:e})}const o=document.createElement("div");o.className="wrapper",l.appendChild(o),g().then(e=>{Object.assign(o.style,z(e),{position:"fixed"})});let y=!1;const d=document.createElement("div");d.className="badge-pill",d.setAttribute("role","button"),d.setAttribute("tabindex","0"),d.setAttribute("aria-label",`${t.length} related saved bookmark${t.length>1?"s":""}`),d.innerHTML=`<span class="badge-dot"></span><span>Related saves</span><span class="badge-count">${t.length}</span>`,o.appendChild(d);const i=document.createElement("div");i.className="panel",i.style.display="none",i.setAttribute("role","region"),i.setAttribute("aria-label","Related saved bookmarks");const T=`
    <div class="panel-header" id="ss-drag-handle" role="toolbar" aria-label="Contextos suggestions panel">
      <span class="badge-dot"></span>
      <span class="brand-text">Contextos <span class="brand-sub">· Related saves</span></span>
      <button class="header-close" id="ss-close" aria-label="Close panel">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `,B=t.map((e,s)=>{const b=(()=>{try{return new URL(e.bookmark.url).hostname}catch{return""}})(),w=`https://www.google.com/s2/favicons?domain=${b}&sz=32`,f=e.bookmark.note?`<div class="result-note">${e.bookmark.note.replace(/</g,"&lt;").replace(/>/g,"&gt;").substring(0,80)}…</div>`:"";return`
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
        <svg class="ext-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
        </svg>
      </a>
    `}).join(""),H=`
    <div class="panel-footer">
      <button class="mute-btn" id="ss-mute-search" title="Do not show for this search">Mute search</button>
      <span class="sep">·</span>
      <button class="mute-btn" id="ss-mute-site" title="Do not show on this site">Mute site</button>
      <span class="privacy-note">Local only</span>
    </div>
  `;i.innerHTML=T+`<div role="list">${B}</div>`+H,o.appendChild(i);function v(){y||(y=!0,d.style.display="none",i.style.display="block")}function k(){y=!1,i.classList.add("collapsing"),setTimeout(()=>{i.classList.remove("collapsing"),i.style.display="none",d.style.display="flex"},250)}(u==null?void 0:u.badgeStyle)==="auto-expand"&&v(),d.addEventListener("click",v),d.addEventListener("keydown",e=>{(e.key==="Enter"||e.key===" ")&&v()}),(L=l.getElementById("ss-close"))==null||L.addEventListener("click",()=>{k()}),(S=l.getElementById("ss-mute-search"))==null||S.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_QUERY",payload:{query:a}}),c()}),(M=l.getElementById("ss-mute-site"))==null||M.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_SITE",payload:{site:location.hostname}}),c()});let h=!1,E=0,C=0;(D=l.getElementById("ss-drag-handle"))==null||D.addEventListener("mousedown",e=>{h=!0,o.classList.add("dragging");const s=o.getBoundingClientRect();o.style.right="auto",o.style.bottom="auto",o.style.left=`${s.left}px`,o.style.top=`${s.top}px`,E=e.clientX-s.left,C=e.clientY-s.top,e.preventDefault()}),document.addEventListener("mousemove",e=>{h&&(o.style.left=`${e.clientX-E}px`,o.style.top=`${e.clientY-C}px`)}),document.addEventListener("mouseup",()=>{if(!h)return;h=!1,o.classList.remove("dragging");const e=o.getBoundingClientRect(),s=window.innerWidth/2,b=window.innerHeight/2,w=e.left+e.width/2>=s,f=e.top+e.height/2>=b,A=w?f?"bottom-right":"top-right":f?"bottom-left":"top-left";Object.assign(o.style,z(A)),R(A)}),i.addEventListener("keydown",e=>{e.key==="Escape"&&k()})}async function I(t){var p;if(t===$)return;if(t.length<3){c();return}const a=u;if(!(a!=null&&a.enabled)){c();return}const n=U();if(!n||((p=a.engines)==null?void 0:p[n])===!1){c();return}const l=t.toLowerCase().trim();if(a.mutedSearches.some(g=>g.toLowerCase()===l)){c();return}if(a.mutedSites.some(g=>g===location.hostname)){c();return}$=t;const r=await chrome.runtime.sendMessage({type:"FIND_RELATED",payload:{query:t}});if(!(r!=null&&r.success)||!Array.isArray(r.data)||r.data.length===0){c();return}F(r.data,t)}function x(){const t=Y();if(!t){c();return}I(t)}async function j(){if(u=await P(),chrome.storage.onChanged.addListener((n,l)=>{var r,p;l==="sync"&&((p=(r=n.settings)==null?void 0:r.newValue)!=null&&p.searchSuggest)&&(u=n.settings.newValue.searchSuggest)}),!u.enabled)return;x();const t=history.pushState.bind(history),a=history.replaceState.bind(history);history.pushState=(...n)=>{t(...n),setTimeout(x,100)},history.replaceState=(...n)=>{a(...n),setTimeout(x,100)},window.addEventListener("popstate",()=>setTimeout(x,100))}j();
})()
