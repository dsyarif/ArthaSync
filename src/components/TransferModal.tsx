import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  Building2,
  Wallet,
  Smartphone,
  Coins,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AssetAccount, AssetType, FamilyMember } from '../types/finance';
import { formatRupiah, getMemberColorTheme, parseRupiahInput } from '../utils/finance';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetAccount[];
  members: FamilyMember[];
  groupId: string;
  onTransfer: (data: {
    groupId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
    adminFee?: number;
    memberId: string;
    date: string;
    time: string;
    note?: string;
  }) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  assets,
  members,
  groupId,
  onTransfer,
}) => {
  const [fromAssetId, setFromAssetId] = useState('');
  const [toAssetId, setToAssetId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [adminFeeInput, setAdminFeeInput] = useState('0');
  const [memberId, setMemberId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toISOString().split('T')[0]);
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      setAmountInput('');
      setAdminFeeInput('0');
      setNote('');
      setError('');

      if (assets.length >= 2) {
        setFromAssetId(assets[0].id);
        setToAssetId(assets[1].id);
      } else if (assets.length === 1) {
        setFromAssetId(assets[0].id);
        setToAssetId(assets[0].id);
      }

      setMemberId(members[0]?.id || '');
    }
  }, [isOpen, assets, members]);

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

  const handleAdminFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseRupiahInput(raw);
    if (num === 0 && raw === '') {
      setAdminFeeInput('0');
    } else {
      setAdminFeeInput(formatRupiah(num, { withPrefix: false }));
    }
  };

  const parsedAmount = parseRupiahInput(amountInput);
  const parsedAdminFee = parseRupiahInput(adminFeeInput);
  const totalDeduction = parsedAmount + parsedAdminFee;

  const fromAsset = assets.find((a) => a.id === fromAssetId);
  const toAsset = assets.find((a) => a.id === toAssetId);

  const fromNewBalance = fromAsset ? fromAsset.balance - totalDeduction : 0;
  const toNewBalance = toAsset ? toAsset.balance + parsedAmount : 0;
  const isOverdraft = fromAsset ? fromAsset.balance < totalDeduction : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromAssetId || !toAssetId) {
      setError('Pilih rekening asal dan rekening tujuan transfer.');
      return;
    }

    if (fromAssetId === toAssetId) {
      setError('Rekening asal dan tujuan tidak boleh sama.');
      return;
    }

    if (parsedAmount <= 0) {
      setError('Masukkan nominal transfer yang valid (lebih dari Rp 0).');
      return;
    }

    if (!memberId) {
      setError('Pilih anggota keluarga yang melakukan transfer.');
      return;
    }

    onTransfer({
      groupId,
      fromAssetId,
      toAssetId,
      amount: parsedAmount,
      adminFee: parsedAdminFee,
      memberId,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '12:00',
      note: note.trim() || undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 id="transfer-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Transfer Antar Rekening & Kas
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pindahkan saldo antar dompet, kas, atau rekening bank
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal transfer"
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

          {/* From & To Asset Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            {/* Rekening Asal */}
            <div>
              <label
                htmlFor="from-asset-select"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1"
              >
                Rekening Asal (Sumber Dana) *
              </label>
              <select
                id="from-asset-select"
                value={fromAssetId}
                onChange={(e) => setFromAssetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatRupiah(a.balance)})
                  </option>
                ))}
              </select>
              {fromAsset && (
                <div className="mt-1 text-[11px] text-slate-500">
                  Saldo: <span className="font-mono font-bold">{formatRupiah(fromAsset.balance)}</span>
                </div>
              )}
            </div>

            {/* Rekening Tujuan */}
            <div>
              <label
                htmlFor="to-asset-select"
                className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1"
              >
                Rekening Tujuan *
              </label>
              <select
                id="to-asset-select"
                value={toAssetId}
                onChange={(e) => setToAssetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === fromAssetId}>
                    {a.name} ({formatRupiah(a.balance)})
                  </option>
                ))}
              </select>
              {toAsset && (
                <div className="mt-1 text-[11px] text-slate-500">
                  Saldo: <span className="font-mono font-bold">{formatRupiah(toAsset.balance)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nominal Transfer Input */}
          <div>
            <label
              htmlFor="transfer-amount-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nominal Transfer *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                Rp
              </div>
              <input
                id="transfer-amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Biaya Admin & Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="admin-fee-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Biaya Admin (Jika Ada)
              </label>
              <div className="flex items-center gap-1.5">
                {[0, 2500, 6500].map((fee) => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setAdminFeeInput(formatRupiah(fee, { withPrefix: false }))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      parsedAdminFee === fee
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {fee === 0 ? 'Gratis (Rp 0)' : formatRupiah(fee)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                Rp
              </div>
              <input
                id="admin-fee-input"
                type="text"
                inputMode="numeric"
                value={adminFeeInput}
                onChange={handleAdminFeeChange}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Live Preview Simulation Card */}
          {parsedAmount > 0 && fromAsset && toAsset && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2 text-xs">
              <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Simulasi Perubahan Saldo</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-slate-400 block text-[10px]">{fromAsset.name}</span>
                  <span className={isOverdraft ? 'text-red-600 font-bold' : 'text-slate-900 dark:text-white font-bold'}>
                    {formatRupiah(fromNewBalance)}
                  </span>
                  <span className="text-red-500 text-[10px] block">
                    -{formatRupiah(totalDeduction)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-slate-400 block text-[10px]">{toAsset.name}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatRupiah(toNewBalance)}
                  </span>
                  <span className="text-emerald-500 text-[10px] block">
                    +{formatRupiah(parsedAmount)}
                  </span>
                </div>
              </div>
              {isOverdraft && (
                <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Peringatan: Saldo rekening asal tidak mencukupi untuk transfer ini.
                </div>
              )}
            </div>
          )}

          {/* Member Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pencatat / Anggota Keluarga *
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((mem) => {
                const isSelected = memberId === mem.id;
                const mTheme = getMemberColorTheme(mem.avatarColor);
                return (
                  <button
                    key={mem.id}
                    type="button"
                    onClick={() => setMemberId(mem.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? `${mTheme.badge} shadow-xs border-transparent scale-105`
                        : `${mTheme.bgLight} ${mTheme.text} ${mTheme.borderLight}`
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white"
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

          {/* Catatan / Keterangan */}
          <div>
            <label
              htmlFor="transfer-note"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Catatan / Keperluan (Opsional)
            </label>
            <input
              id="transfer-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Top up GoPay, Tarik tunai ATM, Pindah tabungan, dll"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="transfer-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal
              </label>
              <input
                id="transfer-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="transfer-time" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Waktu
              </label>
              <input
                id="transfer-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Transfer Sekarang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
