require("dotenv").config();
const { Pool } = require("pg");
const { RequestsService } = require("../dist/modules/requests/requests.service");
const { AssignmentRoutingService } = require("../dist/modules/assignment-routing/assignment-routing.service");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const base = await pool.query(
    `SELECT r.id, r.assigned_user_id, rs.code AS status_code
     FROM travel_requests r
     JOIN request_statuses rs ON rs.id = r.request_status_id
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 1`,
  );
  const staff = await pool.query(
    `SELECT id, name, roles FROM users
     WHERE roles && ARRAY['travel_agent', 'offshore_intake_employee']::text[]
     ORDER BY id`,
  );
  const admin = await pool.query(
    `SELECT id, roles FROM users
     WHERE roles @> ARRAY['system_administrator']::text[]
     ORDER BY id LIMIT 1`,
  );
  const request = base.rows[0];
  const actor = admin.rows[0];
  const target = staff.rows.find((item) => item.id !== request?.assigned_user_id) ?? staff.rows[0];
  if (!request || !actor || !target) throw new Error("Assignment test requires a request, an administrator, and eligible staff");

  const realClient = await pool.connect();
  let rollbackPromise = Promise.resolve();
  let auditVerified = false;
  let routingEventVerified = false;
  let notificationVerified = false;
  const testClient = {
    query: async (text, values) => {
      if (text === "COMMIT") {
        const audit = await realClient.query(
          `SELECT action, before_state, after_state
           FROM audit_events
           WHERE entity_type = 'travel_request' AND entity_id = $1
           ORDER BY id DESC LIMIT 1`,
          [String(request.id)],
        );
        const event = audit.rows[0];
        const expectedAction = request.assigned_user_id === null
          ? "travel_request.assigned"
          : "travel_request.reassigned";
        auditVerified = Boolean(
          event &&
          event.action === expectedAction &&
          event.after_state?.assignedUserId === target.id &&
          event.before_state?.assignedUserId === request.assigned_user_id,
        );
        const routingEvent = await realClient.query(
          `SELECT event_type, routing_level, staff_user_id, actor_user_id, explanation
           FROM request_assignment_events
           WHERE request_id = $1 ORDER BY id DESC LIMIT 1`,
          [request.id],
        );
        routingEventVerified = Boolean(
          routingEvent.rows[0] &&
          routingEvent.rows[0].staff_user_id === target.id &&
          routingEvent.rows[0].actor_user_id === actor.id &&
          routingEvent.rows[0].explanation,
        );
        const notification = await realClient.query(
          `SELECT user_id, notification_type, entity_type, entity_id, read_at
           FROM staff_notifications
           WHERE user_id = $1 AND entity_type = 'travel_request' AND entity_id = $2
           ORDER BY id DESC LIMIT 1`,
          [target.id, String(request.id)],
        );
        const notificationRow = notification.rows[0];
        notificationVerified = Boolean(
          notificationRow &&
          notificationRow.user_id === target.id &&
          notificationRow.notification_type === "request_assigned" &&
          notificationRow.entity_id === String(request.id) &&
          notificationRow.read_at === null,
        );
        return { rows: [], rowCount: 0 };
      }
      return realClient.query(text, values);
    },
    release: () => {
      rollbackPromise = realClient.query("ROLLBACK").finally(() => realClient.release());
    },
  };
  const routing = new AssignmentRoutingService(pool);
  const recommendation = await routing.recommend(request.id);
  if (recommendation.requestId !== request.id || !Array.isArray(recommendation.candidates)) {
    throw new Error("Routing recommendation did not return an explainable candidate evaluation");
  }
  const service = new RequestsService({ connect: async () => testClient }, routing);
  const assigned = await service.assign(request.id, target.id, actor.id, actor.roles);
  await rollbackPromise;

  if (assigned.assignedUserId !== target.id || assigned.assignedByUserId !== actor.id) {
    throw new Error("Assignment result did not contain the expected owner and actor");
  }
  if (assigned.assignmentStatus !== "assigned") {
    throw new Error("Assignment state did not move to Assigned");
  }
  if (assigned.requestStatusCode !== request.status_code) {
    throw new Error("Assignment incorrectly changed the operational workflow status");
  }
  if (!auditVerified) throw new Error("Assignment audit event was not written correctly");
  if (!routingEventVerified) throw new Error("Explainable assignment history was not written correctly");
  if (!notificationVerified) throw new Error("Assignment notification was not written correctly");

  const restored = await pool.query("SELECT assigned_user_id FROM travel_requests WHERE id = $1", [request.id]);
  if (restored.rows[0]?.assigned_user_id !== request.assigned_user_id) {
    throw new Error("Rollback-only test changed the request assignment");
  }
  console.log(`Recommendation, assignment state, explanation history, audit, in-app notification, and rollback verified for request ${request.id}.`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
