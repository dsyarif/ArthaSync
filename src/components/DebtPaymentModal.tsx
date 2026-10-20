import React, { useState, useEffect } from 'react';
import { X, CheckCircle, HandCoins, AlertCircle, Building2, Calendar, ArrowRightLeft } from 'lucide-react';
import { AssetAccount, DebtPayment, DebtRecord, FamilyMember } from '../types/finance';
import { formatRupiah, getEligibleAssetsForMember, parseRupiahInput } from '../utils/finance';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtRecord | null;
  assets: AssetAccount[];
  members?: FamilyMember[];
  editingPayment?: DebtPayment | null;
  onConfirmPayment: (
    debtId: string,
    payment: {
      amount: number;
      date: string;
      assetId?: string;
      recipientAssetId?: string;
      note?: string;
    }
  ) => void;
  onUpdatePayment?: (
    debtId: string,
    paymentId: string,
    updates: {
      amount: number;
      date: string;
      note?: string;
    }
  ) => void;
}

export const DebtPaymentModal: React.FC<DebtPaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  assets,
  members = [],
  editingPayment = null,
  onConfirmPayment,
  onUpdatePayment,
}) => {
  const [amountInput, setAmountInput] = useState('');
  const [assetId, setAssetId] = useState('');
  const [recipientAssetId, setRecipientAssetId] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && debt) {
      if (editingPayment) {
        setAmountInput(formatRupiah(editingPayment.amount, { withPrefix: false }));
        setDate(editingPayment.date || new Date().toISOString().split('T')[0]);
        setNote(editingPayment.note || '');
        setAssetId(editingPayment.assetId || '');
        setRecipientAssetId(editingPayment.recipientAssetId || '');
        setError('');
      } else {
        const remaining = Math.max(0, debt.amount - (debt.paidAmount || 0));
        setAmountInput(formatRupiah(remaining, { withPrefix: false }));
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
        setError('');
        const payerId = debt.type === 'piutang' ? debt.otherMemberId : debt.memberId;
        const receiverId = debt.type === 'piutang' ? debt.memberId : debt.otherMemberId;
        const pAssets = getEligibleAssetsForMember(assets, payerId);
        const rAssets = getEligibleAssetsForMember(assets, receiverId);

        setAssetId(pAssets[0]?.id || assets[0]?.id || '');
        setRecipientAssetId(rAssets[0]?.id || assets[0]?.id || '');
      }
    }
  }, [isOpen, debt, assets, editingPayment]);

  if (!isOpen || !debt) return null;

  const isEditing = Boolean(editingPayment);
  const remaining = isEditing
    ? Math.max(0, debt.amount - (debt.paidAmount || 0) + (editingPayment?.amount || 0))
    : Math.max(0, debt.amount - (debt.paidAmount || 0));

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') {
      setAmountInput('');
    } else {
      setAmountInput(formatRupiah(num, { withPrefix: false }));
    }
  };

  const handleSetFullAmount = () => {
    setAmountInput(formatRupiah(remaining, { withPrefix: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRupiahInput(amountInput);

    if (parsedAmount <= 0) {
      setError('Masukkan nominal pembayaran cicilan yang valid (lebih dari Rp 0).');
      return;
    }

    if (parsedAmount > remaining) {
      if (!confirm(`Nominal pembayaran (${formatRupiah(parsedAmount)}) melebihi sisa pokok (${formatRupiah(remaining)}). Lanjutkan?`)) {
        return;
      }
    }

    if (isEditing && editingPayment && onUpdatePayment) {
      onUpdatePayment(debt.id, editingPayment.id, {
        amount: parsedAmount,
        date: date || new Date().toISOString().split('T')[0],
        note: note.trim() || undefined,
      });
    } else {
      onConfirmPayment(debt.id, {
        amount: parsedAmount,
        date: date || new Date().toISOString().split('T')[0],
        assetId: assetId || undefined,
        recipientAssetId: debt.partyType === 'internal' ? recipientAssetId || undefined : undefined,
        note: note.trim() || undefined,
      });
    }

    onClose();
  };

  const isUtang = debt.type === 'utang';
  const isInternal = debt.partyType === 'internal';
  const payerId = debt.type === 'piutang' ? debt.otherMemberId : debt.memberId;
  const receiverId = debt.type === 'piutang' ? debt.memberId : debt.otherMemberId;
  const payerObj = members.find((m) => m.id === payerId);
  const receiverObj = members.find((m) => m.id === receiverId);
  const payerAssets = getEligibleAssetsForMember(assets, payerId);
  const receiverAssets = getEligibleAssetsForMember(assets, receiverId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isUtang ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
            }`}>
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Riwayat Pembayaran / Cicilan' : isUtang ? 'Bayar Cicilan / Lunasi Utang' : 'Terima Pembayaran Piutang'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {debt.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Outstanding Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Total Pokok:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatRupiah(debt.amount)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Sudah Dibayar:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(debt.paidAmount || 0)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="font-bold text-slate-800 dark:text-slate-200">Sisa Tagihan / Utang:</span>
              <span className="font-mono font-extrabold text-sm text-rose-600 dark:text-rose-400">{formatRupiah(remaining)}</span>
            </div>
          </div>

          {/* Nominal Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="payment-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nominal Pembayaran *
              </label>
              <button
                type="button"
                onClick={handleSetFullAmount}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Lunasi Penuh ({formatRupiah(remaining)})
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                Rp
              </div>
              <input
                id="payment-amount"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* Linked Asset Account(s) */}
          {isEditing ? (
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 flex-shrink-0 text-blue-500" />
              <span>
                Perubahan nominal dan tanggal akan otomatis memperbarui riwayat transaksi dan saldo rekening terkait secara instan.
              </span>
            </div>
          ) : isInternal ? (
            <div className="space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
              <div>
                <label htmlFor="payment-asset" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Rekening Pembayar ({payerObj?.name || 'Peminjam'}) - <span className="text-rose-500 font-bold">Saldo Berkurang</span>
                </label>
                <select
                  id="payment-asset"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Jangan potong rekening pembayar --</option>
                  {(payerAssets.length > 0 ? payerAssets : assets).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="payment-recipient-asset" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Rekening Penerima ({receiverObj?.name || 'Pemberi Pinjaman'}) - <span className="text-emerald-500 font-bold">Saldo Bertambah</span>
                </label>
                <select
                  id="payment-recipient-asset"
                  value={recipientAssetId}
                  onChange={(e) => setRecipientAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Jangan tambah rekening penerima --</option>
                  {(receiverAssets.length > 0 ? receiverAssets : assets).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            assets.length > 0 && (
              <div>
                <label htmlFor="payment-asset" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isUtang ? 'Potong dari Rekening / Kas *' : 'Masuk ke Rekening / Kas *'}
                </label>
                <select
                  id="payment-asset"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Jangan potong/tambah saldo rekening --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.balance)})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-400">
                  {isUtang
                    ? 'Saldo rekening terpilih akan otomatis dipotong dan dicatat ke riwayat transaksi.'
                    : 'Saldo rekening terpilih akan otomatis bertambah dan dicatat ke riwayat transaksi.'}
                </p>
              </div>
            )
          )}

          {/* Payment Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="payment-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Pembayaran
              </label>
              <input
                id="payment-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="payment-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan (Opsional)
              </label>
              <input
                id="payment-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Cicilan 1 transfer BCA, dll"
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {isEditing ? 'Simpan Perubahan' : 'Simpan Pembayaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
