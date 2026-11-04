(function(){const E=`
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

`;function L(e,t=20){const o={"bottom-right":["auto",`${t}px`,`${t}px`,"auto"],"bottom-left":["auto","auto",`${t}px`,`${t}px`],"top-right":[`${t}px`,`${t}px`,"auto","auto"],"top-left":[`${t}px`,"auto","auto",`${t}px`]},[n,r,i,s]=o[e];return{top:n,right:r,bottom:i,left:s}}function D(e,t,o){const n=window.innerWidth,r=window.innerHeight,i=e+o.offsetWidth/2,s=t+o.offsetHeight/2,a=i>n/2,u=s>r/2;return u&&a?"bottom-right":u&&!a?"bottom-left":!u&&a?"top-right":"top-left"}function y(e,t){const o=L(t);e.style.top=o.top,e.style.right=o.right,e.style.bottom=o.bottom,e.style.left=o.left}async function w(e){const t=`ctx_corner_${e}`;return(await chrome.storage.local.get(t))[t]??"bottom-right"}async function $(e,t){await chrome.storage.local.set({[`ctx_corner_${e}`]:t})}function T(e,t,o){let n=!1,r=0,i=0;e.addEventListener("mousedown",s=>{if(s.target.tagName==="BUTTON"||s.target.tagName==="TEXTAREA"||s.target.tagName==="INPUT")return;n=!0,e.classList.add("dragging");const a=e.getBoundingClientRect();e.style.right="auto",e.style.bottom="auto",e.style.left=`${a.left}px`,e.style.top=`${a.top}px`,r=s.clientX-a.left,i=s.clientY-a.top,a.left,a.top,s.preventDefault()}),document.addEventListener("mousemove",s=>{n&&(e.style.left=`${s.clientX-r}px`,e.style.top=`${s.clientY-i}px`)}),document.addEventListener("mouseup",s=>{if(!n)return;n=!1,e.classList.remove("dragging");const a=D(s.clientX-r,s.clientY-i,e);y(e,a),$(t,a)})}function A(){var t;(t=document.querySelector("#contextos-toast-host"))==null||t.remove();const e=document.createElement("div");return e.id="contextos-toast-host",document.body.appendChild(e),e}function v(e){var m,x;const t=A(),o=t.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=E,o.appendChild(n);const r=location.hostname,s=(e==null?void 0:e.note)&&!e.note.startsWith("Interesting")&&!e.note.startsWith("Saved")?"Add another remark":e?"Add remark":"Save page",a=document.createElement("div");a.className="badge",a.innerHTML=`
    <div class="unsaved-pill" id="unsaved-pill-inner">
      <span class="badge-dot"></span>
      <span style="font-size:11px; font-weight:500; color:#F3EEE4;">${s}</span>
      <button class="unsaved-pill-close" id="unsaved-pill-close" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `,o.appendChild(a),w(r).then(d=>{y(a,d)}),T(a,r);let u=setTimeout(l,5e3);function l(){clearTimeout(u),t.remove()}(m=o.getElementById("unsaved-pill-close"))==null||m.addEventListener("click",d=>{d.stopPropagation(),l()}),(x=o.getElementById("unsaved-pill-inner"))==null||x.addEventListener("click",d=>{d.target.id!=="unsaved-pill-close"&&(clearTimeout(u),h(),t.remove())});function h(){var S,C;const d=A(),c=d.attachShadow({mode:"open"}),g=document.createElement("style");g.textContent=E,c.appendChild(g);const p=document.createElement("div");p.className="unsaved-panel badge",p.innerHTML=`
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
    `,c.appendChild(p),w(r).then(f=>y(p,f)),T(p,r);const b=c.getElementById("ep-note");b==null||b.focus(),(S=c.getElementById("ep-close"))==null||S.addEventListener("click",()=>d.remove()),(C=c.getElementById("ep-save"))==null||C.addEventListener("click",()=>{const f=(b==null?void 0:b.value.trim())??"",_=document.title,I=location.href,M=c.getElementById("ep-save");M.textContent="Saving…",M.style.opacity="0.7",e?chrome.runtime.sendMessage({type:"APPEND_NOTE",payload:{id:e.id,newNote:f,uid:e.uid}},()=>{p.innerHTML='<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Note saved</div>',setTimeout(()=>d.remove(),1500)}):chrome.runtime.sendMessage({type:"SAVE_NEW_PAGE_WITH_NOTE",payload:{title:_,url:I,note:f}},()=>{p.innerHTML='<div style="text-align:center;color:#E5A53A;font-size:12px;font-weight:500;padding:12px;">Page saved</div>',setTimeout(()=>d.remove(),1500)})})}}function k(e,t){var x,d,c;const o=A(),n=o.attachShadow({mode:"open"}),r=document.createElement("style");r.textContent=E,n.appendChild(r);const i=location.hostname,s=(()=>{try{return new URL(e.url).hostname}catch{return""}})(),a=e.note?e.note.split(/\n\n---\n/).map(g=>g.trim()).filter(Boolean):[],u=a.length>0?a.map((g,p)=>`
        <div class="note-card">
          <span class="note-card-num">#${p+1}</span>
          <span class="note-card-text">${g.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
        </div>
      `).join(""):'<p style="font-size:11px;color:#958D7D;padding:2px 0;">No note recorded.</p>',l=document.createElement("div");l.className="panel badge",l.innerHTML=`
    <div class="panel-header" id="panel-drag-handle">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${s}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">Contextos</span>
      <button class="close-btn" id="panel-close" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="panel-body">${u}</div>
    <div class="panel-footer">
      <button class="btn-edit" id="panel-edit">Edit note</button>
      <button class="btn-dismiss" id="panel-dismiss">Dismiss</button>
    </div>
  `,n.appendChild(l),w(i).then(g=>y(l,g)),T(l,i);let h;function m(){clearTimeout(h),l.classList.add("dismiss"),setTimeout(()=>{o.remove(),t==null||t()},350)}(x=n.getElementById("panel-close"))==null||x.addEventListener("click",m),(d=n.getElementById("panel-dismiss"))==null||d.addEventListener("click",m),(c=n.getElementById("panel-edit"))==null||c.addEventListener("click",()=>{chrome.storage.local.set({pending_edit:e.id},()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{})}),m()}),h=setTimeout(m,5e3)}function z(e,t){try{const o=new URL(e),n=new URL(t);return o.hostname===n.hostname&&o.pathname.replace(/\/$/,"")===n.pathname.replace(/\/$/,"")&&o.search===n.search}catch{return!1}}function N(){const e=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},t=>{if(chrome.runtime.lastError||!(t!=null&&t.success)||!Array.isArray(t.data))return;const n=t.data.find(r=>z(r.url,e));if(n){if(n.health!=="alive"&&chrome.runtime.sendMessage({type:"MARK_ALIVE",payload:{id:n.id}}),n.note&&!(n.note.startsWith("Interesting ")||n.note.startsWith("Saved for "))){k(n,()=>{v(n)});return}v(n)}else v()})}chrome.runtime.onMessage.addListener((e,t,o)=>{var n,r;if(e.type==="SHOW_TOAST"&&e.payload)k(e.payload);else if(e.type==="EXTRACT_TEXT"){const i=(((n=document.body)==null?void 0:n.innerText)||((r=document.documentElement)==null?void 0:r.innerText)||"").substring(0,5e3);o({text:i})}});N();
})()
