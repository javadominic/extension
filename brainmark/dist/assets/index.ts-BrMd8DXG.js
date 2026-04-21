(function(){function m(t){var i,d,c,l;(i=document.querySelector("#contextos-toast-host"))==null||i.remove();const e=document.createElement("div");e.id="contextos-toast-host",document.body.appendChild(e);const o=e.attachShadow({mode:"open"}),n=document.createElement("style");n.textContent=`
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: linear-gradient(135deg, #1a1a35 0%, #0f0f23 100%);
      border: 1px solid #2a2a4a;
      border-radius: 14px;
      padding: 14px 16px;
      max-width: 340px;
      min-width: 260px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2);
      animation: slideIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards;
      color: #e2e8f0;
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
      margin-bottom: 8px;
    }
    .favicon {
      width: 18px;
      height: 18px;
      border-radius: 4px;
    }
    .brand {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #818cf8;
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
      background: rgba(99,102,241,0.15);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 99px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
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
    .btn-primary {
      background: #6366f1;
      color: #fff;
    }
    .btn-primary:hover { background: #4f46e5; }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); }
  `;const a=document.createElement("div");a.className="toast";const p=(()=>{try{return new URL(t.url).hostname}catch{return""}})();a.innerHTML=`
    <div class="header">
      <img class="favicon" src="https://www.google.com/s2/favicons?domain=${p}&sz=32" alt="" onerror="this.style.display='none'"/>
      <span class="brand">🧠 Contextos</span>
      <button class="close-btn" id="bm-close">×</button>
    </div>
    <div class="note">
      <strong>You saved this because:</strong><br/>
      ${t.note||'<em style="color:#64748b">No note yet — click Edit to add one.</em>'}
    </div>
    ${t.tags.length?`<div class="tags">${t.tags.map(b=>`<span class="tag">#${b}</span>`).join("")}</div>`:""}
    <div class="actions">
      <button class="btn btn-primary" id="bm-edit">Edit note</button>
      <button class="btn btn-ghost" id="bm-dismiss">Dismiss</button>
    </div>
  `,o.appendChild(n),o.appendChild(a);let r;function s(){clearTimeout(r),a.classList.add("dismiss"),setTimeout(()=>e.remove(),350)}(d=o.getElementById("bm-close"))==null||d.addEventListener("click",s),(c=o.getElementById("bm-dismiss"))==null||c.addEventListener("click",s),(l=o.getElementById("bm-edit"))==null||l.addEventListener("click",()=>{chrome.runtime.sendMessage({type:"OPEN_POPUP"}).catch(()=>{}),s()}),r=setTimeout(s,5e3)}function g(t,e){try{const o=new URL(t),n=new URL(e);return o.hostname===n.hostname&&o.pathname.replace(/\/$/,"")===n.pathname.replace(/\/$/,"")}catch{return!1}}function f(){const t=location.href;chrome.runtime.sendMessage({type:"GET_BOOKMARKS"},e=>{if(chrome.runtime.lastError||!(e!=null&&e.success)||!Array.isArray(e.data))return;const n=e.data.find(a=>g(a.url,t));n&&m(n)})}chrome.runtime.onMessage.addListener(t=>{t.type==="SHOW_TOAST"&&t.payload&&m(t.payload)});f();
})()
