# SQL Query Refactoring Guide

## Overview
This guide explains how to split large SQL lines into reusable components, making code more maintainable and DRY (Don't Repeat Yourself).

## Problem: Before Refactoring
```javascript
const getAPInvoice = q(`
  SELECT i.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
  WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL
`);
```

**Issues:**
- Long SELECT with repeated patterns
- JOINs duplicated across multiple queries
- Field lists not reusable
- Hard to maintain consistency

## Solution: Component-Based Approach

### 1. Extract Reusable SELECT Fragments
```javascript
const SELECT_INVOICE_DETAIL = `
  SELECT i.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
`;
```

### 2. Extract Common FROM/JOIN Clauses
```javascript
const FROM_INVOICES_FULL = `
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
`;
```

### 3. Extract Field Lists
```javascript
const INVOICE_FIELDS = [
  'id', 'org_id', 'doc_no', 'vendor_id', 'vendor_name',
  'vendor_gstin', 'vendor_inv_no', 'po_ref', 'gr_ref',
  'invoice_date', 'posting_date', 'due_date', 'currency',
  'payment_terms', 'subtotal', 'discount_pct',
  'discount_amount', 'tax_amount', 'total_amount',
  'notes', 'created_by'
];
```

### 4. Use Helper Functions
```javascript
// Instead of manually building placeholders
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)

// Use:
VALUES (${buildPlaceholders(1, INVOICE_FIELDS.length)})
```

### 5. Compose Queries from Components
```javascript
const getAPInvoice = q(`
  ${SELECT_INVOICE_DETAIL}
  ${FROM_INVOICES_FULL}
  WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL
`);
```

## Helper Functions

### buildPlaceholders(startIndex, count)
Generates parameterized placeholders for VALUES or WHERE clauses.

```javascript
buildPlaceholders(1, 5)  // Returns: "$1,$2,$3,$4,$5"
buildPlaceholders(3, 3)  // Returns: "$3,$4,$5"
```

### buildUpdateSet(fields, startIndex)
Generates UPDATE SET clause with proper parameter indexing.

```javascript
buildUpdateSet(['name', 'email'], 3)
// Returns: "name=$3, email=$4"
```

### buildColumnList(fields)
Joins field array into SQL column list.

```javascript
buildColumnList(['id', 'name', 'email'])
// Returns: "id, name, email"
```

## Reusable Components

### WHERE Clauses
```javascript
WHERE_CLAUSES.orgNotDeleted()
// WHERE i.org_id=$1 AND i.deleted_at IS NULL

WHERE_CLAUSES.orgById(1, 2)
// WHERE id=$1 AND org_id=$2 AND deleted_at IS NULL
```

### SELECT Fragments
```javascript
SELECT_FRAGMENTS.balanceDue
// (total_amount - paid_amount) AS balance_due

SELECT_FRAGMENTS.vendorInfo
// v.name AS vendor_display_name, v.phone AS vendor_phone, ...
```

## Real-World Example

### File: apInvoices.js

**Old Approach:**
```javascript
const listAPInvoices = q(`
  SELECT i.*, v.name AS vendor_display_name, u.name AS created_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  WHERE i.org_id=$1 AND i.deleted_at IS NULL
  ORDER BY i.created_at DESC
`);

const getAPInvoice = q(`
  SELECT i.*, v.name AS vendor_display_name, v.phone AS vendor_phone,
    v.email AS vendor_email, v.address AS vendor_address,
    u.name AS created_by_name, a.name AS approved_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN users a ON a.id = i.approved_by
  WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL
`);
```

**New Approach:**
```javascript
const SELECT_INVOICE_BASE = `
  SELECT i.*, v.name AS vendor_display_name, u.name AS created_by_name,
    (i.total_amount - i.paid_amount) AS balance_due
`;

const FROM_INVOICES_WITH_VENDORS = `
  FROM ap_invoices i
  LEFT JOIN vendors v ON v.id = i.vendor_id AND v.org_id = i.org_id
  LEFT JOIN users u ON u.id = i.created_by
`;

const listAPInvoices = q(`
  ${SELECT_INVOICE_BASE}
  ${FROM_INVOICES_WITH_VENDORS}
  WHERE i.org_id=$1 AND i.deleted_at IS NULL
  ORDER BY i.created_at DESC
`);

const getAPInvoice = q(`
  ${SELECT_INVOICE_DETAIL}
  ${FROM_INVOICES_FULL}
  WHERE i.id=$1 AND i.org_id=$2 AND i.deleted_at IS NULL
`);
```

## Best Practices

### 1. Group Related Fragments
```javascript
// ✅ Good
const SELECT_INVOICE_BASE = `...`;
const SELECT_INVOICE_DETAIL = `...`;
const FROM_INVOICES_BASIC = `...`;
const FROM_INVOICES_FULL = `...`;

// ❌ Bad
const SEL1 = `...`;
const FROM1 = `...`;
const SEL2 = `...`;
```

### 2. Use Meaningful Names
```javascript
// ✅ Good
const INVOICE_FIELDS = ['id', 'org_id', ...];

// ❌ Bad
const FIELDS = ['id', 'org_id', ...];
const F = ['id', 'org_id', ...];
```

### 3. Comment Component Sections
```javascript
// ============ SQL Fragment Builders ============
const SELECT_INVOICE_BASE = `...`;

// ============ Insert/Update Field Lists ============
const INVOICE_FIELDS = [...];

// ============ Helper: Build Placeholders ============
const buildPlaceholders = (startIndex = 1, count) => { ... };
```

### 4. Keep Components Focused
Each component should handle ONE responsibility:
- Field lists define WHAT columns
- JOINs define HOW tables connect
- WHERE clauses define WHICH rows
- ORDER BY defines SORT order

### 5. Use sqlBuilder.js for Shared Utilities
Import and use shared helpers across all statement files:

```javascript
const { buildPlaceholders, buildUpdateSet, WHERE_CLAUSES } = require('../sqlBuilder');
```

## Applying to Other Files

### Pattern for apCreditMemos.js
```javascript
const { buildPlaceholders, buildUpdateSet } = require('../sqlBuilder');

// Define field lists
const CREDIT_MEMO_FIELDS = ['id', 'org_id', ...];

// Define fragments
const SELECT_CREDIT_MEMO = `SELECT c.*, v.name AS vendor_name, ...`;
const FROM_CREDIT_MEMOS = `FROM ap_credit_memos c LEFT JOIN vendors v ON ...`;

// Build queries
const getCreditMemo = q(`
  ${SELECT_CREDIT_MEMO}
  ${FROM_CREDIT_MEMOS}
  WHERE c.id=$1 AND c.org_id=$2
`);
```

## Migration Checklist

- [ ] Extract repeated SELECT columns into constants
- [ ] Extract repeated FROM/JOIN clauses into constants
- [ ] Extract field lists used in INSERT/UPDATE into arrays
- [ ] Create helper functions for placeholder generation
- [ ] Apply WHERE_CLAUSES from sqlBuilder.js
- [ ] Test all queries work identically
- [ ] Update other statement files using same pattern
- [ ] Document any file-specific components

## Benefits

✅ **Reduced Code Duplication** - JOINs and SELECTs defined once
✅ **Easier Maintenance** - Change pattern in one place, applies everywhere
✅ **Better Readability** - Query structure is clear and explicit
✅ **Consistency** - Field lists guaranteed to match across queries
✅ **Reusability** - Components shared across multiple queries
✅ **Scalability** - Easy to add new queries following the pattern
