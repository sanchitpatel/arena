import { createAvatar } from '@dicebear/core';
import { lorelei, notionists } from '@dicebear/collection';
import fs from 'node:fs';

const BG = ['d8f3ff', 'b6e3f4', 'c7d2fe', 'e0f2fe', 'f1f5f9'];

let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Arena Avatar Selection Gallery</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #09090b;
      color: #fafafa;
      padding: 24px 24px 120px 24px;
      margin: 0;
      user-select: none;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 6px 0;
      color: #38bdf8;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    p {
      color: #a1a1aa;
      font-size: 14px;
      margin: 0 0 24px 0;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 14px;
    }
    .card {
      position: relative;
      background: #18181b;
      border: 2px solid #27272a;
      border-radius: 18px;
      padding: 12px 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease-out;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: #3f3f46;
      background: #202024;
    }
    .card.selected {
      border-color: #38bdf8;
      background: #082f49;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
      transform: translateY(-3px) scale(1.02);
    }
    .check-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #38bdf8;
      color: #09090b;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    .card.selected .check-badge {
      display: flex;
    }
    .avatar-wrap {
      width: 88px;
      height: 88px;
      margin: 4px auto 8px;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
    }
    .avatar-wrap svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .seed {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 700;
      margin-top: 2px;
    }
    .card.selected .seed {
      color: #e0f2fe;
    }

    /* Fixed Floating Selection Dock */
    .dock {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18, 18, 22, 0.94);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15);
      border-radius: 24px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      z-index: 999;
      width: min(92%, 640px);
      justify-content: space-between;
    }
    .counter-block {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .counter-num {
      font-size: 22px;
      font-weight: 900;
      color: #38bdf8;
      font-family: ui-monospace, monospace;
    }
    .counter-label {
      font-size: 13px;
      font-weight: 700;
      color: #e4e4e7;
    }
    .counter-sub {
      font-size: 11px;
      color: #a1a1aa;
    }
    .dock-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:active {
      transform: scale(0.96);
    }
    .btn-secondary {
      background: #27272a;
      color: #d4d4d8;
      border: 1px solid #3f3f46;
    }
    .btn-secondary:hover {
      background: #3f3f46;
      color: #fff;
    }
    .btn-primary {
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #38bdf8;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    }
    .btn-primary:hover {
      background: #0369a1;
    }
    .btn-accent {
      background: #f8fafc;
      color: #09090b;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
    }
    .btn-accent:hover {
      background: #e2e8f0;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: #10b981;
      color: #022c22;
      padding: 12px 24px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1000;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <div id="toast" class="toast">JSON Copied to Clipboard!</div>

  <h1>Arena Avatar Selector & Exporter</h1>
  <p>Click your favorite avatars to select them (aim for 16–24). Then click <b>Copy JSON</b> or <b>Download JSON</b> below.</p>

  <h2 style="font-size: 16px; color: #7dd3fc; margin-top: 28px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
    Style 1: Lorelei (Artistic, Clean, Modern - 150 Faces)
  </h2>
  <div class="gallery-grid">
`;

for (let i = 1; i <= 150; i++) {
  const seed = `lorelei-${i}`;
  const svg = createAvatar(lorelei, { seed, backgroundColor: BG, radius: 50 }).toString();
  html += `
    <div class="card" id="card-${seed}" onclick="toggleSelect('${seed}')">
      <div class="check-badge">&#10003;</div>
      <div class="avatar-wrap">${svg}</div>
      <div class="seed">${seed}</div>
    </div>
  `;
}

html += `
  </div>

  <h2 style="font-size: 16px; color: #a78bfa; margin-top: 48px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">
    Style 2: Notionists (Minimalist B&W Pro Line-Art - 50 Faces)
  </h2>
  <div class="gallery-grid">
`;

for (let i = 1; i <= 50; i++) {
  const seed = `notion-${i}`;
  const svg = createAvatar(notionists, { seed, backgroundColor: BG, radius: 50 }).toString();
  html += `
    <div class="card" id="card-${seed}" onclick="toggleSelect('${seed}')">
      <div class="check-badge">&#10003;</div>
      <div class="avatar-wrap">${svg}</div>
      <div class="seed">${seed}</div>
    </div>
  `;
}

html += `
  </div>

  <!-- Floating Sticky Dock -->
  <div class="dock">
    <div>
      <div class="counter-block">
        <span class="counter-num" id="counter">0</span>
        <span class="counter-label">Picked</span>
      </div>
      <div class="counter-sub" id="counter-hint">Target: 16 to 24 faces</div>
    </div>
    <div class="dock-actions">
      <button class="btn btn-secondary" onclick="clearAll()">Clear</button>
      <button class="btn btn-primary" onclick="copyJSON()">Copy JSON</button>
      <button class="btn btn-accent" onclick="downloadJSON()">Download JSON</button>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'arena_selected_avatars';
    let selected = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));

    function updateDock() {
      const count = selected.size;
      const countEl = document.getElementById('counter');
      const hintEl = document.getElementById('counter-hint');
      countEl.innerText = count;

      if (count >= 16 && count <= 24) {
        countEl.style.color = '#4ade80';
        hintEl.innerText = 'Perfect selection range!';
        hintEl.style.color = '#4ade80';
      } else if (count > 24) {
        countEl.style.color = '#f59e0b';
        hintEl.innerText = 'More than 24 picked';
        hintEl.style.color = '#f59e0b';
      } else {
        countEl.style.color = '#38bdf8';
        hintEl.innerText = 'Target: 16 to 24 faces';
        hintEl.style.color = '#a1a1aa';
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selected)));
    }

    function toggleSelect(seed) {
      const card = document.getElementById('card-' + seed);
      if (selected.has(seed)) {
        selected.delete(seed);
        if (card) card.classList.remove('selected');
      } else {
        selected.add(seed);
        if (card) card.classList.add('selected');
      }
      updateDock();
    }

    function clearAll() {
      selected.forEach(seed => {
        const card = document.getElementById('card-' + seed);
        if (card) card.classList.remove('selected');
      });
      selected.clear();
      updateDock();
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.innerText = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }

    function copyJSON() {
      if (selected.size === 0) {
        alert('Please click on some avatars to select them first!');
        return;
      }
      const data = JSON.stringify(Array.from(selected), null, 2);
      navigator.clipboard.writeText(data).then(() => {
        showToast('Copied ' + selected.size + ' avatar seeds to clipboard!');
      }).catch(() => {
        prompt('Copy your seeds JSON here:', data);
      });
    }

    function downloadJSON() {
      if (selected.size === 0) {
        alert('Please click on some avatars to select them first!');
        return;
      }
      const data = JSON.stringify(Array.from(selected), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arena-avatar-picks.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded arena-avatar-picks.json!');
    }

    // Restore previously selected from localStorage on page load
    window.addEventListener('DOMContentLoaded', () => {
      selected.forEach(seed => {
        const card = document.getElementById('card-' + seed);
        if (card) card.classList.add('selected');
      });
      updateDock();
    });
  </script>
</body>
</html>`;

fs.writeFileSync('avatar-gallery.html', html);
fs.writeFileSync('public/avatar-gallery.html', html);
console.log('Successfully updated avatar-gallery.html and public/avatar-gallery.html with interactive selection and export!');
