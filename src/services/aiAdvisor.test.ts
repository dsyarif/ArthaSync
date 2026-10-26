import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinancialContext, generateLocalAdvisorResponse } from './aiAdvisor.ts';
import { Category, FamilyGroup, Transaction, DebtRecord } from '../types/finance.ts';

const mockGroup: FamilyGroup = {
  id: 'group-1',
  name: 'Keluarga Bahagia',
  type: 'keluarga',
  currency: 'IDR',
  monthlyBudget: 5000000,
  updatedAt: 1,
  members: [
    { id: 'm-1', name: 'Dwi Syarif', role: 'kepala_keluarga', avatarColor: '#10b981' },
    { id: 'm-2', name: 'Ega', role: 'pasangan', avatarColor: '#ec4899' },
  ],
  assets: [
    { id: 'a-1', name: 'Sea Bank', type: 'bank', institution: 'SeaBank', balance: 5000000, color: '#f97316', updatedAt: 1 },
    { id: 'a-2', name: 'Cash', type: 'kas', institution: 'Dompet', balance: 500000, color: '#10b981', updatedAt: 1 },
  ],
};

const mockCategories: Category[] = [
  { id: 'c-food', name: 'Makanan & Minuman', icon: 'Utensils', color: '#10b981', monthlyBudget: 1500000, type: 'expense', updatedAt: 1 },
  { id: 'c-trans', name: 'Transportasi', icon: 'Car', color: '#3b82f6', monthlyBudget: 500000, type: 'expense', updatedAt: 1 },
  { id: 'c-salary', name: 'Gaji Pokok', icon: 'Briefcase', color: '#10b981', monthlyBudget: 0, type: 'income', updatedAt: 1 },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    amount: 10000000,
    type: 'income',
    categoryId: 'c-salary',
    description: 'Gaji Bulanan',
    date: '2026-10-01',
    time: '08:00',
    paymentMethod: 'transfer_bank',
    groupId: 'group-1',
    memberId: 'm-1',
    syncStatus: 'synced',
    updatedAt: 1,
  },
  {
    id: 'tx-2',
    amount: 500000,
    type: 'expense',
    categoryId: 'c-food',
    description: 'Makan soto dan belanja mingguan',
    date: '2026-10-05',
    time: '12:00',
    paymentMethod: 'transfer_bank',
    groupId: 'group-1',
    memberId: 'm-1',
    syncStatus: 'synced',
    updatedAt: 1,
  },
  {
    id: 'tx-3',
    amount: 200000,
    type: 'expense',
    categoryId: 'c-trans',
    description: 'Bensin',
    date: '2026-10-06',
    time: '14:00',
    paymentMethod: 'tunai',
    groupId: 'group-1',
    memberId: 'm-2',
    syncStatus: 'synced',
    updatedAt: 1,
  },
];

const mockDebts: DebtRecord[] = [
  {
    id: 'debt-1',
    groupId: 'group-1',
    type: 'utang',
    partyType: 'external',
    memberId: 'm-1',
    amount: 1000000,
    paidAmount: 200000,
    date: '2026-10-01',
    description: 'Cicilan Laptop',
    status: 'partial',
    createdAt: 1,
    updatedAt: 1,
  },
];

test('buildFinancialContext aggregates income, expense, net savings, and category breakdowns', () => {
  const ctx = buildFinancialContext(mockTransactions, mockCategories, mockGroup, mockDebts, 2026, 10);

  assert.equal(ctx.totalIncome, 10000000);
  assert.equal(ctx.totalExpense, 700000);
  assert.equal(ctx.netSavings, 9300000);
  assert.equal(ctx.savingsRate, 93);
  assert.equal(ctx.liquidBalance, 5500000);
  assert.equal(ctx.debtSummary.totalUtang, 800000);
  assert.equal(ctx.debtSummary.netBalance, -800000);
});

test('generateLocalAdvisorResponse answers questions about food category', () => {
  const ctx = buildFinancialContext(mockTransactions, mockCategories, mockGroup, mockDebts, 2026, 10);
  const response = generateLocalAdvisorResponse('berapa pengeluaran makan bulan ini?', ctx);

  assert.ok(response.includes('Analisa Pengeluaran Makanan'));
  assert.ok(response.includes('Rp 500.000'));
});

test('generateLocalAdvisorResponse answers questions about members', () => {
  const ctx = buildFinancialContext(mockTransactions, mockCategories, mockGroup, mockDebts, 2026, 10);
  const response = generateLocalAdvisorResponse('siapa anggota paling boros?', ctx);

  assert.ok(response.includes('Perbandingan Pengeluaran per Anggota'));
  assert.ok(response.includes('Dwi Syarif'));
});

test('generateLocalAdvisorResponse answers questions about savings and recommendations', () => {
  const ctx = buildFinancialContext(mockTransactions, mockCategories, mockGroup, mockDebts, 2026, 10);
  const response = generateLocalAdvisorResponse('bagaimana cara berhemat dan rekomendasi menabung?', ctx);

  assert.ok(response.includes('Rasio 50/30/20'));
  assert.ok(response.includes('Langkah Konkret'));
});

test('generateLocalAdvisorResponse answers yearly queries using yearlySummary context', () => {
  const ctx = buildFinancialContext(mockTransactions, mockCategories, mockGroup, mockDebts, 2026, 10);
  const response = generateLocalAdvisorResponse('berikan analisa keuangan 1 tahun penuh', ctx);

  assert.ok(response.includes('Analisis Keuangan Tahunan Periode 2026'));
  assert.ok(response.includes('Total Pengeluaran 1 Tahun'));
  assert.ok(response.includes('Rp 700.000'));
  assert.ok(response.includes('Total Pemasukan 1 Tahun'));
  assert.ok(response.includes('Rp 10.000.000'));
  assert.ok(response.includes('Rincian Performa Bulan ke Bulan'));
});
