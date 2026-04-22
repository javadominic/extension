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
`;function x(){var o;(o=document.querySelector("#contextos-toast-host"))==null||o.remove();const t=document.createElement("div");return t.id="contextos-toast-host",document.body.appendChild(t),t}function g(t){const o=x(),s=o.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=f,s.appendChild(n);const e=document.createElement("div");e.className="toast small";const l=t?"＋ Add remark":"＋ Save page";e.innerHTML=`
    <div style="display: flex; align-items: center; width: 100%;">
      <span class="brand" style="font-size:15px; margin-right:4px; cursor:pointer;">🧠 Contextos</span>
      <span style="font-size:12px; font-weight:500; color:#cbd5e1; flex: 1; cursor:pointer;">${l}</span>
      <button class="close-btn" id="bm-widget-close" style="margin-left: 8px; font-size: 16px; z-index: 10;">×</button>
    </div>
  `,s.appendChild(e);let i;function a(){clearTimeout(i),e.classList.add("dismiss"),setTimeout(()=>o.remove(),350)}i=setTimeout(a,5e3),s.getElementById("bm-widget-close").addEventListener("click",r=>{r.stopPropagation(),a()}),e.addEventListener("click",r=>{if(r.target.id==="bm-widget-close")return;clearTimeout(i),e.className="toast expanded",e.innerHTML=`
      <div class="header" style="margin-bottom: 8px;">
        <span class="brand">🧠 Contextos</span>
        <button class="close-btn" id="bm-close">×</button>
      </div>
      <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:6px;">Why are you saving this?</label>
      <textarea id="bm-note-input" class="note-input" placeholder="Add a personal note..."></textarea>
      <div class="actions">
        <button class="btn btn-primary" id="bm-confirm-save">Save Note</button>
      </div>
    `;const c=s.getElementById("bm-close"),d=s.getElementById("bm-confirm-save"),u=s.getElementById("bm-note-input");u.focus(),c.addEventListener("click",m=>{m.stopPropagation(),a()}),d.addEventListener("click",m=>{m.stopPropagation();const b=u.value.trim(),y=document.title,v=location.href;d.textContent="Saving...",d.style.opacity="0.7",t?chrome.runtime.sendMessage({type:"SAVE_NOTE",payload:{id:t.id,note:b,tags:t.tags,uid:t.uid}},()=>{e.innerHTML='<div style="text-align:center; color:#e8a034; font-size:13px; font-weight:500; padding:10px 0;">✓ Note added successfully</div>',setTimeout(()=>{e.classList.add("dismiss"),setTimeout(()=>o.remove(),350)},1500)}):chrome.runtime.sendMessage({type:"SAVE_NEW_PAGE_WITH_NOTE",payload:{title:y,url:v,note:b}},()=>{e.innerHTML='<div style="text-align:center; color:#e8a034; font-size:13px; font-weight:500; padding:10px 0;">✓ Saved successfully</div>',setTimeout(()=>{e.classList.add("dismiss"),setTimeout(()=>o.remove(),350)},1500)})})})}function h(t){var p,r,c;const o=x(),s=o.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=f,s.appendChild(n);const e=document.createElement("div");e.className="toast expanded";const l=(()=>{try{return new URL(t.url).hostname}catch{return""}})();e.innerHTML=`
    <div class="header">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${l}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">🧠 Contextos</span>
      <button class="close-btn" id="bm-close">×</button>
    </div>
    <div class="note">
      <strong>You saved this because:</strong><br/>
      ${t.note||'<em style="color:#64748b">No note yet — click Edit to add one.</em>'}
    </div>
    ${t.tags&&t.tags.length?`<div class="tags">${t.tags.map(d=>`<span class="tag">#${d}</span>`).join("")}</div>`:""}
    <div class="actions">
      <button class="btn btn-primary" id="bm-edit">Edit note</button>
      <button class="btn btn-ghost" id="bm-dismiss">Dismiss</button>
    </div>
  `,s.appendChild(e);let i;function a(){clearTimeout(i),e.classList.add("dismiss"),setTimeout(()=>o.remove(),350)}(p=s.getElementById("bm-close"))==null||p.addEventListener("click",a),(r=s.getElementById("bm-dismiss"))==null||r.addEventListener("click",a),(c=s.getElementById("bm-edit"))==null||c.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{}),a()}),i=setTimeout(a,5e3)}function E(t,o){try{const s=new URL(t),n=new URL(o);return s.hostname===n.hostname&&s.pathname.replace(/\/$/,"")===n.pathname.replace(/\/$/,"")}catch{return!1}}function T(){const t=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},o=>{if(chrome.runtime.lastError||!(o!=null&&o.success)||!Array.isArray(o.data))return;const n=o.data.find(e=>E(e.url,t));if(n){if(n.note&&!(n.note.startsWith("Interesting ")||n.note.startsWith("Saved for "))){h(n);return}g(n)}else g()})}chrome.runtime.onMessage.addListener(t=>{t.type==="SHOW_TOAST"&&t.payload&&h(t.payload)});T();
})()
