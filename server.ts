import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// File-based persistence directory
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, '.data');
const DB_FILE = path.join(DATA_DIR, 'cloud_store.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data
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
    }
  ],
  categories: [
    // Kategori Pengeluaran
    { id: 'cat-food', name: 'Makanan & Minuman', icon: 'Utensils', color: '#f97316', monthlyBudget: 3500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-groceries', name: 'Belanja Supermarket', icon: 'ShoppingCart', color: '#10b981', monthlyBudget: 2500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-transport', name: 'Transportasi & Bensin', icon: 'Car', color: '#3b82f6', monthlyBudget: 1200000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-bills', name: 'Tagihan & Utilitas', icon: 'Zap', color: '#eab308', monthlyBudget: 1500000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-education', name: 'Pendidikan & Les', icon: 'GraduationCap', color: '#8b5cf6', monthlyBudget: 1000000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-health', name: 'Kesehatan & Farmasi', icon: 'HeartPulse', color: '#ec4899', monthlyBudget: 800000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-entertainment', name: 'Hiburan & Liburan', icon: 'Film', color: '#06b6d4', monthlyBudget: 800000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-savings', name: 'Tabungan & Investasi', icon: 'PiggyBank', color: '#14b8a6', monthlyBudget: 2000000, type: 'expense', isDefault: true, updatedAt: 1 },
    { id: 'cat-others', name: 'Lain-lain', icon: 'MoreHorizontal', color: '#64748b', monthlyBudget: 500000, type: 'expense', isDefault: true, updatedAt: 1 },
    // Kategori Pemasukan
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
    {
      id: 'tx-init-3',
      amount: 50000,
      type: 'expense',
      categoryId: 'cat-transport',
      description: 'Isi Pertamax Mobil / Motor',
      date: '2026-10-16',
      time: '07:30',
      paymentMethod: 'tunai',
      assetId: 'ast-3',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 300000,
    },
    {
      id: 'tx-init-4',
      amount: 450000,
      type: 'expense',
      categoryId: 'cat-bills',
      description: 'Token Listrik PLN & Tagihan Wifi IndiHome',
      date: '2026-10-12',
      time: '10:00',
      paymentMethod: 'transfer_bank',
      assetId: 'ast-1',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 250000,
    },
    {
      id: 'tx-init-5',
      amount: 120000,
      type: 'expense',
      categoryId: 'cat-food',
      description: 'Makan malam Bakso & Es Teh sekeluarga',
      date: '2026-10-11',
      time: '19:20',
      paymentMethod: 'qris_ewallet',
      assetId: 'ast-4',
      groupId: 'grp-family-1',
      memberId: 'mem-2',
      syncStatus: 'synced',
      updatedAt: Date.now() - 200000,
    },
    {
      id: 'tx-init-6',
      amount: 250000,
      type: 'expense',
      categoryId: 'cat-education',
      description: 'Buku pelajaran & alat tulis sekolah',
      date: '2026-10-08',
      time: '14:10',
      paymentMethod: 'tunai',
      assetId: 'ast-3',
      groupId: 'grp-family-1',
      memberId: 'mem-3',
      syncStatus: 'synced',
      updatedAt: Date.now() - 150000,
    },
    {
      id: 'tx-init-7',
      amount: 150000,
      type: 'expense',
      categoryId: 'cat-entertainment',
      description: 'Nonton Bioskop Weekend sekeluarga',
      date: '2026-10-04',
      time: '15:30',
      paymentMethod: 'qris_ewallet',
      assetId: 'ast-4',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 100000,
    },
    {
      id: 'tx-init-8',
      amount: 1000000,
      type: 'expense',
      categoryId: 'cat-savings',
      description: 'Setor Reksadana & Tabungan Emas',
      date: '2026-10-01',
      time: '09:00',
      paymentMethod: 'transfer_bank',
      assetId: 'ast-1',
      groupId: 'grp-family-1',
      memberId: 'mem-1',
      syncStatus: 'synced',
      updatedAt: Date.now() - 80000,
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
      let modified = false;
      if (store.groups && Array.isArray(store.groups)) {
        store.groups = store.groups.map((grp: any) => {
          const matchInitial = initialData.groups.find((g) => g.id === grp.id);
          if (!grp.assets || grp.assets.length === 0) {
            grp.assets = matchInitial?.assets || [
              { id: `ast-${Date.now()}-1`, name: 'Kas Tunai', type: 'kas', institution: 'Dompet Tunai', balance: 2500000, color: '#059669', updatedAt: 1 },
              { id: `ast-${Date.now()}-2`, name: 'Rekening Bank', type: 'bank', institution: 'Bank BCA', balance: 10000000, color: '#2563eb', updatedAt: 1 },
            ];
            modified = true;
          }
          return grp;
        });
      }
      if (store.categories && Array.isArray(store.categories)) {
        store.categories = store.categories.map((c: any) => {
          if (!c.type) {
            modified = true;
            return { ...c, type: 'expense' };
          }
          return c;
        });
        const hasIncome = store.categories.some((c: any) => c.type === 'income');
        if (!hasIncome) {
          const defaultIncome = initialData.categories.filter((c: any) => c.type === 'income');
          store.categories.push(...defaultIncome);
          modified = true;
        }
      }
      if (store.transactions && Array.isArray(store.transactions)) {
        store.transactions = store.transactions.map((t: any) => {
          if (!t.assetId) {
            t.assetId = 'ast-1';
            modified = true;
          }
          return t;
        });
      }
      if (modified) {
        saveStore(store);
      }
      return store;
    }
  } catch (err) {
    console.error('Failed to load store, initializing default:', err);
  }
  saveStore(initialData);
  return initialData;
}

function saveStore(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

// In-memory store cached from disk
let cloudStore = loadStore();

// SSE Connected Clients for real-time broadcast
const sseClients = new Set<express.Response>();

function broadcastChange(payload: any) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now(), clients: sseClients.size });
});

// Full Cloud Fetch / Sync Pull
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: cloudStore,
    serverTime: Date.now(),
  });
});

// Cloud Sync Push & Merge (Bi-directional real-time sync with LWW & Tombstone deletion)
app.post('/api/sync', (req, res) => {
  try {
    const {
      transactions = [],
      categories = [],
      groups = [],
      debts = [],
      deletedTxIds = [],
      deletedCatIds = [],
      deletedGrpIds = [],
      deletedDebtIds = [],
    } = req.body;
    let hasChanges = false;

    // Merge transactions
    const txMap = new Map<string, any>(cloudStore.transactions.map((t: any) => [t.id, t]));
    
    // Process explicit transaction deletions
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
    const catMap = new Map<string, any>(cloudStore.categories.map((c: any) => [c.id, c]));
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
    const grpMap = new Map<string, any>(cloudStore.groups.map((g: any) => [g.id, g]));
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
    if (!cloudStore.debts) cloudStore.debts = [];
    const debtMap = new Map<string, any>(cloudStore.debts.map((d: any) => [d.id, d]));
    for (const delId of deletedDebtIds) {
      if (debtMap.has(delId)) {
        debtMap.delete(delId);
        hasChanges = true;
      }
    }
    for (const clientDebt of debts) {
      if (clientDebt.isDeleted || deletedDebtIds.includes(clientDebt.id)) {
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

    if (hasChanges) {
      cloudStore.lastSyncedAt = Date.now();
      saveStore(cloudStore);
      broadcastChange({
        type: 'SYNC_UPDATE',
        serverTime: cloudStore.lastSyncedAt,
        data: cloudStore,
      });
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

// Explicit delete endpoint for single transaction
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const initialCount = cloudStore.transactions.length;
  cloudStore.transactions = cloudStore.transactions.filter((t: any) => t.id !== id);
  const deleted = cloudStore.transactions.length < initialCount;
  if (deleted) {
    cloudStore.lastSyncedAt = Date.now();
    saveStore(cloudStore);
    broadcastChange({
      type: 'SYNC_UPDATE',
      serverTime: cloudStore.lastSyncedAt,
      data: cloudStore,
    });
  }
  res.json({ success: true, deleted });
});

// Explicit delete endpoint for single debt
app.delete('/api/debts/:id', (req, res) => {
  const { id } = req.params;
  if (!cloudStore.debts) cloudStore.debts = [];
  const initialCount = cloudStore.debts.length;
  cloudStore.debts = cloudStore.debts.filter((d: any) => d.id !== id);
  const deleted = cloudStore.debts.length < initialCount;
  if (deleted) {
    cloudStore.lastSyncedAt = Date.now();
    saveStore(cloudStore);
    broadcastChange({
      type: 'SYNC_UPDATE',
      serverTime: cloudStore.lastSyncedAt,
      data: cloudStore,
    });
  }
  res.json({ success: true, deleted });
});

// Explicit delete endpoint for single category
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  cloudStore.categories = cloudStore.categories.filter((c: any) => c.id !== id);
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  broadcastChange({
    type: 'SYNC_UPDATE',
    serverTime: cloudStore.lastSyncedAt,
    data: cloudStore,
  });
  res.json({ success: true });
});

// Explicit delete endpoint for group
app.delete('/api/groups/:id', (req, res) => {
  const { id } = req.params;
  if (cloudStore.groups.length <= 1) {
    return res.status(400).json({ success: false, error: 'Tidak dapat menghapus satu-satunya grup yang tersisa' });
  }
  cloudStore.groups = cloudStore.groups.filter((g: any) => g.id !== id);
  // Also delete transactions under this group
  cloudStore.transactions = cloudStore.transactions.filter((t: any) => t.groupId !== id);
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  broadcastChange({
    type: 'SYNC_UPDATE',
    serverTime: cloudStore.lastSyncedAt,
    data: cloudStore,
  });
  res.json({ success: true });
});

// Clear all transactions endpoint
app.post('/api/clear-transactions', (req, res) => {
  cloudStore.transactions = [];
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  broadcastChange({
    type: 'SYNC_UPDATE',
    serverTime: cloudStore.lastSyncedAt,
    data: cloudStore,
  });
  res.json({ success: true, message: 'Semua transaksi berhasil dibersihkan' });
});

// Factory Reset endpoint
app.post('/api/reset', (req, res) => {
  cloudStore = JSON.parse(JSON.stringify(initialData));
  cloudStore.lastSyncedAt = Date.now();
  saveStore(cloudStore);
  broadcastChange({
    type: 'SYNC_UPDATE',
    serverTime: cloudStore.lastSyncedAt,
    data: cloudStore,
  });
  res.json({ success: true, data: cloudStore, message: 'Data berhasil direset ke pengaturan awal' });
});

// SSE Endpoint for real-time cloud notifications
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', serverTime: Date.now() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// Vite Middleware for Dev / Static Files for Prod
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/.data/**', '**/cloud_store.json', '**/.git/**', '**/dist/**', '**/*.log'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArthaSync server running at http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer();
