import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Set CORS headers for all requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// Writable directory on Vercel is /tmp
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'cloud_store.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

const initialData = {
  groups: [
    {
      id: 'grp-family-1',
      name: 'Keluarga Cemara',
      type: 'keluarga',
      currency: 'IDR',
      monthlyBudget: 15000000,
      updatedAt: Date.now() - 100000,
      assets: [
        { id: 'ast-1', name: 'Rekening Operasional BCA', type: 'bank', institution: 'Bank BCA', balance: 32500000, color: '#2563eb', accountNumber: '***-8921', updatedAt: 1 },
        { id: 'ast-2', name: 'Tabungan Deposito Mandiri', type: 'bank', institution: 'Bank Mandiri', balance: 50000000, color: '#4f46e5', accountNumber: '***-4310', updatedAt: 1 },
        { id: 'ast-3', name: 'Kas Tunai di Rumah', type: 'kas', institution: 'Uang Tunai', balance: 4500000, color: '#059669', updatedAt: 1 },
        { id: 'ast-4', name: 'E-Wallet (GoPay & OVO)', type: 'ewallet', institution: 'GoPay / OVO', balance: 2750000, color: '#0891b2', updatedAt: 1 },
        { id: 'ast-5', name: 'Investasi Reksadana & Emas', type: 'investasi', institution: 'Bibit & Antam', balance: 65000000, color: '#d97706', updatedAt: 1 },
      ],
      members: [
        { id: 'mem-1', name: 'Dwi Syarif', role: 'kepala_keluarga', avatarColor: '#2563eb', email: 'DwiSyarif98@gmail.com' },
        { id: 'mem-2', name: 'Siti Rahma', role: 'pasangan', avatarColor: '#e11d48' },
        { id: 'mem-3', name: 'Rizky', role: 'anak', avatarColor: '#059669' },
      ],
    },
  ],
  categories: [
    { id: 'cat-food', name: 'Makanan & Minuman', icon: 'Utensils', color: '#f97316', monthlyBudget: 3500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-groceries', name: 'Belanja Supermarket', icon: 'ShoppingCart', color: '#10b981', monthlyBudget: 2500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-transport', name: 'Transportasi & Bensin', icon: 'Car', color: '#3b82f6', monthlyBudget: 1200000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-bills', name: 'Tagihan & Utilitas', icon: 'Zap', color: '#eab308', monthlyBudget: 1500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-education', name: 'Pendidikan & Les', icon: 'GraduationCap', color: '#8b5cf6', monthlyBudget: 1000000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-health', name: 'Kesehatan & Farmasi', icon: 'HeartPulse', color: '#ec4899', monthlyBudget: 800000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-entertainment', name: 'Hiburan & Liburan', icon: 'Film', color: '#06b6d4', monthlyBudget: 800000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-savings', name: 'Tabungan & Investasi', icon: 'PiggyBank', color: '#14b8a6', monthlyBudget: 2000000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-others', name: 'Lain-lain', icon: 'MoreHorizontal', color: '#64748b', monthlyBudget: 500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-in-salary', name: 'Gaji Pokok & Upah', icon: 'Briefcase', color: '#10b981', monthlyBudget: 15000000, type: 'income', isDefault: true, updatedAt: 1 },
    { id: 'cat-in-bonus', name: 'Bonus, THR & Hadiah', icon: 'Gift', color: '#f59e0b', monthlyBudget: 2500000, type: 'income', isDefault: true, updatedAt: 1 },
    { id: 'cat-in-business', name: 'Bisnis & Freelance', icon: 'TrendingUp', color: '#3b82f6', monthlyBudget: 5000000, type: 'income', isDefault: true, updatedAt: 1 },
    { id: 'cat-in-investment', name: 'Hasil Investasi & Dividen', icon: 'Coins', color: '#8b5cf6', monthlyBudget: 1500000, type: 'income', isDefault: true, updatedAt: 1 },
    { id: 'cat-in-others', name: 'Pemasukan Lain-lain', icon: 'Banknote', color: '#06b6d4', monthlyBudget: 500000, type: 'income', isDefault: true, updatedAt: 1 },
  ],
  transactions: [
    {
      id: 'tx-init-in-1',
      amount: 18500000,
      type: 'income',
      categoryId: 'cat-in-salary',
      description: 'Gaji Bulanan & Tunjangan Kantor',
      date: '2026-10-01',
      time: '08:00',
      paymentMethod: 'transfer_bank',
      assetId: 'ast-1',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 600000,
    },
    {
      id: 'tx-init-1',
      amount: 45000,
      type: 'expense',
      categoryId: 'cat-food',
      description: 'Sarapan Nasi Uduk & Kopi',
      date: '2026-10-18',
      time: '08:15',
      paymentMethod: 'qris_ewallet',
      assetId: 'ast-4',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 500000,
    },
    {
      id: 'tx-init-2',
      amount: 320000,
      type: 'expense',
      categoryId: 'cat-groceries',
      description: 'Belanja sayur dan kebutuhan dapur di Superindo',
      date: '2026-10-17',
      time: '16:45',
      paymentMethod: 'kartu_debit',
      assetId: 'ast-1',
      groupId: 'grp-family-1',
      memberId: 'mem-2',
      syncStatus: 'synced',
      updatedAt: Date.now() - 400000,
    },
  ],
  debts: [
    {
      id: 'debt-1',
      groupId: 'grp-family-1',
      type: 'utang',
      partyType: 'internal',
      memberId: 'mem-1',
      otherMemberId: 'mem-2',
      amount: 2500000,
      paidAmount: 500000,
      date: '2026-10-01',
      dueDate: '2026-11-15',
      description: 'Pinjaman modal usaha kecil ke Siti Rahma',
      assetId: 'ast-1',
      status: 'partial',
      payments: [
        { id: 'pay-1', amount: 500000, date: '2026-10-10', note: 'Cicilan 1 transfer BCA', createdAt: Date.now() - 86400000 * 5 },
      ],
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'debt-2',
      groupId: 'grp-family-1',
      type: 'piutang',
      partyType: 'external',
      memberId: 'mem-1',
      otherPersonName: 'Mas Budi (Teman Kantor)',
      amount: 1200000,
      paidAmount: 0,
      date: '2026-10-08',
      dueDate: '2026-10-30',
      description: 'Talangan tiket pesawat & hotel reuni kantor',
      assetId: 'ast-1',
      status: 'unpaid',
      payments: [],
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
  ],
  lastSyncedAt: Date.now(),
};

function loadStore() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const store = JSON.parse(content);
      return store;
    }
  } catch {}
  return JSON.parse(JSON.stringify(initialData));
}

function saveStore(store: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {}
}

let cloudStore = loadStore();

const router = express.Router();

// GET /api/sync
router.get('/sync', (req: Request, res: Response) => {
  cloudStore = loadStore();
  res.json({
    success: true,
    serverTime: cloudStore.lastSyncedAt || Date.now(),
    data: cloudStore,
  });
});

// POST /api/sync
router.post('/sync', (req: Request, res: Response) => {
  try {
    cloudStore = loadStore();
    const {
      transactions = [],
      categories = [],
      groups = [],
      debts = [],
      deletedTxIds = [],
      deletedCatIds = [],
      deletedGrpIds = [],
    } = req.body;
    let hasChanges = false;

    // Merge transactions
    const txMap = new Map<string, any>((cloudStore.transactions || []).map((t: any) => [t.id, t]));
    for (const delId of deletedTxIds) {
      if (txMap.has(delId)) {
        txMap.delete(delId);
        hasChanges = true;
      }
    }
    for (const clientTx of transactions) {
      if (clientTx.isDeleted || deletedTxIds.includes(clientTx.id)) {
        if (txMap.has(clientTx.id)) {
          txMap.delete(clientTx.id);
          hasChanges = true;
        }
        continue;
      }
      const existing = txMap.get(clientTx.id);
      if (!existing || (clientTx.updatedAt && clientTx.updatedAt > (existing.updatedAt || 0))) {
        txMap.set(clientTx.id, { ...clientTx, syncStatus: 'synced' });
        hasChanges = true;
      }
    }
    cloudStore.transactions = Array.from(txMap.values());

    // Merge categories
    const catMap = new Map<string, any>((cloudStore.categories || []).map((c: any) => [c.id, c]));
    for (const delId of deletedCatIds) {
      if (catMap.has(delId)) {
        catMap.delete(delId);
        hasChanges = true;
      }
    }
    for (const clientCat of categories) {
      if (deletedCatIds.includes(clientCat.id)) continue;
      const existing = catMap.get(clientCat.id);
      if (!existing || (clientCat.updatedAt && clientCat.updatedAt > (existing.updatedAt || 0))) {
        catMap.set(clientCat.id, clientCat);
        hasChanges = true;
      }
    }
    cloudStore.categories = Array.from(catMap.values());

    // Merge groups
    const grpMap = new Map<string, any>((cloudStore.groups || []).map((g: any) => [g.id, g]));
    for (const delId of deletedGrpIds) {
      if (grpMap.has(delId)) {
        grpMap.delete(delId);
        hasChanges = true;
      }
    }
    for (const clientGrp of groups) {
      if (deletedGrpIds.includes(clientGrp.id)) continue;
      const existing = grpMap.get(clientGrp.id);
      if (!existing || (clientGrp.updatedAt && clientGrp.updatedAt > (existing.updatedAt || 0))) {
        grpMap.set(clientGrp.id, clientGrp);
        hasChanges = true;
      }
    }
    cloudStore.groups = Array.from(grpMap.values());

    // Merge debts
    if (Array.isArray(debts) && debts.length > 0) {
      if (!cloudStore.debts) cloudStore.debts = [];
      const debtMap = new Map<string, any>(cloudStore.debts.map((d: any) => [d.id, d]));
      for (const clientDebt of debts) {
        if (clientDebt.isDeleted) {
          if (debtMap.has(clientDebt.id)) {
            debtMap.delete(clientDebt.id);
            hasChanges = true;
          }
          continue;
        }
        const existing = debtMap.get(clientDebt.id);
        if (!existing || (clientDebt.updatedAt && clientDebt.updatedAt > (existing.updatedAt || 0))) {
          debtMap.set(clientDebt.id, clientDebt);
          hasChanges = true;
        }
      }
      cloudStore.debts = Array.from(debtMap.values());
    }

    if (hasChanges) {
      cloudStore.lastSyncedAt = Date.now();
      saveStore(cloudStore);
    }

    res.json({
      success: true,
      serverTime: cloudStore.lastSyncedAt,
      data: cloudStore,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Sync error' });
  }
});

// POST /api/clear-transactions
router.post('/clear-transactions', (req: Request, res: Response) => {
  cloudStore = loadStore();
  cloudStore.transactions = [];
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  res.json({ success: true, message: 'Semua transaksi berhasil dibersihkan' });
});

// POST /api/reset
router.post('/reset', (req: Request, res: Response) => {
  cloudStore = JSON.parse(JSON.stringify(initialData));
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  res.json({ success: true, data: cloudStore, message: 'Data berhasil direset' });
});

// GET /api/events (Fallback for Serverless SSE)
router.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', serverTime: Date.now() })}\n\n`);
  setTimeout(() => {
    res.end();
  }, 2000);
});

// Support both /api/* and root router mappings
app.use('/api', router);
app.use('/', router);

export default app;
