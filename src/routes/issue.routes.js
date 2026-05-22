const { Router } = require('express');
const IssueController = require('../controllers/issue.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createIssueSchema,
  listIssuesSchema,
  updateStatusSchema,
  assignIssueSchema,
  issueIdParamSchema,
} = require('../middleware/schemas/issue.schemas');

const SLAController = require('../controllers/sla.controller');

const router = Router();

// All issue routes require authentication
router.use(authenticate);

// ─── Seed demo data (supervisor only) ────────────────────────────────────────
router.post('/seed', authorize('supervisor'), async (req, res) => {
  const { IssueStore, HistoryStore, UserStore } = require('../models/store');
  const SEED = [
    { title: 'Large pothole on MG Road', description: 'Deep pothole near bus stop causing vehicle damage', category: 'roads', priority: 'high', status: 'open', location: { address: 'MG Road, Bengaluru', lat: 12.9716, lng: 77.5946 } },
    { title: 'Broken streetlight near park', description: 'Streetlight has been out for 2 weeks creating safety hazard', category: 'electricity', priority: 'medium', status: 'in_progress', location: { address: 'Cubbon Park, Bengaluru', lat: 12.9763, lng: 77.5929 } },
    { title: 'Overflowing garbage bin', description: 'Garbage bin on main street overflowing for 3 days', category: 'sanitation', priority: 'high', status: 'open', location: { address: 'Brigade Road, Bengaluru', lat: 12.9719, lng: 77.6074 } },
    { title: 'Water pipe burst on 5th Cross', description: 'Water gushing out since morning, road flooded', category: 'water', priority: 'critical', status: 'resolved', location: { address: '5th Cross, Indiranagar', lat: 12.9784, lng: 77.6408 } },
    { title: 'Park benches vandalized', description: 'Multiple benches broken in the children\'s play area', category: 'parks', priority: 'low', status: 'closed', location: { address: 'Lalbagh, Bengaluru', lat: 12.9507, lng: 77.5848 } },
    { title: 'Stray dogs menacing residents', description: 'Pack of stray dogs attacking pedestrians near school', category: 'safety', priority: 'critical', status: 'in_progress', location: { address: 'Koramangala, Bengaluru', lat: 12.9352, lng: 77.6245 } },
    { title: 'Road cave-in near metro station', description: 'Sinkhole forming near metro construction site', category: 'roads', priority: 'critical', status: 'open', location: { address: 'Majestic Metro, Bengaluru', lat: 12.9767, lng: 77.5713 } },
    { title: 'Sewage overflow on residential street', description: 'Sewage backing up into street after heavy rain', category: 'sanitation', priority: 'high', status: 'in_progress', location: { address: 'Jayanagar, Bengaluru', lat: 12.9308, lng: 77.5838 } },
    { title: 'No water supply for 48 hours', description: 'Entire block without water supply since Tuesday', category: 'water', priority: 'high', status: 'resolved', location: { address: 'Whitefield, Bengaluru', lat: 12.9698, lng: 77.7499 } },
    { title: 'Illegal dumping near lake', description: 'Construction debris being dumped near Ulsoor Lake', category: 'other', priority: 'medium', status: 'open', location: { address: 'Ulsoor Lake, Bengaluru', lat: 12.9833, lng: 77.6101 } },
  ];

  // Find or use the requesting user as reporter
  const reporter = req.user;
  let seeded = 0;
  for (const s of SEED) {
    const { status, ...rest } = s;
    const issue = IssueStore.create({ ...rest, reportedBy: reporter.id });
    HistoryStore.append(issue.id, { action: 'created', field: null, oldValue: null, newValue: 'open', performedBy: reporter.id, performedByName: reporter.name, performedByRole: reporter.role, note: 'Seeded demo issue' });
    if (status !== 'open') {
      IssueStore.update(issue.id, { status });
      HistoryStore.append(issue.id, { action: 'status_changed', field: 'status', oldValue: 'open', newValue: status, performedBy: reporter.id, performedByName: reporter.name, performedByRole: reporter.role, note: 'Demo seed' });
    }
    seeded++;
  }
  res.json({ success: true, message: `Seeded ${seeded} demo issues`, data: { seeded } });
});

/**
 * @swagger
 * /issues:
 *   post:
 *     tags: [Issues]
 *     summary: Create a new civic issue
 *     description: Only citizens can create issues.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category]
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: Large pothole on Main St
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 5000
 *                 example: There is a deep pothole near 123 Main St that is damaging vehicles.
 *               category:
 *                 type: string
 *                 enum: [roads, sanitation, water, electricity, parks, safety, other]
 *                 example: roads
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               location:
 *                 type: object
 *                 required: [lat, lng]
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: 123 Main St, Springfield
 *                   lat:
 *                     type: number
 *                     example: 40.7128
 *                   lng:
 *                     type: number
 *                     example: -74.0060
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://cdn.example.com/photo1.jpg"]
 *     responses:
 *       201:
 *         description: Issue created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         issue:
 *                           $ref: '#/components/schemas/Issue'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not a citizen)
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authorize('citizen'),
  validate(createIssueSchema),
  IssueController.createIssue
);

/**
 * @swagger
 * /issues:
 *   get:
 *     tags: [Issues]
 *     summary: List issues with filtering
 *     description: |
 *       Returns a paginated list of issues.
 *       - Citizens see only their own issues.
 *       - Officials and Supervisors see all issues.
 *       
 *       Geolocation filtering requires `lat`, `lng`, and `radius` (km) all together.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [roads, sanitation, water, electricity, parks, safety, other]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *         description: Latitude for geolocation filter (requires lng and radius)
 *       - in: query
 *         name: lng
 *         schema:
 *           type: number
 *         description: Longitude for geolocation filter (requires lat and radius)
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometres (requires lat and lng)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated issue list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         data:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Issue'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get(
  '/',
  validate(listIssuesSchema, 'query'),
  IssueController.listIssues
);

/**
 * @swagger
 * /issues/{id}:
 *   get:
 *     tags: [Issues]
 *     summary: Get a single issue with its timeline
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Issue detail with timeline
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         issue:
 *                           allOf:
 *                             - $ref: '#/components/schemas/Issue'
 *                             - type: object
 *                               properties:
 *                                 timeline:
 *                                   type: array
 *                                   items:
 *                                     $ref: '#/components/schemas/HistoryEntry'
 *       404:
 *         description: Issue not found
 */
router.get(
  '/:id',
  validate(issueIdParamSchema, 'params'),
  IssueController.getIssueById
);

/**
 * @swagger
 * /issues/{id}/status:
 *   patch:
 *     tags: [Issues]
 *     summary: Update issue status
 *     description: Only Officials and Supervisors can update status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, resolved, closed, rejected]
 *               note:
 *                 type: string
 *                 maxLength: 500
 *                 example: Repair crew dispatched.
 *     responses:
 *       200:
 *         description: Status updated
 *       403:
 *         description: Forbidden (citizen role)
 *       404:
 *         description: Issue not found
 *       409:
 *         description: Status already set to that value
 */
router.patch(
  '/:id/status',
  authorize('official', 'supervisor'),
  validate(issueIdParamSchema, 'params'),
  validate(updateStatusSchema),
  IssueController.updateStatus
);

/**
 * @swagger
 * /issues/{id}/assign:
 *   post:
 *     tags: [Issues]
 *     summary: Assign issue to an official
 *     description: Only Supervisors can assign issues.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [officialId]
 *             properties:
 *               officialId:
 *                 type: string
 *                 format: uuid
 *               note:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Issue assigned
 *       403:
 *         description: Forbidden (not a supervisor)
 *       404:
 *         description: Issue or official not found
 *       422:
 *         description: Target user is not an official
 */
router.post(
  '/:id/assign',
  authorize('supervisor'),
  validate(issueIdParamSchema, 'params'),
  validate(assignIssueSchema),
  IssueController.assignIssue
);

/**
 * @swagger
 * /issues/{id}/history:
 *   get:
 *     tags: [Issues]
 *     summary: Get full audit trail for an issue
 *     description: Citizens can only view history for issues they reported.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Audit trail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         history:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/HistoryEntry'
 *       404:
 *         description: Issue not found
 */
router.get(
  '/:id/history',
  validate(issueIdParamSchema, 'params'),
  IssueController.getIssueHistory
);

/**
 * @swagger
 * /issues/{id}/sla:
 *   get:
 *     tags: [Issues]
 *     summary: Get SLA status for an issue
 *     description: Returns elapsed time, breach timestamp, and SLA compliance status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: SLA status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SLAStatus'
 *       404:
 *         description: Issue not found
 */
router.get(
  '/:id/sla',
  validate(issueIdParamSchema, 'params'),
  SLAController.getIssueSLA
);

module.exports = router;
