/**
 * Data Store — SQLite-backed (falls back to in-memory if DB unavailable)
 *
 * Exports the same API as the original in-memory store so no other file changes.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db/sqlite');

// ─── Fallback in-memory collections (used when SQLite unavailable) ────────────
const _users = new Map();
const _refreshTokens = new Set();
const _revokedTokens = new Set();
const _issues = new Map();
const _history = new Map();

const USE_DB = !!db;

// ─── User Store ───────────────────────────────────────────────────────────────
const UserStore = {
  create: (data) => {
    const user = {
      id: uuidv4(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      role: data.role || 'citizen',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (USE_DB) {
      db.prepare(
        `INSERT INTO users (id,name,email,password_hash,role,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?)`
      ).run(user.id, user.name, user.email, user.passwordHash, user.role, user.createdAt, user.updatedAt);
    } else {
      _users.set(user.id, user);
    }
    return user;
  },

  findById: (id) => {
    if (USE_DB) {
      const row = db.prepare('SELECT * FROM users WHERE id=?').get(id);
      return row ? _rowToUser(row) : null;
    }
    return _users.get(id) || null;
  },

  findByEmail: (email) => {
    if (USE_DB) {
      const row = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
      return row ? _rowToUser(row) : null;
    }
    for (const u of _users.values()) if (u.email === email.toLowerCase()) return u;
    return null;
  },

  toPublic: (user) => { const p = { ...user }; delete p.passwordHash; return p; },

  _getAll: () => {
    if (USE_DB) return db.prepare('SELECT * FROM users').all().map(_rowToUser);
    return Array.from(_users.values());
  },
};

function _rowToUser(row) {
  return { id: row.id, name: row.name, email: row.email, passwordHash: row.password_hash,
    role: row.role, createdAt: row.created_at, updatedAt: row.updated_at };
}

// ─── Token Store ──────────────────────────────────────────────────────────────
const TokenStore = {
  save: (token) => {
    if (USE_DB) db.prepare('INSERT OR IGNORE INTO refresh_tokens (token,revoked) VALUES (?,0)').run(token);
    else _refreshTokens.add(token);
  },
  exists: (token) => {
    if (USE_DB) {
      const row = db.prepare('SELECT revoked FROM refresh_tokens WHERE token=?').get(token);
      return row ? row.revoked === 0 : false;
    }
    return _refreshTokens.has(token) && !_revokedTokens.has(token);
  },
  revoke: (token) => {
    if (USE_DB) db.prepare('UPDATE refresh_tokens SET revoked=1 WHERE token=?').run(token);
    else { _revokedTokens.add(token); _refreshTokens.delete(token); }
  },
  revokeAllForUser: (_userId) => {},
};

// ─── Issue Store ──────────────────────────────────────────────────────────────
const IssueStore = {
  VALID_STATUSES: ['open', 'in_progress', 'resolved', 'closed', 'rejected'],
  VALID_CATEGORIES: ['roads', 'sanitation', 'water', 'electricity', 'parks', 'safety', 'other'],
  VALID_PRIORITIES: ['low', 'medium', 'high', 'critical'],

  create: (data) => {
    const issue = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      category: data.category,
      status: 'open',
      priority: data.priority || 'medium',
      location: data.location || null,
      attachments: data.attachments || [],
      reportedBy: data.reportedBy,
      assignedTo: null,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (USE_DB) {
      db.prepare(
        `INSERT INTO issues (id,title,description,category,status,priority,location,attachments,
          reported_by,assigned_to,first_response_at,resolved_at,closed_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(issue.id, issue.title, issue.description, issue.category, issue.status, issue.priority,
        JSON.stringify(issue.location), JSON.stringify(issue.attachments),
        issue.reportedBy, null, null, null, null, issue.createdAt, issue.updatedAt);
    } else {
      _issues.set(issue.id, issue);
      _history.set(issue.id, []);
    }
    return issue;
  },

  findById: (id) => {
    if (USE_DB) {
      const row = db.prepare('SELECT * FROM issues WHERE id=?').get(id);
      return row ? _rowToIssue(row) : null;
    }
    return _issues.get(id) || null;
  },

  update: (id, updates) => {
    const issue = IssueStore.findById(id);
    if (!issue) return null;
    const now = new Date().toISOString();
    const merged = { ...issue, ...updates, updatedAt: now };

    if (updates.status && updates.status !== issue.status) {
      if (issue.status === 'open' && !merged.firstResponseAt) merged.firstResponseAt = now;
      if (updates.status === 'resolved' && !merged.resolvedAt) merged.resolvedAt = now;
      if (updates.status === 'closed' && !merged.closedAt) merged.closedAt = now;
    }

    if (USE_DB) {
      db.prepare(
        `UPDATE issues SET title=?,description=?,category=?,status=?,priority=?,location=?,
          attachments=?,assigned_to=?,first_response_at=?,resolved_at=?,closed_at=?,updated_at=?
         WHERE id=?`
      ).run(merged.title, merged.description, merged.category, merged.status, merged.priority,
        JSON.stringify(merged.location), JSON.stringify(merged.attachments),
        merged.assignedTo, merged.firstResponseAt, merged.resolvedAt, merged.closedAt,
        merged.updatedAt, id);
    } else {
      _issues.set(id, merged);
    }
    return merged;
  },

  findAll: (filters = {}) => {
    let result;
    if (USE_DB) {
      result = db.prepare('SELECT * FROM issues').all().map(_rowToIssue);
    } else {
      result = Array.from(_issues.values());
    }

    if (filters.status)     result = result.filter(i => i.status === filters.status);
    if (filters.category)   result = result.filter(i => i.category === filters.category);
    if (filters.assignedTo) result = result.filter(i => i.assignedTo === filters.assignedTo);
    if (filters.reportedBy) result = result.filter(i => i.reportedBy === filters.reportedBy);
    if (filters.dateFrom)   result = result.filter(i => new Date(i.createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo)     result = result.filter(i => new Date(i.createdAt) <= new Date(filters.dateTo));

    if (filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined) {
      const { haversineDistance } = require('../utils/geo');
      result = result.filter(i => {
        if (!i.location?.lat || !i.location?.lng) return false;
        return haversineDistance(filters.lat, filters.lng, i.location.lat, i.location.lng) <= filters.radiusKm;
      });
    }

    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
    const total = result.length;
    const data = result.slice((page - 1) * limit, page * limit);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },
};

function _rowToIssue(row) {
  return {
    id: row.id, title: row.title, description: row.description,
    category: row.category, status: row.status, priority: row.priority,
    location: _parseJSON(row.location),
    attachments: _parseJSON(row.attachments) || [],
    reportedBy: row.reported_by, assignedTo: row.assigned_to || null,
    firstResponseAt: row.first_response_at || null,
    resolvedAt: row.resolved_at || null,
    closedAt: row.closed_at || null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function _parseJSON(v) { try { return v ? JSON.parse(v) : null; } catch { return null; } }

// ─── History Store ────────────────────────────────────────────────────────────
const HistoryStore = {
  append: (issueId, entry) => {
    const record = { id: uuidv4(), issueId, ...entry, timestamp: new Date().toISOString() };
    if (USE_DB) {
      db.prepare(
        `INSERT INTO issue_history (id,issue_id,action,field,old_value,new_value,
          performed_by,performed_by_name,performed_by_role,note,timestamp)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).run(record.id, issueId, record.action, record.field || null,
        record.oldValue || null, record.newValue || null,
        record.performedBy, record.performedByName || null,
        record.performedByRole || null, record.note || null, record.timestamp);
    } else {
      const log = _history.get(issueId) || [];
      log.push(record);
      _history.set(issueId, log);
    }
    return record;
  },

  findByIssueId: (issueId) => {
    if (USE_DB) {
      return db.prepare('SELECT * FROM issue_history WHERE issue_id=? ORDER BY timestamp ASC').all(issueId)
        .map(r => ({
          id: r.id, issueId: r.issue_id, action: r.action, field: r.field,
          oldValue: r.old_value, newValue: r.new_value,
          performedBy: r.performed_by, performedByName: r.performed_by_name,
          performedByRole: r.performed_by_role, note: r.note, timestamp: r.timestamp,
        }));
    }
    return _history.get(issueId) || [];
  },
};

module.exports = { UserStore, TokenStore, IssueStore, HistoryStore };
