(function(){const f=`
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'DM Mono', system-ui, sans-serif; }
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #161616;
    border: 1px solid #262626;
    border-radius: 14px;
    padding: 14px 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,160,52,0.1);
    animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
    color: #e2e8f0;
  }
  .toast.small {
    padding: 10px 14px;
    border-radius: 99px;
    cursor: pointer;
    transition: transform 0.15s, background 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toast.small:hover {
    transform: scale(1.02);
    background: #1a1a1a;
  }
  .toast.expanded {
    max-width: 340px;
    min-width: 280px;
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .toast.dismiss {
    animation: slideOut 0.3s ease-in forwards;
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to   { opacity: 0; transform: translateY(20px); }
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .favicon { width: 18px; height: 18px; border-radius: 4px; }
  .brand {
    font-family: 'Instrument Serif', serif;
    font-style: italic;
    font-size: 16px;
    font-weight: 400;
    color: #e8a034;
  }
  .close-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
    transition: color 0.15s;
  }
  .close-btn:hover { color: #e2e8f0; }
  .note {
    font-size: 13px;
    line-height: 1.5;
    color: #cbd5e1;
    margin-bottom: 10px;
  }
  .note strong { color: #fff; }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }
  .tag {
    background: rgba(232,160,52,0.1);
    color: #e8a034;
    border: 1px solid rgba(232,160,52,0.25);
    border-radius: 99px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 500;
  }
  .actions { display: flex; gap: 8px; }
  .btn {
    flex: 1;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
  }
  .btn-primary { background: #e8a034; color: #0c0c0c; }
  .btn-primary:hover { background: #d08c2a; }
  .btn-ghost { background: rgba(255,255,255,0.06); color: #94a3b8; }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); }
  
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
  .note-card-num {
    color: #e8a034;
    font-size: 10px;
    font-weight: 700;
    margin-top: 2px;
    flex-shrink: 0;
  }
  .note-card-text {
    font-size: 12px;
    line-height: 1.5;
    color: #cbd5e1;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .note-input {
    width: 100%;
    height: 60px;
    background: rgba(0,0,0,0.2);
    border: 1px solid #333;
    color: #e2e8f0;
    border-radius: 8px;
    padding: 8px;
    font-size: 12px;
    resize: none;
    margin-bottom: 12px;
    outline: none;
    transition: border-color 0.2s;
  }
  .note-input:focus { border-color: #e8a034; }
`;function h(){var o;(o=document.querySelector("#contextos-toast-host"))==null||o.remove();const t=document.createElement("div");return t.id="contextos-toast-host",document.body.appendChild(t),t}function x(t){const o=h(),s=o.attachShadow({mode:"open"}),e=document.createElement("style");e.textContent=f,s.appendChild(e);const n=document.createElement("div");n.className="toast small";const g=t&&t.note&&!t.note.startsWith("Interesting")&&!t.note.startsWith("Saved")?"＋ Add another remark":t?"＋ Add remark":"＋ Save page";n.innerHTML=`
    <div style="display: flex; align-items: center; width: 100%;">
      <span class="brand" style="font-size:15px; margin-right:4px; cursor:pointer;">🧠 Contextos</span>
      <span style="font-size:12px; font-weight:500; color:#cbd5e1; flex: 1; cursor:pointer;">${g}</span>
      <button class="close-btn" id="bm-widget-close" style="margin-left: 8px; font-size: 16px; z-index: 10;">×</button>
    </div>
  `,s.appendChild(n);let i;function l(){clearTimeout(i),n.classList.add("dismiss"),setTimeout(()=>o.remove(),350)}i=setTimeout(l,5e3),s.getElementById("bm-widget-close").addEventListener("click",r=>{r.stopPropagation(),l()}),n.addEventListener("click",r=>{if(r.target.id==="bm-widget-close")return;clearTimeout(i),n.className="toast expanded",n.innerHTML=`
      <div class="header" style="margin-bottom: 8px;">
        <span class="brand">🧠 Contextos</span>
        <button class="close-btn" id="bm-close">×</button>
      </div>
      <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Why are you saving this?</label>
      <textarea id="bm-note-input" class="note-input" placeholder="Add a personal note..."></textarea>
      <div class="actions">
        <button class="btn btn-primary" id="bm-confirm-save">Save Note</button>
      </div>
    `;const m=s.getElementById("bm-close"),c=s.getElementById("bm-confirm-save"),p=s.getElementById("bm-note-input");p.focus(),m.addEventListener("click",a=>{a.stopPropagation(),l()}),c.addEventListener("click",a=>{a.stopPropagation();const u=p.value.trim(),v=document.title,T=location.href;c.textContent="Saving...",c.style.opacity="0.7",t?chrome.runtime.sendMessage({type:"APPEND_NOTE",payload:{id:t.id,newNote:u,uid:t.uid}},()=>{n.innerHTML='<div style="text-align:center; color:#e8a034; font-size:13px; font-weight:500; padding:10px 0;">✓ Note added successfully</div>',setTimeout(()=>{n.classList.add("dismiss"),setTimeout(()=>o.remove(),350)},1500)}):chrome.runtime.sendMessage({type:"SAVE_NEW_PAGE_WITH_NOTE",payload:{title:v,url:T,note:u}},()=>{n.innerHTML='<div style="text-align:center; color:#e8a034; font-size:13px; font-weight:500; padding:10px 0;">✓ Saved successfully</div>',setTimeout(()=>{n.classList.add("dismiss"),setTimeout(()=>o.remove(),350)},1500)})})})}function y(t,o){var m,c,p;const s=h(),e=s.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=f,e.appendChild(n);const d=document.createElement("div");d.className="toast expanded";const g=(()=>{try{return new URL(t.url).hostname}catch{return""}})(),i=t.note?t.note.split(/\n\n---\n/).map(a=>a.trim()).filter(Boolean):[],l=i.length>0?`<div style="margin-bottom:10px">
        <div style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
          ${i.length} note${i.length>1?"s":""}
        </div>
        ${i.map((a,u)=>`
          <div class="note-card">
            <span class="note-card-num">#${u+1}</span>
            <span class="note-card-text">${a.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
          </div>
        `).join("")}
      </div>`:'<div class="note"><em style="color:#64748b">No note yet — click Edit to add one.</em></div>';d.innerHTML=`
    <div class="header">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${g}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">🧠 Contextos</span>
      <button class="close-btn" id="bm-close">×</button>
    </div>
    ${l}
    ${t.tags&&t.tags.length?`<div class="tags">${t.tags.map(a=>`<span class="tag">#${a}</span>`).join("")}</div>`:""}
    <div class="actions">
      <button class="btn btn-primary" id="bm-edit">Edit note</button>
      <button class="btn btn-ghost" id="bm-dismiss">Dismiss</button>
    </div>
  `,e.appendChild(d);let b;function r(){clearTimeout(b),d.classList.add("dismiss"),setTimeout(()=>{s.remove(),o&&o()},350)}(m=e.getElementById("bm-close"))==null||m.addEventListener("click",r),(c=e.getElementById("bm-dismiss"))==null||c.addEventListener("click",r),(p=e.getElementById("bm-edit"))==null||p.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{}),r()}),b=setTimeout(r,5e3)}function w(t,o){try{const s=new URL(t),e=new URL(o);return s.hostname===e.hostname&&s.pathname.replace(/\/$/,"")===e.pathname.replace(/\/$/,"")}catch{return!1}}function E(){const t=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},o=>{if(chrome.runtime.lastError||!(o!=null&&o.success)||!Array.isArray(o.data))return;const e=o.data.find(n=>w(n.url,t));if(e){if(e.note&&!(e.note.startsWith("Interesting ")||e.note.startsWith("Saved for "))){y(e,()=>{x(e)});return}x(e)}else x()})}chrome.runtime.onMessage.addListener((t,o,s)=>{var e,n;if(t.type==="SHOW_TOAST"&&t.payload)y(t.payload);else if(t.type==="EXTRACT_TEXT"){const d=(((e=document.body)==null?void 0:e.innerText)||((n=document.documentElement)==null?void 0:n.innerText)||"").substring(0,5e3);s({text:d})}});E();
})()
