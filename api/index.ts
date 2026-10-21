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
  groups: [],
  categories: [],
  transactions: [],
  debts: [],
  lastSyncedAt: 1,
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
      deletedDebtIds = [],
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

// DELETE /api/debts/:id
router.delete('/debts/:id', (req: Request, res: Response) => {
  cloudStore = loadStore();
  if (!cloudStore.debts) cloudStore.debts = [];
  const { id } = req.params;
  const initialCount = cloudStore.debts.length;
  cloudStore.debts = cloudStore.debts.filter((d: any) => d.id !== id);
  const deleted = cloudStore.debts.length < initialCount;
  if (deleted) {
    cloudStore.lastSyncedAt = Date.now();
    saveStore(cloudStore);
  }
  res.json({ success: true, deleted });
});

// DELETE /api/transactions/:id
router.delete('/transactions/:id', (req: Request, res: Response) => {
  cloudStore = loadStore();
  if (!cloudStore.transactions) cloudStore.transactions = [];
  const { id } = req.params;
  const initialCount = cloudStore.transactions.length;
  cloudStore.transactions = cloudStore.transactions.filter((t: any) => t.id !== id);
  const deleted = cloudStore.transactions.length < initialCount;
  if (deleted) {
    cloudStore.lastSyncedAt = Date.now();
    saveStore(cloudStore);
  }
  res.json({ success: true, deleted });
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
