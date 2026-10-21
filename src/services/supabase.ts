import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Category, DebtRecord, FamilyGroup, Transaction } from '../types/finance';

const DEFAULT_SUPABASE_URL = 'https://utugdjewnchvvpoxaura.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dWdkamV3bmNodnZwb3hhdXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NDI3MDIsImV4cCI6MjEwODExODcwMn0.KOmTz4XqSIXYaXOXu2i9CYFlWCtOssJSU7xuPhw50SA';

export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Checks if the app is currently running in a localhost / local development environment.
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h.endsWith('.local')
  );
}

/**
 * Returns true if Supabase is configured AND not in a local development environment.
 * Localhost is strictly isolated from modifying or affecting Supabase production!
 */
export function isSupabaseActiveForEnvironment(): boolean {
  if (typeof window !== 'undefined' && isLocalhost()) {
    return false;
  }
  return isSupabaseConfigured();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
}

/**
 * Validates online connection. Throws descriptive error if offline in browser.
 */
export function assertOnline(actionName: string = 'menyimpan data') {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    if (!navigator.onLine) {
      throw new Error(
        `Koneksi internet diperlukan untuk ${actionName}. Anda sedang dalam Mode Offline (Hanya Lihat). Hubungkan perangkat ke internet untuk melanjutkan.`
      );
    }
  }
}

// ----------------------------------------------------
// Serialization / Deserialization Mappers
// ----------------------------------------------------

export function toSupabaseGroup(grp: FamilyGroup) {
  return {
    id: grp.id,
    name: grp.name,
    type: grp.type || 'keluarga',
    currency: grp.currency || 'IDR',
    monthly_budget: grp.monthlyBudget || 0,
    members: grp.members || [],
    assets: grp.assets || [],
    updated_at: grp.updatedAt || Date.now(),
    is_deleted: false,
  };
}

export function fromSupabaseGroup(row: any): FamilyGroup {
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'keluarga',
    currency: row.currency || 'IDR',
    monthlyBudget: Number(row.monthly_budget || 0),
    members: Array.isArray(row.members) ? row.members : [],
    assets: Array.isArray(row.assets) ? row.assets : [],
    updatedAt: Number(row.updated_at || 1),
  };
}

export function toSupabaseCategory(cat: Category) {
  return {
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    monthly_budget: cat.monthlyBudget || 0,
    type: cat.type || 'expense',
    is_default: !!cat.isDefault,
    updated_at: cat.updatedAt || Date.now(),
    is_deleted: false,
  };
}

export function fromSupabaseCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    monthlyBudget: Number(row.monthly_budget || 0),
    type: row.type || 'expense',
    isDefault: !!row.is_default,
    updatedAt: Number(row.updated_at || 1),
  };
}

export function toSupabaseTx(tx: Transaction) {
  return {
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    category_id: tx.categoryId,
    description: tx.description || '',
    date: tx.date,
    time: tx.time || '12:00',
    payment_method: tx.paymentMethod || 'transfer_bank',
    asset_id: tx.assetId || null,
    group_id: tx.groupId,
    member_id: tx.memberId,
    receipt_url: tx.receiptUrl || null,
    is_transfer: !!tx.isTransfer,
    to_asset_id: tx.toAssetId || null,
    transfer_pair_id: tx.transferPairId || null,
    updated_at: tx.updatedAt || Date.now(),
    is_deleted: !!tx.isDeleted,
  };
}

export function fromSupabaseTx(row: any): Transaction {
  return {
    id: row.id,
    amount: Number(row.amount),
    type: row.type,
    categoryId: row.category_id,
    description: row.description || '',
    date: row.date,
    time: row.time || '12:00',
    paymentMethod: row.payment_method || 'transfer_bank',
    assetId: row.asset_id || undefined,
    groupId: row.group_id,
    memberId: row.member_id,
    receiptUrl: row.receipt_url || undefined,
    syncStatus: 'synced',
    isTransfer: !!row.is_transfer,
    toAssetId: row.to_asset_id || undefined,
    transferPairId: row.transfer_pair_id || undefined,
    updatedAt: Number(row.updated_at || 1),
    isDeleted: !!row.is_deleted,
  };
}

export function toSupabaseDebt(debt: DebtRecord) {
  return {
    id: debt.id,
    group_id: debt.groupId,
    type: debt.type,
    party_type: debt.partyType || 'external',
    scope: debt.scope || 'perorangan',
    is_joint: !!debt.isJoint,
    member_id: debt.memberId,
    other_member_id: debt.otherMemberId || null,
    other_person_name: debt.otherPersonName || null,
    amount: debt.amount || 0,
    paid_amount: debt.paidAmount || 0,
    due_date: debt.dueDate || null,
    date: debt.date,
    description: debt.description || '',
    asset_id: debt.assetId || null,
    target_asset_id: debt.targetAssetId || null,
    status: debt.status || 'unpaid',
    payments: debt.payments || [],
    initial_transaction_ids: debt.initialTransactionIds || [],
    created_at: debt.createdAt || Date.now(),
    updated_at: debt.updatedAt || Date.now(),
    is_deleted: !!debt.isDeleted,
  };
}

export function fromSupabaseDebt(row: any): DebtRecord {
  return {
    id: row.id,
    groupId: row.group_id,
    type: row.type,
    partyType: row.party_type || 'external',
    scope: row.scope || 'perorangan',
    isJoint: !!row.is_joint,
    memberId: row.member_id,
    otherMemberId: row.other_member_id || undefined,
    otherPersonName: row.other_person_name || undefined,
    amount: Number(row.amount || 0),
    paidAmount: Number(row.paid_amount || 0),
    dueDate: row.due_date || undefined,
    date: row.date,
    description: row.description || '',
    assetId: row.asset_id || undefined,
    targetAssetId: row.target_asset_id || undefined,
    status: row.status || 'unpaid',
    payments: Array.isArray(row.payments) ? row.payments : [],
    initialTransactionIds: Array.isArray(row.initial_transaction_ids) ? row.initial_transaction_ids : [],
    createdAt: Number(row.created_at || Date.now()),
    updatedAt: Number(row.updated_at || Date.now()),
    isDeleted: !!row.is_deleted,
  };
}

// ----------------------------------------------------
// Health Check & Table Existence Verification
// ----------------------------------------------------

export async function checkSupabaseHealth(): Promise<{
  ok: boolean;
  error: string | null;
  tablesMissing?: boolean;
}> {
  if (isLocalhost()) {
    return {
      ok: true,
      error: 'Localhost Environment (Terisolasi dari Supabase Production)',
    };
  }

  try {
    const { error } = await supabase.from('transactions').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return {
          ok: false,
          error: 'Tabel Supabase belum dibuat. Jalankan script supabase_schema.sql di Supabase SQL Editor.',
          tablesMissing: true,
        };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Koneksi ke Supabase gagal' };
  }
}

// ----------------------------------------------------
// Cloud-First Supabase Operations
// Localhost is isolated. No automatic template seed mechanism.
// ----------------------------------------------------

export interface RemoteSyncResult {
  transactions: Transaction[];
  categories: Category[];
  groups: FamilyGroup[];
  debts: DebtRecord[];
  isInitialized: boolean;
}

export class SupabaseSyncService {
  private static realtimeChannel: RealtimeChannel | null = null;

  /**
   * PULL ONLY: Fetches the deployed cloud data from Supabase.
   * Localhost will NOT query or modify Supabase production.
   */
  public static async pullFromSupabase(): Promise<RemoteSyncResult> {
    if (isLocalhost()) {
      return {
        groups: [],
        categories: [],
        transactions: [],
        debts: [],
        isInitialized: false,
      };
    }

    assertOnline('mengambil data dari cloud');

    const [txRes, catRes, grpRes, debtRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('is_deleted', false).order('date', { ascending: false }),
      supabase.from('categories').select('*').eq('is_deleted', false),
      supabase.from('groups').select('*').eq('is_deleted', false),
      supabase.from('debts').select('*').eq('is_deleted', false).order('date', { ascending: false }),
    ]);

    if (txRes.error) throw txRes.error;
    if (catRes.error) throw catRes.error;
    if (grpRes.error) throw grpRes.error;
    if (debtRes.error) throw debtRes.error;

    const groups = (grpRes.data || []).map(fromSupabaseGroup);
    const categories = (catRes.data || []).map(fromSupabaseCategory);
    const transactions = (txRes.data || []).map(fromSupabaseTx);
    const debts = (debtRes.data || []).map(fromSupabaseDebt);

    return {
      groups,
      categories,
      transactions,
      debts,
      isInitialized: groups.length > 0,
    };
  }

  /**
   * Saves a single transaction directly to Supabase.
   * Bypassed on localhost.
   */
  public static async saveTransaction(tx: Transaction): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('mencatat transaksi');
    const row = toSupabaseTx(tx);
    const { error } = await supabase.from('transactions').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  }

  /**
   * Soft-deletes a transaction in Supabase.
   * Bypassed on localhost.
   */
  public static async deleteTransaction(id: string): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menghapus transaksi');
    const { error } = await supabase
      .from('transactions')
      .update({ is_deleted: true, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Saves a group / updated asset balance directly to Supabase.
   * Bypassed on localhost.
   */
  public static async saveGroup(group: FamilyGroup): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menyimpan rekening / grup');
    const row = toSupabaseGroup(group);
    const { error } = await supabase.from('groups').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  }

  /**
   * Soft-deletes a group in Supabase.
   * Bypassed on localhost.
   */
  public static async deleteGroup(id: string): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menghapus grup');
    const { error } = await supabase
      .from('groups')
      .update({ is_deleted: true, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Saves a category directly to Supabase.
   * Bypassed on localhost.
   */
  public static async saveCategory(cat: Category): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menyimpan kategori');
    const row = toSupabaseCategory(cat);
    const { error } = await supabase.from('categories').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  }

  /**
   * Soft-deletes a category in Supabase.
   * Bypassed on localhost.
   */
  public static async deleteCategory(id: string): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menghapus kategori');
    const { error } = await supabase
      .from('categories')
      .update({ is_deleted: true, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Saves a debt record directly to Supabase.
   * Bypassed on localhost.
   */
  public static async saveDebt(debt: DebtRecord): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menyimpan utang/piutang');
    const row = toSupabaseDebt(debt);
    const { error } = await supabase.from('debts').upsert(row, { onConflict: 'id' });
    if (error) throw error;
  }

  /**
   * Soft-deletes a debt record in Supabase.
   * Bypassed on localhost.
   */
  public static async deleteDebt(id: string): Promise<void> {
    if (isLocalhost()) return;
    assertOnline('menghapus utang/piutang');
    const { error } = await supabase
      .from('debts')
      .update({ is_deleted: true, updated_at: Date.now() })
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Realtime Listener: Automatically re-fetches when any deployed device makes a change in Supabase.
   */
  public static subscribeRealtime(onChange: () => void) {
    if (isLocalhost()) {
      return () => {};
    }

    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = supabase
        .channel('arthasync-live-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => onChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => onChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'groups' },
          () => onChange()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'debts' },
          () => onChange()
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription notice:', err);
    }

    return () => {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
    };
  }
}
