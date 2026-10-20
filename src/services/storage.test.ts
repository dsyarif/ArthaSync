import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage in Node.js test environment
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = String(val);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

(globalThis as any).fetch = async () => ({
  ok: true,
  json: async () => ({}),
});

import { StorageService } from './storage.ts';
import { FamilyGroup } from '../types/finance.ts';

test('Internal debt affects balances of both borrower and lender on creation and repayment', () => {
  // Set up a test family group with two members: Ayah (mem-1) and Ibu (mem-2)
  const initialGroup: FamilyGroup = {
    id: 'grp-test-1',
    name: 'Keluarga Bahagia',
    type: 'keluarga',
    members: [
      { id: 'mem-1', name: 'Ayah', role: 'kepala_keluarga', avatarColor: '#3b82f6' },
      { id: 'mem-2', name: 'Ibu', role: 'pasangan', avatarColor: '#ec4899' },
    ],
    assets: [
      { id: 'ast-ayah', name: 'BCA Ayah', type: 'bank', balance: 5000000, memberId: 'mem-1', color: '#3b82f6', updatedAt: 1 },
      { id: 'ast-ibu', name: 'Mandiri Ibu', type: 'bank', balance: 2000000, memberId: 'mem-2', color: '#ec4899', updatedAt: 1 },
    ],
    updatedAt: 1,
  };

  StorageService.saveGroups([initialGroup]);
  StorageService.setCurrentGroupId('grp-test-1');
  StorageService.saveTransactions([]);
  StorageService.saveDebts([]);

  // Case 1: Ibu (mem-2) berhutang pada Ayah (mem-1) sebesar Rp 1.000.000
  // type: 'utang', memberId: 'mem-2' (Ibu, borrower), otherMemberId: 'mem-1' (Ayah, lender)
  // lender asset: ast-ayah, borrower asset: ast-ibu
  const createdDebt = StorageService.addDebt(
    {
      type: 'utang',
      partyType: 'internal',
      memberId: 'mem-2',
      otherMemberId: 'mem-1',
      amount: 1000000,
      description: 'Pinjam untuk belanja bulanan',
      date: '2026-10-13',
      groupId: 'grp-test-1',
      assetId: 'ast-ayah',       // Rekening Ayah (Lender)
      targetAssetId: 'ast-ibu',  // Rekening Ibu (Borrower)
    },
    {
      affectAssetBalance: true,
      assetId: 'ast-ayah',
      targetAssetId: 'ast-ibu',
    }
  );

  assert.ok(createdDebt.id);

  // Check balances after loan creation:
  // Ayah gave 1.000.000 -> 5.000.000 - 1.000.000 = 4.000.000
  // Ibu received 1.000.000 -> 2.000.000 + 1.000.000 = 3.000.000
  let groups = StorageService.getGroups();
  let currentGrp = groups.find((g) => g.id === 'grp-test-1')!;
  let ayahAcc = currentGrp.assets.find((a) => a.id === 'ast-ayah')!;
  let ibuAcc = currentGrp.assets.find((a) => a.id === 'ast-ibu')!;

  assert.equal(ayahAcc.balance, 4000000, 'Saldo Ayah harus berkurang Rp 1.000.000 saat memberikan pinjaman');
  assert.equal(ibuAcc.balance, 3000000, 'Saldo Ibu harus bertambah Rp 1.000.000 saat menerima pinjaman');

  // Case 2: Ibu membayar cicilan utang ke Ayah sebesar Rp 400.000
  // Payer asset: ast-ibu, Recipient asset: ast-ayah
  const updatedDebt = StorageService.addDebtPayment(
    createdDebt.id,
    {
      amount: 400000,
      date: '2026-10-14',
      assetId: 'ast-ibu',           // Saldo Ibu (peminjam) berkurang Rp 400.000
      recipientAssetId: 'ast-ayah', // Saldo Ayah (pemberi pinjaman) bertambah Rp 400.000
      note: 'Cicilan 1',
    },
    true
  );

  assert.ok(updatedDebt);
  assert.equal(updatedDebt?.paidAmount, 400000);
  assert.equal(updatedDebt?.status, 'partial');

  // Check balances after payment:
  // Ibu paid 400.000 -> 3.000.000 - 400.000 = 2.600.000
  // Ayah received 400.000 -> 4.000.000 + 400.000 = 4.400.000
  groups = StorageService.getGroups();
  currentGrp = groups.find((g) => g.id === 'grp-test-1')!;
  ayahAcc = currentGrp.assets.find((a) => a.id === 'ast-ayah')!;
  ibuAcc = currentGrp.assets.find((a) => a.id === 'ast-ibu')!;

  assert.equal(ibuAcc.balance, 2600000, 'Saldo Ibu harus berkurang Rp 400.000 saat bayar cicilan utang');
  assert.equal(ayahAcc.balance, 4400000, 'Saldo Ayah harus bertambah Rp 400.000 saat menerima pelunasan utang');

  // Case 3: Edit cicilan utang dari Rp 400.000 menjadi Rp 500.000
  const paymentId = updatedDebt?.payments?.[0]?.id!;
  assert.ok(paymentId);

  const editedDebt = StorageService.updateDebtPayment(createdDebt.id, paymentId, {
    amount: 500000,
    date: '2026-10-15',
    note: 'Cicilan 1 (Revisi nominal)',
  });

  assert.equal(editedDebt?.paidAmount, 500000);
  groups = StorageService.getGroups();
  currentGrp = groups.find((g) => g.id === 'grp-test-1')!;
  ayahAcc = currentGrp.assets.find((a) => a.id === 'ast-ayah')!;
  ibuAcc = currentGrp.assets.find((a) => a.id === 'ast-ibu')!;

  assert.equal(ibuAcc.balance, 2500000, 'Saldo Ibu berkurang Rp 100.000 lagi karena kenaikan cicilan');
  assert.equal(ayahAcc.balance, 4500000, 'Saldo Ayah bertambah Rp 100.000 lagi karena kenaikan cicilan');

  // Case 4: Sekali Hapus Cicilan Utang (Delete Debt Payment)
  const afterDeleteDebt = StorageService.deleteDebtPayment(createdDebt.id, paymentId);
  assert.equal(afterDeleteDebt?.paidAmount, 0);
  assert.equal(afterDeleteDebt?.status, 'unpaid');
  assert.equal(afterDeleteDebt?.payments?.length, 0);

  // Check balances after payment deleted:
  // Saldo Ibu kembali ke 3.000.000
  // Saldo Ayah kembali ke 4.000.000
  groups = StorageService.getGroups();
  currentGrp = groups.find((g) => g.id === 'grp-test-1')!;
  ayahAcc = currentGrp.assets.find((a) => a.id === 'ast-ayah')!;
  ibuAcc = currentGrp.assets.find((a) => a.id === 'ast-ibu')!;

  assert.equal(ibuAcc.balance, 3000000, 'Saldo Ibu harus kembali ke Rp 3.000.000 setelah cicilan dihapus');
  assert.equal(ayahAcc.balance, 4000000, 'Saldo Ayah harus kembali ke Rp 4.000.000 setelah cicilan dihapus');
});

test('deleteDebt permanently removes debt and registers tombstone to prevent resurrection on cloud sync', () => {
  StorageService.saveDebts([]);
  const debt = StorageService.addDebt({
    groupId: 'grp-test-1',
    type: 'utang',
    partyType: 'external',
    memberId: 'mem-1',
    otherPersonName: 'Teman',
    amount: 500000,
    date: '2026-10-20',
    description: 'Pinjaman sementara',
  }, { affectAssetBalance: false });

  assert.equal(StorageService.getDebts().length, 1);
  const debtId = debt.id;

  // Delete debt
  const success = StorageService.deleteDebt(debtId);
  assert.equal(success, true);
  assert.equal(StorageService.getDebts().length, 0);

  // Deleted debt id must be tracked in deletedDebtIds
  const deletedIds = StorageService.getDeletedDebtIds();
  assert.ok(deletedIds.includes(debtId), 'deletedDebtIds must include the deleted debt id');

  // Simulate remote sync returning the old deleted debt
  (StorageService as any).mergeRemoteStore({
    debts: [debt],
  });

  // Debt must still NOT be restored because of tombstone check
  assert.equal(StorageService.getDebts().length, 0, 'Deleted debt must not be restored by remote sync');
});
