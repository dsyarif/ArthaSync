import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Check,
  AlertCircle,
  Building2,
  Wallet,
  Tag,
  User,
  Zap,
  Calendar,
} from 'lucide-react';
import {
  AssetAccount,
  Category,
  FamilyMember,
  PaymentMethod,
  TransactionType,
} from '../types/finance';
import { formatIndonesianDate, formatRupiah, getEligibleAssetsForMember, parseRupiahInput } from '../utils/finance';

interface HorizontalQuickAddBarProps {
  categories: Category[];
  members: FamilyMember[];
  assets: AssetAccount[];
  groupId: string;
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
  className?: string;
}

export const HorizontalQuickAddBar: React.FC<HorizontalQuickAddBarProps> = ({
  categories,
  members,
  assets,
  groupId,
  onSave,
  className = '',
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [dateInput, setDateInput] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        try {
          dateInputRef.current.showPicker();
          return;
        } catch {}
      }
      dateInputRef.current.focus();
    }
  };

  // Active categories for type
  const activeCategories = categories.filter((c) =>
    type === 'expense' ? c.type !== 'income' : c.type === 'income'
  );

  const selectedCategory = categoryId || activeCategories[0]?.id || categories[0]?.id || '';
  const selectedMember = memberId || members[0]?.id || '';
  const eligibleAssets = getEligibleAssetsForMember(assets, selectedMember);
  const selectedAsset = assetId && eligibleAssets.some((a) => a.id === assetId) ? assetId : eligibleAssets[0]?.id || '';

  const handleMemberChange = (newMemberId: string) => {
    setMemberId(newMemberId);
    const newEligible = getEligibleAssetsForMember(assets, newMemberId);
    if (!newEligible.some((a) => a.id === assetId)) {
      setAssetId(newEligible[0]?.id || '');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') {
      setAmountInput('');
    } else {
      setAmountInput(formatRupiah(num, { withPrefix: false }));
    }
  };

  const handleTypeToggle = (newType: TransactionType) => {
    setType(newType);
    const matching = categories.filter((c) =>
      newType === 'expense' ? c.type !== 'income' : c.type === 'income'
    );
    if (matching.length > 0) {
      setCategoryId(matching[0].id);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedAmount = parseRupiahInput(amountInput);

    if (parsedAmount <= 0) {
      setError('Masukkan nominal.');
      return;
    }

    if (!description.trim()) {
      setError('Masukkan catatan.');
      return;
    }

    const now = new Date();
    const date = dateInput || now.toISOString().split('T')[0];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const chosenAsset = assets.find((a) => a.id === selectedAsset);
    let derivedPaymentMethod: PaymentMethod = 'transfer_bank';
    if (chosenAsset) {
      if (chosenAsset.type === 'kas') derivedPaymentMethod = 'tunai';
      else if (chosenAsset.type === 'ewallet') derivedPaymentMethod = 'qris_ewallet';
      else derivedPaymentMethod = 'transfer_bank';
    }

    onSave({
      amount: parsedAmount,
      type,
      categoryId: selectedCategory,
      description: description.trim(),
      date,
      time,
      paymentMethod: derivedPaymentMethod,
      assetId: selectedAsset || undefined,
      memberId: selectedMember,
      groupId,
    });

    // Reset inputs
    setAmountInput('');
    setDescription('');
    setError('');
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${
        justSaved ? 'ring-2 ring-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Catat Transaksi Cepat (Input Horizontal Langsung)</span>
        </div>
        {justSaved && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Berhasil dicatat!</span>
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center gap-2">
        {/* Type Toggle */}
        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl col-span-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleTypeToggle('expense')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Pengeluaran (-)"
          >
            <TrendingDown className="w-3 h-3" />
            <span>Keluar</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeToggle('income')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Pemasukan (+)"
          >
            <TrendingUp className="w-3 h-3" />
            <span>Masuk</span>
          </button>
        </div>

        {/* Date Picker Button: Easy and fast to click anywhere */}
        <div className="relative flex items-center col-span-1 sm:min-w-[130px] sm:max-w-[155px] flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenDatePicker}
            className="w-full flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-emerald-500 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
            title="Klik untuk ubah tanggal transaksi"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
            <span className="truncate">{formatIndonesianDate(dateInput)}</span>
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value || new Date().toISOString().split('T')[0])}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {/* Amount Input */}
        <div className="relative col-span-1 sm:min-w-[130px] sm:max-w-[160px] sm:flex-initial">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
            Rp
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amountInput}
            onChange={handleAmountChange}
            onKeyDown={handleKeyDown}
            placeholder="0"
            className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Select */}
        <div className="col-span-1 sm:min-w-[120px] sm:max-w-[160px] flex-shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Description Input (Expanded Width) */}
        <div className="col-span-2 sm:col-span-1 sm:min-w-[220px] sm:flex-1">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              type === 'expense'
                ? 'Keterangan lengkap (makan, rincian belanja, bensin...)'
                : 'Keterangan lengkap (gaji, tpp, sppd, freelance...)'
            }
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Member Select: Positioned BEFORE Rekening to filter accounts automatically */}
        <div className="col-span-1 sm:min-w-[90px] sm:max-w-[130px] flex-shrink-0">
          <select
            value={selectedMember}
            onChange={(e) => handleMemberChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            title="Pilih Anggota Pemilik Transaksi"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Asset / Rekening Select: Filtered for Selected Member */}
        {eligibleAssets.length > 0 && (
          <div className="col-span-1 sm:min-w-[130px] sm:max-w-[170px] flex-shrink-0">
            <select
              value={selectedAsset}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              title="Rekening / Sumber Dana Sesuai Anggota"
            >
              {eligibleAssets.map((a) => {
                const isJoint = !a.memberId || a.memberId === 'joint';
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatRupiah(a.balance, { compact: true })}){isJoint ? ' · Bersama' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Submit Quick Button */}
        <button
          type="submit"
          className="col-span-2 sm:col-span-1 w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 sm:ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Simpan Langsung</span>
        </button>
      </form>
    </div>
  );
};
