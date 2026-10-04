let TOKEN="", OWNER="501auto", REPO="idil", SHA=null, DATA=null;

const $=id=>document.getElementById(id);
const apiBase=()=>`https://api.github.com/repos/${OWNER}/${REPO}/contents`;

async function gh(path, options={}){
  const r=await fetch(`${apiBase()}/${path}`,{
    ...options,
    headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${TOKEN}`,
      "X-GitHub-Api-Version":"2022-11-28",
      ...(options.headers||{})
    }
  });
  if(!r.ok){let t=await r.text();throw new Error(`${r.status}: ${t}`)}
  return r.json();
}

function b64utf8(s){return btoa(unescape(encodeURIComponent(s)))}
function utf8b64(s){return decodeURIComponent(escape(atob(s.replace(/\n/g,""))))}
function b64file(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result.split(",")[1]);
    r.onerror=reject;r.readAsDataURL(file)
  })
}

$("connect").onclick=async()=>{
  TOKEN=$("ghToken").value.trim(); OWNER=$("ghUser").value.trim()||"501auto"; REPO=$("ghRepo").value.trim()||"idil";
  if(!TOKEN){alert("GitHub tokenını gir.");return}
  try{
    await gh("");
    const raw=await gh("data/site.json");
    SHA=raw.sha; DATA=JSON.parse(utf8b64(raw.content));
    $("setup").classList.add("hidden");$("panel").classList.remove("hidden");
    $("connection").textContent="● GITHUB BAĞLI";$("connection").className="online";
    renderAll();
  }catch(e){alert("GitHub bağlantısı kurulamadı.\n\n"+e.message)}
};

async function getLatestData(){
  const raw=await gh("data/site.json");
  SHA=raw.sha;DATA=JSON.parse(utf8b64(raw.content));return DATA;
}

async function putFile(path, content, message, sha=null){
  const body={message,content};
  if(sha)body.sha=sha;
  return gh(path,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
}

async function saveData(message="501 Otomotiv: içerik güncellendi"){
  const latest=await getLatestData();
  DATA=latest;
  // Local DATA changes are copied over the latest object before writing.
  // Caller modifies DATA after this function's getLatestData only when safe; use direct helper below.
}

async function writeData(message){
  const raw=await gh("data/site.json");
  const result=await putFile("data/site.json",b64utf8(JSON.stringify(DATA,null,2)),message,raw.sha);
  SHA=result.content.sha;renderAll();
}

function renderAll(){
  $("nRental").textContent=(DATA.rentalVehicles||[]).length;
  $("nSales").textContent=(DATA.saleVehicles||[]).length;
  $("nProperty").textContent=(DATA.properties||[]).length;
  renderList("rentalList","rentalVehicles","Kiralık araç");
  renderList("salesList","saleVehicles","Satılık araç");
  renderList("propertyList","properties","Emlak");
  fillBusiness();
}

function renderList(id,key,label){
  const a=DATA[key]||[], box=$(id);
  if(!a.length){box.innerHTML=`<div class="item"><span>${label} ilanı yok.</span></div>`;return}
  box.innerHTML=a.map(x=>`<div class="item">
    <div><strong>${esc(x.title||"İlan")}</strong><small>${esc(x.price||"Fiyat belirtilmedi")} ${x.image?" • 📷 Fotoğraf":" "}</small></div>
    <div class="actions"><button onclick="editItem('${key}','${x.id}')">Düzenle</button><button class="danger" onclick="deleteItem('${key}','${x.id}')">Sil</button></div>
  </div>`).join("");
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

function newItem(key){
  $("itemType").value=key;$("itemId").value="";
  ["fTitle","fPrice","fModel","fKm","fRooms","fLocation","fDesc"].forEach(x=>$(x).value="");
  $("fImage").value="";$("preview").classList.add("hidden");
  $("modalTitle").textContent=key==="properties"?"Yeni Emlak İlanı":"Yeni Araç";
  $("modal").classList.remove("hidden");
}
function editItem(key,id){
  const x=(DATA[key]||[]).find(a=>a.id===id);if(!x)return;
  $("itemType").value=key;$("itemId").value=id;
  $("fTitle").value=x.title||"";$("fPrice").value=x.price||"";$("fModel").value=x.model||"";
  $("fKm").value=x.km||"";$("fRooms").value=x.rooms||"";$("fLocation").value=x.location||"";$("fDesc").value=x.description||"";
  $("fImage").value="";$("preview").classList.toggle("hidden",!x.image);if(x.image)$("preview").src=x.image;
  $("modalTitle").textContent="İlanı Düzenle";$("modal").classList.remove("hidden");
}
function closeModal(){$("modal").classList.add("hidden")}

async function saveItem(){
  const key=$("itemType").value,id=$("itemId").value||crypto.randomUUID();
  const arr=DATA[key]||(DATA[key]=[]);
  let x=arr.find(a=>a.id===id);if(!x){x={id};arr.push(x)}
  x.title=$("fTitle").value.trim();x.price=$("fPrice").value.trim();x.model=$("fModel").value.trim();x.km=$("fKm").value.trim();x.rooms=$("fRooms").value.trim();x.location=$("fLocation").value.trim();x.description=$("fDesc").value.trim();
  const file=$("fImage").files[0];
  try{
    if(file){
      const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
      const path=`images/${key}/${id}.${ext}`;
      const content=await b64file(file);
      let oldSha=null;try{oldSha=(await gh(path)).sha}catch(_){}
      await putFile(path,content,`501: ${x.title||"ilan"} fotoğrafı`,oldSha);
      x.image=`${location.origin}${location.pathname.replace(/\/[^\/]*$/,"/")}${path}`;
    }
    await writeData(`501: ${x.title||"ilan"} kaydedildi`);
    closeModal();alert("İlan GitHub'a kaydedildi.");
  }catch(e){alert("Kaydedilemedi:\n\n"+e.message)}
}

async function deleteItem(key,id){
  if(!confirm("Bu ilanı silmek istediğine emin misin?"))return;
  DATA[key]=(DATA[key]||[]).filter(x=>x.id!==id);
  try{await writeData("501: ilan silindi");alert("İlan silindi.")}catch(e){alert("Silinemedi:\n\n"+e.message)}
}

function fillBusiness(){
  const c=DATA.company||{};
  $("bizName").value=c.name||"";$("bizOwner").value=c.owner||"";
  $("bizPhone").value=c.phone||"";$("bizWhatsapp").value=c.whatsapp||"";
  $("bizAddress").value=c.address||"";$("bizLat").value=c.latitude||"";$("bizLng").value=c.longitude||"";
}
async function saveBusiness(){
  DATA.company=DATA.company||{};
  DATA.company.name=$("bizName").value.trim();DATA.company.owner=$("bizOwner").value.trim();
  DATA.company.phone=$("bizPhone").value.trim();DATA.company.whatsapp=$("bizWhatsapp").value.trim();
  DATA.company.address=$("bizAddress").value.trim();DATA.company.latitude=Number($("bizLat").value);DATA.company.longitude=Number($("bizLng").value);
  try{await writeData("501: işletme bilgileri güncellendi");alert("İşletme bilgileri GitHub'a kaydedildi.")}catch(e){alert("Kaydedilemedi:\n\n"+e.message)}
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));$(b.dataset.tab).classList.remove("hidden");
});
