import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAmount,
  detectTransactionType,
  parseSpelledIndonesianNumber,
  parseTransactionWithLocalNLP,
} from './aiParser.ts';
import { Category, AssetAccount, FamilyMember } from '../types/finance.ts';

const mockCategories: Category[] = [
  { id: 'cat-food', name: 'Makanan & Minuman', icon: 'Utensils', color: '#10b981', monthlyBudget: 1500000, type: 'expense', updatedAt: 1 },
  { id: 'cat-transport', name: 'Transportasi', icon: 'Car', color: '#3b82f6', monthlyBudget: 500000, type: 'expense', updatedAt: 1 },
  { id: 'cat-groceries', name: 'Belanja & Kebutuhan', icon: 'ShoppingCart', color: '#8b5cf6', monthlyBudget: 1000000, type: 'expense', updatedAt: 1 },
  { id: 'cat-bills', name: 'Tagihan & Utilitas', icon: 'Zap', color: '#f59e0b', monthlyBudget: 800000, type: 'expense', updatedAt: 1 },
  { id: 'cat-salary', name: 'Gaji Pokok', icon: 'Briefcase', color: '#10b981', monthlyBudget: 0, type: 'income', updatedAt: 1 },
];

const mockAssets: AssetAccount[] = [
  { id: 'asset-cash', name: 'Cash Tunai', institution: 'Dompet', balance: 500000, color: '#10b981', type: 'kas', updatedAt: 1 },
  { id: 'asset-seabank', name: 'Sea Bank', institution: 'SeaBank Indonesia', balance: 2500000, color: '#f97316', type: 'bank', updatedAt: 1 },
  { id: 'asset-bima', name: 'Bank Bima', institution: 'Bank Jateng', balance: 5000000, color: '#3b82f6', type: 'bank', updatedAt: 1 },
];

const mockMembers: FamilyMember[] = [
  { id: 'mem-1', name: 'Dwi Syarif', role: 'kepala_keluarga', avatarColor: '#10b981' },
  { id: 'mem-2', name: 'Ega', role: 'pasangan', avatarColor: '#ec4899' },
];

test('extractAmount correctly extracts amounts in various Indonesian formats', () => {
  assert.equal(extractAmount('beli soto 25rb').amount, 25000);
  assert.equal(extractAmount('beli kopi 50 ribu').amount, 50000);
  assert.equal(extractAmount('beli hoodie 150k').amount, 150000);
  assert.equal(extractAmount('service motor 1.5jt').amount, 1500000);
  assert.equal(extractAmount('laptop 2,5 juta').amount, 2500000);
  assert.equal(extractAmount('goceng').amount, 5000);
  assert.equal(extractAmount('cepek').amount, 100000);
  assert.equal(extractAmount('gocap').amount, 50000);
  assert.equal(extractAmount('bayar kos 850.000').amount, 850000);
});

test('parseSpelledIndonesianNumber parses spelled out Indonesian numbers', () => {
  assert.equal(parseSpelledIndonesianNumber('dua puluh lima ribu'), 25000);
  assert.equal(parseSpelledIndonesianNumber('seratus ribu'), 100000);
  assert.equal(parseSpelledIndonesianNumber('satu juta lima ratus ribu'), 1500000);
});

test('detectTransactionType detects transaction type correctly', () => {
  assert.equal(detectTransactionType('Makan bakso 25 ribu'), 'expense');
  assert.equal(detectTransactionType('Beli bensin pertalite 30rb'), 'expense');
  assert.equal(detectTransactionType('Gaji bulanan 5 juta'), 'income');
  assert.equal(detectTransactionType('Dapat bonus proyek 1.5jt'), 'income');
  assert.equal(detectTransactionType('Hasil jualan kue 500rb'), 'income');
});

test('parseTransactionWithLocalNLP parses full Indonesian voice sentence into structured transaction', () => {
  const result = parseTransactionWithLocalNLP(
    'Makan soto ayam 25 ribu pakai Sea Bank',
    mockCategories,
    mockAssets,
    mockMembers,
    'mem-1'
  );

  assert.equal(result.amount, 25000);
  assert.equal(result.type, 'expense');
  assert.equal(result.categoryId, 'cat-food');
  assert.equal(result.assetId, 'asset-seabank');
  assert.equal(result.paymentMethod, 'transfer_bank');
  assert.ok(result.description.toLowerCase().includes('makan soto ayam'));
  assert.equal(result.source, 'local_nlp');
});

test('parseTransactionWithLocalNLP parses income transaction and matches bank asset and member', () => {
  const result = parseTransactionWithLocalNLP(
    'Gaji bulanan Dwi Syarif 5 juta masuk Bank Bima',
    mockCategories,
    mockAssets,
    mockMembers,
    'mem-1'
  );

  assert.equal(result.amount, 5000000);
  assert.equal(result.type, 'income');
  assert.equal(result.categoryId, 'cat-salary');
  assert.equal(result.assetId, 'asset-bima');
  assert.equal(result.memberId, 'mem-1');
});

test('parseTransactionWithLocalNLP handles "kemarin" date parsing', () => {
  const result = parseTransactionWithLocalNLP(
    'Beli bensin 30rb tunai kemarin',
    mockCategories,
    mockAssets,
    mockMembers
  );

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  assert.equal(result.date, yesterday.toISOString().split('T')[0]);
  assert.equal(result.amount, 30000);
  assert.equal(result.paymentMethod, 'tunai');
});
