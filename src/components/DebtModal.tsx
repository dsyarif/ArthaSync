import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Users,
  Building2,
  DollarSign,
  Calendar,
  AlertCircle,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ShieldCheck,
} from 'lucide-react';
import { AssetAccount, DebtPartyType, DebtRecord, DebtScope, DebtType, FamilyMember } from '../types/finance';
import {
  formatRupiah,
  getEligibleAssetsForMember,
  getMemberColorTheme,
  parseRupiahInput,
} from '../utils/finance';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    groupId: string;
    type: DebtType;
    partyType: DebtPartyType;
    scope?: DebtScope;
    isJoint?: boolean;
    memberId: string;
    otherMemberId?: string;
    otherPersonName?: string;
    amount: number;
    dueDate?: string;
    date: string;
    description: string;
    assetId?: string;
    targetAssetId?: string;
  }) => void;
  members: FamilyMember[];
  assets: AssetAccount[];
  groupId: string;
  editingDebt?: DebtRecord | null;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  members,
  assets,
  groupId,
  editingDebt,
}) => {
  const [scope, setScope] = useState<DebtScope>('perorangan');
  const [type, setType] = useState<DebtType>('piutang');
  const [partyType, setPartyType] = useState<DebtPartyType>('internal');
  const [memberId, setMemberId] = useState('');
  const [otherMemberId, setOtherMemberId] = useState('');
  const [otherPersonName, setOtherPersonName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState('');
  const [targetAssetId, setTargetAssetId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingDebt) {
      const debtScope: DebtScope =
        editingDebt.scope ||
        (editingDebt.isJoint || editingDebt.memberId === 'joint' ? 'bersama' : 'perorangan');
      setScope(debtScope);
      setType(editingDebt.type);
      setPartyType(debtScope === 'bersama' ? 'external' : editingDebt.partyType);
      setMemberId(editingDebt.memberId);
      setOtherMemberId(editingDebt.otherMemberId || (members.find((m) => m.id !== editingDebt.memberId)?.id || ''));
      setOtherPersonName(editingDebt.otherPersonName || '');
      setAmountInput(formatRupiah(editingDebt.amount, { withPrefix: false }));
      setDueDate(editingDebt.dueDate || '');
      setDate(editingDebt.date || new Date().toISOString().split('T')[0]);
      setDescription(editingDebt.description);
      setAssetId(editingDebt.assetId || '');
      setTargetAssetId(editingDebt.targetAssetId || '');
    } else {
      const now = new Date();
      setScope('perorangan');
      setType('piutang');
      setPartyType('internal');
      setMemberId(members[0]?.id || '');
      setOtherMemberId(members[1]?.id || members[0]?.id || '');
      setOtherPersonName('');
      setAmountInput('');
      setDueDate('');
      setDate(now.toISOString().split('T')[0]);
      setDescription('');
      setAssetId('');
      setTargetAssetId('');
    }
    setError('');
  }, [editingDebt, isOpen, members]);

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

  const isJoint = scope === 'bersama';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseRupiahInput(amountInput);

    if (parsedAmount <= 0) {
      setError('Masukkan nominal utang / piutang yang valid (lebih dari Rp 0).');
      return;
    }

    if (!description.trim()) {
      setError('Masukkan keterangan / keperluan utang atau piutang.');
      return;
    }

    if (!isJoint && !memberId) {
      setError('Pilih anggota keluarga yang terkait.');
      return;
    }

    if (!isJoint && partyType === 'internal') {
      if (!otherMemberId) {
        setError('Pilih anggota keluarga pasangan transaksi.');
        return;
      }
      if (otherMemberId === memberId) {
        setError('Anggota peminjam dan pemberi pinjaman tidak boleh orang yang sama.');
        return;
      }
    } else {
      if (!otherPersonName.trim()) {
        setError('Ketik nama pihak luar / rekan / instansi.');
        return;
      }
    }

    onSave({
      groupId,
      type,
      partyType: isJoint ? 'external' : partyType,
      scope,
      isJoint,
      memberId: isJoint ? 'joint' : memberId,
      otherMemberId: !isJoint && partyType === 'internal' ? otherMemberId : undefined,
      otherPersonName: otherPersonName.trim() || undefined,
      amount: parsedAmount,
      dueDate: dueDate || undefined,
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      assetId: assetId || undefined,
      targetAssetId: !isJoint && partyType === 'internal' ? targetAssetId || undefined : undefined,
    });

    onClose();
  };

  const lenderId = type === 'piutang' ? memberId : otherMemberId;
  const borrowerId = type === 'piutang' ? otherMemberId : memberId;
  const lenderObj = members.find((m) => m.id === lenderId);
  const borrowerObj = members.find((m) => m.id === borrowerId);
  const lenderAssets = getEligibleAssetsForMember(assets, lenderId);
  const borrowerAssets = getEligibleAssetsForMember(assets, borrowerId);

  // Joint eligible assets (rekening bersama)
  const jointAssets = assets.filter((a) => !a.memberId || a.memberId === 'joint');
  const eligibleJointAssets = jointAssets.length > 0 ? jointAssets : assets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 id="debt-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                {editingDebt ? 'Edit Catatan Utang / Piutang' : 'Catat Utang & Piutang Baru'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pantau pinjaman antar anggota keluarga atau pihak ketiga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal utang piutang"
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

          {/* Scope Selector: Perorangan vs Bersama */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cakupan Kepemilikan Catatan *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setScope('perorangan')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isJoint
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Perorangan Anggota</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('bersama')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isJoint
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Bersama (Keluarga)</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {isJoint
                ? '⭐ Utang/piutang ini dicatat atas nama kas bersama dan TIDAK mempengaruhi aset pribadi anggota saat difilter per anggota.'
                : 'Utang/piutang ini milik individu anggota tertentu dan akan mempengaruhi saldo/kekayaan bersih anggota yang bersangkutan.'}
            </p>
          </div>

          {/* Type Selector: Piutang (Kita Pinjamkan) vs Utang (Kita Pinjam) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Jenis Catatan *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setType('piutang')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'piutang'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Piutang (Kita Berhak Tagih)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('utang')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  type === 'utang'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Utang (Kita Wajib Bayar)</span>
              </button>
            </div>
          </div>

          {/* Party Type Selector: Antar Anggota vs Pihak Luar (Only for Perorangan) */}
          {!isJoint && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pihak Terkait *
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPartyType('internal')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    partyType === 'internal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Antar Anggota Keluarga</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPartyType('external')}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    partyType === 'external'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Pihak Luar / Orang Lain</span>
                </button>
              </div>
            </div>
          )}

          {/* Parties Detail Inputs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            {isJoint ? (
              <>
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Utang / Piutang Bersama Keluarga</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-200/60 dark:bg-emerald-900 px-2 py-0.5 rounded-md">
                    Kas Bersama
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Pihak Luar / Instansi / Rekan *
                  </label>
                  <input
                    type="text"
                    value={otherPersonName}
                    onChange={(e) => setOtherPersonName(e.target.value)}
                    placeholder="Contoh: Bank BRI (KPR), Koperasi, Toko Elektronik, Rekan Keluarga"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Primary Member */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {type === 'piutang' ? 'Anggota yang Memberi Pinjaman *' : 'Anggota yang Berutang *'}
                  </label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Other Party */}
                {partyType === 'internal' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {type === 'piutang'
                        ? 'Anggota Keluarga yang Meminjam *'
                        : 'Anggota Keluarga yang Dipinjami *'}
                    </label>
                    <select
                      value={otherMemberId}
                      onChange={(e) => setOtherMemberId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {members.map((m) => (
                        <option key={m.id} value={m.id} disabled={m.id === memberId}>
                          {m.name} ({m.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Nama Pihak Luar / Instansi / Rekan *
                    </label>
                    <input
                      type="text"
                      value={otherPersonName}
                      onChange={(e) => setOtherPersonName(e.target.value)}
                      placeholder="Contoh: Mas Budi (Teman Kantor), Bank BRI, Toko Elektronik, dll"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label
              htmlFor="debt-amount-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Jumlah Pokok Utang / Piutang *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                Rp
              </div>
              <input
                id="debt-amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="debt-desc-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Keterangan / Keperluan Pinjaman *
            </label>
            <input
              id="debt-desc-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Talangan beli tiket bareng, Modal usaha, Cicilan motor, dll"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Linked Accounts: Affect Asset Balances */}
          {assets.length > 0 && (
            partyType === 'internal' ? (
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Sinkronisasi Saldo Rekening Anggota Otomatis</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Lender Account: Balance Decreases */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rekening {lenderObj?.name || 'Pemberi Pinjaman'} (Saldo Berkurang)
                    </label>
                    <select
                      value={assetId}
                      onChange={(e) => setAssetId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Jangan potong rekening --</option>
                      {lenderAssets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatRupiah(a.balance, { compact: true })})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Borrower Account: Balance Increases */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rekening {borrowerObj?.name || 'Peminjam'} (Saldo Bertambah)
                    </label>
                    <select
                      value={targetAssetId}
                      onChange={(e) => setTargetAssetId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Jangan tambah rekening --</option>
                      {borrowerAssets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({formatRupiah(a.balance, { compact: true })})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-blue-700 dark:text-blue-300">
                  💡 Saldo rekening <strong>{lenderObj?.name}</strong> akan otomatis berkurang dan rekening <strong>{borrowerObj?.name}</strong> akan bertambah sesuai nominal yang dipinjamkan.
                </p>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="debt-asset-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  {isJoint
                    ? type === 'piutang'
                      ? 'Rekening / Kas Bersama Pencairan Uang (Saldo Berkurang)'
                      : 'Rekening / Kas Bersama Penerima Uang (Saldo Bertambah)'
                    : type === 'piutang'
                    ? 'Rekening Sumber Pencairan Uang (Saldo Berkurang)'
                    : 'Rekening Penerima Uang Pinjaman (Saldo Bertambah)'}
                </label>
                <select
                  id="debt-asset-select"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Jangan sesuaikan saldo rekening --</option>
                  {(isJoint ? eligibleJointAssets : getEligibleAssetsForMember(assets, memberId)).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatRupiah(a.balance)}) {!a.memberId || a.memberId === 'joint' ? '· Bersama' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* Date & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="debt-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Transaksi
              </label>
              <input
                id="debt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="debt-due-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Jatuh Tempo (Opsional)
              </label>
              <input
                id="debt-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
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
              className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                type === 'piutang' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {editingDebt ? 'Simpan Perubahan' : 'Catat Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
