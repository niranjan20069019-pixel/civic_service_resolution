const { IssueStore, HistoryStore, UserStore } = require('../models/store');
const SLAService = require('./sla.service');
const NotificationService = require('./notification.service');
const { getIO } = require('../io');

const emit = (event, data) => { try { const io = getIO(); if (io) io.emit(event, data); } catch (_) { /* ignore */ } };

const IssueService = {
  createIssue: async (data, reportedBy) => {
    const issue = IssueStore.create({ ...data, reportedBy: reportedBy.id });
    HistoryStore.append(issue.id, {
      action: 'created', field: null, oldValue: null, newValue: 'open',
      performedBy: reportedBy.id, performedByName: reportedBy.name,
      performedByRole: reportedBy.role, note: 'Issue created',
    });
    emit('issue:created', issue);
    return issue;
  },

  listIssues: async (filters, user) => {
    const effectiveFilters = { ...filters };
    if (user.role === 'citizen') effectiveFilters.reportedBy = user.id;
    if (filters.lat !== undefined) effectiveFilters.lat = parseFloat(filters.lat);
    if (filters.lng !== undefined) effectiveFilters.lng = parseFloat(filters.lng);
    if (filters.radius !== undefined) effectiveFilters.radiusKm = parseFloat(filters.radius);
    return IssueStore.findAll(effectiveFilters);
  },

  getIssueById: async (issueId, user) => {
    const issue = IssueStore.findById(issueId);
    if (!issue) { const e = new Error('Issue not found.'); e.statusCode = 404; throw e; }
    if (user.role === 'citizen' && issue.reportedBy !== user.id) {
      const e = new Error('You do not have permission to view this issue.'); e.statusCode = 403; throw e;
    }
    const timeline = HistoryStore.findByIssueId(issueId);
    let sla = null;
    try { sla = SLAService.getIssueSLA(issueId); } catch (_) { /* no SLA config for category */ }
    return { ...issue, timeline, sla };
  },

  updateStatus: async (issueId, { status, note }, user) => {
    const issue = IssueStore.findById(issueId);
    if (!issue) { const e = new Error('Issue not found.'); e.statusCode = 404; throw e; }
    if (issue.status === status) {
      const e = new Error(`Issue is already in ${status} status.`); e.statusCode = 409; throw e;
    }
    const oldStatus = issue.status;
    const updated = IssueStore.update(issueId, { status });
    HistoryStore.append(issueId, {
      action: 'status_changed', field: 'status', oldValue: oldStatus, newValue: status,
      performedBy: user.id, performedByName: user.name, performedByRole: user.role, note: note || null,
    });
    // Notify the reporter
    NotificationService.notify(
      issue.reportedBy,
      `Your issue "${issue.title}" status changed from ${oldStatus} to ${status}.`,
      status === 'resolved' ? 'success' : 'info'
    );
    emit('issue:updated', updated);
    return updated;
  },

  assignIssue: async (issueId, { officialId, note }, user) => {
    const issue = IssueStore.findById(issueId);
    if (!issue) { const e = new Error('Issue not found.'); e.statusCode = 404; throw e; }
    const official = UserStore.findById(officialId);
    if (!official) { const e = new Error('Official not found.'); e.statusCode = 404; throw e; }
    if (official.role !== 'official') {
      const e = new Error(`User ${officialId} is not an official (role: ${official.role}).`); e.statusCode = 422; throw e;
    }
    const oldAssignee = issue.assignedTo;
    const updated = IssueStore.update(issueId, {
      assignedTo: officialId,
      status: issue.status === 'open' ? 'in_progress' : issue.status,
    });
    HistoryStore.append(issueId, {
      action: 'assigned', field: 'assignedTo', oldValue: oldAssignee, newValue: officialId,
      performedBy: user.id, performedByName: user.name, performedByRole: user.role,
      note: note || `Assigned to ${official.name}`,
    });
    // Notify the assigned official
    NotificationService.notify(
      officialId,
      `Issue "${issue.title}" has been assigned to you.`,
      'info'
    );
    return { ...updated, assignedToName: official.name };
  },

  getIssueHistory: async (issueId, user) => {
    const issue = IssueStore.findById(issueId);
    if (!issue) { const e = new Error('Issue not found.'); e.statusCode = 404; throw e; }
    if (user.role === 'citizen' && issue.reportedBy !== user.id) {
      const e = new Error('You do not have permission to view this issue history.'); e.statusCode = 403; throw e;
    }
    return HistoryStore.findByIssueId(issueId);
  },
};

module.exports = IssueService;
