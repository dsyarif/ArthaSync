/**
 * Types for ArthaSync Financial Management App
 */

export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'tunai' | 'transfer_bank' | 'qris_ewallet' | 'kartu_debit' | 'kartu_kredit';

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon identifier
  color: string; // Hex or Tailwind color class
  monthlyBudget: number; // in IDR
  type?: 'expense' | 'income'; // Distinguish between expense and income category
  isDefault?: boolean;
  updatedAt: number;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'kepala_keluarga' | 'pasangan' | 'anak' | 'anggota';
  avatarColor: string;
  email?: string;
}

export type AssetType = 'kas' | 'bank' | 'ewallet' | 'investasi';

export interface AssetAccount {
  id: string;
  name: string;
  type: AssetType;
  institution: string;
  balance: number; // in IDR
  color: string;
  icon?: string;
  accountNumber?: string;
  memberId?: string; // Optional: specific member owner, or undefined/'joint' for Saldo Bersama
  updatedAt: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  type: 'pribadi' | 'keluarga' | 'kost_grup';
  members: FamilyMember[];
  currency: string; // default 'IDR'
  monthlyBudget: number;
  assets?: AssetAccount[];
  updatedAt: number;
}

export interface Transaction {
  id: string;
  amount: number; // in IDR
  type: TransactionType;
  categoryId: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  paymentMethod: PaymentMethod;
  assetId?: string; // Linked asset/rekening account ID
  groupId: string;
  memberId: string;
  receiptUrl?: string;
  syncStatus: 'synced' | 'pending' | 'offline';
  isTransfer?: boolean;
  toAssetId?: string;
  transferPairId?: string;
  updatedAt: number;
  isDeleted?: boolean;
}

// Debt / Loan Tracking Types (Utang & Piutang)
export type DebtType = 'utang' | 'piutang'; // 'utang' = harus bayar ke pihak lain; 'piutang' = hak tagih dari pihak lain
export type DebtPartyType = 'internal' | 'external'; // 'internal' = antar anggota keluarga; 'external' = orang lain/instansi
export type DebtScope = 'bersama' | 'perorangan'; // 'bersama' = kas bersama keluarga; 'perorangan' = individu anggota
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface DebtPayment {
  id: string;
  amount: number;
  date: string;
  assetId?: string; // Rekening pembayar (saldo berkurang)
  recipientAssetId?: string; // Jika internal: Rekening penerima (saldo bertambah)
  note?: string;
  createdAt: number;
  transactionIds?: string[]; // IDs transaksi yang otomatis dicatat untuk pembayaran ini
}

export interface DebtRecord {
  id: string;
  groupId: string;
  type: DebtType;
  partyType: DebtPartyType;
  scope?: DebtScope; // 'bersama' = utang/piutang bersama; 'perorangan' = perorangan anggota
  isJoint?: boolean; // true jika utang/piutang bersama keluarga
  memberId: string; // Anggota peminjam atau pemberi pinjaman, atau 'joint' jika bersama
  otherMemberId?: string; // Jika internal: anggota keluarga lainnya
  otherPersonName?: string; // Jika external: nama orang lain / instansi
  amount: number; // Jumlah total pokok
  paidAmount: number; // Jumlah yang sudah dibayar/dicicil
  dueDate?: string; // Jatuh tempo (YYYY-MM-DD)
  date: string; // Tanggal mulai transaksi utang/piutang (YYYY-MM-DD)
  description: string;
  assetId?: string; // Rekening sumber / pemberi pinjaman (saldo berkurang)
  targetAssetId?: string; // Jika internal: Rekening penerima pinjaman (saldo bertambah)
  status: DebtStatus;
  payments?: DebtPayment[];
  initialTransactionIds?: string[]; // IDs transaksi pencairan awal pinjaman
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string; // HH:mm (e.g. "20:00")
  soundEnabled: boolean;
  lastNotifiedDate?: string;
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  pinCode: string; // 4-6 digits fallback
  isLocked: boolean;
  lockTimeoutMinutes: number; // 0 for immediate on blur, or e.g. 5 mins
  credentialId?: string;
}

export interface CloudSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  simulatedOffline: boolean;
  syncError: string | null;
}
