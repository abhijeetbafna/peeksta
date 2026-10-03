// Local-first Snapshot History & Whitelist Storage using IndexedDB
const DB_NAME = 'instastudiodb_v1';
const DB_VERSION = 1;
const SNAPSHOTS_STORE = 'snapshots';
const WHITELIST_KEY = 'instastudio_whitelist';

// Open or initialize IndexedDB
function openDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------- SNAPSHOT CRUD ----------------

export async function saveSnapshot({ label, followers, following, meta = {} }) {
  try {
    const db = await openDb();
    const id = 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const createdAt = new Date().toISOString();

    const snapshot = {
      id,
      label: label || `Snapshot - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      createdAt,
      followersCount: followers.length,
      followingCount: following.length,
      followers, // array of { username, name }
      following, // array of { username, name }
      meta
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SNAPSHOTS_STORE], 'readwrite');
      const store = tx.objectStore(SNAPSHOTS_STORE);
      const req = store.add(snapshot);

      req.onsuccess = () => resolve(snapshot);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save snapshot:', err);
    throw err;
  }
}

export async function getSnapshots() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SNAPSHOTS_STORE], 'readonly');
      const store = tx.objectStore(SNAPSHOTS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = req.result || [];
        // Sort newest first
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read snapshots from DB:', err);
    return [];
  }
}

export async function deleteSnapshot(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SNAPSHOTS_STORE], 'readwrite');
      const store = tx.objectStore(SNAPSHOTS_STORE);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to delete snapshot:', err);
    return false;
  }
}

// ---------------- SNAPSHOT COMPARISON DIFF ----------------

export function compareSnapshots(earlierSnapshot, laterSnapshot) {
  if (!earlierSnapshot || !laterSnapshot) return null;

  // Build maps from earlier snapshot
  const earlyFollowersMap = new Map();
  (earlierSnapshot.followers || []).forEach(u => {
    const handle = typeof u === 'string' ? u : u.username;
    if (handle) earlyFollowersMap.set(handle.toLowerCase(), u);
  });

  const earlyFollowingMap = new Map();
  (earlierSnapshot.following || []).forEach(u => {
    const handle = typeof u === 'string' ? u : u.username;
    if (handle) earlyFollowingMap.set(handle.toLowerCase(), u);
  });

  // Build maps from later snapshot
  const laterFollowersMap = new Map();
  (laterSnapshot.followers || []).forEach(u => {
    const handle = typeof u === 'string' ? u : u.username;
    if (handle) laterFollowersMap.set(handle.toLowerCase(), u);
  });

  const laterFollowingMap = new Map();
  (laterSnapshot.following || []).forEach(u => {
    const handle = typeof u === 'string' ? u : u.username;
    if (handle) laterFollowingMap.set(handle.toLowerCase(), u);
  });

  // 1. Lost Followers: In earlier followers, but NOT in later followers
  const lostFollowers = [];
  earlyFollowersMap.forEach((userObj, handle) => {
    if (!laterFollowersMap.has(handle)) {
      lostFollowers.push(userObj);
    }
  });

  // 2. Gained Followers: In later followers, but NOT in earlier followers
  const gainedFollowers = [];
  laterFollowersMap.forEach((userObj, handle) => {
    if (!earlyFollowersMap.has(handle)) {
      gainedFollowers.push(userObj);
    }
  });

  // 3. Unfollowed By You: In earlier following, but NOT in later following
  const unfollowedByYou = [];
  earlyFollowingMap.forEach((userObj, handle) => {
    if (!laterFollowingMap.has(handle)) {
      unfollowedByYou.push(userObj);
    }
  });

  // 4. New Following: In later following, but NOT in earlier following
  const newFollowing = [];
  laterFollowingMap.forEach((userObj, handle) => {
    if (!earlyFollowingMap.has(handle)) {
      newFollowing.push(userObj);
    }
  });

  const netFollowerChange = (laterSnapshot.followersCount || 0) - (earlierSnapshot.followersCount || 0);
  const netFollowingChange = (laterSnapshot.followingCount || 0) - (earlierSnapshot.followingCount || 0);

  return {
    earlierLabel: earlierSnapshot.label,
    laterLabel: laterSnapshot.label,
    earlierDate: earlierSnapshot.createdAt,
    laterDate: laterSnapshot.createdAt,
    lostFollowers,
    gainedFollowers,
    unfollowedByYou,
    newFollowing,
    netFollowerChange,
    netFollowingChange
  };
}

// ---------------- WHITELIST / VIP HELPERS ----------------

export function getWhitelist() {
  try {
    const raw = localStorage.getItem(WHITELIST_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(s => s.toLowerCase()) : []);
  } catch (e) {
    return new Set();
  }
}

export function saveWhitelist(whitelistSet) {
  try {
    const arr = Array.from(whitelistSet);
    localStorage.setItem(WHITELIST_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn('Could not save whitelist to localStorage:', e);
  }
}

// ---------------- WIPE EVERYTHING ----------------

// Removes every piece of data this app keeps in the browser:
// saved Time-Machine snapshots (IndexedDB), VIP whitelist and theme (localStorage).
export function clearAllStoredData() {
  try {
    localStorage.removeItem(WHITELIST_KEY);
    localStorage.removeItem('peeksta_theme');
  } catch (e) {
    console.warn('Could not clear localStorage:', e);
  }

  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(true);
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve(true);
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}
