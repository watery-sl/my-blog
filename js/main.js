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

const postList = document.getElementById('postList');
if (postList) {
  fetch('journal/posts-index.json')
    .then(r => r.json())
    .then(posts => {
      if (posts.length === 0) {
        postList.innerHTML = '<div class="empty-state">还没有文章，敬请期待</div>';
        return;
      }
      postList.innerHTML = posts.map(p => `
        <a class="post-card" href="post.html?slug=${encodeURIComponent(p.slug)}">
          <span class="post-title">${p.title}</span>
          <span class="post-date">${p.date}</span>
        </a>
      `).join('');
    })
    .catch(() => {
      postList.innerHTML = '<div class="empty-state">还没有文章，敬请期待</div>';
    });
}

const postContent = document.getElementById('postContent');
if (postContent) {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  if (!slug) {
    postContent.innerHTML = '<div class="empty-state">未指定文章</div>';
  } else {
    fetch('journal/posts/' + slug + '.md')
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then(md => {
        const titleMatch = md.match(/^---\n[\s\S]*?\n---\n/);
        let body = md;
        let title = '';
        let date = '';
        if (titleMatch) {
          const front = titleMatch[0];
          const titleLine = front.match(/title:\s*(.+)/);
          const dateLine = front.match(/date:\s*(.+)/);
          if (titleLine) title = titleLine[1].trim().replace(/^['"]|['"]$/g, '');
          if (dateLine) date = dateLine[1].trim().replace(/^['"]|['"]$/g, '');
          body = md.slice(titleMatch[0].length);
        } else {
          const lines = body.split('\n');
          if (lines[0].startsWith('# ')) {
            title = lines[0].slice(2).trim();
            body = lines.slice(1).join('\n');
          } else {
            title = slug;
          }
        }
        document.title = title + ' — watery';
        postContent.innerHTML = `
          <article>
            <h1>${title}</h1>
            ${date ? '<div class="meta">' + date + '</div>' : ''}
            <div class="post-content">${marked.parse(body)}</div>
          </article>
        `;
      })
      .catch(() => {
        postContent.innerHTML = '<div class="empty-state">文章未找到</div>';
      });
  }
}
