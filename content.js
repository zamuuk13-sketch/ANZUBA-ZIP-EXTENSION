(() => {
  "use strict";

  const ALLOWED_HOSTS = new Set(["gemini.google.com", "deepseek.com", "chat.deepseek.com"]);
  if (!ALLOWED_HOSTS.has(location.hostname.toLowerCase())) return;

  const TRIPLE_TICK = "~~~";
  const files = new Map();
  let projectName = "anzuba-project";
  let panel = null;
  let finishTimer = null;
  let scanTimer = null;
  let lastScanSignature = "";

  const EXTENSIONS = /\.(py|js|ts|tsx|jsx|html?|css|json|lua|cpp|c|h|hpp|cs|java|kt|rs|go|php|gd|bat|cmd|ps1|sh|md|txt|xml|yml|yaml|toml|ini|sql|vue|svelte)$/i;

  function safeName(value) {
    const cleaned = String(value || "anzuba-project")
      .replace(/[^a-zA-Z0-9À-ÿ._ -]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return (cleaned || "anzuba-project").slice(0, 80);
  }

  function cleanPath(value) {
    return String(value || "")
      .replace(/^[*#\s]+|[*#\s]+$/g, "")
      .replace(/^[\"']|[\"']$/g, "")
      .trim()
      .replace(/\\/g, "/");
  }

  function validPath(value) {
    const path = cleanPath(value);
    return path.length > 0 &&
      path.length < 240 &&
      !path.startsWith("/") &&
      !path.includes("..") &&
      !/[<>:"|?*]/.test(path);
  }

  function addFile(path, content) {
    const clean = cleanPath(path);
    if (!validPath(clean)) return false;
    files.set(clean, {
      path: clean,
      content: String(content ?? "").replace(/\r\n/g, "\n").replace(/\n$/, "")
    });
    return true;
  }

  function inferProjectName(text) {
    const source = String(text || "");
    const explicit = source.match(/(?:^|\n)\s*(?:NAME|PROJECT|PROJETO)\s*:\s*([^\n]+)/i);
    if (explicit) {
      projectName = safeName(explicit[1]);
      return;
    }

    const heading = source.match(/(?:^|\n)\s*#{1,3}\s+([^\n]+)/);
    if (heading) projectName = safeName(heading[1]);
  }

  function findFileLabel(lines) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (/^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=\-]/i.test(line)) {
        return line.replace(/^(FILE|ARQUIVO|FILEPATH|CAMINHO)\s*[:=\-]\s*/i, "");
      }
      if (EXTENSIONS.test(cleanPath(line)) && !/[{}();<>]/.test(line)) {
        return cleanPath(line);
      }
    }
    return "";
  }

  function parseProtocol(text) {
    const match = String(text || "").match(/ANZUBA_PROJECT[\s\S]*?ANZUBA_END/i);
    if (!match) return false;

    const block = match[0];
    inferProjectName(block);
    const parts = block.split(TRIPLE_TICK);

    for (let i = 1; i < parts.length; i += 2) {
      const before = parts[i - 1].split("\n").filter(Boolean);
      const label = findFileLabel(before);
      if (!label) continue;

      let body = parts[i];
      const firstBreak = body.indexOf("\n");
      if (firstBreak >= 0) body = body.slice(firstBreak + 1);
      addFile(label, body);
    }
    return true;
  }

  function parseFencedBlocks(text) {
    const source = String(text || "");
    const regex = /\\?\`\`\`[^\n]*\n([\s\S]*?)\\?\`\`\`/g;
    let match;

    while ((match = regex.exec(source))) {
      const body = match[1];
      const before = source.slice(0, match.index).split("\n");
      const label = findFileLabel(before);
      if (label) addFile(label, body);
    }
  }

  function parsePre(pre) {
    const code = pre.querySelector("code") || pre;
    const body = code.innerText || code.textContent || "";
    if (!body.trim()) return;

    const candidates = [];
    let node = pre.previousElementSibling;

    for (let i = 0; node && i < 8; i++, node = node.previousElementSibling) {
      const text = (node.innerText || node.textContent || "").trim();
      if (text) candidates.push(text.split("\n").pop().trim());
    }

    if (pre.parentElement) {
      const parentText = pre.parentElement.innerText || "";
      candidates.push(...parentText.split("\n").slice(0, 16).reverse().map(x => x.trim()));
    }

    const label = findFileLabel(candidates);
    if (label) addFile(label, body);
  }

  function parseVisibleText(text) {
    inferProjectName(text);
    parseProtocol(text);
    parseFencedBlocks(text);
  }

  function ensurePanel() {
    if (panel && document.documentElement.contains(panel)) return panel;

    panel = document.createElement("aside");
    panel.id = "anzuba-status";
    panel.setAttribute("aria-label", "ANZUBA ZIP");
    panel.innerHTML = [
      '<div class="anzuba-status-title">ANZUBA</div>',
      '<div class="anzuba-status-text">Conectado ao site da IA</div>'
    ].join("");

    (document.body || document.documentElement).appendChild(panel);
    return panel;
  }

  function showLoading() {
    const root = ensurePanel();
    const button = root.querySelector(".anzuba-download");
    const info = root.querySelector(".anzuba-info");
    if (button) button.remove();
    if (info) info.remove();

    if (!root.querySelector(".anzuba-loading")) {
      const loading = document.createElement("div");
      loading.className = "anzuba-loading";
      loading.innerHTML = "<span></span><span></span><span></span>";
      root.appendChild(loading);
    }
  }

  function showDownload() {
    const root = ensurePanel();
    const loading = root.querySelector(".anzuba-loading");
    if (loading) loading.remove();

    const oldButton = root.querySelector(".anzuba-download");
    const oldInfo = root.querySelector(".anzuba-info");
    if (oldButton) oldButton.remove();
    if (oldInfo) oldInfo.remove();

    const list = Array.from(files.values());
    if (!list.length) return;

    const button = document.createElement("button");
    button.className = "anzuba-download";
    button.type = "button";
    button.innerHTML = '<img src="' + chrome.runtime.getURL("icons/folder.svg") + '" alt="">Baixar projeto';
    button.addEventListener("click", () => downloadZip(list));

    const info = document.createElement("div");
    info.className = "anzuba-info";
    info.textContent = list.length + (list.length === 1 ? " arquivo" : " arquivos") +
      " • " + safeName(projectName) + ".zip";

    root.appendChild(button);
    root.appendChild(info);
  }

  function scheduleFinish() {
    if (!files.size) return;

    showLoading();
    clearTimeout(finishTimer);
    finishTimer = setTimeout(() => {
      if (files.size) showDownload();
    }, 2500);
  }

  function scan() {
    ensurePanel();

    const roots = document.querySelectorAll(
      "article, [data-message-author-role='assistant'], [data-testid*='assistant'], pre"
    );

    for (const root of roots) {
      const text = root.innerText || root.textContent || "";
      if (text) parseVisibleText(text);
    }

    document.querySelectorAll("pre").forEach(parsePre);

    const signature = Array.from(files.keys()).sort().join("\n") + "|" + projectName;
    if (signature !== lastScanSignature) {
      lastScanSignature = signature;
      if (files.size) scheduleFinish();
    }
  }

  window.addEventListener("message", event => {
    const data = event.data;
    if (!data || data.source !== "ANZUBA_AI" || data.type !== "PROJECT") return;
    if (!Array.isArray(data.files)) return;

    if (data.project) projectName = safeName(data.project);
    for (const file of data.files) {
      if (file && validPath(file.path)) addFile(file.path, file.content);
    }
    scheduleFinish();
  });

  function u16(n) {
    return new Uint8Array([n & 255, (n >>> 8) & 255]);
  }

  function u32(n) {
    return new Uint8Array([
      n & 255,
      (n >>> 8) & 255,
      (n >>> 16) & 255,
      (n >>> 24) & 255
    ]);
  }

  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeZip(list) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const file of list) {
      const name = encoder.encode(file.path);
      const data = encoder.encode(file.content);
      const checksum = crc32(data);

      const local = new Uint8Array(30 + name.length + data.length);
      let p = 0;
      local.set(u32(0x04034B50), p); p += 4;
      local.set(u16(20), p); p += 2;
      local.set(u16(0), p); p += 2;
      local.set(u16(0), p); p += 2;
      local.set(u16(0), p); p += 2;
      local.set(u16(0), p); p += 2;
      local.set(u32(checksum), p); p += 4;
      local.set(u32(data.length), p); p += 4;
      local.set(u32(data.length), p); p += 4;
      local.set(u16(name.length), p); p += 2;
      local.set(u16(0), p); p += 2;
      local.set(name, p); p += name.length;
      local.set(data, p);
      localParts.push(local);

      const central = new Uint8Array(46 + name.length);
      p = 0;
      central.set(u32(0x02014B50), p); p += 4;
      central.set(u16(20), p); p += 2;
      central.set(u16(20), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u32(checksum), p); p += 4;
      central.set(u32(data.length), p); p += 4;
      central.set(u32(data.length), p); p += 4;
      central.set(u16(name.length), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u16(0), p); p += 2;
      central.set(u32(0), p); p += 4;
      central.set(u32(offset), p); p += 4;
      central.set(name, p);

      centralParts.push(central);
      offset += local.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    let p = 0;
    end.set(u32(0x06054B50), p); p += 4;
    end.set(u16(0), p); p += 2;
    end.set(u16(0), p); p += 2;
    end.set(u16(list.length), p); p += 2;
    end.set(u16(list.length), p); p += 2;
    end.set(u32(centralSize), p); p += 4;
    end.set(u32(offset), p); p += 4;
    end.set(u16(0), p);

    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }

  function downloadZip(list) {
    const url = URL.createObjectURL(makeZip(list));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeName(projectName) + ".zip";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function start() {
    ensurePanel();
    window.dispatchEvent(new CustomEvent("ANZUBA_READY", {
      detail: { version: "5.0.0", host: location.hostname }
    }));

    const observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scan, 350);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(scan, 500);
    setInterval(scan, 3000);
  }

  if (document.body) start();
  else window.addEventListener("DOMContentLoaded", start, { once: true });
})();
