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

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http'));
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

// Helper to chunk arrays for batch operations
function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// ----------------------------------------------------
// Cloud Sync with Supabase (Push & Pull)
// ----------------------------------------------------

export interface SyncPayload {
  transactions: Transaction[];
  categories: Category[];
  groups: FamilyGroup[];
  debts: DebtRecord[];
  deletedTxIds: string[];
  deletedCatIds: string[];
  deletedGrpIds: string[];
  deletedDebtIds: string[];
}

export interface RemoteSyncResult {
  transactions: Transaction[];
  categories: Category[];
  groups: FamilyGroup[];
  debts: DebtRecord[];
}

export class SupabaseSyncService {
  private static realtimeChannel: RealtimeChannel | null = null;

  /**
   * Push local changes and deletions to Supabase, then fetch latest remote data.
   */
  public static async sync(payload: SyncPayload): Promise<RemoteSyncResult> {
    // 1. Process soft deletions in Supabase
    if (payload.deletedTxIds.length > 0) {
      for (const chunk of chunkArray(payload.deletedTxIds, 100)) {
        await supabase
          .from('transactions')
          .update({ is_deleted: true, updated_at: Date.now() })
          .in('id', chunk);
      }
    }
    if (payload.deletedCatIds.length > 0) {
      for (const chunk of chunkArray(payload.deletedCatIds, 100)) {
        await supabase
          .from('categories')
          .update({ is_deleted: true, updated_at: Date.now() })
          .in('id', chunk);
      }
    }
    if (payload.deletedGrpIds.length > 0) {
      for (const chunk of chunkArray(payload.deletedGrpIds, 100)) {
        await supabase
          .from('groups')
          .update({ is_deleted: true, updated_at: Date.now() })
          .in('id', chunk);
      }
    }
    if (payload.deletedDebtIds.length > 0) {
      for (const chunk of chunkArray(payload.deletedDebtIds, 100)) {
        await supabase
          .from('debts')
          .update({ is_deleted: true, updated_at: Date.now() })
          .in('id', chunk);
      }
    }

    // 2. Upsert local items to Supabase
    if (payload.groups.length > 0) {
      const rows = payload.groups.map(toSupabaseGroup);
      for (const chunk of chunkArray(rows, 100)) {
        const { error } = await supabase.from('groups').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }
    }

    if (payload.categories.length > 0) {
      const rows = payload.categories.map(toSupabaseCategory);
      for (const chunk of chunkArray(rows, 100)) {
        const { error } = await supabase.from('categories').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }
    }

    if (payload.transactions.length > 0) {
      const activeTxs = payload.transactions.filter(
        (t) => !payload.deletedTxIds.includes(t.id) && !t.isDeleted
      );
      const rows = activeTxs.map(toSupabaseTx);
      for (const chunk of chunkArray(rows, 100)) {
        const { error } = await supabase.from('transactions').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }
    }

    if (payload.debts.length > 0) {
      const activeDebts = payload.debts.filter(
        (d) => !payload.deletedDebtIds.includes(d.id) && !d.isDeleted
      );
      const rows = activeDebts.map(toSupabaseDebt);
      for (const chunk of chunkArray(rows, 100)) {
        const { error } = await supabase.from('debts').upsert(chunk, { onConflict: 'id' });
        if (error) throw error;
      }
    }

    // 3. Fetch latest active remote data
    return await this.fetchRemoteData();
  }

  /**
   * Fetch all records from Supabase
   */
  public static async fetchRemoteData(): Promise<RemoteSyncResult> {
    const [txRes, catRes, grpRes, debtRes] = await Promise.all([
      supabase.from('transactions').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('groups').select('*'),
      supabase.from('debts').select('*'),
    ]);

    if (txRes.error) throw txRes.error;
    if (catRes.error) throw catRes.error;
    if (grpRes.error) throw grpRes.error;
    if (debtRes.error) throw debtRes.error;

    return {
      transactions: (txRes.data || []).map(fromSupabaseTx),
      categories: (catRes.data || []).map(fromSupabaseCategory),
      groups: (grpRes.data || []).map(fromSupabaseGroup),
      debts: (debtRes.data || []).map(fromSupabaseDebt),
    };
  }

  /**
   * Subscribe to Supabase Realtime changes across all tables
   */
  public static subscribeRealtime(onChange: () => void) {
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = supabase
        .channel('arthasync-live-sync')
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Channel ready
          }
        });
    } catch (err) {
      console.warn('Supabase Realtime subscription error:', err);
    }

    return () => {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe();
        this.realtimeChannel = null;
      }
    };
  }
}
