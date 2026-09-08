const AuditLog = require('../models/auditLog.model');
const { getClientIp } = require('../utils/helpers');

async function auditLog({ req, actorId, actorRole, action, targetType, targetId, metadata }) {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress: req ? getClientIp(req) : 'system',
    });
  } catch (err) {
    // Audit failures must not break the main flow.
    // eslint-disable-next-line no-console
    console.error('[audit]', err.message);
  }
}

module.exports = { auditLog };
