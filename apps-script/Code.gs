/**
 * PersonalSpace backend — Google Apps Script + Google Sheets.
 *
 * Setup (see README):
 *  1. Open your Google Sheet → Extensions → Apps Script, paste this file.
 *  2. Project Settings → Script properties → add APP_PASSWORD = <your password>.
 *  3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *  4. Copy the Web app URL into the PersonalSpace login screen.
 *
 * The sheet gets two tabs, created automatically: "Bookmarks" and "Folders".
 * You can read/edit them by hand; columns are matched by header name.
 */

const TOKEN_DAYS = 90;
const MAX_FAILS = 5; // wrong passwords allowed per 10 minutes

const TABLES = {
  Bookmarks: ['id', 'url', 'title', 'description', 'folderId', 'tags', 'favorite', 'createdAt', 'updatedAt'],
  Folders: ['id', 'name', 'updatedAt'],
};

function doGet() {
  return json_({ ok: true, app: 'PersonalSpace' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (req.action) {
      case 'login':
        return json_(login_(req.password));
      case 'logout':
        if (validToken_(req.token)) PropertiesService.getScriptProperties().deleteProperty(tokenKey_(req.token));
        return json_({ ok: true });
      case 'pull':
        if (!validToken_(req.token)) return json_({ ok: false, error: 'unauthorized' });
        return json_({ ok: true, ...readAll_() });
      case 'ops':
        if (!validToken_(req.token)) return json_({ ok: false, error: 'unauthorized' });
        return json_(applyOps_(req.ops || []));
      default:
        return json_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ ok: false, error: 'server_error', message: String(err) });
  }
}

/* ---------------- Auth ---------------- */

function login_(password) {
  const props = PropertiesService.getScriptProperties();
  const expected = props.getProperty('APP_PASSWORD');
  if (!expected) return { ok: false, error: 'not_configured' };

  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= MAX_FAILS) return { ok: false, error: 'locked' };

  if (!password || hash_(password) !== hash_(expected)) {
    cache.put('login_fails', String(fails + 1), 600);
    return { ok: false, error: 'wrong_password' };
  }

  cache.remove('login_fails');
  cleanupTokens_(props);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  props.setProperty(tokenKey_(token), String(Date.now() + TOKEN_DAYS * 864e5));
  return { ok: true, token: token };
}

function validToken_(token) {
  if (!token || typeof token !== 'string') return false;
  const exp = Number(PropertiesService.getScriptProperties().getProperty(tokenKey_(token)) || 0);
  return exp > Date.now();
}

// Tokens are stored hashed so the raw token never sits in Script Properties.
function tokenKey_(token) {
  return 'tok_' + hash_(token).slice(0, 40);
}

function cleanupTokens_(props) {
  const all = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('tok_') === 0 && Number(all[k]) < Date.now()) props.deleteProperty(k);
  });
}

function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); })
    .join('');
}

/* ---------------- Data ---------------- */

function readAll_() {
  const bookmarks = readTable_('Bookmarks').map(function (r) {
    return {
      id: String(r.id),
      url: String(r.url),
      title: String(r.title),
      description: String(r.description || ''),
      collectionId: r.folderId ? String(r.folderId) : null,
      tags: String(r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String),
      favorite: r.favorite === true || String(r.favorite).toUpperCase() === 'TRUE',
      createdAt: Number(r.createdAt) || Date.now(),
    };
  });
  const collections = readTable_('Folders').map(function (r) {
    return { id: String(r.id), name: String(r.name) };
  });
  bookmarks.sort(function (a, b) { return b.createdAt - a.createdAt; });
  return { bookmarks: bookmarks, collections: collections };
}

/** Applies a batch of changes atomically (one lock, one write per tab). */
function applyOps_(ops) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const bm = loadTable_('Bookmarks');
    const fd = loadTable_('Folders');
    const now = new Date();

    ops.forEach(function (op) {
      switch (op.type) {
        case 'upsertBookmark': {
          const b = op.bookmark;
          if (!b || !b.id) return;
          bm.rows.set(String(b.id), {
            id: b.id,
            url: b.url,
            title: b.title,
            description: b.description || '',
            folderId: b.collectionId || '',
            tags: (b.tags || []).join(', '),
            favorite: !!b.favorite,
            createdAt: Number(b.createdAt) || Date.now(),
            updatedAt: now,
          });
          break;
        }
        case 'deleteBookmark':
          bm.rows.delete(String(op.id));
          break;
        case 'upsertFolder':
          if (op.folder && op.folder.id) {
            fd.rows.set(String(op.folder.id), { id: op.folder.id, name: op.folder.name, updatedAt: now });
          }
          break;
        case 'deleteFolder':
          fd.rows.delete(String(op.id));
          bm.rows.forEach(function (r) {
            if (String(r.folderId) === String(op.id)) { r.folderId = ''; r.updatedAt = now; }
          });
          break;
      }
    });

    saveTable_(bm);
    saveTable_(fd);
    return { ok: true, applied: ops.length };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Sheet helpers ---------------- */

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, TABLES[name].length).setValues([TABLES[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readTable_(name) {
  return Array.from(loadTable_(name).rows.values());
}

/** Loads a tab into a Map keyed by id. Extra columns the user adds are kept. */
function loadTable_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  let headers = values[0].map(String);
  TABLES[name].forEach(function (h) { if (headers.indexOf(h) < 0) headers.push(h); });
  const rows = new Map();
  values.slice(1).forEach(function (row) {
    const o = {};
    headers.forEach(function (h, i) { o[h] = row[i] === undefined ? '' : row[i]; });
    if (o.id !== '' && o.id !== null) rows.set(String(o.id), o);
  });
  return { sheet: sh, headers: headers, rows: rows };
}

function saveTable_(t) {
  const out = [t.headers];
  t.rows.forEach(function (o) {
    out.push(t.headers.map(function (h) { return safe_(o[h]); }));
  });
  t.sheet.clearContents();
  t.sheet.getRange(1, 1, out.length, t.headers.length).setValues(out);
  t.sheet.getRange(1, 1, 1, t.headers.length).setFontWeight('bold');
}

// Stop titles like "=IMPORTXML(...)" from being treated as formulas.
function safe_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
