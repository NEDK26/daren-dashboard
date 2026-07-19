const test = require('node:test');
const assert = require('node:assert/strict');

const { generateRandomPassword, validatePassword } = require('../services/userAccounts');

test('initial passwords are 10-character alphanumeric codes', () => {
  const password = generateRandomPassword();
  assert.match(password, /^[A-Za-z0-9]{10}$/);
});

test('custom passwords require at least 8 characters', () => {
  assert.equal(validatePassword('short').ok, false);
  assert.equal(validatePassword('long-enough').ok, true);
  assert.equal(validatePassword('达人人', '达人人').ok, false);
});
