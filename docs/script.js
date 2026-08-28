const BACKEND_URL = "https://code-dr.onrender.com/generate";
const $ = (id) => document.getElementById(id);
let lastCode = "";
let downloadUrl = "";
let generating = false;
let uploadedImageBase64 = null;

$("tab-preview").addEventListener("click", () => switchTab("preview"));
$("tab-code").addEventListener("click", () => switchTab("code"));
$("genBtn").addEventListener("click", generate);

// Image Upload Handling
$("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (uploadEvent) => {
    uploadedImageBase64 = uploadEvent.target.result;
    $("imagePreview").src = uploadedImageBase64;
    $("imagePreviewContainer").classList.remove("hidden");
    setStatus("Image attached successfully.");
  };
  reader.readAsDataURL(file);
});

$("removeImage").addEventListener("click", () => {
  uploadedImageBase64 = null;
  $("imageInput").value = "";
  $("imagePreviewContainer").classList.add("hidden");
  setStatus("Image removed.");
});

$("clearPrompt").addEventListener("click", () => {
  $("prompt").value = "";
  updateCharCount();
  setStatus("Prompt cleared.");
  $("prompt").focus();
});

document.querySelectorAll(".quick-prompt").forEach((button) => {
  button.addEventListener("click", () => {
    $("prompt").value = button.dataset.prompt || "";
    updateCharCount();
    setStatus("Quick Message selected. Generate or upload an image.");
    $("prompt").focus();
  });
});

$("prompt").addEventListener("input", updateCharCount);

$("codeView").addEventListener("input", (e) => {
  lastCode = e.target.value;
  $("preview").srcdoc = lastCode;
  updateDownloadLink();
});

document.querySelectorAll(".view-mode").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-mode").forEach(b => {
      b.classList.remove("bg-white/20", "text-white");
      b.classList.add("text-gray-400");
    });
    btn.classList.add("bg-white/20", "text-white");
    btn.classList.remove("text-gray-400");

    const mode = btn.dataset.mode;
    const container = $("previewContainer");
    container.className = "transition-all duration-300 h-full flex justify-center";
    if (mode === "mobile") {
      container.style.width = "375px";
    } else if (mode === "tablet") {
      container.style.width = "768px";
    } else {
      container.style.width = "100%";
    }
  });
});

function switchTab(tab) {
  $("preview").classList.toggle("hidden", tab !== "preview");
  $("codeView").classList.toggle("hidden", tab !== "code");
  $("viewportSwitcher").classList.toggle("hidden", tab !== "preview");
  $("tab-preview").classList.toggle("bg-white/10", tab === "preview");
  $("tab-code").classList.toggle("bg-white/10", tab === "code");
}

function showTopCenterError(message) {
  let banner = document.getElementById("topCenterError");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "topCenterError";
    banner.className = "fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl font-medium text-sm flex items-center space-x-2 border border-red-400";
    document.body.appendChild(banner);
  }
  banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>${message}</span>`;
  banner.classList.remove("hidden");
  setTimeout(() => { banner.classList.add("hidden"); }, 6000);
}

function setStatus(message, show = true) {
  if (message.startsWith("Error:") || message.includes("failed") || message.includes("limit")) {
    showTopCenterError(message.replace("Error: ", ""));
  }
  $("status").textContent = message;
  $("status").classList.toggle("hidden", !show);
}

function updateCharCount() {
  const n = $("prompt").value.length;
  $("charCount").textContent = `${n} / 2500`;
}

let generationHistory = JSON.parse(localStorage.getItem("codeDrHistory") || "[]");

function renderHistory() {
  const container = $("historyList");
  if (!container) return;
  if (generationHistory.length === 0) {
    container.innerHTML = '<span class="text-[11px] text-gray-600 italic">No history yet...</span>';
    return;
  }
  container.innerHTML = generationHistory.map((item, index) => `
    <div class="history-item flex items-center justify-between bg-[#1a1a1a] hover:bg-[#222] p-2 rounded-lg cursor-pointer border border-white/5 transition" data-index="${index}">
      <span class="truncate text-gray-300 pr-2">${escapeHtml(item.prompt || "Image design")}</span>
      <span class="text-[10px] text-gray-500 whitespace-nowrap">${item.style}</span>
    </div>
  `).join("");

  container.querySelectorAll(".history-item").forEach(el => {
    el.addEventListener("click", () => {
      const idx = el.dataset.index;
      const entry = generationHistory[idx];
      if (entry) {
        lastCode = entry.code;
        $("codeView").value = lastCode;
        $("preview").srcdoc = lastCode;
        $("empty").classList.add("hidden");
        switchTab("preview");
        updateDownloadLink();
        setStatus("Loaded from history ✓");
      }
    });
  });
}

function updateDownloadLink() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = URL.createObjectURL(new Blob([lastCode], {type:"text/html;charset=utf-8"}));
  const dl = $("downloadBtn");
  dl.href = downloadUrl;
  dl.download = "index.html";
  dl.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  updateCharCount();
  renderHistory();
  const clearHistBtn = $("clearHistory");
  if (clearHistBtn) {
    clearHistBtn.addEventListener("click", () => {
      generationHistory = [];
      localStorage.removeItem("codeDrHistory");
      renderHistory();
      setStatus("History cleared.");
    });
  }
});

async function generate() {
  if (generating) return;
  const prompt = $("prompt").value.trim();
  const style = $("style").value;

  if (!prompt && !uploadedImageBase64) {
    setStatus("First type a request or upload a layout image.");
    $("prompt").focus();
    return;
  }

  generating = true;
  const btn = $("genBtn");
  btn.disabled = true;
  btn.innerHTML = "⏳ AI is analyzing...";
  $("empty").textContent = uploadedImageBase64 ? "Analyzing image & building website..." : "Generating website...";
  $("empty").classList.remove("hidden");
  setStatus("Processing... Please wait.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json", "Accept": "application/json"},
      body: JSON.stringify({
        prompt: prompt || "Create a responsive website matching this screenshot layout with Tailwind CSS.",
        style,
        image: uploadedImageBase64
      }),
      signal: controller.signal
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(data.detail || "Backend generation failed.");
    if (!data.code) throw new Error("Backend returned no HTML.");

    lastCode = data.code;
    $("prompt").value = "";
    uploadedImageBase64 = null;
    $("imagePreviewContainer").classList.add("hidden");
    $("imageInput").value = "";
    updateCharCount();
    
    $("codeView").value = lastCode;
    $("preview").srcdoc = lastCode;
    $("empty").classList.add("hidden");
    switchTab("preview");

    generationHistory.unshift({ prompt: prompt || "Image Upload Layout", style, code: lastCode });
    if (generationHistory.length > 15) generationHistory.pop();
    localStorage.setItem("codeDrHistory", JSON.stringify(generationHistory));
    renderHistory();
    updateDownloadLink();
    setStatus("Done ✓");
  } catch (e) {
    setStatus("Error: " + (e.name === "AbortError" ? "Request timed out." : e.message));
    $("empty").textContent = "Generation failed. Try again.";
  } finally {
    clearTimeout(timeout);
    generating = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Generate from AI/Vision';
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}