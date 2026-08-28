const BACKEND_URL = "https://code-dr.onrender.com/generate";
const $ = (id) => document.getElementById(id);
let lastCode = "";
let downloadUrl = "";
let generating = false;

$("tab-preview").addEventListener("click", () => switchTab("preview"));
$("tab-code").addEventListener("click", () => switchTab("code"));
$("genBtn").addEventListener("click", generate);
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
    setStatus("Quick Message selected. Edit it if needed, then Generate.");
    $("prompt").focus();
  });
});
$("prompt").addEventListener("input", updateCharCount);
$("prompt").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    generate();
  }
});

function switchTab(tab) {
  $("preview").classList.toggle("hidden", tab !== "preview");
  $("codeView").classList.toggle("hidden", tab !== "code");
  $("tab-preview").classList.toggle("active", tab === "preview");
  $("tab-code").classList.toggle("active", tab === "code");
}

function setStatus(message, show = true) {
  $("status").textContent = message;
  $("status").classList.toggle("hidden", !show);
}

function updateCharCount() {
  const n = $("prompt").value.length;
  $("charCount").textContent = `${n} / 1800`;
}
updateCharCount();

function friendlyError(message, status) {
  if (status === 429 || /rate|token|TPM/i.test(message)) {
    return "Groq limit reached. Wait about 60 seconds and try a shorter prompt.";
  }
  if (status === 404 || /failed to fetch|network/i.test(message)) {
    return "Backend connection failed. Check your Render backend URL and make sure the service is running.";
  }
  return message || `Backend error (${status || "unknown"})`;
}

async function generate() {
  if (generating) return;
  const prompt = $("prompt").value.trim();
  const style = $("style").value;

  if (!prompt) {
    setStatus("First type a request or choose a Quick Message.");
    $("prompt").focus();
    return;
  }
  if (prompt.length > 1800) {
    setStatus("Prompt is too long. Keep it under 1800 characters.");
    return;
  }

  generating = true;
  const btn = $("genBtn");
  btn.disabled = true;
  btn.innerHTML = "⏳ AI is generating...";
  $("empty").textContent = "Generating website...";
  $("empty").classList.remove("hidden");
  setStatus("Generating... Please wait.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json", "Accept": "application/json"},
      body: JSON.stringify({prompt, style}),
      signal: controller.signal
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(friendlyError(data.detail, res.status));
    if (!data.code) throw new Error("Backend returned no HTML.");

    lastCode = data.code;
    $("codeView").innerHTML = "<code>" + escapeHtml(lastCode) + "</code>";
    $("preview").srcdoc = lastCode;
    $("empty").classList.add("hidden");
    switchTab("preview");

    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = URL.createObjectURL(new Blob([lastCode], {type:"text/html;charset=utf-8"}));
    const dl = $("downloadBtn");
    dl.href = downloadUrl;
    dl.download = "index.html";
    dl.classList.remove("hidden");
    setStatus("Done ✓");
  } catch (e) {
    const msg = e.name === "AbortError"
      ? "Request timed out. Try a simpler prompt or check Render."
      : friendlyError(e.message);
    console.error(e);
    setStatus("Error: " + msg);
    $("empty").textContent = "Generation failed. Try again.";
  } finally {
    clearTimeout(timeout);
    generating = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Generate LIVE Website';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
