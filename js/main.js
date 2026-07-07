const toggle = document.getElementById('themeToggle');
const html = document.documentElement;

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  html.setAttribute('data-theme', 'dark');
  toggle.textContent = '☀️';
}

toggle.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  if (current === 'dark') {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    toggle.textContent = '🌙';
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    toggle.textContent = '☀️';
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

if (momentsFeed) {
  fetch('_data/moments.json')
    .then(r => r.json())
    .then(moments => {
      if (!moments || moments.length === 0) {
        momentsFeed.innerHTML = '<div class="empty-state">还没有动态，写点什么吧</div>';
        return;
      }
      momentsFeed.innerHTML = moments.map(m => renderMoment(m)).join('');
    })
    .catch(() => {
      momentsFeed.innerHTML = '<div class="empty-state">还没有动态，写点什么吧</div>';
    });
}

function renderMoment(m) {
  let imagesHtml = '';
  if (m.images && m.images.length > 0) {
    imagesHtml = '<div class="moment-images">' +
      m.images.map(img => '<img src="' + img + '" alt="" onclick="openLightbox(\'' + img + '\')">').join('') +
      '</div>';
  }
  const delBtn = getToken() ? '<span class="moment-del-btn" onclick="confirmDelete(\'' + m.file + '\')" title="删除">&#128465;</span>' : '';
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
      m.images.map(img => '<img src="' + img + '" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="openLightbox(\'' + img + '\')">').join('') +
      '</div>';
  }
  return '<div class="trash-item">' +
    '<div class="trash-text">' + escapeHtml(m.text) + '</div>' +
    imagesHtml +
    '<div class="trash-meta">删除于 ' + m.deletedAt + '</div>' +
    '<div class="trash-actions">' +
    '<button class="trash-btn restore" onclick="restoreMoment(\'' + m.file + '\')">&#x21A9; 恢复</button>' +
    '<button class="trash-btn delete" onclick="permanentDelete(\'' + m.file + '\')">&#128465; 永久删除</button>' +
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

async function publishMoment() {
  const token = getToken();
  if (!token) { showModal(); return; }

  const text = momentText.value.trim();
  if (!text && selectedFiles.length === 0) {
    showMsg('写点什么或选张照片吧', 'error');
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = '发布中...';

  try {
    const timeStr = ts();
    const dateStr = formatDate(new Date());
    const uploaded = [];

    for (const file of selectedFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const imgName = timeStr + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
      const imgPath = 'assets/images/' + imgName;
      const base64 = await fileToBase64(file);
      const imgRes = await fetch(GH_BASE + '/contents/' + imgPath, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'upload: ' + imgName, content: base64.split(',')[1] })
      });
      if (!imgRes.ok) throw new Error('图片上传失败');
      uploaded.push('https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + imgPath);
    }

    const mdContent = '---\ndate: ' + dateStr + '\n' +
      (uploaded.length > 0 ? 'images:\n' + uploaded.map(u => '  - ' + u).join('\n') + '\n' : '') +
      '---\n\n' + text;

    const fileName = timeStr + '.md';
    const res = await fetch(GH_BASE + '/contents/_data/moments/' + fileName, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'moment: ' + (text.slice(0, 50) || 'photo'), content: btoa(unescape(encodeURIComponent(mdContent))) })
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || '发布失败'); }

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
    showMsg('发布成功！', 'success');
  } catch (e) {
    showMsg('发布失败：' + e.message, 'error');
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = '发布';
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
      if (allImages.length === 0) { photoGrid.innerHTML = '<div class="photo-empty">还没有照片</div>'; return; }
      photoGrid.innerHTML = allImages.map(img => '<img src="' + img + '" alt="" onclick="openLightbox(\'' + img + '\')">').join('');
    })
    .catch(() => { photoGrid.innerHTML = '<div class="photo-empty">还没有照片</div>'; });
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
  btn.textContent = '删除中...';

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('文件不存在');
    const data = await getRes.json();

    const content = atob(data.content.replace(/\n/g, ''));
    const trashContent = content.replace('---\ndate:', '---\ndeleted_at: ' + formatDate(new Date()) + '\ndate:');

    const putRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'trash: ' + file, content: btoa(unescape(encodeURIComponent(trashContent))) })
    });
    if (!putRes.ok) throw new Error('移入回收站失败');

    await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'delete: ' + file, sha: data.sha })
    });

    const item = momentsFeed.querySelector('[data-file="' + file + '"]');
    if (item) item.remove();
    const remaining = momentsFeed.querySelectorAll('.moment-item');
    if (remaining.length === 0) momentsFeed.innerHTML = '<div class="empty-state">还没有动态，写点什么吧</div>';

    showMsg('已删除，可在回收站恢复', 'success');
  } catch (e) {
    showMsg('删除失败：' + e.message, 'error');
  } finally {
    document.getElementById('confirmModal').classList.remove('active');
    btn.disabled = false;
    btn.textContent = '确定删除';
  }
}

if (trashList) {
  const token = getToken();
  if (!token) {
    trashList.innerHTML = '<div class="empty-state">请先设置 GitHub 令牌</div>';
  } else {
    fetch('_data/trash.json')
      .then(r => r.json())
      .then(items => {
        if (!items || items.length === 0) {
          trashList.innerHTML = '<div class="empty-state">回收站是空的</div>';
          return;
        }
        trashList.innerHTML = items.map(m => renderTrashItem(m)).join('');
      })
      .catch(() => { trashList.innerHTML = '<div class="empty-state">回收站是空的</div>'; });
  }
}

async function restoreMoment(file) {
  const token = getToken();
  if (!token) { showModal(); return; }

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('文件不存在');
    const data = await getRes.json();

    let content = atob(data.content.replace(/\n/g, ''));
    content = content.replace(/\ndeleted_at:[^\n]*/, '');

    const putRes = await fetch(GH_BASE + '/contents/_data/moments/' + file, {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'restore: ' + file, content: btoa(unescape(encodeURIComponent(content))) })
    });
    if (!putRes.ok) throw new Error('恢复失败');

    await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'remove from trash: ' + file, sha: data.sha })
    });

    showMsg('已恢复', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showMsg('恢复失败：' + e.message, 'error');
  }
}

async function permanentDelete(file) {
  const token = getToken();
  if (!token) { showModal(); return; }

  if (!confirm('确定永久删除？无法恢复。')) return;

  try {
    const getRes = await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!getRes.ok) throw new Error('文件不存在');
    const data = await getRes.json();

    await fetch(GH_BASE + '/contents/_data/trash/' + file, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '永久删除: ' + file, sha: data.sha })
    });

    showMsg('已永久删除', 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showMsg('删除失败：' + e.message, 'error');
  }
}
