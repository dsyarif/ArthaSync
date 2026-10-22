import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  User,
  DollarSign,
  AlertCircle,
  Trash2,
  Building2,
  Wallet,
  Smartphone,
  Coins,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  AssetAccount,
  AssetType,
  Category,
  FamilyMember,
  PaymentMethod,
  Transaction,
  TransactionType,
} from '../types/finance';
import {
  formatRupiah,
  getEligibleAssetsForMember,
  getMemberColorTheme,
  parseRupiahInput,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    description: string;
    date: string;
    time: string;
    paymentMethod: PaymentMethod;
    assetId?: string;
    memberId: string;
    groupId: string;
  }) => void;
  onDelete?: (id: string) => void;
  categories: Category[];
  members: FamilyMember[];
  assets?: AssetAccount[];
  groupId: string;
  editingTransaction?: Transaction | null;
  duplicateTransaction?: Transaction | null;
  isOnline?: boolean;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  members,
  assets = [],
  groupId,
  editingTransaction,
  duplicateTransaction,
  isOnline = true,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const targetMember =
      editingTransaction?.memberId || duplicateTransaction?.memberId || members[0]?.id || '';
    setMemberId(targetMember);

    const eligible = getEligibleAssetsForMember(assets, targetMember);
    const existingAssetId = (editingTransaction || duplicateTransaction)?.assetId;
    if (existingAssetId && eligible.some((a) => a.id === existingAssetId)) {
      setAssetId(existingAssetId);
    } else {
      setAssetId(eligible[0]?.id || assets[0]?.id || '');
    }

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountInput(formatRupiah(editingTransaction.amount, { withPrefix: false }));
      setDescription(editingTransaction.description);
      setCategoryId(editingTransaction.categoryId);
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
    } else if (duplicateTransaction) {
      const now = new Date();
      setType(duplicateTransaction.type);
      setAmountInput(formatRupiah(duplicateTransaction.amount, { withPrefix: false }));
      setDescription(duplicateTransaction.description);
      setCategoryId(duplicateTransaction.categoryId);
      setDate(now.toISOString().split('T')[0]);
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } else {
      // Defaults for new entry
      const now = new Date();
      setType('expense');
      setAmountInput('');
      setDescription('');
      
      // Default to first expense category
      const expenseCats = categories.filter((c) => c.type !== 'income');
      setCategoryId(expenseCats[0]?.id || categories[0]?.id || '');
      setDate(now.toISOString().split('T')[0]);
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    }
    setError('');
  }, [editingTransaction, duplicateTransaction, isOpen, categories, members, assets]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') {
      setAmountInput('');
    } else {
      setAmountInput(formatRupiah(num, { withPrefix: false }));
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matchingCats = categories.filter((c) =>
      newType === 'expense' ? c.type !== 'income' : c.type === 'income'
    );
    const isValid = matchingCats.some((c) => c.id === categoryId);
    if (!isValid && matchingCats.length > 0) {
      setCategoryId(matchingCats[0].id);
    }
  };

  const handleSelectMember = (newMemberId: string) => {
    setMemberId(newMemberId);
    const eligible = getEligibleAssetsForMember(assets, newMemberId);
    if (!eligible.some((a) => a.id === assetId)) {
      setAssetId(eligible[0]?.id || '');
    }
  };

  const handleSelectAsset = (asset: AssetAccount) => {
    setAssetId(asset.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRupiahInput(amountInput);

    if (parsedAmount <= 0) {
      setError('Masukkan nominal transaksi yang valid lebih dari Rp 0.');
      return;
    }

    if (!description.trim()) {
      setError('Masukkan catatan atau keterangan transaksi.');
      return;
    }

    if (!categoryId) {
      setError('Pilih kategori transaksi.');
      return;
    }

    if (!memberId) {
      setError('Pilih anggota keluarga yang melakukan transaksi.');
      return;
    }

    if (assets.length > 0 && !assetId) {
      setError('Pilih rekening atau kantong aset sumber dana.');
      return;
    }

    const chosenAsset = assets.find((a) => a.id === assetId);
    let derivedPaymentMethod: PaymentMethod = editingTransaction?.paymentMethod || 'transfer_bank';
    if (chosenAsset) {
      if (chosenAsset.type === 'kas') {
        derivedPaymentMethod = 'tunai';
      } else if (chosenAsset.type === 'ewallet') {
        derivedPaymentMethod = 'qris_ewallet';
      } else {
        derivedPaymentMethod = 'transfer_bank';
      }
    }

    onSave({
      amount: parsedAmount,
      type,
      categoryId,
      description: description.trim(),
      date: date || new Date().toISOString().split('T')[0],
      time: time || '12:00',
      paymentMethod: derivedPaymentMethod,
      assetId: assetId || (assets[0]?.id || undefined),
      memberId,
      groupId,
    });

    onClose();
  };

  const getAssetTypeIcon = (assetType: AssetType) => {
    switch (assetType) {
      case 'bank':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'kas':
        return <Wallet className="w-3.5 h-3.5" />;
      case 'ewallet':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'investasi':
        return <Coins className="w-3.5 h-3.5" />;
      default:
        return <CreditCard className="w-3.5 h-3.5" />;
    }
  };

  const activeCategories = categories.filter((c) =>
    type === 'expense' ? c.type !== 'income' : c.type === 'income'
  );

  const memMap = new Map(members.map((m) => [m.id, m]));
  const parsedAmount = parseRupiahInput(amountInput);
  const selectedAsset = assets.find((a) => a.id === assetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="modal-title"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            {editingTransaction
              ? 'Edit Catatan Transaksi'
              : duplicateTransaction
              ? 'Duplikat & Catat Transaksi'
              : 'Catat Transaksi Baru'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Tutup modal transaksi"
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

          {/* Type Switcher: Expense / Income */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Pengeluaran</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Pemasukan</span>
              </button>
            </div>
          </div>

          {/* Nominal Input */}
          <div>
            <label
              htmlFor="amount-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nominal (Rupiah) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                Rp
              </div>
              <input
                id="amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Description - Expanded Multi-line Textarea */}
          <div>
            <label
              htmlFor="desc-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Keterangan / Catatan Transaksi *
            </label>
            <textarea
              id="desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'expense'
                  ? 'Contoh: Belanja Bulanan (Beras Sumo 5kg, Minyak, Telur 10 butir, Sabun mandi)...'
                  : 'Contoh: Gaji Pokok, TPP, SPPD Semarang, Bonus, dll...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-y min-h-[78px]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Kolom catatan leluasa untuk mencatat rincian belanjaan dan keterangan transaksi.
            </span>
          </div>

          {/* Category Picker: Filtered by Expense vs Income */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {type === 'expense' ? 'Kategori Pengeluaran *' : 'Kategori Pemasukan *'}
              </label>
              <span className="text-[11px] text-slate-400">
                {activeCategories.length} kategori tersedia
              </span>
            </div>
            {activeCategories.length === 0 ? (
              <div className="p-3 text-center rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-400">
                Belum ada kategori untuk {type === 'expense' ? 'pengeluaran' : 'pemasukan'}. Tambahkan di menu Kategori.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                {activeCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? type === 'income'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Family Member Picker: Selected FIRST so accounts are filtered accurately */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pencatat / Anggota Keluarga *
              </label>
              <span className="text-[11px] text-slate-400">
                Pilih anggota pemilik transaksi
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((mem) => {
                const isSelected = memberId === mem.id;
                const mTheme = getMemberColorTheme(mem.avatarColor);
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => handleSelectMember(mem.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${mTheme.badge} shadow-md border-transparent scale-105 ring-2 ring-offset-2 ring-emerald-500`
                        : `${mTheme.bgLight} ${mTheme.text} ${mTheme.borderLight} hover:scale-105`
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-xs"
                      style={{ backgroundColor: mem.avatarColor }}
                    >
                      {mem.name.charAt(0)}
                    </div>
                    <span>{mem.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rekening / Kantong Aset: Filtered for Selected Member */}
          {assets.length > 0 && (() => {
            const selectedMemberObj = members.find((m) => m.id === memberId);
            const eligibleAssets = getEligibleAssetsForMember(assets, memberId);
            const hiddenOtherCount = assets.length - eligibleAssets.length;

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {type === 'expense'
                      ? `Rekening Sumber Dana (${selectedMemberObj?.name || 'Anggota'}) *`
                      : `Rekening Tujuan Masuk Saldo (${selectedMemberObj?.name || 'Anggota'}) *`}
                  </label>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Disesuaikan otomatis</span>
                  </span>
                </div>

                {hiddenOtherCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <span>
                      {hiddenOtherCount} rekening milik anggota lain disembunyikan agar <strong>{selectedMemberObj?.name}</strong> tidak salah memilih saldo orang lain.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {eligibleAssets.map((asset) => {
                    const isSelected = assetId === asset.id;
                    const willOverdraft = type === 'expense' && parsedAmount > 0 && asset.balance < parsedAmount;
                    const projectedBalance =
                      type === 'income'
                        ? asset.balance + parsedAmount
                        : asset.balance - parsedAmount;
                    const isJoint = !asset.memberId || asset.memberId === 'joint';
                    const ownerMem = asset.memberId ? memMap.get(asset.memberId) : undefined;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectAsset(asset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-[10px]"
                              style={{ backgroundColor: asset.color || '#2563eb' }}
                            >
                              {getAssetTypeIcon(asset.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {asset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {asset.institution}
                              </div>
                            </div>
                          </div>
                          {/* Ownership Badge */}
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                              isJoint
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {isJoint ? 'Bersama' : `Milik ${ownerMem?.name || 'Pribadi'}`}
                          </span>
                        </div>

                        <div className="mt-1 flex items-baseline justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-slate-400">Saldo saat ini:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatRupiah(asset.balance)}
                          </span>
                        </div>

                        {isSelected && parsedAmount > 0 && (
                          <div
                            className={`mt-1 text-[10px] flex items-center justify-between font-medium ${
                              willOverdraft
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            <span>Estimasi saldo baru:</span>
                            <span className="font-mono font-bold">
                              {formatRupiah(projectedBalance)}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="date-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Tanggal
              </label>
              <div className="relative">
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="time-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Waktu
              </label>
              <input
                id="time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Offline Warning Notice */}
          {!isOnline && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Perangkat Anda sedang offline. Koneksi internet diperlukan untuk menyimpan transaksi.</span>
            </div>
          )}

          {/* Submit, Delete & Cancel Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              {editingTransaction && onDelete && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus catatan transaksi "${editingTransaction.description}"?`)) {
                      onDelete(editingTransaction.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!isOnline}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {!isOnline
                  ? 'Offline (Perlu Internet)'
                  : editingTransaction
                  ? 'Simpan Perubahan'
                  : duplicateTransaction
                  ? 'Catat Transaksi Duplikat'
                  : 'Catat Sekarang'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
