# API Contract: {Service Name}
**Version:** v{N}  
**Date:** YYYY-MM-DD  
**Author:** {Name}  
**ATS Project:** {Project Name}  
**Base URL:** `https://api.{domain}.com/v{N}`  
**Status:** Draft | Review | Approved | Deprecated

---

## Overview

> One paragraph: what this API does, who consumes it (web app / mobile app / partner / internal service), and any key design decisions.

**Consumers:**
- Web App (Next.js dashboard)
- Mobile App (React Native / Expo)
- {Partner / Third Party}

**Authentication:** OAuth 2.0 Bearer JWT (RS256)  
**Content-Type:** `application/json`  
**Rate Limiting:** 100 req/min per user (default) — per-endpoint overrides below  
**API Versioning:** URL-based (`/v1/`, `/v2/`) — sunset notice 6 months in advance

---

## Authentication

```
Authorization: Bearer {access_token}

Token source:    POST /auth/token (OAuth 2.0 token endpoint)
Token expiry:    15 minutes (access) | 7 days (refresh, rotated on use)
Refresh:         POST /auth/token/refresh  { "refreshToken": "..." }
Revocation:      POST /auth/logout
```

**Error responses for auth failures:**
```json
// 401 — No token or invalid
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Authentication required", "requestId": "req_abc" } }

// 403 — Valid token, no permission
{ "success": false, "error": { "code": "FORBIDDEN", "message": "Insufficient permissions", "requestId": "req_abc" } }
```

---

## Standard Response Envelopes

```json
// Success — single resource
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "req_abc123", "timestamp": "2026-05-07T10:30:00Z" }
}

// Success — list (paginated)
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "hasMore": true,
    "total": 1430
  },
  "meta": { "requestId": "req_abc123" }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message safe to display",
    "details": [
      { "field": "email", "issue": "Must be a valid email address" }
    ],
    "requestId": "req_abc123"
  }
}
```

---

## Endpoints

---

### POST `/auth/register`

**Description:** Register a new user account.  
**Auth required:** No  
**Rate limit:** 5 req/min per IP  
**Idempotent:** No

#### Request Body

```json
{
  "email":     "string | required | format:email | max:255",
  "password":  "string | required | min:12 | max:128",
  "name":      "string | required | min:2 | max:100 | trim",
  "phone":     "string | optional | E.164 format (+91XXXXXXXXXX)"
}
```

#### Validation Rules

| Field | Type | Required | Rules |
|---|---|---|---|
| email | string | ✅ | Valid email format, lowercase, max 255 chars |
| password | string | ✅ | Min 12 chars, max 128 chars, checked against HaveIBeenPwned |
| name | string | ✅ | Min 2, max 100, trim whitespace, alphanumeric + spaces |
| phone | string | ❌ | E.164 format if provided, validated against region |

#### Response — 201 Created

```json
{
  "success": true,
  "data": {
    "userId": "usr_01j8kx...",
    "email": "user@example.com",
    "name": "Jane Doe",
    "emailVerified": false,
    "createdAt": "2026-05-07T10:30:00Z"
  },
  "meta": { "requestId": "req_abc123" }
}
```

#### Error Responses

| Status | Code | Trigger |
|---|---|---|
| 400 | VALIDATION_ERROR | Schema validation failed |
| 409 | EMAIL_ALREADY_EXISTS | Email already registered |
| 422 | PASSWORD_TOO_WEAK | Password found in breach database |
| 429 | RATE_LIMIT_EXCEEDED | > 5 attempts/min from same IP |

#### Security Notes
- Password hashed with Argon2id before storage — never stored plain
- Email normalised to lowercase before uniqueness check
- Response never includes password hash
- Verification email sent async (response not blocked on email delivery)

---

### POST `/auth/login`

**Description:** Authenticate a user and return tokens.  
**Auth required:** No  
**Rate limit:** 5 req/min per IP; account lock after 10 failures  
**Idempotent:** No

#### Request Body

```json
{
  "email":    "string | required | format:email",
  "password": "string | required",
  "mfaCode":  "string | optional | 6-digit TOTP"
}
```

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "userId": "usr_01j8kx...",
      "email": "user@example.com",
      "name": "Jane Doe",
      "roles": ["user"],
      "mfaEnabled": true
    }
  },
  "meta": { "requestId": "req_abc123" }
}
```

*Note: `refreshToken` delivered via Set-Cookie (httpOnly, Secure, SameSite=Strict) — not in response body.*

#### Error Responses

| Status | Code | Trigger |
|---|---|---|
| 400 | VALIDATION_ERROR | Schema failed |
| 401 | INVALID_CREDENTIALS | Wrong email/password |
| 401 | MFA_REQUIRED | Valid credentials, MFA code missing |
| 401 | MFA_INVALID | MFA code wrong |
| 423 | ACCOUNT_LOCKED | Too many failures |
| 429 | RATE_LIMIT_EXCEEDED | IP rate limit hit |

#### Security Notes
- Identical error message for wrong email vs wrong password (prevent user enumeration)
- Failed attempts logged with IP and timestamp for anomaly detection
- Successful login invalidates all previous refresh tokens from untrusted devices

---

### GET `/users/{userId}`

**Description:** Get user profile by ID.  
**Auth required:** Yes (Bearer JWT)  
**Permissions:** Own profile (user) | Any profile (admin)  
**Rate limit:** 60 req/min per user  
**Idempotent:** Yes

#### Path Parameters

| Param | Type | Rules |
|---|---|---|
| userId | string | UUID v7 format |

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "userId": "usr_01j8kx...",
    "email": "u***@example.com",
    "name": "Jane Doe",
    "phone": "+91**XXXXX90",
    "roles": ["user"],
    "mfaEnabled": true,
    "emailVerified": true,
    "createdAt": "2026-05-07T10:30:00Z",
    "lastLoginAt": "2026-05-07T09:00:00Z"
  },
  "meta": { "requestId": "req_abc123" }
}
```

#### Error Responses

| Status | Code | Trigger |
|---|---|---|
| 401 | UNAUTHORIZED | No / invalid token |
| 403 | FORBIDDEN | Requesting another user's profile without admin role |
| 404 | USER_NOT_FOUND | User does not exist or is deleted |

#### Security Notes
- Email and phone masked in response (PII minimisation)
- Admin accessing user profile creates audit log entry
- Deleted users return 404, not 403 (avoids confirming existence post-deletion)

---

### GET `/users`

**Description:** List users (admin only).  
**Auth required:** Yes | **Permission:** admin  
**Rate limit:** 20 req/min  
**Pagination:** Cursor-based

#### Query Parameters

| Param | Type | Default | Rules |
|---|---|---|---|
| cursor | string | null | Opaque cursor from previous response |
| limit | integer | 20 | Min 1, Max 100 |
| search | string | null | Max 100 chars, searches name + email |
| role | string | null | Enum: user, admin, support |
| sort | string | created_at:desc | created_at:asc/desc, name:asc/desc |

#### Response — 200 OK

```json
{
  "success": true,
  "data": [
    { "userId": "...", "email": "u***@...", "name": "...", "roles": ["user"], "createdAt": "..." }
  ],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "hasMore": true,
    "total": 4320
  },
  "meta": { "requestId": "req_abc123" }
}
```

#### Security Notes
- Only admins can access this endpoint; verified server-side
- PII masked in list responses (email, phone)
- Search term sanitised; uses parameterised LIKE query (not full-text injection)
- Admin access logged with search term, result count, timestamp

---

### PATCH `/users/{userId}`

**Description:** Update user profile fields.  
**Auth required:** Yes | **Permission:** Own profile or admin  
**Rate limit:** 10 req/min  
**Idempotent:** Yes (same patch applied twice = same result)

#### Request Body (all fields optional)

```json
{
  "name":  "string | optional | min:2 | max:100",
  "phone": "string | optional | E.164 format | null to remove"
}
```

**Not patchable via this endpoint:** email, password, roles, userId — separate endpoints for these.

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "userId": "usr_01j8kx...",
    "name": "Jane Updated",
    "phone": "+91**XXXXX90",
    "updatedAt": "2026-05-07T11:00:00Z"
  },
  "meta": { "requestId": "req_abc123" }
}
```

---

### DELETE `/users/{userId}`

**Description:** Soft-delete a user account.  
**Auth required:** Yes | **Permission:** Own account or admin  
**Rate limit:** 5 req/hour  
**Idempotent:** Yes  
**Re-auth required:** Yes — requires fresh token (< 5 min old) or password confirmation

#### Response — 204 No Content

*Empty body on success.*

#### Security Notes
- Soft delete only (sets `deleted_at`); hard delete runs after 30-day retention window
- Deletes: sessions invalidated immediately, refresh tokens revoked
- Related data anonymised per GDPR/DPDP right to erasure within 30 days
- Deletion request logged with requestor ID + timestamp for compliance
- Admin deleting user triggers email notification to deleted user's email

---

## Webhook Events (Outbound)

*Events delivered to your registered webhook URL via HTTPS POST.*

**Signature header:** `X-ATS-Signature: sha256={HMAC-SHA256 of raw body using your webhook secret}`  
**Retry policy:** 3 retries at 5s → 30s → 5min exponential  
**Timeout:** Your endpoint must respond within 5s  
**Idempotency:** Each event has a unique `eventId` — handle duplicates

```json
// Payload shape (all events)
{
  "eventId":   "evt_01j8kx...",
  "eventType": "user.created",
  "version":   "1.0",
  "timestamp": "2026-05-07T10:30:00Z",
  "data": { ... }
}
```

### Event Catalogue

| Event Type | Trigger | Data Payload |
|---|---|---|
| `user.created` | New registration | `{ userId, email, createdAt }` |
| `user.verified` | Email verified | `{ userId, verifiedAt }` |
| `user.deleted` | Account deleted | `{ userId, deletedAt }` |
| `payment.completed` | Payment success | `{ paymentId, userId, amount, currency }` |
| `payment.failed` | Payment failure | `{ paymentId, userId, reason }` |
| `{add more}` | | |

---

## Error Code Reference

| Code | HTTP | Description |
|---|---|---|
| VALIDATION_ERROR | 400 | Request schema validation failed |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| MFA_REQUIRED | 401 | Valid credentials but MFA not provided |
| MFA_INVALID | 401 | MFA code wrong or expired |
| FORBIDDEN | 403 | Authenticated but not authorised |
| NOT_FOUND | 404 | Resource does not exist |
| METHOD_NOT_ALLOWED | 405 | HTTP method not supported |
| CONFLICT | 409 | Duplicate resource |
| GONE | 410 | Resource permanently deleted |
| UNPROCESSABLE | 422 | Business rule violation |
| ACCOUNT_LOCKED | 423 | Too many failed attempts |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit hit |
| INTERNAL_ERROR | 500 | Unexpected server error |
| SERVICE_UNAVAILABLE | 503 | Planned downtime or circuit open |

---

## Deprecation Log

| Version | Endpoint | Sunset Date | Replaced By |
|---|---|---|---|
| v1 | GET /users/list | 2026-12-31 | GET /users (cursor-based) |
| {v} | {endpoint} | {date} | {replacement} |

---

## Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-07 | Initial draft |
| {v} | {date} | {changes} |

---

*ATS API Contract Template v2.13 | Store in: /docs/api/{service-name}-contract.md*  
*Generate OpenAPI 3.1 YAML from this document for Swagger UI*
