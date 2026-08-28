// STEP 1: Render.com la backend deploy panna aprom, antha URL ah inga maathu
   const BACKEND_URL = "https://code-dr.onrender.com/generate";
// Local test ku: "http://localhost:10000/generate"

let lastCode = "";

function switchTab(t){
  document.getElementById("preview").classList.add("hidden");
  document.getElementById("codeView").classList.add("hidden");
  document.getElementById("tab-preview").classList.remove("active");
  document.getElementById("tab-code").classList.remove("active");
  if(t==='preview'){
    document.getElementById("preview").classList.remove("hidden");
    document.getElementById("tab-preview").classList.add("active");
  } else {
    document.getElementById("codeView").classList.remove("hidden");
    document.getElementById("tab-code").classList.add("active");
  }
}

async function generate(){
  const prompt = document.getElementById("prompt").value;
  const style = document.getElementById("style").value;
  if(!prompt){ alert("Enna website venum nu sollunga da!"); return; }

  const btn = document.getElementById("genBtn");
  btn.innerHTML = "⏳ AI Yosikuthu...";
  btn.disabled = true;
  document.getElementById("empty").innerText = "Generating ultra website... 30 sec aagum";

  try{
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({prompt, style})
    });
    const data = await res.json();
    lastCode = data.code;

    document.getElementById("codeView").innerHTML = "<code>" + escapeHtml(lastCode) + "</code>";
    document.getElementById("preview").srcdoc = lastCode;
    
    document.getElementById("empty").classList.add("hidden");
    switchTab('preview');

    // Download setup
    const blob = new Blob([lastCode], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const dl = document.getElementById("downloadBtn");
    dl.href = url; dl.download = "index.html"; dl.classList.remove("hidden");

  }catch(e){
    alert("Backend connect aagala! BACKEND_URL ah sariya maathiya? Error: "+e);
  }
  btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Generate LIVE Website';
  btn.disabled = false;
}

function escapeHtml(str){ return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
