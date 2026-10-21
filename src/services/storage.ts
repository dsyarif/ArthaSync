import { AssetAccount, Category, CloudSyncState, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import { isSupabaseConfigured, SupabaseSyncService } from './supabase';

const STORAGE_KEYS = {
  TRANSACTIONS: 'arthasync_transactions_v1',
  CATEGORIES: 'arthasync_categories_v1',
  GROUPS: 'arthasync_groups_v1',
  CURRENT_GROUP_ID: 'arthasync_current_group_id',
  LAST_SYNC: 'arthasync_last_sync_timestamp',
  PENDING_QUEUE: 'arthasync_pending_queue_v1',
  OFFLINE_SIM: 'arthasync_offline_simulation',
  DELETED_TX_IDS: 'arthasync_deleted_tx_ids_v1',
  DELETED_CAT_IDS: 'arthasync_deleted_cat_ids_v1',
  DELETED_GRP_IDS: 'arthasync_deleted_grp_ids_v1',
  DELETED_DEBT_IDS: 'arthasync_deleted_debt_ids_v1',
  DEBTS: 'arthasync_debts_v1',
};

// Default Asset Accounts with joint and individual ownership
export const DEFAULT_FAMILY_ASSETS: AssetAccount[] = [
  { id: 'ast-1', name: 'Rekening Operasional BCA', type: 'bank', institution: 'Bank BCA', balance: 32500000, color: '#2563eb', accountNumber: '***-8921', updatedAt: 1 }, // Saldo Bersama
  { id: 'ast-2', name: 'Tabungan Deposito Mandiri', type: 'bank', institution: 'Bank Mandiri', balance: 50000000, color: '#4f46e5', accountNumber: '***-4310', memberId: 'mem-1', updatedAt: 1 }, // Milik Ayah
  { id: 'ast-3', name: 'Kas Tunai di Rumah', type: 'kas', institution: 'Uang Tunai', balance: 4500000, color: '#059669', updatedAt: 1 }, // Saldo Bersama
  { id: 'ast-4', name: 'E-Wallet (GoPay & OVO)', type: 'ewallet', institution: 'GoPay / OVO', balance: 2750000, color: '#0891b2', memberId: 'mem-2', updatedAt: 1 }, // Milik Ibu
  { id: 'ast-5', name: 'Investasi Reksadana & Emas', type: 'investasi', institution: 'Bibit & Antam', balance: 65000000, color: '#d97706', memberId: 'mem-1', updatedAt: 1 }, // Milik Ayah
];

export const DEFAULT_PERSONAL_ASSETS: AssetAccount[] = [
  { id: 'ast-p1', name: 'Rekening Utama BCA', type: 'bank', institution: 'Bank BCA', balance: 14500000, color: '#2563eb', accountNumber: '***-8921', memberId: 'mem-1', updatedAt: 1 },
  { id: 'ast-p2', name: 'Dompet Kas Fisik', type: 'kas', institution: 'Tunai', balance: 1200000, color: '#059669', memberId: 'mem-1', updatedAt: 1 },
  { id: 'ast-p3', name: 'Saldo GoPay / ShopeePay', type: 'ewallet', institution: 'E-Wallet', balance: 850000, color: '#0891b2', memberId: 'mem-1', updatedAt: 1 },
  { id: 'ast-p4', name: 'Tabungan Emas Digital', type: 'investasi', institution: 'Pluang / Pegadaian', balance: 12000000, color: '#d97706', memberId: 'mem-1', updatedAt: 1 },
];

// Initial default debts/loans (Utang & Piutang)
export const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt-1',
    groupId: 'grp-family-1',
    type: 'utang',
    partyType: 'internal',
    memberId: 'mem-1', // Dwi Syarif pinjam ke Siti Rahma
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
    memberId: 'mem-1', // Dwi Syarif meminjamkan ke Mas Budi
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
  {
    id: 'debt-3',
    groupId: 'grp-family-1',
    type: 'utang',
    partyType: 'external',
    memberId: 'mem-2', // Siti Rahma
    otherPersonName: 'Cicilan Toko Elektronik Berkah',
    amount: 5000000,
    paidAmount: 2500000,
    date: '2026-09-15',
    dueDate: '2026-11-20',
    description: 'Cicilan mesin cuci 2 tabung',
    status: 'partial',
    payments: [
      { id: 'pay-2', amount: 2500000, date: '2026-10-05', note: 'Pembayaran DP & cicilan 1', createdAt: Date.now() - 86400000 * 12 },
    ],
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 12,
  },
];

// Initial default categories
export const DEFAULT_CATEGORIES: Category[] = [
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
];

export const DEFAULT_GROUPS: FamilyGroup[] = [
  {
    id: 'grp-family-1',
    name: 'Keluarga Cemara',
    type: 'keluarga',
    currency: 'IDR',
    monthlyBudget: 15000000,
    assets: DEFAULT_FAMILY_ASSETS,
    updatedAt: 1,
    members: [
      { id: 'mem-1', name: 'Dwi Syarif', role: 'kepala_keluarga', avatarColor: '#2563eb', email: 'DwiSyarif98@gmail.com' },
      { id: 'mem-2', name: 'Siti Rahma', role: 'pasangan', avatarColor: '#e11d48' },
      { id: 'mem-3', name: 'Rizky', role: 'anak', avatarColor: '#059669' },
    ],
  },
  {
    id: 'grp-personal',
    name: 'Pribadi (Dompet Mandiri)',
    type: 'pribadi',
    currency: 'IDR',
    monthlyBudget: 5000000,
    assets: DEFAULT_PERSONAL_ASSETS,
    updatedAt: 1,
    members: [
      { id: 'mem-1', name: 'Dwi Syarif', role: 'kepala_keluarga', avatarColor: '#2563eb', email: 'DwiSyarif98@gmail.com' },
    ],
  },
];

export class StorageService {
  private static listeners: Set<() => void> = new Set();
  private static sseSource: EventSource | null = null;
  private static unsubscribeSupabaseRealtime: (() => void) | null = null;
  private static syncState: CloudSyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    simulatedOffline: false,
    syncError: null,
  };

  public static subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private static notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Storage listener error:', err);
      }
    });
  }

  public static getSyncState(): CloudSyncState {
    return { ...this.syncState };
  }

  public static assertOnline(actionName: string = 'menyimpan data') {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      if (!navigator.onLine || this.syncState.simulatedOffline) {
        throw new Error(
          `Koneksi internet diperlukan untuk ${actionName}. Anda sedang dalam Mode Offline (Hanya Lihat). Hubungkan perangkat ke internet untuk mencatat perubahan.`
        );
      }
    }
  }

  public static init() {
    if (typeof window === 'undefined') return;

    // Load simulated offline state
    const sim = localStorage.getItem(STORAGE_KEYS.OFFLINE_SIM);
    this.syncState.simulatedOffline = sim === 'true';
    this.syncState.isOnline = !this.syncState.simulatedOffline && navigator.onLine;

    // Load last sync time
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (lastSync) {
      this.syncState.lastSyncedAt = parseInt(lastSync, 10);
    }

    // Update pending count
    this.updatePendingCount();

    // Browser network events
    window.addEventListener('online', () => {
      if (!this.syncState.simulatedOffline) {
        this.syncState.isOnline = true;
        this.notify();
        this.initRealtime();
        this.triggerCloudSync();
      }
    });

    window.addEventListener('offline', () => {
      this.syncState.isOnline = false;
      this.notify();
    });

    // Initialize real-time listeners if online
    this.initRealtime();

    // Trigger initial sync to pull server data or push offline data
    this.triggerCloudSync();
  }

  public static toggleSimulatedOffline() {
    this.syncState.simulatedOffline = !this.syncState.simulatedOffline;
    localStorage.setItem(STORAGE_KEYS.OFFLINE_SIM, String(this.syncState.simulatedOffline));
    this.syncState.isOnline = !this.syncState.simulatedOffline && navigator.onLine;
    this.notify();

    if (this.syncState.isOnline) {
      this.initRealtime();
      this.triggerCloudSync();
    } else {
      if (this.unsubscribeSupabaseRealtime) {
        this.unsubscribeSupabaseRealtime();
        this.unsubscribeSupabaseRealtime = null;
      }
      if (this.sseSource) {
        this.sseSource.close();
        this.sseSource = null;
      }
    }
  }

  private static initRealtime() {
    if (!this.syncState.isOnline) return;

    if (isSupabaseConfigured()) {
      if (this.unsubscribeSupabaseRealtime) {
        this.unsubscribeSupabaseRealtime();
        this.unsubscribeSupabaseRealtime = null;
      }
      this.unsubscribeSupabaseRealtime = SupabaseSyncService.subscribeRealtime(() => {
        this.triggerCloudSync();
      });
    } else {
      this.initSSE();
    }
  }

  private static initSSE() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    if (!this.syncState.isOnline) return;

    try {
      this.sseSource = new EventSource('/api/events');
      this.sseSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'SYNC_UPDATE' && payload.data) {
            this.mergeRemoteStore(payload.data);
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e);
        }
      };

      this.sseSource.onerror = () => {
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
      };
    } catch {
      // SSE not supported or unavailable
    }
  }

  public static getTransactions(): Transaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  public static saveTransactions(items: Transaction[]) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(items));
    this.updatePendingCount();
    this.notify();
  }

  public static adjustAssetBalance(groupId: string, assetId: string | undefined, delta: number) {
    if (!assetId || delta === 0) return;
    const groups = this.getGroups();
    const grpIndex = groups.findIndex((g) => g.id === groupId);
    if (grpIndex === -1) return;

    const grp = groups[grpIndex];
    const assets = grp.assets || [];
    const astIndex = assets.findIndex((a) => a.id === assetId);
    if (astIndex === -1) return;

    const oldBal = typeof assets[astIndex].balance === 'number' ? assets[astIndex].balance : 0;
    const newBal = oldBal + delta;

    assets[astIndex] = {
      ...assets[astIndex],
      balance: newBal,
      updatedAt: Date.now(),
    };

    grp.assets = [...assets];
    grp.updatedAt = Date.now();
    groups[grpIndex] = grp;

    this.saveGroups(groups);
    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveGroup(grp).catch((err) =>
        console.warn('Supabase saveGroup notice:', err)
      );
    }
  }

  public static addTransaction(transaction: Omit<Transaction, 'id' | 'updatedAt' | 'syncStatus'>): Transaction {
    this.assertOnline('mencatat transaksi');

    const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Fallback to first available asset if not selected
    let finalAssetId = transaction.assetId;
    if (!finalAssetId) {
      const groups = this.getGroups();
      const currentGrp = groups.find((g) => g.id === transaction.groupId) || groups[0];
      if (currentGrp && currentGrp.assets && currentGrp.assets.length > 0) {
        finalAssetId = currentGrp.assets[0].id;
      }
    }

    const newTx: Transaction = {
      ...transaction,
      assetId: finalAssetId,
      id,
      updatedAt: Date.now(),
      syncStatus: 'synced',
    };

    const current = this.getTransactions();
    const updated = [newTx, ...current];
    this.saveTransactions(updated);

    // Update asset balance: income adds, expense subtracts
    const delta = newTx.type === 'income' ? newTx.amount : -newTx.amount;
    this.adjustAssetBalance(newTx.groupId, newTx.assetId, delta);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveTransaction(newTx).catch((err) => {
        console.warn('Supabase saveTransaction error:', err);
        this.syncState.syncError = err.message || 'Gagal menyimpan transaksi ke cloud';
        this.notify();
      });
    }

    return newTx;
  }

  public static updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    this.assertOnline('mengubah transaksi');

    const current = this.getTransactions();
    const index = current.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = current[index];

    // Revert old transaction's impact on old asset
    const oldDelta = existing.type === 'income' ? existing.amount : -existing.amount;
    this.adjustAssetBalance(existing.groupId, existing.assetId, -oldDelta);

    const updatedTx: Transaction = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
      syncStatus: 'synced',
    };

    // Apply new transaction's impact on new asset
    const newDelta = updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount;
    this.adjustAssetBalance(updatedTx.groupId, updatedTx.assetId, newDelta);

    current[index] = updatedTx;
    this.saveTransactions(current);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveTransaction(updatedTx).catch((err) => {
        console.warn('Supabase updateTransaction error:', err);
        this.syncState.syncError = err.message || 'Gagal mengubah transaksi di cloud';
        this.notify();
      });
    }

    return updatedTx;
  }

  public static getDeletedTxIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_TX_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addDeletedTxId(id: string) {
    const set = new Set(this.getDeletedTxIds());
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_TX_IDS, JSON.stringify(Array.from(set)));
  }

  public static getDeletedCatIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_CAT_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addDeletedCatId(id: string) {
    const set = new Set(this.getDeletedCatIds());
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_CAT_IDS, JSON.stringify(Array.from(set)));
  }

  public static getDeletedGrpIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_GRP_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addDeletedGrpId(id: string) {
    const set = new Set(this.getDeletedGrpIds());
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_GRP_IDS, JSON.stringify(Array.from(set)));
  }

  public static getDeletedDebtIds(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DELETED_DEBT_IDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static addDeletedDebtId(id: string) {
    const set = new Set(this.getDeletedDebtIds());
    set.add(id);
    localStorage.setItem(STORAGE_KEYS.DELETED_DEBT_IDS, JSON.stringify(Array.from(set)));
  }

  public static deleteTransaction(id: string): boolean {
    this.assertOnline('menghapus transaksi');

    const current = this.getTransactions();
    const item = current.find((t) => t.id === id);
    if (!item) return false;

    // Revert asset balance
    const oldDelta = item.type === 'income' ? item.amount : -item.amount;
    this.adjustAssetBalance(item.groupId, item.assetId, -oldDelta);

    // Filter out locally immediately
    const filtered = current.filter((t) => t.id !== id);
    this.saveTransactions(filtered);
    this.addDeletedTxId(id);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.deleteTransaction(id).catch((err) => {
        console.warn('Supabase deleteTransaction error:', err);
        this.syncState.syncError = err.message || 'Gagal menghapus transaksi di cloud';
        this.notify();
      });
    }

    return true;
  }

  /**
   * Transfer between asset accounts
   * Deducts source asset, credits destination asset, and records linked transfer transactions
   */
  public static transferBetweenAssets(params: {
    groupId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
    adminFee?: number;
    memberId: string;
    date: string;
    time: string;
    note?: string;
  }): { outTx: Transaction; inTx: Transaction; feeTx?: Transaction } {
    const { groupId, fromAssetId, toAssetId, amount, adminFee = 0, memberId, date, time, note } = params;

    const groups = this.getGroups();
    const grp = groups.find((g) => g.id === groupId) || groups[0];
    const assets = grp?.assets || [];
    const fromAsset = assets.find((a) => a.id === fromAssetId);
    const toAsset = assets.find((a) => a.id === toAssetId);

    const fromName = fromAsset ? fromAsset.name : 'Rekening Asal';
    const toName = toAsset ? toAsset.name : 'Rekening Tujuan';

    const transferPairId = `trf-${Date.now()}`;
    const descNote = note ? ` (${note})` : '';

    // 1. Transaction Out from Source Account
    const outTx = this.addTransaction({
      amount,
      type: 'expense',
      categoryId: 'cat-savings',
      description: `Transfer keluar ke ${toName}${descNote}`,
      date,
      time,
      paymentMethod: fromAsset?.type === 'kas' ? 'tunai' : fromAsset?.type === 'ewallet' ? 'qris_ewallet' : 'transfer_bank',
      assetId: fromAssetId,
      memberId,
      groupId,
      isTransfer: true,
      toAssetId,
      transferPairId,
    });

    // 2. Transaction In to Destination Account
    const inTx = this.addTransaction({
      amount,
      type: 'income',
      categoryId: 'cat-in-others',
      description: `Transfer masuk dari ${fromName}${descNote}`,
      date,
      time,
      paymentMethod: toAsset?.type === 'kas' ? 'tunai' : toAsset?.type === 'ewallet' ? 'qris_ewallet' : 'transfer_bank',
      assetId: toAssetId,
      memberId,
      groupId,
      isTransfer: true,
      toAssetId: fromAssetId,
      transferPairId,
    });

    // 3. Optional Admin Fee Transaction
    let feeTx: Transaction | undefined;
    if (adminFee > 0) {
      feeTx = this.addTransaction({
        amount: adminFee,
        type: 'expense',
        categoryId: 'cat-bills',
        description: `Biaya Admin Transfer ${fromName} ke ${toName}`,
        date,
        time,
        paymentMethod: 'transfer_bank',
        assetId: fromAssetId,
        memberId,
        groupId,
        isTransfer: true,
        transferPairId,
      });
    }

    return { outTx, inTx, feeTx };
  }

  // Utang & Piutang (Debts & Loans) Storage Engine
  public static getDebts(): DebtRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEBTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(DEFAULT_DEBTS));
        return DEFAULT_DEBTS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_DEBTS;
    }
  }

  public static saveDebts(items: DebtRecord[]) {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(items));
    this.notify();
  }

  public static addDebt(
    debt: Omit<DebtRecord, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'status' | 'payments'>,
    options?: {
      affectAssetBalance?: boolean;
    }
  ): DebtRecord {
    this.assertOnline('mencatat data utang/piutang');

    const id = `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newDebt: DebtRecord = {
      ...debt,
      id,
      paidAmount: 0,
      status: 'unpaid',
      payments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const current = this.getDebts();
    const updated = [newDebt, ...current];
    this.saveDebts(updated);

    const shouldAffect = options?.affectAssetBalance !== false;
    const initialTxIds: string[] = [];

    // Synchronize initial loan to account balances
    if (shouldAffect) {
      if (debt.partyType === 'internal') {
        // Internal Loan between Family Members
        const lenderMemberId = debt.type === 'piutang' ? debt.memberId : debt.otherMemberId;
        const borrowerMemberId = debt.type === 'piutang' ? debt.otherMemberId : debt.memberId;

        // 1. Lender gives money: Lender's account balance decreases
        if (debt.assetId && lenderMemberId) {
          const tx = this.addTransaction({
            amount: debt.amount,
            type: 'expense',
            categoryId: 'cat-bills',
            description: `Pinjaman diberikan ke anggota: ${debt.description}`,
            date: debt.date,
            time: '12:00',
            paymentMethod: 'transfer_bank',
            assetId: debt.assetId,
            memberId: lenderMemberId,
            groupId: debt.groupId,
          });
          if (tx?.id) initialTxIds.push(tx.id);
        }

        // 2. Borrower receives money: Borrower's account balance increases
        if (debt.targetAssetId && borrowerMemberId) {
          const tx = this.addTransaction({
            amount: debt.amount,
            type: 'income',
            categoryId: 'cat-in-others',
            description: `Pinjaman diterima dari anggota: ${debt.description}`,
            date: debt.date,
            time: '12:00',
            paymentMethod: 'transfer_bank',
            assetId: debt.targetAssetId,
            memberId: borrowerMemberId,
            groupId: debt.groupId,
          });
          if (tx?.id) initialTxIds.push(tx.id);
        }
      } else {
        // External Loan (Pihak Luar)
        if (debt.assetId) {
          if (debt.type === 'piutang') {
            // Pinjamkan ke pihak luar: saldo kita berkurang
            const tx = this.addTransaction({
              amount: debt.amount,
              type: 'expense',
              categoryId: 'cat-bills',
              description: `Pencairan Piutang ke ${debt.otherPersonName || 'Pihak Luar'}: ${debt.description}`,
              date: debt.date,
              time: '12:00',
              paymentMethod: 'transfer_bank',
              assetId: debt.assetId,
              memberId: debt.memberId,
              groupId: debt.groupId,
            });
            if (tx?.id) initialTxIds.push(tx.id);
          } else {
            // Pinjam dari pihak luar: saldo kita bertambah
            const tx = this.addTransaction({
              amount: debt.amount,
              type: 'income',
              categoryId: 'cat-in-others',
              description: `Penerimaan Pinjaman dari ${debt.otherPersonName || 'Pihak Luar'}: ${debt.description}`,
              date: debt.date,
              time: '12:00',
              paymentMethod: 'transfer_bank',
              assetId: debt.assetId,
              memberId: debt.memberId,
              groupId: debt.groupId,
            });
            if (tx?.id) initialTxIds.push(tx.id);
          }
        }
      }
    }

    if (initialTxIds.length > 0) {
      newDebt.initialTransactionIds = initialTxIds;
      this.saveDebts(this.getDebts().map((d) => (d.id === newDebt.id ? newDebt : d)));
    }

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveDebt(newDebt).catch((err) =>
        console.warn('Supabase saveDebt notice:', err)
      );
    }

    return newDebt;
  }

  public static updateDebt(id: string, updates: Partial<DebtRecord>): DebtRecord | null {
    this.assertOnline('mengubah data utang/piutang');

    const current = this.getDebts();
    const index = current.findIndex((d) => d.id === id);
    if (index === -1) return null;

    const existing = current[index];
    const updated: DebtRecord = {
      ...existing,
      ...updates,
      id,
      updatedAt: Date.now(),
    };

    // Recalculate status based on paidAmount
    const remaining = Math.max(0, updated.amount - (updated.paidAmount || 0));
    if (remaining <= 0) {
      updated.status = 'paid';
    } else if ((updated.paidAmount || 0) > 0) {
      updated.status = 'partial';
    } else {
      updated.status = 'unpaid';
    }

    current[index] = updated;
    this.saveDebts(current);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveDebt(updated).catch((err) =>
        console.warn('Supabase updateDebt notice:', err)
      );
    }

    return updated;
  }

  public static deleteDebt(id: string): boolean {
    this.assertOnline('menghapus data utang/piutang');

    const current = this.getDebts();
    const target = current.find((d) => d.id === id);
    if (target) {
      // Revert initial loan transactions
      if (target.initialTransactionIds && target.initialTransactionIds.length > 0) {
        for (const txId of target.initialTransactionIds) {
          this.deleteTransaction(txId);
        }
      }
      // Revert all payment transactions
      if (target.payments && target.payments.length > 0) {
        for (const p of target.payments) {
          if (p.transactionIds && p.transactionIds.length > 0) {
            for (const txId of p.transactionIds) {
              this.deleteTransaction(txId);
            }
          }
        }
      }
    }

    const filtered = current.filter((d) => d.id !== id);
    this.saveDebts(filtered);
    this.addDeletedDebtId(id);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.deleteDebt(id).catch((err) =>
        console.warn('Supabase deleteDebt notice:', err)
      );
    }

    return true;
  }

  public static addDebtPayment(
    debtId: string,
    payment: {
      amount: number;
      date: string;
      assetId?: string; // Rekening pembayar (Peminjam)
      recipientAssetId?: string; // Rekening penerima (Pemberi Pinjaman)
      note?: string;
    },
    affectAssetBalance: boolean = true
  ): DebtRecord | null {
    this.assertOnline('mencatat pembayaran cicilan utang/piutang');

    const current = this.getDebts();
    const index = current.findIndex((d) => d.id === debtId);
    if (index === -1) return null;

    const debt = current[index];
    const newPaidAmount = (debt.paidAmount || 0) + payment.amount;
    const paymentTxIds: string[] = [];

    // If affectAssetBalance is true, record transactions to synchronize asset balances
    if (affectAssetBalance !== false) {
      if (debt.partyType === 'internal') {
        // Antar Anggota Keluarga:
        // Payer = Peminjam (yang berutang, saldo berkurang)
        // Receiver = Pemberi Pinjaman (yang berhak tagih, saldo bertambah)
        const payerMemberId = debt.type === 'piutang' ? debt.otherMemberId : debt.memberId;
        const receiverMemberId = debt.type === 'piutang' ? debt.memberId : debt.otherMemberId;

        // 1. Peminjam pays debt: Peminjam's account balance decreases
        if (payment.assetId && payerMemberId) {
          const tx = this.addTransaction({
            amount: payment.amount,
            type: 'expense',
            categoryId: 'cat-bills',
            description: `Bayar Cicilan/Pelunasan Utang: ${debt.description} (${payment.note || 'Lunas/Cicil'})`,
            date: payment.date,
            time: '12:00',
            paymentMethod: 'transfer_bank',
            assetId: payment.assetId,
            memberId: payerMemberId,
            groupId: debt.groupId,
          });
          if (tx?.id) paymentTxIds.push(tx.id);
        }

        // 2. Pemberi pinjaman receives payment: Pemberi Pinjaman's account balance increases
        if (payment.recipientAssetId && receiverMemberId) {
          const tx = this.addTransaction({
            amount: payment.amount,
            type: 'income',
            categoryId: 'cat-in-others',
            description: `Terima Pembayaran Piutang dari anggota: ${debt.description} (${payment.note || 'Lunas/Cicil'})`,
            date: payment.date,
            time: '12:00',
            paymentMethod: 'transfer_bank',
            assetId: payment.recipientAssetId,
            memberId: receiverMemberId,
            groupId: debt.groupId,
          });
          if (tx?.id) paymentTxIds.push(tx.id);
        }
      } else {
        // Pihak Luar (External party)
        if (payment.assetId) {
          if (debt.type === 'utang') {
            // Kita bayar utang ke pihak luar: saldo berkurang
            const tx = this.addTransaction({
              amount: payment.amount,
              type: 'expense',
              categoryId: 'cat-bills',
              description: `Pembayaran Utang: ${debt.description} (${debt.otherPersonName || 'Pihak Luar'})`,
              date: payment.date,
              time: '12:00',
              paymentMethod: 'transfer_bank',
              assetId: payment.assetId,
              memberId: debt.memberId,
              groupId: debt.groupId,
            });
            if (tx?.id) paymentTxIds.push(tx.id);
          } else {
            // Pihak luar bayar piutang ke kita: saldo bertambah
            const tx = this.addTransaction({
              amount: payment.amount,
              type: 'income',
              categoryId: 'cat-in-others',
              description: `Pelunasan Piutang: ${debt.description} (${debt.otherPersonName || 'Pihak Luar'})`,
              date: payment.date,
              time: '12:00',
              paymentMethod: 'transfer_bank',
              assetId: payment.assetId,
              memberId: debt.memberId,
              groupId: debt.groupId,
            });
            if (tx?.id) paymentTxIds.push(tx.id);
          }
        }
      }
    }

    const paymentRecord: DebtPayment = {
      id: `pay-${Date.now()}`,
      amount: payment.amount,
      date: payment.date || new Date().toISOString().split('T')[0],
      assetId: payment.assetId,
      recipientAssetId: payment.recipientAssetId,
      note: payment.note,
      transactionIds: paymentTxIds.length > 0 ? paymentTxIds : undefined,
      createdAt: Date.now(),
    };

    const payments = [...(debt.payments || []), paymentRecord];
    const remaining = Math.max(0, debt.amount - newPaidAmount);
    const newStatus = remaining <= 0 ? 'paid' : 'partial';

    const updated: DebtRecord = {
      ...debt,
      paidAmount: newPaidAmount,
      status: newStatus,
      payments,
      updatedAt: Date.now(),
    };

    current[index] = updated;
    this.saveDebts(current);
    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveDebt(updated).catch((err) =>
        console.warn('Supabase saveDebt notice:', err)
      );
    }
    return updated;
  }

  public static deleteDebtPayment(debtId: string, paymentId: string): DebtRecord | null {
    this.assertOnline('menghapus pembayaran cicilan utang/piutang');

    const current = this.getDebts();
    const index = current.findIndex((d) => d.id === debtId);
    if (index === -1) return null;

    const debt = current[index];
    const payments = debt.payments || [];
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return null;

    // 1. Revert and delete all transactions generated by this payment
    if (payment.transactionIds && payment.transactionIds.length > 0) {
      for (const txId of payment.transactionIds) {
        this.deleteTransaction(txId);
      }
    } else {
      // Fallback for legacy records without transactionIds: revert asset balances
      if (payment.assetId) {
        this.adjustAssetBalance(debt.groupId, payment.assetId, payment.amount);
      }
      if (payment.recipientAssetId) {
        this.adjustAssetBalance(debt.groupId, payment.recipientAssetId, -payment.amount);
      }
    }

    // 2. Remove payment and recalculate debt
    const updatedPayments = payments.filter((p) => p.id !== paymentId);
    const newPaidAmount = Math.max(0, (debt.paidAmount || 0) - payment.amount);
    const remaining = Math.max(0, debt.amount - newPaidAmount);
    const newStatus = remaining <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    const updatedDebt: DebtRecord = {
      ...debt,
      paidAmount: newPaidAmount,
      status: newStatus,
      payments: updatedPayments,
      updatedAt: Date.now(),
    };

    current[index] = updatedDebt;
    this.saveDebts(current);
    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveDebt(updatedDebt).catch((err) =>
        console.warn('Supabase saveDebt notice:', err)
      );
    }
    return updatedDebt;
  }

  public static updateDebtPayment(
    debtId: string,
    paymentId: string,
    updates: {
      amount: number;
      date: string;
      note?: string;
    }
  ): DebtRecord | null {
    this.assertOnline('mengubah pembayaran cicilan utang/piutang');

    const current = this.getDebts();
    const index = current.findIndex((d) => d.id === debtId);
    if (index === -1) return null;

    const debt = current[index];
    const payments = debt.payments || [];
    const pIndex = payments.findIndex((p) => p.id === paymentId);
    if (pIndex === -1) return null;

    const oldPayment = payments[pIndex];
    const diff = updates.amount - oldPayment.amount;

    // 1. Update linked transactions
    if (oldPayment.transactionIds && oldPayment.transactionIds.length > 0) {
      for (const txId of oldPayment.transactionIds) {
        this.updateTransaction(txId, {
          amount: updates.amount,
          date: updates.date,
          description: updates.note ? `${debt.description} (${updates.note})` : undefined,
        });
      }
    } else {
      // Fallback: adjust balances directly
      if (oldPayment.assetId) {
        this.adjustAssetBalance(debt.groupId, oldPayment.assetId, -diff);
      }
      if (oldPayment.recipientAssetId) {
        this.adjustAssetBalance(debt.groupId, oldPayment.recipientAssetId, diff);
      }
    }

    // 2. Update payment object
    const updatedPayment: DebtPayment = {
      ...oldPayment,
      amount: updates.amount,
      date: updates.date,
      note: updates.note,
    };

    const updatedPayments = [...payments];
    updatedPayments[pIndex] = updatedPayment;

    const newPaidAmount = Math.max(0, (debt.paidAmount || 0) + diff);
    const remaining = Math.max(0, debt.amount - newPaidAmount);
    const newStatus = remaining <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    const updatedDebt: DebtRecord = {
      ...debt,
      paidAmount: newPaidAmount,
      status: newStatus,
      payments: updatedPayments,
      updatedAt: Date.now(),
    };

    current[index] = updatedDebt;
    this.saveDebts(current);
    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveDebt(updatedDebt).catch((err) =>
        console.warn('Supabase saveDebt notice:', err)
      );
    }
    return updatedDebt;
  }

  public static getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      let list: Category[] = data ? JSON.parse(data) : DEFAULT_CATEGORIES;
      if (!list || list.length === 0) list = DEFAULT_CATEGORIES;

      let needsSave = false;
      const updatedList = list.map((c) => {
        if (!c.type) {
          needsSave = true;
          return { ...c, type: 'expense' as const };
        }
        return c;
      });

      // Ensure default income categories exist if the user has no income categories yet
      const hasIncome = updatedList.some((c) => c.type === 'income');
      if (!hasIncome) {
        const defaultIncomeCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'income');
        updatedList.push(...defaultIncomeCategories);
        needsSave = true;
      }

      if (needsSave) {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedList));
      }

      return updatedList;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  public static saveCategories(categories: Category[]) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.notify();
  }

  public static addCategory(cat: Omit<Category, 'id' | 'updatedAt'>): Category {
    this.assertOnline('menambah kategori');

    const id = `cat-${Date.now()}`;
    const newCat: Category = {
      ...cat,
      id,
      updatedAt: Date.now(),
    };
    const current = this.getCategories();
    const updated = [...current, newCat];
    this.saveCategories(updated);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveCategory(newCat).catch((err) =>
        console.warn('Supabase saveCategory notice:', err)
      );
    }

    return newCat;
  }

  public static updateCategory(id: string, updates: Partial<Category>): Category | null {
    this.assertOnline('mengubah kategori');

    const current = this.getCategories();
    const index = current.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const updatedCat: Category = {
      ...current[index],
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    current[index] = updatedCat;
    this.saveCategories(current);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveCategory(updatedCat).catch((err) =>
        console.warn('Supabase updateCategory notice:', err)
      );
    }

    return updatedCat;
  }

  public static deleteCategory(id: string): boolean {
    this.assertOnline('menghapus kategori');

    const current = this.getCategories();
    const filtered = current.filter((c) => c.id !== id);
    this.saveCategories(filtered);
    this.addDeletedCatId(id);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.deleteCategory(id).catch((err) =>
        console.warn('Supabase deleteCategory notice:', err)
      );
    }

    return true;
  }

  public static getGroups(): FamilyGroup[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      const groups: FamilyGroup[] = data ? JSON.parse(data) : DEFAULT_GROUPS;
      const list = groups.length > 0 ? groups : DEFAULT_GROUPS;
      return list.map((g) => ({
        ...g,
        assets:
          Array.isArray(g.assets) && g.assets.length > 0
            ? g.assets
            : g.type === 'pribadi'
            ? DEFAULT_PERSONAL_ASSETS
            : DEFAULT_FAMILY_ASSETS,
      }));
    } catch {
      return DEFAULT_GROUPS;
    }
  }

  public static saveGroups(groups: FamilyGroup[]) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    this.notify();
  }

  public static getCurrentGroupId(): string {
    const groups = this.getGroups();
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_GROUP_ID);
    if (saved && groups.some((g) => g.id === saved)) {
      return saved;
    }
    return groups[0]?.id || 'grp-family-1';
  }

  public static setCurrentGroupId(groupId: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_GROUP_ID, groupId);
    this.notify();
  }

  public static addGroup(group: Omit<FamilyGroup, 'id' | 'updatedAt'>): FamilyGroup {
    this.assertOnline('menambah grup keluarga');

    const id = `grp-${Date.now()}`;
    const newGroup: FamilyGroup = {
      ...group,
      id,
      updatedAt: Date.now(),
    };
    const current = this.getGroups();
    const updated = [...current, newGroup];
    this.saveGroups(updated);
    this.setCurrentGroupId(id);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveGroup(newGroup).catch((err) =>
        console.warn('Supabase saveGroup notice:', err)
      );
    }

    return newGroup;
  }

  public static updateGroup(id: string, updates: Partial<FamilyGroup>): FamilyGroup | null {
    this.assertOnline('mengubah data grup/rekening');

    const current = this.getGroups();
    const index = current.findIndex((g) => g.id === id);
    if (index === -1) return null;

    const updatedGroup: FamilyGroup = {
      ...current[index],
      ...updates,
      id,
      updatedAt: Date.now(),
    };
    current[index] = updatedGroup;
    this.saveGroups(current);

    if (isSupabaseConfigured()) {
      SupabaseSyncService.saveGroup(updatedGroup).catch((err) =>
        console.warn('Supabase updateGroup notice:', err)
      );
    }

    return updatedGroup;
  }

  public static deleteGroup(id: string): boolean {
    this.assertOnline('menghapus grup keluarga');

    const current = this.getGroups();
    if (current.length <= 1) return false;

    const filtered = current.filter((g) => g.id !== id);
    this.saveGroups(filtered);
    this.addDeletedGrpId(id);

    // If current group was deleted, switch to next available
    if (this.getCurrentGroupId() === id) {
      this.setCurrentGroupId(filtered[0].id);
    }

    if (isSupabaseConfigured()) {
      SupabaseSyncService.deleteGroup(id).catch((err) =>
        console.warn('Supabase deleteGroup notice:', err)
      );
    }

    return true;
  }

  public static async clearAllTransactions(): Promise<boolean> {
    const current = this.getTransactions();
    current.forEach((t) => this.addDeletedTxId(t.id));
    this.saveTransactions([]);

    if (this.syncState.isOnline) {
      try {
        await fetch('/api/clear-transactions', { method: 'POST' });
      } catch {}
    }

    this.triggerCloudSync();
    return true;
  }

  public static async resetAllData(): Promise<boolean> {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.GROUPS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_TX_IDS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_CAT_IDS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_GRP_IDS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_DEBT_IDS);
    localStorage.removeItem(STORAGE_KEYS.PENDING_QUEUE);

    if (this.syncState.isOnline) {
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch {}
    }

    this.saveCategories(DEFAULT_CATEGORIES);
    this.saveGroups(DEFAULT_GROUPS);
    this.setCurrentGroupId(DEFAULT_GROUPS[0].id);
    this.saveTransactions([]);
    this.saveDebts(DEFAULT_DEBTS);
    this.notify();
    return true;
  }

  // Pending queue management for offline sync
  private static getPendingQueue(): any[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static enqueuePending(type: string, item: any) {
    const queue = this.getPendingQueue();
    queue.push({ type, item, queuedAt: Date.now() });
    localStorage.setItem(STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(queue));
    this.updatePendingCount();
  }

  private static clearPendingQueue() {
    localStorage.removeItem(STORAGE_KEYS.PENDING_QUEUE);
    this.updatePendingCount();
  }

  private static updatePendingCount() {
    const transactions = this.getTransactions();
    const offlineTxs = transactions.filter((t) => t.syncStatus !== 'synced').length;
    const pendingQueue = this.getPendingQueue().length;
    this.syncState.pendingCount = offlineTxs + pendingQueue;
  }

  // Cloud Sync Engine
  public static async triggerCloudSync() {
    if (!this.syncState.isOnline || this.syncState.isSyncing) return;

    this.syncState.isSyncing = true;
    this.syncState.syncError = null;
    this.notify();

    const localTransactions = this.getTransactions();
    const localCategories = this.getCategories();
    const localGroups = this.getGroups();
    const localDebts = this.getDebts();
    const deletedTxIds = this.getDeletedTxIds();
    const deletedCatIds = this.getDeletedCatIds();
    const deletedGrpIds = this.getDeletedGrpIds();
    const deletedDebtIds = this.getDeletedDebtIds();

    try {
      // 1. Primary: Direct Supabase Cloud Pull
      // CLOUD IS THE SINGLE SOURCE OF TRUTH. LOCAL NEVER OVERWRITES CLOUD!
      if (isSupabaseConfigured()) {
        try {
          const remote = await SupabaseSyncService.pullFromSupabase();

          if (remote.isInitialized) {
            // Cloud has data: refresh local cache with canonical data from Supabase
            this.saveGroups(remote.groups);
            this.saveCategories(remote.categories);
            this.saveTransactions(remote.transactions);
            this.saveDebts(remote.debts);
          } else {
            // First time ever: Supabase is brand new and empty (0 groups)
            // Seed initial starting data to Supabase once
            await SupabaseSyncService.seedIfEmpty(
              DEFAULT_GROUPS,
              DEFAULT_CATEGORIES,
              DEFAULT_DEBTS
            );
            const fresh = await SupabaseSyncService.pullFromSupabase();
            if (fresh.isInitialized) {
              this.saveGroups(fresh.groups);
              this.saveCategories(fresh.categories);
              this.saveTransactions(fresh.transactions);
              this.saveDebts(fresh.debts);
            }
          }

          this.clearPendingQueue();
          this.syncState.lastSyncedAt = Date.now();
          this.syncState.syncError = null;
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(this.syncState.lastSyncedAt));
          this.notify();
          return;
        } catch (supaErr: any) {
          if (supaErr?.code === 'PGRST205' || supaErr?.message?.includes('schema cache')) {
            this.syncState.syncError = 'Tabel database Supabase belum dibuat. Jalankan supabase_schema.sql di Supabase SQL Editor.';
            return;
          }
          console.warn('Supabase pull notice:', supaErr);
          this.syncState.syncError = supaErr.message || 'Gagal sinkronisasi Supabase';
        }
      }

      // 2. Secondary Fallback: Local /api/sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: localTransactions,
          categories: localCategories,
          groups: localGroups,
          debts: localDebts,
          deletedTxIds,
          deletedCatIds,
          deletedGrpIds,
          deletedDebtIds,
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            this.mergeRemoteStore(resData.data);
            this.clearPendingQueue();
            this.syncState.lastSyncedAt = Date.now();
            this.syncState.syncError = null;
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, String(this.syncState.lastSyncedAt));
          }
        }
      }
    } catch (err: any) {
      if (!this.syncState.syncError) {
        this.syncState.syncError = err.message || 'Gagal sinkronisasi';
      }
    } finally {
      this.syncState.isSyncing = false;
      this.updatePendingCount();
      this.notify();
    }
  }

  private static mergeRemoteStore(remoteData: any) {
    if (!remoteData) return;

    const deletedTxSet = new Set(this.getDeletedTxIds());
    const deletedCatSet = new Set(this.getDeletedCatIds());
    const deletedGrpSet = new Set(this.getDeletedGrpIds());
    const deletedDebtSet = new Set(this.getDeletedDebtIds());

    // Merge transactions
    if (Array.isArray(remoteData.transactions)) {
      const localMap = new Map<string, Transaction>(this.getTransactions().map((t) => [t.id, t]));
      for (const remoteTx of remoteData.transactions) {
        if (deletedTxSet.has(remoteTx.id) || remoteTx.isDeleted) {
          localMap.delete(remoteTx.id);
          continue;
        }
        const local = localMap.get(remoteTx.id);
        if (!local || remoteTx.updatedAt > local.updatedAt) {
          localMap.set(remoteTx.id, { ...remoteTx, syncStatus: 'synced' });
        }
      }
      // Filter out deleted items from local active view
      const merged = Array.from(localMap.values())
        .filter((t) => !t.isDeleted && !deletedTxSet.has(t.id))
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(merged));
    }

    // Merge categories
    if (Array.isArray(remoteData.categories)) {
      const catMap = new Map<string, Category>(this.getCategories().map((c) => [c.id, c]));
      for (const remoteCat of remoteData.categories) {
        if (deletedCatSet.has(remoteCat.id)) {
          catMap.delete(remoteCat.id);
          continue;
        }
        const local = catMap.get(remoteCat.id);
        if (!local || remoteCat.updatedAt > local.updatedAt) {
          catMap.set(remoteCat.id, remoteCat);
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify(Array.from(catMap.values()).filter((c) => !deletedCatSet.has(c.id)))
      );
    }

    // Merge groups
    if (Array.isArray(remoteData.groups)) {
      const grpMap = new Map<string, FamilyGroup>(this.getGroups().map((g) => [g.id, g]));
      for (const remoteGrp of remoteData.groups) {
        if (deletedGrpSet.has(remoteGrp.id)) {
          grpMap.delete(remoteGrp.id);
          continue;
        }
        const local = grpMap.get(remoteGrp.id);
        if (!local || remoteGrp.updatedAt > local.updatedAt) {
          grpMap.set(remoteGrp.id, remoteGrp);
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.GROUPS,
        JSON.stringify(Array.from(grpMap.values()).filter((g) => !deletedGrpSet.has(g.id)))
      );
    }

    // Merge debts
    if (Array.isArray(remoteData.debts)) {
      const debtMap = new Map<string, DebtRecord>(this.getDebts().map((d) => [d.id, d]));
      for (const remoteDebt of remoteData.debts) {
        if (deletedDebtSet.has(remoteDebt.id) || remoteDebt.isDeleted) {
          debtMap.delete(remoteDebt.id);
          continue;
        }
        const local = debtMap.get(remoteDebt.id);
        if (!local || remoteDebt.updatedAt > local.updatedAt) {
          debtMap.set(remoteDebt.id, remoteDebt);
        }
      }
      localStorage.setItem(
        STORAGE_KEYS.DEBTS,
        JSON.stringify(Array.from(debtMap.values()).filter((d) => !deletedDebtSet.has(d.id)))
      );
    }

    this.notify();
  }
}
