import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  parseRupiahInput,
  calculateMonthlyStats,
  calculateBudgetStatus,
  filterTransactions,
  groupTransactionsByDate,
  generateCsvData,
  resolveItemConflict,
  calculateAssetOverview,
  calculateDebtSummary,
  calculateRealNetWorth,
  formatIndonesianDate,
  getEligibleAssetsForMember,
  getMemberColorTheme,
} from './finance.ts';
import { AssetAccount, Category, DebtRecord, FamilyMember, Transaction } from '../types/finance.ts';

test('formatRupiah formats currency correctly', () => {
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(15000), 'Rp 15.000');
  assert.equal(formatRupiah(2500000), 'Rp 2.500.000');
  assert.equal(formatRupiah(100000000), 'Rp 100.000.000');
  assert.equal(formatRupiah(-50000), '-Rp 50.000');
  assert.equal(formatRupiah(150000, { withPrefix: false }), '150.000');
  assert.equal(formatRupiah(2500000, { compact: true }), 'Rp 2.5jt');
});

test('parseRupiahInput cleans and parses user string input', () => {
  assert.equal(parseRupiahInput('Rp 150.000'), 150000);
  assert.equal(parseRupiahInput('25.000.000'), 25000000);
  assert.equal(parseRupiahInput(''), 0);
  assert.equal(parseRupiahInput('abc'), 0);
  assert.equal(parseRupiahInput('Rp 500'), 500);
});

test('calculateMonthlyStats aggregates expenses, categories, and member totals', () => {
  const dummyCategories: Category[] = [
    { id: 'cat-1', name: 'Makanan', icon: 'Utensils', color: '#f97316', monthlyBudget: 1500000, updatedAt: 1 },
    { id: 'cat-2', name: 'Transport', icon: 'Car', color: '#3b82f6', monthlyBudget: 500000, updatedAt: 1 },
  ];

  const dummyMembers: FamilyMember[] = [
    { id: 'mem-1', name: 'Ayah', role: 'kepala_keluarga', avatarColor: '#3b82f6' },
    { id: 'mem-2', name: 'Ibu', role: 'pasangan', avatarColor: '#ec4899' },
  ];

  const dummyTransactions: Transaction[] = [
    {
      id: 'tx-1',
      amount: 50000,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Makan siang',
      date: '2026-10-05',
      time: '12:30',
      paymentMethod: 'qris_ewallet',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 100,
    },
    {
      id: 'tx-2',
      amount: 150000,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Makan malam keluarga',
      date: '2026-10-05',
      time: '19:00',
      paymentMethod: 'tunai',
      groupId: 'grp-1',
      memberId: 'mem-2',
      syncStatus: 'synced',
      updatedAt: 101,
    },
    {
      id: 'tx-3',
      amount: 50000,
      type: 'expense',
      categoryId: 'cat-2',
      description: 'Bensin motor',
      date: '2026-10-10',
      time: '08:00',
      paymentMethod: 'tunai',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 102,
    },
    {
      id: 'tx-4',
      amount: 5000000,
      type: 'income',
      categoryId: 'cat-salary',
      description: 'Gaji Bulanan',
      date: '2026-10-01',
      time: '09:00',
      paymentMethod: 'transfer_bank',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 103,
    },
  ];

  const stats = calculateMonthlyStats(dummyTransactions, dummyCategories, dummyMembers, 2026, 10);

  assert.equal(stats.totalSpent, 250000);
  assert.equal(stats.totalIncome, 5000000);
  assert.equal(stats.netSavings, 4750000);
  assert.equal(stats.categoryBreakdown.length, 2);
  assert.equal(stats.categoryBreakdown[0].categoryName, 'Makanan');
  assert.equal(stats.categoryBreakdown[0].amount, 200000);
  assert.equal(stats.categoryBreakdown[0].percentage, 80); // 200k / 250k = 80%

  assert.equal(stats.memberBreakdown.length, 2);
  // Ibu spent 150k, Ayah spent 100k
  assert.equal(stats.memberBreakdown[0].memberName, 'Ibu');
  assert.equal(stats.memberBreakdown[0].amount, 150000);
});

test('calculateBudgetStatus computes warning and over budget flags', () => {
  const safe = calculateBudgetStatus(500000, 1000000);
  assert.equal(safe.percentage, 50);
  assert.equal(safe.status, 'safe');
  assert.equal(safe.isOverBudget, false);

  const warning = calculateBudgetStatus(850000, 1000000);
  assert.equal(warning.percentage, 85);
  assert.equal(warning.status, 'warning');
  assert.equal(warning.isOverBudget, false);

  const danger = calculateBudgetStatus(1200000, 1000000);
  assert.equal(danger.percentage, 120);
  assert.equal(danger.status, 'danger');
  assert.equal(danger.isOverBudget, true);
});

test('filterTransactions matches category, member, and search query', () => {
  const txList: Transaction[] = [
    {
      id: 'tx-1',
      amount: 30000,
      type: 'expense',
      categoryId: 'c-1',
      description: 'Kopi Susu Senja',
      date: '2026-10-12',
      time: '15:00',
      paymentMethod: 'qris_ewallet',
      groupId: 'g-1',
      memberId: 'm-1',
      syncStatus: 'synced',
      updatedAt: 1,
    },
    {
      id: 'tx-2',
      amount: 75000,
      type: 'expense',
      categoryId: 'c-2',
      description: 'Tiket Bioskop',
      date: '2026-10-14',
      time: '19:30',
      paymentMethod: 'qris_ewallet',
      groupId: 'g-1',
      memberId: 'm-2',
      syncStatus: 'synced',
      updatedAt: 2,
    },
  ];

  const searchFiltered = filterTransactions(txList, { searchQuery: 'kopi' });
  assert.equal(searchFiltered.length, 1);
  assert.equal(searchFiltered[0].id, 'tx-1');

  const catFiltered = filterTransactions(txList, { categoryId: 'c-2' });
  assert.equal(catFiltered.length, 1);
  assert.equal(catFiltered[0].id, 'tx-2');
});

test('generateCsvData includes UTF-8 BOM and correct headers', () => {
  const csv = generateCsvData([], [], []);
  assert.ok(csv.startsWith('\uFEFF"ID Transaksi"'));
  assert.ok(csv.includes('"Nominal (IDR)"'));
});

test('resolveItemConflict prefers higher updatedAt timestamp', () => {
  const local = { id: 'item-1', updatedAt: 200, title: 'Baru' };
  const remote = { id: 'item-1', updatedAt: 100, title: 'Lama' };
  const resolved = resolveItemConflict(local, remote);
  assert.equal(resolved.title, 'Baru');
});

test('calculateAssetOverview sums liquid and investment assets correctly', () => {
  const assets = [
    { id: '1', name: 'Dompet', type: 'kas' as const, institution: 'Cash', balance: 500000, color: '#10b981', updatedAt: 1 },
    { id: '2', name: 'BCA', type: 'bank' as const, institution: 'BCA', balance: 15000000, color: '#3b82f6', updatedAt: 1 },
    { id: '3', name: 'GoPay', type: 'ewallet' as const, institution: 'GoPay', balance: 1000000, color: '#06b6d4', updatedAt: 1 },
    { id: '4', name: 'Emas', type: 'investasi' as const, institution: 'Bibit', balance: 25000000, color: '#f59e0b', updatedAt: 1 },
  ];

  const overview = calculateAssetOverview(assets);
  assert.equal(overview.liquidAssets, 16500000); // 500k + 15M + 1M
  assert.equal(overview.investmentAssets, 25000000);
  assert.equal(overview.totalAssets, 41500000);
  assert.equal(overview.byType.kas, 500000);
  assert.equal(overview.byType.bank, 15000000);
});

test('getMemberColorTheme generates consistent styling classes', () => {
  const blueTheme = getMemberColorTheme('#3b82f6');
  assert.equal(blueTheme.primary, '#2563eb');
  assert.ok(blueTheme.text.includes('text-blue'));

  const pinkTheme = getMemberColorTheme('#ec4899');
  assert.equal(pinkTheme.primary, '#e11d48');
  assert.ok(pinkTheme.text.includes('text-rose'));

  const greenTheme = getMemberColorTheme('#10b981');
  assert.equal(greenTheme.primary, '#059669');
  assert.ok(greenTheme.text.includes('text-emerald'));
});

test('filterTransactions excludes soft-deleted transactions', () => {
  const list: Transaction[] = [
    {
      id: 'tx-active',
      amount: 10000,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Active Tx',
      date: '2026-10-18',
      time: '10:00',
      paymentMethod: 'tunai',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 1,
    },
    {
      id: 'tx-deleted',
      amount: 50000,
      type: 'expense',
      categoryId: 'cat-1',
      description: 'Deleted Tx',
      date: '2026-10-18',
      time: '11:00',
      paymentMethod: 'tunai',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      isDeleted: true,
      updatedAt: 2,
    },
  ];

  const filtered = filterTransactions(list, { groupId: 'grp-1' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'tx-active');
});

test('filterTransactions filters correctly by assetId', () => {
  const list: Transaction[] = [
    {
      id: 'tx-bca',
      amount: 100000,
      type: 'expense',
      categoryId: 'cat-food',
      description: 'Makan BCA',
      date: '2026-10-18',
      time: '12:00',
      paymentMethod: 'transfer_bank',
      assetId: 'ast-bca',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 1,
    },
    {
      id: 'tx-cash',
      amount: 25000,
      type: 'expense',
      categoryId: 'cat-transport',
      description: 'Parkir Tunai',
      date: '2026-10-18',
      time: '13:00',
      paymentMethod: 'tunai',
      assetId: 'ast-cash',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 2,
    },
  ];

  const bcaOnly = filterTransactions(list, { assetId: 'ast-bca' });
  assert.equal(bcaOnly.length, 1);
  assert.equal(bcaOnly[0].id, 'tx-bca');

  const cashOnly = filterTransactions(list, { assetId: 'ast-cash' });
  assert.equal(cashOnly.length, 1);
  assert.equal(cashOnly[0].id, 'tx-cash');
});

test('generateCsvData includes Rekening / Aset column when assets provided', () => {
  const tx: Transaction[] = [
    {
      id: 'tx-1',
      amount: 50000,
      type: 'expense',
      categoryId: 'cat-food',
      description: 'Makan',
      date: '2026-10-18',
      time: '12:00',
      paymentMethod: 'transfer_bank',
      assetId: 'ast-1',
      groupId: 'grp-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: 1,
    },
  ];
  const assets = [
    { id: 'ast-1', name: 'BCA Utama', type: 'bank' as const, institution: 'Bank BCA', balance: 5000000, color: '#2563eb', updatedAt: 1 },
  ];
  const csv = generateCsvData(tx, [], [], assets);
  assert.ok(csv.includes('"Rekening / Aset"'));
  assert.ok(csv.includes('"BCA Utama (Bank BCA)"'));
});

test('calculateAssetOverview filters by all, joint, or specific member', () => {
  const assets: AssetAccount[] = [
    { id: 'ast-1', name: 'Rekening Bersama', type: 'bank', balance: 10000000, color: '#3b82f6', updatedAt: 1 },
    { id: 'ast-2', name: 'Dompet Ayah', type: 'kas', balance: 500000, memberId: 'mem-1', color: '#10b981', updatedAt: 1 },
    { id: 'ast-3', name: 'Tabungan Ibu', type: 'bank', balance: 2000000, memberId: 'mem-2', color: '#ec4899', updatedAt: 1 },
  ];

  const allOverview = calculateAssetOverview(assets, 'all');
  assert.equal(allOverview.totalAssets, 12500000);
  assert.equal(allOverview.accounts.length, 3);

  const jointOverview = calculateAssetOverview(assets, 'joint');
  assert.equal(jointOverview.totalAssets, 10000000);
  assert.equal(jointOverview.accounts.length, 1);
  assert.equal(jointOverview.accounts[0].id, 'ast-1');

  const ayahOverview = calculateAssetOverview(assets, 'mem-1');
  assert.equal(ayahOverview.totalAssets, 500000);
  assert.equal(ayahOverview.accounts.length, 1);
  assert.equal(ayahOverview.accounts[0].id, 'ast-2');

  const ibuOverview = calculateAssetOverview(assets, 'mem-2');
  assert.equal(ibuOverview.totalAssets, 2000000);
  assert.equal(ibuOverview.accounts.length, 1);
  assert.equal(ibuOverview.accounts[0].id, 'ast-3');
});

test('calculateDebtSummary computes receivables, payables, and net balance correctly', () => {
  const debts: DebtRecord[] = [
    {
      id: 'd-1',
      groupId: 'grp-1',
      type: 'piutang', // Piutang: kita meminjamkan ke pihak luar
      partyType: 'external',
      otherPartyName: 'Rudi',
      amount: 1000000,
      paidAmount: 200000,
      status: 'partial',
      startDate: '2026-10-01',
      dueDate: '2026-12-01',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'd-2',
      groupId: 'grp-1',
      type: 'utang', // Utang: kita meminjam dari anggota lain
      partyType: 'family_member',
      lenderMemberId: 'mem-2',
      borrowerMemberId: 'mem-1',
      amount: 500000,
      paidAmount: 0,
      status: 'pending',
      startDate: '2026-10-01',
      dueDate: '2026-11-01',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'd-3',
      groupId: 'grp-1',
      type: 'utang', // Utang sudah lunas
      partyType: 'external',
      otherPartyName: 'Toko Elektronik',
      amount: 300000,
      paidAmount: 300000,
      status: 'paid',
      startDate: '2026-09-01',
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  const summary = calculateDebtSummary(debts);

  // Remaining piutang: 1,000,000 - 200,000 = 800,000
  assert.equal(summary.totalReceivable, 800000);

  // Remaining utang: 500,000 (d-3 is paid so 0 remaining)
  assert.equal(summary.totalPayable, 500000);

  // Net balance: 800,000 - 500,000 = 300,000
  assert.equal(summary.netBalance, 300000);

  // Counts
  assert.equal(summary.unpaidCount, 2);
  assert.equal(summary.paidCount, 1);
});

test('calculateRealNetWorth computes True Net Worth (Saldo + Piutang - Utang) and isolates joint debts from personal member', () => {
  const assets: AssetAccount[] = [
    { id: 'ast-1', name: 'Rekening Bersama', type: 'bank', balance: 5000000, color: '#3b82f6', updatedAt: 1 },
    { id: 'ast-2', name: 'Dompet Ayah', type: 'kas', balance: 1000000, memberId: 'mem-1', color: '#10b981', updatedAt: 1 },
  ];

  const debts: DebtRecord[] = [
    {
      id: 'd-1',
      groupId: 'grp-1',
      type: 'piutang', // Piutang bersama belum lunas: 2,000,000 - 500,000 = 1,500,000
      partyType: 'external',
      scope: 'bersama',
      isJoint: true,
      memberId: 'joint',
      otherPersonName: 'Budi',
      amount: 2000000,
      paidAmount: 500000,
      status: 'partial',
      date: '2026-10-01',
      description: 'Piutang bersama keluarga ke Budi',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'd-2',
      groupId: 'grp-1',
      type: 'utang', // Utang bersama belum lunas: 500,000
      partyType: 'external',
      scope: 'bersama',
      isJoint: true,
      memberId: 'joint',
      otherPersonName: 'Toko Listrik',
      amount: 500000,
      paidAmount: 0,
      status: 'unpaid',
      date: '2026-10-01',
      description: 'Utang bersama renovasi rumah',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'd-3',
      groupId: 'grp-1',
      type: 'utang', // Utang pribadi Ayah: 200,000
      partyType: 'external',
      scope: 'perorangan',
      isJoint: false,
      memberId: 'mem-1',
      otherPersonName: 'Teman Ayah',
      amount: 200000,
      paidAmount: 0,
      status: 'unpaid',
      date: '2026-10-01',
      description: 'Pinjaman pribadi Ayah',
      createdAt: 1,
      updatedAt: 1,
    },
  ];

  // 1. Overall ('all'): Liquid = 6,000,000; Piutang = 1,500,000; Utang = 500,000 + 200,000 = 700,000
  // Real Net Worth = 6,000,000 + 1,500,000 - 700,000 = 6,800,000
  const netWorthAll = calculateRealNetWorth(assets, debts, 'all');
  assert.equal(netWorthAll.liquidBalance, 6000000);
  assert.equal(netWorthAll.receivableRemaining, 1500000);
  assert.equal(netWorthAll.payableRemaining, 700000);
  assert.equal(netWorthAll.realNetAsset, 6800000);

  // 2. Joint only ('joint'): Liquid = 5,000,000; Piutang Bersama = 1,500,000; Utang Bersama = 500,000
  // Real Net Worth Bersama = 5,000,000 + 1,500,000 - 500,000 = 6,000,000
  const netWorthJoint = calculateRealNetWorth(assets, debts, 'joint');
  assert.equal(netWorthJoint.liquidBalance, 5000000);
  assert.equal(netWorthJoint.receivableRemaining, 1500000);
  assert.equal(netWorthJoint.payableRemaining, 500000);
  assert.equal(netWorthJoint.realNetAsset, 6000000);

  // 3. Member Ayah ('mem-1'):
  // Ayah's liquid = 1,000,000; Ayah's personal debt = 200,000
  // CRITICAL REQUIREMENT: Utang/Piutang Bersama MUST NOT affect Ayah's personal net asset!
  // Real Net Worth Ayah = 1,000,000 - 200,000 = 800,000
  const netWorthAyah = calculateRealNetWorth(assets, debts, 'mem-1');
  assert.equal(netWorthAyah.liquidBalance, 1000000);
  assert.equal(netWorthAyah.receivableRemaining, 0); // Piutang bersama tidak masuk ke Ayah pribadi
  assert.equal(netWorthAyah.payableRemaining, 200000); // Hanya utang pribadi Ayah
  assert.equal(netWorthAyah.realNetAsset, 800000);
});

test('getEligibleAssetsForMember isolates member accounts to prevent accidental deduction', () => {
  const assets: AssetAccount[] = [
    { id: 'ast-joint', name: 'Rekening Bersama', type: 'bank', balance: 10000000, color: '#3b82f6', updatedAt: 1 },
    { id: 'ast-ayah', name: 'BCA Ayah', type: 'bank', balance: 3000000, memberId: 'mem-1', color: '#10b981', updatedAt: 1 },
    { id: 'ast-ibu', name: 'Mandiri Ibu', type: 'bank', balance: 5000000, memberId: 'mem-2', color: '#ec4899', updatedAt: 1 },
  ];

  // When Ayah (mem-1) is selected:
  const ayahAssets = getEligibleAssetsForMember(assets, 'mem-1');
  assert.equal(ayahAssets.length, 2);
  assert.ok(ayahAssets.some((a) => a.id === 'ast-joint'));
  assert.ok(ayahAssets.some((a) => a.id === 'ast-ayah'));
  assert.ok(!ayahAssets.some((a) => a.id === 'ast-ibu')); // Ibu's account must NOT be selectable by Ayah!

  // When Ibu (mem-2) is selected:
  const ibuAssets = getEligibleAssetsForMember(assets, 'mem-2');
  assert.equal(ibuAssets.length, 2);
  assert.ok(ibuAssets.some((a) => a.id === 'ast-joint'));
  assert.ok(ibuAssets.some((a) => a.id === 'ast-ibu'));
  assert.ok(!ibuAssets.some((a) => a.id === 'ast-ayah')); // Ayah's account must NOT be selectable by Ibu!
});

test('formatIndonesianDate formats ISO date strings into Indonesian localized format', () => {
  assert.equal(formatIndonesianDate('2026-10-13'), '13 Okt 2026');
  assert.equal(formatIndonesianDate('2026-10-13', { monthFormat: 'long' }), '13 Oktober 2026');
  assert.equal(formatIndonesianDate('2026-01-05'), '5 Jan 2026');
  assert.equal(formatIndonesianDate('2026-08-17'), '17 Agu 2026');
  assert.equal(formatIndonesianDate('2026-12-31'), '31 Des 2026');
  assert.equal(formatIndonesianDate(''), '');
  assert.equal(formatIndonesianDate('invalid-date'), 'invalid-date');
});
