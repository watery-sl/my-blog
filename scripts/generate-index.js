const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'journal', 'posts');
const indexFile = path.join(__dirname, '..', 'journal', 'posts-index.json');

let posts = [];

if (fs.existsSync(postsDir)) {
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  posts = files.map(file => {
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const slug = file.replace(/\.md$/, '');
    let title = slug;
    let date = '';

    const match = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (match) {
      const lines = match[1].split('\n');
      for (const line of lines) {
        if (line.startsWith('title:')) {
          title = line.slice(6).trim().replace(/^['"]|['"]$/g, '');
        }
        if (line.startsWith('date:')) {
          date = line.slice(5).trim().replace(/^['"]|['"]$/g, '');
        }
      }
    } else {
      const firstLine = content.split('\n')[0].replace(/^#\s*/, '').trim();
      if (firstLine) title = firstLine;
    }

    return { title, date, slug };
  });

  posts.sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
}

fs.writeFileSync(indexFile, JSON.stringify(posts, null, 2));
console.log(`Generated index with ${posts.length} posts.`);
