const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const ROLE="administrador";
const LABEL="Administrador";

function getSessionLocal(){
  try{
    var u=JSON.parse(localStorage.getItem("unidacUser")||"null");
    if(u&&u.role) u.role=String(u.role).trim().toLowerCase();
    return u;
  }catch(e){return null}
}

function requireSession(){
  var u = (typeof getSession === "function") ? getSession() : getSessionLocal();
  var role = u && u.role ? String(u.role).trim().toLowerCase() : "";
  if(!u || role !== ROLE){
    console.warn("[Unidac] Sessão inválida", u, "esperado:", ROLE);
    // NÃO apaga a sessão imediatamente se só estiver carregando — só redireciona
    if(typeof goToIndex === "function") goToIndex();
    else window.location.href = new URL("../../index.html", window.location.href).href;
    return null;
  }
  return u;
}

function showToast(m){
  let t=$("#toast");
  if(!t){
    t=document.createElement("div");
    t.id="toast";
    t.className="toast";
    document.body.appendChild(t);
  }
  t.textContent=m;
  t.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove("show"),2800);
}

function setup(){
  const u = requireSession();
  if(!u) return;

  $$(".user-name").forEach(e=>e.textContent=u.name||LABEL);
  $$(".user-role").forEach(e=>e.textContent=LABEL);
  $$(".avatar").forEach(e=>e.textContent=(LABEL||"U")[0]);

  const current=location.pathname.split("/").pop();
  $$(".nav a").forEach(a=>{
    if(a.getAttribute("href")===current) a.classList.add("active");
  });

  $$(".logout").forEach(b=>{
    b.type="button";
    b.onclick = (typeof doLogout === "function") ? doLogout : function(e){
      if(e){e.preventDefault();e.stopPropagation();}
      if(!confirm("Sair do sistema?\nSua sessão será encerrada neste dispositivo.")) return;
      localStorage.removeItem("unidacUser");
      window.location.href = new URL("../../index.html", window.location.href).href;
    };
  });

  $$("[data-toast]").forEach(b=>b.onclick=()=>showToast(b.dataset.toast));
  $$(".progress i[data-width]").forEach(el=>requestAnimationFrame(()=>el.style.width=el.dataset.width+"%"));
}

document.addEventListener("DOMContentLoaded", setup);
