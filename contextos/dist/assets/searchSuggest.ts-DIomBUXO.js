(function(){const U=`
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
  .result-chain { font-size: 9px; color: #e8a034; background: rgba(232, 160, 52, 0.12); border: 1px solid rgba(232, 160, 52, 0.25); border-radius: 4px; padding: 1px 5px; display: inline-block; margin-top: 2px; font-weight: 500; }
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
`;let z="",g=null,u=null;const Y={"www.google.com":e=>e.searchParams.get("q"),"google.com":e=>e.searchParams.get("q"),"www.bing.com":e=>e.searchParams.get("q"),"duckduckgo.com":e=>e.searchParams.get("q"),"search.brave.com":e=>e.searchParams.get("q"),"search.opera.com":e=>e.searchParams.get("q")};function R(e){switch(e){case"top-left":return{top:"80px",left:"24px",right:"auto",bottom:"auto"};case"bottom-left":return{bottom:"24px",left:"24px",right:"auto",top:"auto"};case"bottom-right":return{bottom:"24px",right:"24px",left:"auto",top:"auto"};case"top-right":default:return{top:"80px",right:"24px",left:"auto",bottom:"auto"}}}function B(){const e=location.hostname;return e==="www.google.com"||e==="google.com"?"google":e==="www.bing.com"?"bing":e==="duckduckgo.com"?"duckduckgo":e==="search.brave.com"?"brave":e==="search.opera.com"?"opera":null}function D(){const e=Y[location.hostname];return e?e(new URL(location.href)):null}async function I(){return((await chrome.storage.sync.get("settings")).settings??{}).searchSuggest??{enabled:!0,engines:{google:!0,bing:!0,duckduckgo:!0,brave:!0,opera:!0},threshold:2.5,badgeStyle:"collapsed",mutedSearches:[],mutedSites:[]}}function p(){g==null||g.remove(),g=null}function N(e,r){var S,C,$,M;p();const n=document.createElement("div");n.id="contextos-search-host",n.style.cssText="position: fixed; top: 0; right: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; overflow: visible;",(document.fullscreenElement||document.body||document.documentElement).appendChild(n),g=n;const l=n.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=U,l.appendChild(s);const c=`ctx_search_corner_${location.hostname}`;async function T(){const a=(await chrome.storage.local.get(c))[c];return a==="top-left"||a==="bottom-left"||a==="bottom-right"||a==="top-right"?a:"top-right"}async function A(t){await chrome.storage.local.set({[c]:t})}const o=document.createElement("div");o.className="wrapper",l.appendChild(o),T().then(t=>{Object.assign(o.style,R(t),{position:"fixed"})});let y=!1;const d=document.createElement("div");d.className="badge-pill",d.setAttribute("role","button"),d.setAttribute("tabindex","0"),d.setAttribute("aria-label",`${e.length} related saved bookmark${e.length>1?"s":""}`),d.innerHTML=`<span>🧠</span><span>Related saves</span><span class="badge-count">${e.length}</span>`,o.appendChild(d);const i=document.createElement("div");i.className="panel",i.style.display="none",i.setAttribute("role","region"),i.setAttribute("aria-label","Related saved bookmarks");const H=`
    <div class="panel-header" id="ss-drag-handle" role="toolbar" aria-label="Contextos suggestions panel">
      <span>🧠</span>
      <span class="brand-text">Contextos · Related saves</span>
      <button class="header-close" id="ss-close" aria-label="Close panel">×</button>
    </div>
  `,P=e.map((t,a)=>{const h=(()=>{try{return new URL(t.bookmark.url).hostname}catch{return""}})(),v=`https://www.google.com/s2/favicons?domain=${h}&sz=32`,b=t.bookmark.note?`<div class="result-note">${t.bookmark.note.replace(/</g,"&lt;").replace(/>/g,"&gt;").substring(0,80)}…</div>`:"",f=t.chainLength&&t.chainLength>1?`<div class="result-chain">🔗 part of a ${t.chainLength}-page chain</div>`:"";return`
      <a class="result-item" href="${t.bookmark.url}" target="_blank" rel="noopener noreferrer"
         id="ss-result-${a}" tabindex="0"
         aria-label="${t.bookmark.title}">
        <img class="result-favicon" src="${v}" alt="" onerror="this.style.display='none'" />
        <div class="result-body">
          <div class="result-title">${t.bookmark.title.replace(/</g,"&lt;")}</div>
          <div class="result-domain">${h}</div>
          <div class="result-reason">${t.matchReason}</div>
          ${f}
          ${b}
        </div>
        <svg class="ext-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>
    `}).join(""),_=`
    <div class="panel-footer">
      <button class="mute-btn" id="ss-mute-search" title="Don't show for this search">Mute search</button>
      <span class="sep">·</span>
      <button class="mute-btn" id="ss-mute-site" title="Don't show on this site">Mute site</button>
      <span class="privacy-note">🔒 Local only</span>
    </div>
  `;i.innerHTML=H+`<div role="list">${P}</div>`+_,o.appendChild(i);function w(){y||(y=!0,d.style.display="none",i.style.display="block")}function k(){y=!1,i.classList.add("collapsing"),setTimeout(()=>{i.classList.remove("collapsing"),i.style.display="none",d.style.display="flex"},250)}(u==null?void 0:u.badgeStyle)==="auto-expand"&&w(),d.addEventListener("click",w),d.addEventListener("keydown",t=>{(t.key==="Enter"||t.key===" ")&&w()}),(S=l.getElementById("ss-close"))==null||S.addEventListener("click",()=>{k()}),(C=l.getElementById("ss-mute-search"))==null||C.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_QUERY",payload:{query:r}}),p()}),($=l.getElementById("ss-mute-site"))==null||$.addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"MUTE_SEARCH_SITE",payload:{site:location.hostname}}),p()});let m=!1,E=0,L=0;(M=l.getElementById("ss-drag-handle"))==null||M.addEventListener("mousedown",t=>{m=!0,o.classList.add("dragging");const a=o.getBoundingClientRect();o.style.right="auto",o.style.bottom="auto",o.style.left=`${a.left}px`,o.style.top=`${a.top}px`,E=t.clientX-a.left,L=t.clientY-a.top,t.preventDefault()}),document.addEventListener("mousemove",t=>{m&&(o.style.left=`${t.clientX-E}px`,o.style.top=`${t.clientY-L}px`)}),document.addEventListener("mouseup",()=>{if(!m)return;m=!1,o.classList.remove("dragging");const t=o.getBoundingClientRect(),a=window.innerWidth/2,h=window.innerHeight/2,v=t.left+t.width/2>=a,b=t.top+t.height/2>=h,f=v?b?"bottom-right":"top-right":b?"bottom-left":"top-left";Object.assign(o.style,R(f)),A(f)}),i.addEventListener("keydown",t=>{t.key==="Escape"&&k()})}async function j(e){if(e===z)return;if(e.length<3){p();return}const r=u;if(!(r!=null&&r.enabled)){p();return}const n=B();if(!n||!r.engines[n]){p();return}const l=e.toLowerCase().trim();if(r.mutedSearches.some(c=>c.toLowerCase()===l)){p();return}if(r.mutedSites.some(c=>c===location.hostname)){p();return}z=e;const s=await chrome.runtime.sendMessage({type:"FIND_RELATED",payload:{query:e}});if(!(s!=null&&s.success)||!Array.isArray(s.data)||s.data.length===0){p();return}N(s.data,e)}function x(){const e=D();if(!e){p();return}j(e)}async function Q(){if(u=await I(),chrome.storage.onChanged.addListener((n,l)=>{var s,c;l==="sync"&&((c=(s=n.settings)==null?void 0:s.newValue)!=null&&c.searchSuggest)&&(u=n.settings.newValue.searchSuggest)}),!u.enabled)return;x();const e=history.pushState.bind(history),r=history.replaceState.bind(history);history.pushState=(...n)=>{e(...n),setTimeout(x,100)},history.replaceState=(...n)=>{r(...n),setTimeout(x,100)},window.addEventListener("popstate",()=>setTimeout(x,100))}Q();
})()
