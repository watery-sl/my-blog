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
      for (const line of match[1].split('\n')) {
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
      let inImages = false;
      for (const line of match[1].split('\n')) {
        if (line.startsWith('date:')) date = line.slice(5).trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('images:')) { inImages = true; continue; }
        if (inImages && line.trim().startsWith('- ')) images.push(line.trim().slice(2).trim());
        if (inImages && !line.trim().startsWith('- ')) inImages = false;
      }
      text = match[2].trim();
    }
    return { text, date, images, file: file };
  });
  moments.sort((a, b) => b.date.localeCompare(a.date));
}
fs.writeFileSync(momentsFile, JSON.stringify(moments, null, 2));
console.log('Generated moments index with ' + moments.length + ' moments.');

const trashDir = path.join(__dirname, '..', '_data', 'trash');
const trashFile = path.join(__dirname, '..', '_data', 'trash.json');

let trash = [];
if (fs.existsSync(trashDir)) {
  const files = fs.readdirSync(trashDir).filter(f => f.endsWith('.md'));
  trash = files.map(file => {
    const content = fs.readFileSync(path.join(trashDir, file), 'utf-8');
    let text = '';
    let date = '';
    let images = [];
    let deletedAt = '';
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      let inImages = false;
      for (const line of match[1].split('\n')) {
        if (line.startsWith('date:')) date = line.slice(5).trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('deleted_at:')) deletedAt = line.slice(11).trim().replace(/^['"]|['"]$/g, '');
        if (line.startsWith('images:')) { inImages = true; continue; }
        if (inImages && line.trim().startsWith('- ')) images.push(line.trim().slice(2).trim());
        if (inImages && !line.trim().startsWith('- ')) inImages = false;
      }
      text = match[2].trim();
    }
    return { text, date, images, deletedAt, file: file };
  });
  trash.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}
fs.writeFileSync(trashFile, JSON.stringify(trash, null, 2));
console.log('Generated trash index with ' + trash.length + ' items.');
