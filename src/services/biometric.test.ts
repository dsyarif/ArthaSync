import test from 'node:test';
import assert from 'node:assert/strict';
import { BiometricService, DEFAULT_APP_PASSWORD } from './biometric';

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

test('Security system defaults to password Yuga1418 and locked state', () => {
  mockStorage['arthasync_security_settings_v1'] = '';
  delete mockStorage['arthasync_security_settings_v1'];

  assert.equal(DEFAULT_APP_PASSWORD, 'Yuga1418');

  BiometricService.lockApp();
  const settings = BiometricService.getSettings();
  assert.equal(settings.password, 'Yuga1418');
  assert.equal(settings.isLocked, true);
});

test('verifyPassword rejects invalid password and keeps app locked', () => {
  BiometricService.lockApp();
  assert.equal(BiometricService.getSettings().isLocked, true);

  const wrong = BiometricService.verifyPassword('WrongPass99');
  assert.equal(wrong, false);
  assert.equal(BiometricService.getSettings().isLocked, true);
});

test('verifyPassword accepts Yuga1418 and unlocks app', () => {
  BiometricService.lockApp();
  assert.equal(BiometricService.getSettings().isLocked, true);

  const success = BiometricService.verifyPassword('Yuga1418');
  assert.equal(success, true);
  assert.equal(BiometricService.getSettings().isLocked, false);
});

test('Custom password can be configured and verified', () => {
  const current = BiometricService.getSettings();
  BiometricService.saveSettings({ ...current, password: 'NewCustomSecret987' });
  BiometricService.lockApp();

  assert.equal(BiometricService.verifyPassword('Yuga1418'), false);
  assert.equal(BiometricService.verifyPassword('NewCustomSecret987'), true);
  assert.equal(BiometricService.getSettings().isLocked, false);

  // Restore default password for remaining tests
  BiometricService.saveSettings({ ...current, password: DEFAULT_APP_PASSWORD });
});

test('verifyPassword rejects old numeric PIN 1234 and requires Yuga1418', () => {
  BiometricService.lockApp();
  assert.equal(BiometricService.getSettings().isLocked, true);

  const pinRejected = BiometricService.verifyPassword('1234');
  assert.equal(pinRejected, false);
  assert.equal(BiometricService.getSettings().isLocked, true);

  const passwordOk = BiometricService.verifyPassword('Yuga1418');
  assert.equal(passwordOk, true);
  assert.equal(BiometricService.getSettings().isLocked, false);
});
