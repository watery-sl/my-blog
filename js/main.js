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
  document.getElementById('tokenModal').classList.add('active');
}

function hideModal() {
  document.getElementById('tokenModal').classList.remove('active');
}

function confirmToken() {
  const t = document.getElementById('tokenInput').value.trim();
  if (t.length > 10) {
    saveToken(t);
    hideModal();
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
  return '<div class="moment-item">' +
    '<div class="moment-text">' + escapeHtml(m.text) + '</div>' +
    imagesHtml +
    '<div class="moment-date">' + m.date + '</div>' +
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
  if (!token) {
    showModal();
    return;
  }

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
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'upload: ' + imgName,
          content: base64.split(',')[1]
        })
      });

      if (!imgRes.ok) throw new Error('图片上传失败');

      const imgUrl = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + imgPath;
      uploaded.push(imgUrl);
    }

    const mdContent = '---\ndate: ' + dateStr + '\n' +
      (uploaded.length > 0 ? 'images:\n' + uploaded.map(u => '  - ' + u).join('\n') + '\n' : '') +
      '---\n\n' + text;

    const fileName = timeStr + '.md';

    const res = await fetch(GH_BASE + '/contents/_data/moments/' + fileName, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'moment: ' + (text.slice(0, 50) || 'photo'),
        content: btoa(unescape(encodeURIComponent(mdContent)))
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || '发布失败');
    }

    const newMoment = { text, date: dateStr, images: uploaded };
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
  lightbox.addEventListener('click', function() {
    this.classList.remove('active');
  });
}

const photoGrid = document.getElementById('photoGrid');
if (photoGrid) {
  fetch('_data/moments.json')
    .then(r => r.json())
    .then(moments => {
      const allImages = [];
      moments.forEach(m => {
        if (m.images) {
          m.images.forEach(img => allImages.push(img));
        }
      });
      if (allImages.length === 0) {
        photoGrid.innerHTML = '<div class="photo-empty">还没有照片</div>';
        return;
      }
      photoGrid.innerHTML = allImages.map(img =>
        '<img src="' + img + '" alt="" onclick="openLightbox(\'' + img + '\')">'
      ).join('');
    })
    .catch(() => {
      photoGrid.innerHTML = '<div class="photo-empty">还没有照片</div>';
    });
}

const tokenInput = document.getElementById('tokenInput');
if (tokenInput) {
  const saved = getToken();
  if (saved) tokenInput.value = saved;
  tokenInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') confirmToken();
  });
}
