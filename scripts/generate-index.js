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
        if (line.startsWith('title:')) title = line.slice(6).trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('date:')) date = line.slice(5).trim().replace(/^['"]|['"]$/g, '');
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
console.log('Generated posts index with ' + posts.length + ' posts.');

const momentsDir = path.join(__dirname, '..', '_data', 'moments');
const momentsFile = path.join(__dirname, '..', '_data', 'moments.json');

let moments = [];

if (fs.existsSync(momentsDir)) {
  const files = fs.readdirSync(momentsDir).filter(f => f.endsWith('.md'));
  moments = files.map(file => {
    const content = fs.readFileSync(path.join(momentsDir, file), 'utf-8');
    let text = '';
    let date = '';
    let images = [];
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      const frontLines = match[1].split('\n');
      let inImages = false;
      for (const line of frontLines) {
        if (line.startsWith('date:')) date = line.slice(5).trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('images:')) { inImages = true; continue; }
        if (inImages && line.trim().startsWith('- ')) images.push(line.trim().slice(2).trim());
        if (inImages && !line.trim().startsWith('- ')) inImages = false;
      }
      text = match[2].trim();
    } else {
      text = content.trim();
    }
    return { text, date, images };
  });
  moments.sort((a, b) => b.date.localeCompare(a.date));
}

fs.writeFileSync(momentsFile, JSON.stringify(moments, null, 2));
console.log('Generated moments index with ' + moments.length + ' moments.');
