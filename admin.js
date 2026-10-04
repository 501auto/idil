const state = {
  loggedIn: false,
  // 5. adım: gerçek GitHub yazma yetkisi burada tutulmaz.
  // 6. adımda kullanıcı tarafından güvenli biçimde sağlanan GitHub erişimi kullanılacak.
  data: null
};

const $ = id => document.getElementById(id);

function showPage(id, title){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(id).classList.remove("hidden");
  $("pageTitle").textContent=title;
  document.querySelectorAll(".menu").forEach(m=>m.classList.remove("active"));
  document.querySelector(`.menu[data-page="${id}"]`)?.classList.add("active");
}

document.querySelectorAll(".menu").forEach(btn=>{
  btn.addEventListener("click",()=>showPage(btn.dataset.page,btn.textContent.replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü]+/,"").trim()));
});

$("loginBtn").addEventListener("click",()=>{
  const u=$("username").value.trim(), p=$("password").value;
  // Geçici arayüz testi. Gerçek kimlik doğrulama 6. adımda GitHub erişim yöntemiyle kurulacak.
  if(u && p){
    state.loggedIn=true;
    $("login").classList.add("hidden");
    $("app").classList.remove("hidden");
    loadData();
  }else $("loginMessage").textContent="Kullanıcı adı ve şifre girin.";
});

$("logout").addEventListener("click",()=>{
  state.loggedIn=false;
  $("app").classList.add("hidden");
  $("login").classList.remove("hidden");
  $("password").value="";
});

async function loadData(){
  try{
    const res=await fetch("../data/site.json?"+Date.now());
    state.data=await res.json();
  }catch(e){
    state.data={company:{},rentalVehicles:[],saleVehicles:[],properties:[]};
  }
  $("rentalCount").textContent=state.data.rentalVehicles.length;
  $("saleCount").textContent=state.data.saleVehicles.length;
  $("propertyCount").textContent=state.data.properties.length;
  renderList("rentalList",state.data.rentalVehicles,"Henüz kiralık araç eklenmedi.");
  renderList("salesList",state.data.saleVehicles,"Henüz satılık araç eklenmedi.");
  renderList("propertyList",state.data.properties,"Henüz emlak ilanı eklenmedi.");
  fillBusiness();
}

function renderList(id,arr,msg){
  const box=$(id);
  box.innerHTML=arr.length?arr.map(x=>`<div class="empty"><b>${x.title||x.marka||"İlan"}</b></div>`).join(""):`<div class="empty">＋<br>${msg}</div>`;
}

function fillBusiness(){
  const c=state.data.company||{};
  $("companyName").value=c.name||"";
  $("companyPhone").value=c.phone||"";
  $("companyWhatsapp").value=c.whatsapp||"";
  $("companyAddress").value=c.address||"";
  $("lat").value=c.latitude||"";
  $("lng").value=c.longitude||"";
}
