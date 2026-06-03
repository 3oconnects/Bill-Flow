// backend/tests/auth.test.js
'use strict';

// Set env before loading modules
process.env.JWT_SECRET = 'test-secret-for-jest-only';
process.env.NODE_ENV   = 'test';

const { hashPassword, checkPassword, createSession } = require('../auth');
const jwt = require('jsonwebtoken');

describe('Auth utilities', () => {
  test('hashPassword produces bcrypt hash', () => {
    const hash = hashPassword('MyP@ssword123');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test('checkPassword accepts correct password', () => {
    const hash = hashPassword('Secret123!');
    expect(checkPassword('Secret123!', hash)).toBe(true);
  });

  test('checkPassword rejects wrong password', () => {
    const hash = hashPassword('Secret123!');
    expect(checkPassword('WrongPassword', hash)).toBe(false);
  });

  test('createSession returns a valid JWT', async () => {
    const token   = await createSession('user-1', 'org-1');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.uid).toBe('user-1');
    expect(decoded.oid).toBe('org-1');
  });

  test('JWT contains both uid and oid', async () => {
    const token   = await createSession('user-abc', 'org-xyz');
    const decoded = jwt.decode(token);
    expect(decoded).toMatchObject({ uid: 'user-abc', oid: 'org-xyz' });
  });

  test('two different users get different tokens', async () => {
    const t1 = await createSession('user-1', 'org-1');
    const t2 = await createSession('user-2', 'org-2');
    expect(t1).not.toBe(t2);
  });
});
