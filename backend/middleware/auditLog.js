/**
 * Audit Logging Middleware
 * Tracks all CREATE, UPDATE, DELETE operations for compliance
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db/conn');

// ============================================
// AUDIT LOG TABLE SCHEMA
// ============================================

/**
 * Run this once to initialize audit_logs table:
 *
 * CREATE TABLE IF NOT EXISTS audit_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   org_id UUID NOT NULL,
 *   user_id UUID NOT NULL,
 *   action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
 *   entity_type VARCHAR(100) NOT NULL,
 *   entity_id VARCHAR(100) NOT NULL,
 *   old_values JSONB,
 *   new_values JSONB,
 *   ip_address VARCHAR(50),
 *   user_agent VARCHAR(500),
 *   timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   FOREIGN KEY (org_id) REFERENCES organizations(id),
 *   FOREIGN KEY (user_id) REFERENCES users(id)
 * );
 *
 * CREATE INDEX idx_audit_org ON audit_logs(org_id);
 * CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
 * CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
 */

// ============================================
// AUDIT LOG SERVICE
// ============================================

class AuditLogger {
  constructor(db) {
    this.db = db;
    this.preparedStatements = {
      insertAuditLog: db.prepare(`
        INSERT INTO audit_logs (
          id, org_id, user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `),
      getAuditLogs: db.prepare(`
        SELECT id, org_id, user_id, action, entity_type, entity_id,
               old_values, new_values, ip_address, timestamp
        FROM audit_logs
        WHERE org_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
        OFFSET ?
      `),
      getAuditLogsByEntity: db.prepare(`
        SELECT id, org_id, user_id, action, entity_type, entity_id,
               old_values, new_values, ip_address, timestamp
        FROM audit_logs
        WHERE org_id = ? AND entity_type = ? AND entity_id = ?
        ORDER BY timestamp DESC
      `),
    };
  }

  /**
   * Log a database operation
   * @param {Object} options - Logging options
   */
  log({
    orgId,
    userId,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      const logId = uuidv4();
      const oldValuesJson = oldValues ? JSON.stringify(oldValues) : null;
      const newValuesJson = newValues ? JSON.stringify(newValues) : null;

      this.preparedStatements.insertAuditLog.run(
        logId,
        orgId,
        userId,
        action,
        entityType,
        entityId,
        oldValuesJson,
        newValuesJson,
        ipAddress,
        userAgent,
      );

      return logId;
    } catch (error) {
      console.error('[AuditLogger] Error logging operation:', error);
      // Don't throw - logging should not break the main operation
    }
  }

  /**
   * Retrieve audit logs for an organization
   */
  getOrgLogs(orgId, limit = 100, offset = 0) {
    try {
      return this.preparedStatements.getAuditLogs.all(orgId, limit, offset);
    } catch (error) {
      console.error('[AuditLogger] Error retrieving logs:', error);
      return [];
    }
  }

  /**
   * Retrieve audit history for a specific entity
   */
  getEntityHistory(orgId, entityType, entityId) {
    try {
      return this.preparedStatements.getAuditLogsByEntity.all(orgId, entityType, entityId);
    } catch (error) {
      console.error('[AuditLogger] Error retrieving entity history:', error);
      return [];
    }
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Create audit logging middleware
 * Logs CREATE, UPDATE, DELETE operations
 */
function createAuditMiddleware(auditLogger) {
  return (req, res, next) => {
    // Store original methods
    const originalJson = res.json;

    // Override res.json to capture response
    res.json = function (data) {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.body) {
        const method = req.method.toUpperCase();
        const isAuditableMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

        if (isAuditableMethod && req.user) {
          // Determine action type
          let action = 'CREATE';
          if (method === 'PUT' || method === 'PATCH') {
            action = 'UPDATE';
          } else if (method === 'DELETE') {
            action = 'DELETE';
          }

          // Extract entity info from route
          const path = req.route?.path || req.path;
          const entityType = extractEntityType(path);
          const entityId = extractEntityId(req);

          if (entityType && entityId) {
            auditLogger.log({
              orgId: req.user.org_id,
              userId: req.user.id,
              action,
              entityType,
              entityId,
              newValues: action !== 'DELETE' ? req.body : null,
              ipAddress: req.ip,
              userAgent: req.get('user-agent'),
            });
          }
        }
      }

      // Call original method
      return originalJson.call(this, data);
    };

    next();
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractEntityType(path) {
  const match = path.match(/\/api\/(\w+)/);
  if (match) {
    return match[1].toUpperCase();
  }
  return null;
}

function extractEntityId(req) {
  // Try to get from route params (e.g., /api/customers/:id)
  if (req.params.id) {
    return req.params.id;
  }

  // Try to get from request body
  if (req.body?.id) {
    return req.body.id;
  }

  // Try to get from URL
  const match = req.path.match(/\/([a-f0-9\-]{36})$/);
  if (match) {
    return match[1];
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  AuditLogger,
  createAuditMiddleware,
};
