const toggle = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  html.setAttribute('data-theme', 'dark');
  toggle.textContent = '鈽€锔?;
}

toggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  if (current === 'dark') {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    toggle.textContent = '馃寵';
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    toggle.textContent = '鈽€锔?;
  }
});

const momentsFeed = document.getElementById('momentsFeed');
const momentText = document.getElementById('momentText');
const publishBtn = document.getElementById('publishBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const trashList = document.getElementById('trashList');

let selectedFiles = [];

const REPO = 'watery-sl/my-blog';
const BRANCH = 'main';
const GH_BASE = 'https://api.github.com/repos/' + REPO;

function getToken() {
  return localStorage.getItem('gh_token') || '';
}

function saveToken(t) {
  localStorage.setItem('gh_token', t);
}

function showModal() {
  const el = document.getElementById('tokenModal');
  if (el) el.classList.add('active');
}

function hideModal() {
  const el = document.getElementById('tokenModal');
  if (el) el.classList.remove('active');
}

function confirmToken() {
  const t = document.getElementById('tokenInput').value.trim();
  if (t.length > 10) {
    saveToken(t);
    hideModal();
    location.reload();
  }
}

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(d) {
  return d.getFullYear() + '.' + pad(d.getMonth()+1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function ts() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
}

function showMsg(text, type) {
  const el = document.getElementById('momentMsg');
  if (!el) return;
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function decodeContent(encoded) {
  return decodeURIComponent(escape(atob(encoded.replace(/\n/g, ''))));
}

function repairIfGarbled(str) {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 256) return str;
  }
  try {
    return decodeURIComponent(Array.from(str).map(c =>
      '%' + c.charCodeAt(0).toString(16).toUpperCase()
    ).join(''));
  } catch (e) {
    return str;
  }
}

function q(path) {
  return JSON.stringify(path).slice(1, -1);
}

if (momentsFeed) {
  fetch('_data/moments.json')
    .then(r => r.json())
    .then(moments => {
      if (!moments || moments.length === 0) {
        momentsFeed.innerHTML = '<div class="empty-state">杩樻病鏈夊姩鎬侊紝鍐欑偣浠€涔堝惂</div>';
        return;
      }
      moments.forEach(m => { m.text = repairIfGarbled(m.text); });
      momentsFeed.innerHTML = moments.map(m => renderMoment(m)).join('');
    })
    .catch(() => {
      momentsFeed.innerHTML = '<div class="empty-state">杩樻病鏈夊姩鎬侊紝鍐欑偣浠€涔堝惂</div>';
    });
}

function renderMoment(m) {
  let imagesHtml = '';
  if (m.images && m.images.length > 0) {
    imagesHtml = '<div class="moment-images">' +
      m.images.map(img => '<img src="' + img + '" alt="" onclick="openLightbox(\'' + img.replace(/'/g, "\\'") + '\')">').join('') +
      '</div>';
  }
  const delBtn = getToken() ? '<span class="moment-del-btn" onclick="confirmDelete(\'' + m.file.replace(/'/g, "\\'") + '\')" title="鍒犻櫎">&#128465;</span>' : '';
  return '<div class="moment-item" data-file="' + m.file + '">' +
    '<div class="moment-header">' +
    '<div class="moment-text">' + escapeHtml(m.text) + '</div>' +
    delBtn +
    '</div>' +
    imagesHtml +
    '<div class="moment-date">' + m.date + '</div>' +
    '</div>';
}

function renderTrashItem(m) {
  let imagesHtml = '';
  if (m.images && m.images.length > 0) {
    imagesHtml = '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
      m.images.map(img => '<img src="' + img + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="openLightbox(\'' + img.replace(/'/g, "\\'") + '\')">').join('') +
      '</div>';
  }
  return '<div class="trash-item">' +
    '<div class="trash-text">' + escapeHtml(m.text) + '</div>' +
    imagesHtml +
    '<div class="trash-meta">鍒犻櫎浜?' + m.deletedAt + '</div>' +
    '<div class="trash-actions">' +
    '<button class="trash-btn restore" onclick="restoreMoment(\'' + m.file.replace(/'/g, "\\'") + '\')">&#x21A9; 鎭㈠</button>' +
    '<button class="trash-btn delete" onclick="permanentDelete(\'' + m.file.replace(/'/g, "\\'") + '\')">&#128465; 姘镐箙鍒犻櫎</button>' +
    '</div>' +
    '</div>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (imageInput) {
  imageInput.addEventListener('change', function(e) {
    selectedFiles = Array.from(e.target.files);
    imagePreview.innerHTML = selectedFiles.map(f =>
      '<img src="' + URL.createObjectURL(f) + '">'
    ).join('');
  });
}

if (publishBtn) {
  publishBtn.addEventListener('click', publishMoment);
}

if (momentText) {
  momentText.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });
}

async function getFileSha(path) {
  const token = getToken();
  const res = await fetch(GH_BASE + '/contents/' + path, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

async function readJsonFile(path) {
  const token = getToken();
  const res = await fetch(GH_BASE + '/contents/' + path, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { content: JSON.parse(decodeContent(data.content)), sha: data.sha };
}

async function writeJsonFile(path, content, sha) {
  const token = getToken();
  const body = { message: 'update ' + path, content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))) };
  if (sha) body.sha = sha;
  const res = await fetch(GH_BASE + '/contents/' + path, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

async function uploadImage(file, name) {
  const token = getToken();
  const base64 = await fileToBase64(file);
  const res = await fetch(GH_BASE + '/contents/assets/images/' + name, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'upload: ' + name, content: base64.split(',')[1] })
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.content.download_url;
}

async function publishMoment() {
  const token = getToken();
  if (!token) { showModal(); return; }

  const text = momentText.value.trim();
  if (!text && selectedFiles.length === 0) {
    showMsg('鍐欑偣浠€涔堟垨閫夊紶鐓х墖鍚?, 'error');
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = '鍙戝竷涓?..';

  try {
    const timeStr = ts();
    const dateStr = formatDate(new Date());
    const uploaded = [];

    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const name = timeStr + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
      const url = await uploadImage(file, name);
      if (!url) throw new Error('鍥剧墖涓婁紶澶辫触');
      uploaded.push(url);
    }

    const fileName = timeStr + '.md';
    const mdContent = '---\ndate: ' + dateStr + '\n' +
      (uploaded.length > 0 ? 'images:\n' + uploaded.map(u => '  - ' + u).join('\n') + '\n' : '') +
      '---\n\n' + text;

    const mdRes = await fetch(GH_BASE + '/contents/_data/moments/' + fileName, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'moment: ' + (text.slice(0, 50) || 'photo') + ' [skip ci]', content: btoa(unescape(encodeURIComponent(mdContent))) })
    });
    if (!mdRes.ok) { const err = await mdRes.json(); throw new Error(err.message || '鍙戝竷澶辫触'); }

    const idx = await readJsonFile('_data/moments.json');
    if (idx) {
      idx.content.forEach(m => { m.text = repairIfGarbled(m.text); });
      idx.content.unshift({ text, date: dateStr, images: uploaded, file: fileName });
      await writeJsonFile('_data/moments.json', idx.content, idx.sha);
    }

    const newMoment = { text, date: dateStr, images: uploaded, file: fileName };
    if (momentsFeed) {
      const empty = momentsFeed.querySelector('.empty-state');
      if (empty) momentsFeed.innerHTML = '';
      momentsFeed.insertAdjacentHTML('afterbegin', renderMoment(newMoment));
    }

    momentText.value = '';
    momentText.style.height = 'auto';
    selectedFiles = [];
    imagePreview.innerHTML = '';
    imageInput.value = '';
    showMsg('鍙戝竷鎴愬姛锛?, 'success');
  } catch (e) {
    showMsg('鍙戝竷澶辫触锛? + e.message, 'error');
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = '鍙戝竷';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openLightbox(src) {
  if (lightbox && lightboxImg) {
    lightboxImg.src = src;
    lightbox.classList.add('active');
  }
}

if (lightbox) {
  lightbox.addEventListener('click', function() { this.classList.remove('active'); });
}

const photoGrid = document.getElementById('photoGrid');
if (photoGrid) {
  fetch('_data/moments.json')
    .then(r => r.json())
    .then(moments => {
      const allImages = [];
      moments.forEach(m => { if (m.images) m.images.forEach(img => allImages.push(img)); });
      if (allImages.length === 0) { photoGrid.innerHTML = '<div class="photo-empty">杩樻病鏈夌収鐗?/div>'; return; }
      photoGrid.innerHTML = allImages.map(img => '<img src="' + img + '" alt="" onclick="openLightbox(\'' + img.replace(/'/g, "\\'") + '\')">').join('');
    })
    .catch(() => { photoGrid.innerHTML = '<div class="photo-empty">杩樻病鏈夌収鐗?/div>'; });
}

const tokenInput = document.getElementById('tokenInput');
if (tokenInput) {
  const saved = getToken();
  if (saved) tokenInput.value = saved;
  tokenInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') confirmToken(); });
}

function confirmDelete(file) {
  document.getElementById('confirmModal').classList.add('active');
  document.getElementById('confirmModal').dataset.file = file;
}

function cancelDelete() {
  document.getElementById('confirmModal').classList.remove('active');
}

async function doDelete() {
  const file = document.getElementById('confirmModal').dataset.file;
  if (!file) return;
  const token = getToken();
  if (!token) { showModal(); return; }

  const btn = document.querySelector('#confirmModal .btn-danger');
  btn.disabled = true;
  btn.textContent = '鍒犻櫎涓?..';

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('鏂囦欢涓嶅瓨鍦?);
    const data = await getRes.json();

    const content = decodeContent(data.content);
    const trashContent = content.replace('---\ndate:', '---\ndeleted_at: ' + formatDate(new Date()) + '\ndate:');

    const putRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'trash: ' + file + ' [skip ci]', content: btoa(unescape(encodeURIComponent(trashContent))) })
    });
    if (!putRes.ok) throw new Error('绉诲叆鍥炴敹绔欏け璐?);

    const idx = await readJsonFile('_data/moments.json');
    if (idx) {
      idx.content.forEach(m => { m.text = repairIfGarbled(m.text); });
      idx.content = idx.content.filter(m => m.file !== file);
      await writeJsonFile('_data/moments.json', idx.content, idx.sha);
    }

    await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'delete: ' + file, sha: data.sha })
    });

    const item = momentsFeed.querySelector('[data-file="' + file + '"]');
    if (item) item.remove();
    const remaining = momentsFeed.querySelectorAll('.moment-item');
    if (remaining.length === 0) momentsFeed.innerHTML = '<div class="empty-state">杩樻病鏈夊姩鎬侊紝鍐欑偣浠€涔堝惂</div>';

    showMsg('宸插垹闄わ紝鍙湪鍥炴敹绔欐仮澶?, 'success');
  } catch (e) {
    showMsg('鍒犻櫎澶辫触锛? + e.message, 'error');
  } finally {
    document.getElementById('confirmModal').classList.remove('active');
    btn.disabled = false;
    btn.textContent = '纭畾鍒犻櫎';
  }
}

if (trashList) {
  const token = getToken();
  if (!token) {
    trashList.innerHTML = '<div class="empty-state">璇峰厛璁剧疆 GitHub 浠ょ墝</div>';
  } else {
    fetch('_data/trash.json')
      .then(r => r.json())
      .then(items => {
        if (!items || items.length === 0) { trashList.innerHTML = '<div class="empty-state">鍥炴敹绔欐槸绌虹殑</div>'; return; }
        items.forEach(m => { m.text = repairIfGarbled(m.text); });
        trashList.innerHTML = items.map(m => renderTrashItem(m)).join('');
      })
      .catch(() => { trashList.innerHTML = '<div class="empty-state">鍥炴敹绔欐槸绌虹殑</div>'; });
  }
}

async function restoreMoment(file) {
  const token = getToken();
  if (!token) { showModal(); return; }

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('鏂囦欢涓嶅瓨鍦?);
    const data = await getRes.json();

    let content = repairIfGarbled(decodeContent(data.content));
    content = content.replace(/\ndeleted_at:[^\n]*/, '');

    const putRes = await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'restore: ' + file + ' [skip ci]', content: btoa(unescape(encodeURIComponent(content))) })
    });
    if (!putRes.ok) throw new Error('鎭㈠澶辫触');

    await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'remove from trash: ' + file, sha: data.sha })
    });

    showMsg('宸叉仮澶?, 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showMsg('鎭㈠澶辫触锛? + e.message, 'error');
  }
}

async function permanentDelete(file) {
  const token = getToken();
  if (!token) { showModal(); return; }

  if (!confirm('纭畾姘镐箙鍒犻櫎锛熸棤娉曟仮澶嶃€?)) return;

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('鏂囦欢涓嶅瓨鍦?);
    const data = await getRes.json();

    await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '姘镐箙鍒犻櫎: ' + file, sha: data.sha })
    });

    showMsg('宸叉案涔呭垹闄?, 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showMsg('鍒犻櫎澶辫触锛? + e.message, 'error');
  }
}
