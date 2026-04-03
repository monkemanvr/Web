const el = {
  appId: document.getElementById('appId'),
  name: document.getElementById('name'),
  buildId: document.getElementById('buildId'),
  branch: document.getElementById('branch'),
  installdir: document.getElementById('installdir'),
  exe: document.getElementById('exe'),
  depots: document.getElementById('depots'),
  manifestPreview: document.getElementById('manifestPreview'),
  luaPreview: document.getElementById('luaPreview'),
  generateBtn: document.getElementById('generateBtn'),
  downloadManifestBtn: document.getElementById('downloadManifestBtn'),
  downloadLuaBtn: document.getElementById('downloadLuaBtn'),
  downloadZipBtn: document.getElementById('downloadZipBtn'),
  status: document.getElementById('status'),
};

let generated = null;

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.classList.toggle('error', isError);
}

function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadZip() {
  if (!generated) return;
  if (!window.JSZip) {
    setStatus('ZIP library unavailable. You can still download manifest and lua files separately.', true);
    return;
  }

  const zip = new JSZip();
  zip.file(generated.manifestFilename, generated.manifest);
  zip.file(generated.luaFilename, generated.lua);
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `steammanilua_${generated.appId}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

function collectInput() {
  return {
    appId: el.appId.value.trim(),
    name: el.name.value.trim(),
    buildId: el.buildId.value.trim() || '0',
    branch: el.branch.value.trim() || 'public',
    installdir: el.installdir.value.trim() || 'Game',
    exe: el.exe.value.trim() || 'game.exe',
    depots: el.depots.value,
  };
}

function setDownloads(enabled) {
  el.downloadManifestBtn.disabled = !enabled;
  el.downloadLuaBtn.disabled = !enabled;
  el.downloadZipBtn.disabled = !enabled;
}

async function generateFiles() {
  const data = collectInput();
  setStatus('Generating files...');

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const payload = await res.json();
    if (!res.ok) {
      setStatus(payload.error || 'Unable to generate files.', true);
      setDownloads(false);
      return;
    }

    generated = payload;
    el.manifestPreview.textContent = generated.manifest;
    el.luaPreview.textContent = generated.lua;
    setDownloads(true);
    setStatus('Ready. Download individual files or ZIP.');
  } catch (error) {
    setStatus('Server connection failed. Start the app with: npm start', true);
    setDownloads(false);
  }
}

el.generateBtn.addEventListener('click', generateFiles);

el.downloadManifestBtn.addEventListener('click', () => {
  if (!generated) return;
  downloadFile(generated.manifestFilename, generated.manifest, 'text/plain');
});

el.downloadLuaBtn.addEventListener('click', () => {
  if (!generated) return;
  downloadFile(generated.luaFilename, generated.lua, 'text/x-lua');
});

el.downloadZipBtn.addEventListener('click', downloadZip);
