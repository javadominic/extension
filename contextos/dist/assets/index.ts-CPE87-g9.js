(function(){const w=`
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
    gap: 6px;
    background: #161616;
    border: 1px solid rgba(232,160,52,0.35);
    border-radius: 99px;
    padding: 7px 12px 7px 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,160,52,0.08);
    animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    color: #e2e8f0;
    font-size: 13px;
    font-weight: 600;
  }
  .badge-pill:hover { border-color: rgba(232,160,52,0.6); }

  .badge-count {
    background: rgba(232,160,52,0.2);
    color: #e8a034;
    border-radius: 99px;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    min-width: 18px;
    text-align: center;
  }

  @keyframes popIn {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(16px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(16px); }
  }

  .panel {
    position: fixed;
    z-index: 2147483647;
    background: #161616;
    border: 1px solid #262626;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,160,52,0.08);
    animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    max-width: 320px;
    min-width: 260px;
    color: #e2e8f0;
    user-select: none;
  }
  .panel.dismiss { animation: slideOut 0.3s ease-in forwards; }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid #232323;
    cursor: grab;
  }
  .panel-header:active { cursor: grabbing; }

  .brand {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 15px;
    font-weight: 400;
    color: #e8a034;
    flex: 1;
  }
  .favicon { width: 16px; height: 16px; border-radius: 3px; }

  .close-btn {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .close-btn:hover { color: #e2e8f0; }

  .panel-body { padding: 10px 14px; }

  .note-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 8px 10px;
    margin-bottom: 6px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .note-card-num { color: #e8a034; font-size: 10px; font-weight: 700; margin-top: 2px; flex-shrink: 0; }
  .note-card-text { font-size: 12px; line-height: 1.5; color: #cbd5e1; white-space: pre-wrap; word-break: break-word; }

  .panel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 12px;
    border-top: 1px solid #1e1e1e;
    gap: 10px;
  }
  .btn-edit {
    flex: 1;
    padding: 7px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    background: #e8a034;
    color: #0c0c0c;
    transition: background 0.15s;
  }
  .btn-edit:hover { background: #d08c2a; }
  .btn-dismiss {
    background: none;
    border: none;
    color: #64748b;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.15s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .btn-dismiss:hover { color: #94a3b8; }

  .note-input {
    width: 100%;
    height: 64px;
    background: rgba(0,0,0,0.2);
    border: 1px solid #333;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    font-size: 12px;
    resize: none;
    margin-bottom: 10px;
    outline: none;
    transition: border-color 0.2s;
    font-family: 'DM Mono', system-ui, sans-serif;
  }
  .note-input:focus { border-color: #e8a034; }

  .unsaved-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #161616;
    border: 1px solid #262626;
    border-radius: 99px;
    padding: 6px 12px 6px 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .unsaved-pill:hover { border-color: rgba(232,160,52,0.4); background: #1a1a1a; }
  .unsaved-pill-close {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 0 0 0 4px;
    transition: color 0.15s;
  }
  .unsaved-pill-close:hover { color: #e2e8f0; }

  .unsaved-panel {
    position: fixed;
    z-index: 2147483647;
    background: #161616;
    border: 1px solid #262626;
    border-radius: 14px;
    padding: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    animation: slideIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards;
    max-width: 300px;
    min-width: 240px;
    color: #e2e8f0;
  }
  .unsaved-panel-label { font-size: 11px; color: #94a3b8; display: block; margin-bottom: 6px; }
`;function C(e,t=20){const o={"bottom-right":["auto",`${t}px`,`${t}px`,"auto"],"bottom-left":["auto","auto",`${t}px`,`${t}px`],"top-right":[`${t}px`,`${t}px`,"auto","auto"],"top-left":[`${t}px`,"auto","auto",`${t}px`]},[n,s,i,r]=o[e];return{top:n,right:s,bottom:i,left:r}}function $(e,t,o){const n=window.innerWidth,s=window.innerHeight,i=e+o.offsetWidth/2,r=t+o.offsetHeight/2,a=i>n/2,u=r>s/2;return u&&a?"bottom-right":u&&!a?"bottom-left":!u&&a?"top-right":"top-left"}function y(e,t){const o=C(t);e.style.top=o.top,e.style.right=o.right,e.style.bottom=o.bottom,e.style.left=o.left}async function E(e){const t=`ctx_corner_${e}`;return(await chrome.storage.local.get(t))[t]??"bottom-right"}async function N(e,t){await chrome.storage.local.set({[`ctx_corner_${e}`]:t})}function T(e,t,o){let n=!1,s=0,i=0;e.addEventListener("mousedown",r=>{if(r.target.tagName==="BUTTON"||r.target.tagName==="TEXTAREA"||r.target.tagName==="INPUT")return;n=!0,e.classList.add("dragging");const a=e.getBoundingClientRect();e.style.right="auto",e.style.bottom="auto",e.style.left=`${a.left}px`,e.style.top=`${a.top}px`,s=r.clientX-a.left,i=r.clientY-a.top,a.left,a.top,r.preventDefault()}),document.addEventListener("mousemove",r=>{n&&(e.style.left=`${r.clientX-s}px`,e.style.top=`${r.clientY-i}px`)}),document.addEventListener("mouseup",r=>{if(!n)return;n=!1,e.classList.remove("dragging");const a=$(r.clientX-s,r.clientY-i,e);y(e,a),N(t,a)})}function S(){var t;(t=document.querySelector("#contextos-toast-host"))==null||t.remove();const e=document.createElement("div");return e.id="contextos-toast-host",document.body.appendChild(e),e}function v(e){var g,x;const t=S(),o=t.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=w,o.appendChild(n);const s=location.hostname,r=(e==null?void 0:e.note)&&!e.note.startsWith("Interesting")&&!e.note.startsWith("Saved")?"＋ Add another remark":e?"＋ Add remark":"＋ Save page",a=document.createElement("div");a.className="badge",a.innerHTML=`
    <div class="unsaved-pill" id="unsaved-pill-inner">
      <span style="font-size:15px;">🧠</span>
      <span style="font-size:12px; font-weight:500; color:#cbd5e1;">${r}</span>
      <button class="unsaved-pill-close" id="unsaved-pill-close">×</button>
    </div>
  `,o.appendChild(a),E(s).then(d=>{y(a,d)}),T(a,s);let u=setTimeout(l,5e3);function l(){clearTimeout(u),t.remove()}(g=o.getElementById("unsaved-pill-close"))==null||g.addEventListener("click",d=>{d.stopPropagation(),l()}),(x=o.getElementById("unsaved-pill-inner"))==null||x.addEventListener("click",d=>{d.target.id!=="unsaved-pill-close"&&(clearTimeout(u),f(),t.remove())});function f(){var M,z;const d=S(),c=d.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=w,c.appendChild(m);const p=document.createElement("div");p.className="unsaved-panel badge",p.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:grab;">
        <span style="font-size:15px;">🧠</span>
        <span class="brand" style="font-size:14px;">Contextos</span>
        <button class="close-btn" id="ep-close">×</button>
      </div>
      <label class="unsaved-panel-label">Why are you saving this?</label>
      <textarea id="ep-note" class="note-input" placeholder="Add a personal note…"></textarea>
      <div style="display:flex;gap:8px;">
        <button class="btn-edit" id="ep-save" style="flex:1;">Save Note</button>
      </div>
    `,c.appendChild(p),E(s).then(h=>y(p,h)),T(p,s);const b=c.getElementById("ep-note");b==null||b.focus(),(M=c.getElementById("ep-close"))==null||M.addEventListener("click",()=>d.remove()),(z=c.getElementById("ep-save"))==null||z.addEventListener("click",()=>{const h=(b==null?void 0:b.value.trim())??"",L=document.title,A=location.href,_=c.getElementById("ep-save");_.textContent="Saving…",_.style.opacity="0.7",e?chrome.runtime.sendMessage({type:"APPEND_NOTE",payload:{id:e.id,newNote:h,uid:e.uid}},()=>{p.innerHTML='<div style="text-align:center;color:#e8a034;font-size:13px;font-weight:500;padding:12px;">✓ Note added!</div>',setTimeout(()=>d.remove(),1500)}):chrome.runtime.sendMessage({type:"SAVE_NEW_PAGE_WITH_NOTE",payload:{title:L,url:A,note:h}},()=>{p.innerHTML='<div style="text-align:center;color:#e8a034;font-size:13px;font-weight:500;padding:12px;">✓ Saved!</div>',setTimeout(()=>d.remove(),1500)})})}}function I(e,t){var x,d,c;const o=S(),n=o.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=w,n.appendChild(s);const i=location.hostname,r=(()=>{try{return new URL(e.url).hostname}catch{return""}})(),a=e.note?e.note.split(/\n\n---\n/).map(m=>m.trim()).filter(Boolean):[],u=a.length>0?a.map((m,p)=>`
        <div class="note-card">
          <span class="note-card-num">#${p+1}</span>
          <span class="note-card-text">${m.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
        </div>
      `).join(""):'<p style="font-size:12px;color:#64748b;font-style:italic;padding:2px 0;">No personal note — click Edit to add one.</p>',l=document.createElement("div");l.className="panel badge",l.innerHTML=`
    <div class="panel-header" id="panel-drag-handle">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${r}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">🧠 Contextos</span>
      <button class="close-btn" id="panel-close">×</button>
    </div>
    <div class="panel-body">${u}</div>
    <div class="panel-footer">
      <button class="btn-edit" id="panel-edit">Edit note</button>
      <button class="btn-dismiss" id="panel-dismiss">Dismiss</button>
    </div>
  `,n.appendChild(l),E(i).then(m=>y(l,m)),T(l,i);let f;function g(){clearTimeout(f),l.classList.add("dismiss"),setTimeout(()=>{o.remove(),t==null||t()},350)}(x=n.getElementById("panel-close"))==null||x.addEventListener("click",g),(d=n.getElementById("panel-dismiss"))==null||d.addEventListener("click",g),(c=n.getElementById("panel-edit"))==null||c.addEventListener("click",()=>{chrome.storage.local.set({pending_edit:e.id},()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{})}),g()}),f=setTimeout(g,5e3)}function O(e,t){try{const o=new URL(e),n=new URL(t);return o.hostname===n.hostname&&o.pathname.replace(/\/$/,"")===n.pathname.replace(/\/$/,"")&&o.search===n.search}catch{return!1}}function k(){const e=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},t=>{if(chrome.runtime.lastError||!(t!=null&&t.success)||!Array.isArray(t.data))return;const n=t.data.find(s=>O(s.url,e));if(n){if(n.health!=="alive"&&chrome.runtime.sendMessage({type:"MARK_ALIVE",payload:{id:n.id}}),n.note&&!(n.note.startsWith("Interesting ")||n.note.startsWith("Saved for "))){I(n,()=>{v(n)});return}v(n)}else v()})}chrome.runtime.onMessage.addListener((e,t,o)=>{var n,s;if(e.type==="SHOW_TOAST"&&e.payload)I(e.payload);else if(e.type==="EXTRACT_TEXT"){const i=(((n=document.body)==null?void 0:n.innerText)||((s=document.documentElement)==null?void 0:s.innerText)||"").substring(0,5e3);o({text:i})}});k();
})()
