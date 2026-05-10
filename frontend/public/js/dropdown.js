// js/dropdown.js — Shared searchable dropdown engine
function _sdHighlight(text, term) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    '<mark style="background:#fef3c7;color:#92400e;border-radius:3px;padding:0 2px">' +
    text.slice(idx, idx + term.length) + '</mark>' +
    text.slice(idx + term.length);
}

function _sdOpen(id) {
  const list   = document.getElementById(id + '-list');
  const box    = document.getElementById(id + '-inputbox');
  const chev   = document.getElementById(id + '-chevron');
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (!list) return;

  if (list._sdHandler) list.removeEventListener('mousedown', list._sdHandler);
  list._sdHandler = function(ev) {
    ev.preventDefault();
    const opt = ev.target.closest('.sd-opt');
    if (!opt) return;
    const key = opt.dataset.key || id;
    _sdSelect(key, opt.dataset.id || '', opt.dataset.name || '');
  };
  list.addEventListener('mousedown', list._sdHandler);

  list.querySelectorAll('.sd-opt').forEach(opt => {
    opt.style.display = 'flex';
    const nameEl = opt.querySelector('.sd-name');
    if (nameEl) nameEl.innerHTML = nameEl.textContent;
    opt.style.background = opt.dataset.id === (sel ? sel.value : '') ? '#eff6ff' : '';
    delete opt.dataset.focused;
  });
  const emptyEl = list.querySelector('.sd-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  if (search && !(sel && sel.value)) search.value = '';

  list.style.display = 'block';
  if (box)  box.style.borderColor  = 'var(--c-primary)';
  if (chev) chev.style.transform   = 'rotate(180deg)';

  const closer = (ev) => {
    const wrap = document.getElementById(id + '-wrap');
    if (wrap && wrap.contains(ev.target)) {
      document.addEventListener('click', closer, { once: true });
    } else {
      _sdClose(id);
    }
  };
  setTimeout(() => document.addEventListener('click', closer, { once: true }), 0);
}

function _sdClose(id) {
  const list   = document.getElementById(id + '-list');
  const box    = document.getElementById(id + '-inputbox');
  const chev   = document.getElementById(id + '-chevron');
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (list) { list.style.display = 'none'; }
  if (box)  box.style.borderColor  = '';
  if (chev) chev.style.transform   = '';
  if (sel && search) {
    if (sel.value) {
      const opt = sel.querySelector('option[value="' + sel.value + '"]');
      if (opt) search.value = opt.text;
    } else {
      search.value = '';
    }
  }
}

function _sdFilter(id, q) {
  const list = document.getElementById(id + '-list');
  if (!list) return;
  list.style.display = 'block';
  const term = q.trim();
  let count = 0;
  list.querySelectorAll('.sd-opt').forEach(opt => {
    if (!opt.dataset.name && opt.dataset.id === '') {
      opt.style.display = 'flex';
      count++;
      return;
    }
    const name = opt.dataset.name || '';
    const visible = !term || name.toLowerCase().includes(term.toLowerCase());
    opt.style.display = visible ? 'flex' : 'none';
    if (visible) {
      count++;
      const nameEl = opt.querySelector('.sd-name');
      if (nameEl) nameEl.innerHTML = _sdHighlight(name, term);
    }
  });
  const emptyEl = list.querySelector('.sd-empty');
  if (emptyEl) emptyEl.style.display = count === 0 ? 'block' : 'none';
}

function _sdKey(id, ev) {
  const list = document.getElementById(id + '-list');
  if (!list || list.style.display === 'none') {
    if (ev.key === 'ArrowDown' || ev.key === 'Enter') _sdOpen(id);
    return;
  }
  const opts = [...list.querySelectorAll('.sd-opt')].filter(o => o.style.display !== 'none');
  const cur  = list.querySelector('.sd-opt[data-focused]');
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    const idx = cur ? opts.indexOf(cur) + 1 : 0;
    if (cur) { delete cur.dataset.focused; cur.style.background = ''; }
    if (opts[idx]) { opts[idx].dataset.focused = '1'; opts[idx].style.background = '#eff6ff'; opts[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    const idx = cur ? opts.indexOf(cur) - 1 : opts.length - 1;
    if (cur) { delete cur.dataset.focused; cur.style.background = ''; }
    if (opts[idx]) { opts[idx].dataset.focused = '1'; opts[idx].style.background = '#eff6ff'; opts[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (cur) _sdSelect(id, cur.dataset.id || '', cur.dataset.name || '');
  } else if (ev.key === 'Escape') {
    _sdClose(id);
  }
}

function _sdSelect(id, val, label) {
  const sel    = document.getElementById(id);
  const search = document.getElementById(id + '-search');
  if (sel)    sel.value    = val;
  if (search) search.value = label;
  _sdClose(id);
}
