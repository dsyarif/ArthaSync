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

// Initial empty data
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
  } catch (err) {
    console.error('Failed to load store:', err);
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
