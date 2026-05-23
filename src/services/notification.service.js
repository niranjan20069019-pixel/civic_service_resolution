const { v4: uuidv4 } = require('uuid');
const db = require('../db/sqlite');

// In-memory fallback
const _store = new Map(); // userId → notification[]

const USE_DB = !!db;

const NotificationService = {
  notify: (userId, message, type = 'info') => {
    const n = { id: uuidv4(), userId, message, type, read: false, createdAt: new Date().toISOString() };
    if (USE_DB) {
      db.prepare(
        'INSERT INTO notifications (id,user_id,message,type,read,created_at) VALUES (?,?,?,?,0,?)'
      ).run(n.id, userId, message, type, n.createdAt);
    } else {
      const list = _store.get(userId) || [];
      list.push(n);
      _store.set(userId, list);
    }
    return n;
  },

  getForUser: (userId) => {
    if (USE_DB) {
      return db.prepare(
        'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50'
      ).all(userId).map(_row);
    }
    return (_store.get(userId) || []).slice().reverse();
  },

  markRead: (id, userId) => {
    if (USE_DB) {
      const info = db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(id, userId);
      return info.changes > 0;
    }
    const list = _store.get(userId) || [];
    const n = list.find(x => x.id === id);
    if (n) { n.read = true; return true; }
    return false;
  },

  unreadCount: (userId) => {
    if (USE_DB) {
      return db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(userId).c;
    }
    return (_store.get(userId) || []).filter(n => !n.read).length;
  },
};

function _row(r) {
  return { id: r.id, userId: r.user_id, message: r.message, type: r.type,
    read: r.read === 1, createdAt: r.created_at };
}

module.exports = NotificationService;
