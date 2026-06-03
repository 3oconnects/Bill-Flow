/**
 * SQL Query Builder - Reusable components for constructing SQL statements
 * Reduces duplication and improves maintainability across statement files
 */

// ============ Placeholder Builders ============

/**
 * Build placeholder string: $1, $2, $3, ...
 * @param {number} startIndex - Starting parameter index (default: 1)
 * @param {number} count - Number of placeholders
 * @returns {string} Comma-separated placeholders
 */
const buildPlaceholders = (startIndex = 1, count) =>
  Array.from({ length: count }, (_, i) => `$${startIndex + i}`).join(',');

/**
 * Build UPDATE SET clause: field1=$3, field2=$4, ...
 * @param {string[]} fields - Array of field names
 * @param {number} startIndex - Starting parameter index (default: 3)
 * @returns {string} SET clause
 */
const buildUpdateSet = (fields, startIndex = 3) =>
  fields.map((field, i) => `${field}=$${startIndex + i}`).join(', ');

/**
 * Build column list for INSERT
 * @param {string[]} fields - Array of field names
 * @returns {string} Comma-separated field names
 */
const buildColumnList = (fields) => fields.join(', ');

// ============ Common WHERE Clauses ============

const WHERE_CLAUSES = {
  orgNotDeleted: (tableAlias = 'i') => `WHERE ${tableAlias}.org_id=$1 AND ${tableAlias}.deleted_at IS NULL`,
  orgById: (idIndex = 1, orgIndex = 2) => `WHERE id=$${idIndex} AND org_id=$${orgIndex} AND deleted_at IS NULL`,
};

// ============ Common SELECT Fragments ============

const SELECT_FRAGMENTS = {
  // Balance calculations
  balanceDue: `(total_amount - paid_amount) AS balance_due`,

  // Common timestamp aliases
  createdByName: `u.name AS created_by_name`,
  approvedByName: `a.name AS approved_by_name`,
  modifiedByName: `m.name AS modified_by_name`,

  // Vendor details
  vendorInfo: `v.name AS vendor_display_name, v.phone AS vendor_phone, v.email AS vendor_email, v.address AS vendor_address`,

  // Product details
  productInfo: `p.name AS product_display_name, p.sku AS product_sku`,
};

// ============ Common FROM/JOIN Clauses ============

const JOIN_CLAUSES = {
  vendors: `LEFT JOIN vendors v ON v.id = <foreign_key> AND v.org_id = <org_key>`,
  createdBy: `LEFT JOIN users u ON u.id = <foreign_key>`,
  approvedBy: `LEFT JOIN users a ON a.id = <foreign_key>`,
  modifiedBy: `LEFT JOIN users m ON m.id = <foreign_key>`,
  products: `LEFT JOIN products p ON p.id = <foreign_key>`,
};

// ============ Query Template Helpers ============

/**
 * Build a complete SELECT query with common patterns
 * @param {Object} config - Configuration object
 * @returns {string} Complete SQL query
 */
const buildSelectQuery = ({
  selectClause,
  fromTable,
  joins = [],
  whereClause,
  orderBy = null,
}) => {
  let query = `SELECT ${selectClause}\nFROM ${fromTable}`;
  if (joins.length) query += `\n${joins.join('\n')}`;
  if (whereClause) query += `\nWHERE ${whereClause}`;
  if (orderBy) query += `\nORDER BY ${orderBy}`;
  return query;
};

/**
 * Build INSERT query
 * @param {string} table - Table name
 * @param {string[]} fields - Field names
 * @returns {string} Complete INSERT statement
 */
const buildInsertQuery = (table, fields) => `
  INSERT INTO ${table} (${buildColumnList(fields)})
  VALUES (${buildPlaceholders(1, fields.length)})
`;

/**
 * Build UPDATE query
 * @param {string} table - Table name
 * @param {string[]} fields - Fields to update
 * @param {string} whereClause - WHERE clause
 * @returns {string} Complete UPDATE statement
 */
const buildUpdateQuery = (table, fields, whereClause) => `
  UPDATE ${table} SET
    ${buildUpdateSet(fields)}
  ${whereClause}
`;

/**
 * Build DELETE query
 * @param {string} table - Table name
 * @param {string} whereClause - WHERE clause
 * @returns {string} Complete DELETE statement
 */
const buildDeleteQuery = (table, whereClause) => `
  DELETE FROM ${table}
  ${whereClause}
`;

// ============ Aggregation Helpers ============

/**
 * Build FILTER clause for conditional aggregation
 * @param {Object} conditions - Map of column names to conditions
 * @returns {string} FILTER clause
 */
const buildCountFilters = (conditions) => {
  const filters = Object.entries(conditions).map(([name, condition]) =>
    `COUNT(*) FILTER (WHERE ${condition}) AS ${name}`
  );
  return filters.join(',\n    ');
};

/**
 * Build SUM with FILTER for financial aggregates
 * @param {string} column - Column to sum
 * @param {string} condition - WHERE condition for FILTER
 * @param {string} alias - Alias for result
 * @returns {string} SUM clause
 */
const buildSumFilter = (column, condition, alias) =>
  `COALESCE(SUM(${column}) FILTER (WHERE ${condition}), 0) AS ${alias}`;

module.exports = {
  // Placeholder builders
  buildPlaceholders,
  buildUpdateSet,
  buildColumnList,

  // WHERE clauses
  WHERE_CLAUSES,

  // SELECT fragments
  SELECT_FRAGMENTS,

  // JOIN clauses
  JOIN_CLAUSES,

  // Query builders
  buildSelectQuery,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,

  // Aggregation helpers
  buildCountFilters,
  buildSumFilter,
};
