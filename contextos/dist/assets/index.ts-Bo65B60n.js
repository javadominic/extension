(function(){const _=`
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }

  .badge {
    position: fixed;
    z-index: 2147483647;
    cursor: grab;
    user-select: none;
    transition: opacity 0.2s, transform 0.15s;
  }
  .badge:active { cursor: grabbing; }
  .badge.dragging { transition: none; opacity: 0.85; }

  .badge-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 12px 6px 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: popIn 0.25s ease-out forwards;
    color: #F3EEE4;
    font-size: 12px;
    font-weight: 500;
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

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(8px); }
  }

  .panel {
    position: fixed;
    z-index: 2147483647;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    animation: slideIn 0.25s ease-out forwards;
    max-width: 320px;
    min-width: 260px;
    color: #F3EEE4;
    user-select: none;
  }
  .panel.dismiss { animation: slideOut 0.2s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #2C2820;
    background: #14120E;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }

  .brand {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 15px;
    font-weight: 400;
    color: #E5A53A;
    flex: 1;
  }
  .favicon { width: 15px; height: 15px; border-radius: 3px; }

  .close-btn {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    flex-shrink: 0;
  }
  .close-btn:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .panel-body { padding: 10px 12px; }

  .note-card {
    background: #211E18;
    border: 1px solid #2C2820;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .note-card-num { color: #E5A53A; font-size: 10px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 2px; flex-shrink: 0; }
  .note-card-text { font-size: 11px; line-height: 1.5; color: #B3AB9B; white-space: pre-wrap; word-break: break-word; }

  .panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid #2C2820;
    background: #14120E;
    gap: 8px;
  }
  .btn-edit {
    flex: 1;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    background: #E5A53A;
    color: #0F0E0C;
    transition: background 0.15s;
  }
  .btn-edit:hover { background: #D49429; }
  .btn-dismiss {
    background: none;
    border: none;
    color: #958D7D;
    font-size: 11px;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .btn-dismiss:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .note-input {
    width: 100%;
    height: 64px;
    background: #211E18;
    border: 1px solid #2C2820;
    color: #F3EEE4;
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    resize: none;
    margin-bottom: 8px;
    outline: none;
    transition: border-color 0.15s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .note-input:focus { border-color: #E5A53A; }

  .unsaved-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 8px;
    padding: 6px 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    animation: popIn 0.25s ease-out forwards;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .unsaved-pill:hover { border-color: #3D372E; background: #211E18; }
  .unsaved-pill-close {
    background: none;
    border: none;
    color: #958D7D;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
  }
  .unsaved-pill-close:hover { color: #F3EEE4; background: rgba(243,238,228,0.06); }

  .unsaved-panel {
    position: fixed;
    z-index: 2147483647;
    background: #181612;
    border: 1px solid #2C2820;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6);
    animation: slideIn 0.25s ease-out forwards;
    max-width: 300px;
    min-width: 240px;
    color: #F3EEE4;
  }
  .unsaved-panel-label { font-size: 11px; color: #958D7D; display: block; margin-bottom: 6px; }

`;function $(t,e=20){const n={"bottom-right":["auto",`${e}px`,`${e}px`,"auto"],"bottom-left":["auto","auto",`${e}px`,`${e}px`],"top-right":[`${e}px`,`${e}px`,"auto","auto"],"top-left":[`${e}px`,"auto","auto",`${e}px`]},[o,s,l,a]=n[t];return{top:o,right:s,bottom:l,left:a}}function I(t,e,n){const o=window.innerWidth,s=window.innerHeight,l=t+n.offsetWidth/2,a=e+n.offsetHeight/2,r=l>o/2,g=a>s/2;return g&&r?"bottom-right":g&&!r?"bottom-left":!g&&r?"top-right":"top-left"}function w(t,e){const n=$(e);t.style.top=n.top,t.style.right=n.right,t.style.bottom=n.bottom,t.style.left=n.left}async function S(t){const e=`ctx_corner_${t}`;return(await chrome.storage.local.get(e))[e]??"bottom-right"}async function L(t,e){await chrome.storage.local.set({[`ctx_corner_${t}`]:e})}function T(t,e,n){let o=!1,s=0,l=0;t.addEventListener("mousedown",a=>{if(a.target.tagName==="BUTTON"||a.target.tagName==="TEXTAREA"||a.target.tagName==="INPUT")return;o=!0,t.classList.add("dragging");const r=t.getBoundingClientRect();t.style.right="auto",t.style.bottom="auto",t.style.left=`${r.left}px`,t.style.top=`${r.top}px`,s=a.clientX-r.left,l=a.clientY-r.top,r.left,r.top,a.preventDefault()}),document.addEventListener("mousemove",a=>{o&&(t.style.left=`${a.clientX-s}px`,t.style.top=`${a.clientY-l}px`)}),document.addEventListener("mouseup",a=>{if(!o)return;o=!1,t.classList.remove("dragging");const r=I(a.clientX-s,a.clientY-l,t);w(t,r),L(e,r)})}function C(){var e;(e=document.querySelector("#contextos-toast-host"))==null||e.remove();const t=document.createElement("div");return t.id="contextos-toast-host",document.body.appendChild(t),t}function A(t){var b,v;const e=C(),n=e.attachShadow({mode:"open"}),o=document.createElement("style");o.textContent=_,n.appendChild(o);const s=location.hostname,a=(t==null?void 0:t.note)&&!t.note.startsWith("Interesting")&&!t.note.startsWith("Saved")?"Add another remark":t?"Add remark":"Save page",r=document.createElement("div");r.className="badge",r.innerHTML=`
    <div class="unsaved-pill" id="unsaved-pill-inner">
      <span class="badge-dot"></span>
      <span style="font-size:11px; font-weight:500; color:#F3EEE4;">${a}</span>
      <button class="unsaved-pill-close" id="unsaved-pill-close" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `,n.appendChild(r),S(s).then(c=>{w(r,c)}),T(r,s);let g=setTimeout(u,5e3);function u(){clearTimeout(g),e.remove()}(b=n.getElementById("unsaved-pill-close"))==null||b.addEventListener("click",c=>{c.stopPropagation(),u()}),(v=n.getElementById("unsaved-pill-inner"))==null||v.addEventListener("click",c=>{c.target.id!=="unsaved-pill-close"&&(clearTimeout(g),y(),e.remove())});function y(){var h,x;const c=C(),f=c.attachShadow({mode:"open"}),i=document.createElement("style");i.textContent=_,f.appendChild(i);const d=document.createElement("div");d.className="unsaved-panel badge",d.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:grab;">
        <span class="badge-dot"></span>
        <span class="brand" style="font-size:14px;">Contextos</span>
        <button class="close-btn" id="ep-close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <label class="unsaved-panel-label">Why are you saving this?</label>
      <textarea id="ep-note" class="note-input" placeholder="Add a personal note…"></textarea>
      <div style="display:flex;gap:8px;">
        <button class="btn-edit" id="ep-save" style="flex:1;">Save note</button>
      </div>
    `,f.appendChild(d),S(s).then(m=>w(d,m)),T(d,s);const p=f.getElementById("ep-note");p==null||p.focus(),(h=f.getElementById("ep-close"))==null||h.addEventListener("click",()=>c.remove()),(x=f.getElementById("ep-save"))==null||x.addEventListener("click",()=>{const m=(p==null?void 0:p.value.trim())??"",E=document.title,D=location.href,M=f.getElementById("ep-save");M.textContent="Saving…",M.style.opacity="0.7",t?chrome.runtime.sendMessage({type:"APPEND_NOTE",payload:{id:t.id,newNote:m,uid:t.uid}},()=>{d.innerHTML='<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Note saved</div>',setTimeout(()=>c.remove(),1500)}):chrome.runtime.sendMessage({type:"SAVE_NEW_PAGE_WITH_NOTE",payload:{title:E,url:D,note:m}},()=>{d.innerHTML='<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Page saved</div>',setTimeout(()=>c.remove(),1500)})})}}function k(t,e){var v,c,f;const n=C(),o=n.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=_,o.appendChild(s);const l=location.hostname,a=(()=>{try{return new URL(t.url).hostname}catch{return""}})(),r=t.note?t.note.split(/\n\n---\n/).map(i=>i.trim()).filter(Boolean):[],g=r.length>0?r.map((i,d)=>`
        <div class="note-card">
          <span class="note-card-num">#${d+1}</span>
          <span class="note-card-text">${i.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
        </div>
      `).join(""):'<p style="font-size:11px;color:#958D7D;padding:2px 0;">No note recorded.</p>',u=document.createElement("div");u.className="panel badge",u.innerHTML=`
    <div class="panel-header" id="panel-drag-handle">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${a}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">Contextos</span>
      <button class="close-btn" id="panel-close" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="panel-body">${g}</div>
    <div class="panel-footer">
      <button class="btn-edit" id="panel-edit">Edit note</button>
      <button class="btn-dismiss" id="panel-dismiss">Dismiss</button>
    </div>
  `,o.appendChild(u),S(l).then(i=>w(u,i)),T(u,l);let y;function b(){clearTimeout(y),u.classList.add("dismiss"),setTimeout(()=>{n.remove(),e==null||e()},350)}(v=o.getElementById("panel-close"))==null||v.addEventListener("click",b),(c=o.getElementById("panel-dismiss"))==null||c.addEventListener("click",b),(f=o.getElementById("panel-edit"))==null||f.addEventListener("click",()=>{chrome.storage.local.set({pending_edit:t.id},()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{})}),b()}),y=setTimeout(b,5e3)}function z(t,e){try{const n=new URL(t),o=new URL(e);return n.hostname===o.hostname&&n.pathname.replace(/\/$/,"")===o.pathname.replace(/\/$/,"")&&n.search===o.search}catch{return!1}}function N(){const t=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},e=>{if(chrome.runtime.lastError||!(e!=null&&e.success)||!Array.isArray(e.data))return;const o=e.data.find(s=>z(s.url,t));if(o){if(o.health!=="alive"&&chrome.runtime.sendMessage({type:"MARK_ALIVE",payload:{id:o.id}}),o.note&&!(o.note.startsWith("Interesting ")||o.note.startsWith("Saved for "))){k(o,()=>{A(o)});return}A(o)}else A()})}function O(){var c,f;const t=i=>{var d;for(const p of i){const h=document.querySelector(`meta[name="${p}"]`)||document.querySelector(`meta[property="${p}"]`),x=(d=h==null?void 0:h.getAttribute("content"))==null?void 0:d.trim();if(x)return x}};let n=(i=>{const d=document.querySelectorAll(`meta[name="${i}"], meta[property="${i}"]`);return Array.from(d).map(p=>{var h;return((h=p.getAttribute("content"))==null?void 0:h.trim())??""}).filter(Boolean)})("citation_author");if(n.length===0){const i=t(["author","dc.creator","DC.creator","article:author"]);i&&!i.startsWith("http")&&(n=i.split(/\s*,\s*(?=[A-Z])|\s*;\s*|\s+and\s+/i).map(d=>d.trim()).filter(Boolean))}if(n.length===0)try{const i=document.querySelectorAll('script[type="application/ld+json"]');for(const d of Array.from(i)){const p=JSON.parse(d.textContent||"{}"),h=Array.isArray(p)?p:[p];for(const x of h){const m=x==null?void 0:x.author;Array.isArray(m)?n.push(...m.map(E=>E==null?void 0:E.name).filter(Boolean)):typeof m=="string"?n.push(m):m!=null&&m.name&&n.push(m.name)}if(n.length>0)break}}catch{}const o=t(["citation_publication_date","citation_date","citation_online_date","article:published_time","dc.date","DC.date","pubdate"])||((f=(c=document.querySelector("time[datetime]"))==null?void 0:c.getAttribute("datetime"))==null?void 0:f.trim()),s=t(["citation_journal_title","citation_conference_title","citation_booktitle"]),l=t(["og:site_name","application-name"])||location.hostname.replace(/^www\./,"");let a=t(["citation_doi","dc.identifier","DC.identifier"]);if(a&&!/^10\.\d{4,9}\//.test(a)){const i=a.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);a=i?i[0]:void 0}if(!a){const i=location.href.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);i&&(a=i[0])}let r=t(["citation_arxiv_id"]);if(!r&&location.hostname.includes("arxiv.org")){const i=location.pathname.match(/\/(?:abs|pdf)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/);i&&(r=i[1])}const g=t(["citation_volume"]),u=t(["citation_issue"]),y=t(["citation_firstpage"]),b=t(["citation_lastpage"]),v=y&&b?`${y}-${b}`:y;return{authors:Array.from(new Set(n)).slice(0,12),publishedDate:o==null?void 0:o.slice(0,10),siteName:l,journal:s,doi:a,arxivId:r,volume:g,issue:u,pages:v}}chrome.runtime.onMessage.addListener((t,e,n)=>{var o,s,l,a;if(t.type==="SHOW_TOAST"&&t.payload)k(t.payload);else if(t.type==="EXTRACT_TEXT"){const r=(((o=document.body)==null?void 0:o.innerText)||((s=document.documentElement)==null?void 0:s.innerText)||"").substring(0,5e3),g=O(),u=((a=(l=window.getSelection())==null?void 0:l.toString())==null?void 0:a.trim().slice(0,600))||"";n({text:r,citationMeta:g,quote:u})}});N();
})()
