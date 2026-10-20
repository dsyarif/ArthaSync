import React, { useState } from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  Plus,
  Edit2,
  DollarSign,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRightLeft,
  Users,
  Scale,
  Sparkles,
} from 'lucide-react';
import { AssetAccount, AssetType, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import {
  calculateAssetOverview,
  calculateRealNetWorth,
  formatRupiah,
  getMemberColorTheme,
  parseRupiahInput,
} from '../utils/finance';

interface AssetOverviewCardProps {
  currentGroup: FamilyGroup;
  transactions: Transaction[];
  onUpdateGroup: (id: string, updates: Partial<FamilyGroup>) => void;
  selectedYear?: number;
  selectedMonth?: number;
  selectedMemberFilter?: string;
  onSelectMemberFilter?: (memberId: string) => void;
  onOpenTransferModal?: () => void;
  debts?: DebtRecord[];
}

export const AssetOverviewCard: React.FC<AssetOverviewCardProps> = ({
  currentGroup,
  transactions,
  onUpdateGroup,
  selectedYear,
  selectedMonth,
  selectedMemberFilter,
  onSelectMemberFilter,
  onOpenTransferModal,
  debts = [],
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetAccount | null>(null);
  const [localMemberFilter, setLocalMemberFilter] = useState('all');
  const [assetViewMode, setAssetViewMode] = useState<'liquid' | 'real_net'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arthasync_asset_view_mode');
      if (saved === 'real_net' || saved === 'liquid') return saved;
    }
    return 'real_net';
  });
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('arthasync_hide_balance') === 'true';
    }
    return false;
  });

  const activeMemberFilter = selectedMemberFilter !== undefined ? selectedMemberFilter : localMemberFilter;
  const handleMemberFilterChange = (filterId: string) => {
    if (onSelectMemberFilter) {
      onSelectMemberFilter(filterId);
    } else {
      setLocalMemberFilter(filterId);
    }
  };

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      localStorage.setItem('arthasync_hide_balance', String(next));
      return next;
    });
  };

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('bank');
  const [institution, setInstitution] = useState('');
  const [balanceInput, setBalanceInput] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [assetMemberId, setAssetMemberId] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [error, setError] = useState('');

  const members = currentGroup.members || [];
  const memMap = new Map(members.map((m) => [m.id, m]));
  const assets = currentGroup.assets || [];

  // Calculate overview based on selected member filter
  const overview = calculateAssetOverview(assets, activeMemberFilter);

  // Calculate Real Net Worth (Saldo + Piutang - Utang)
  const realNetWorth = calculateRealNetWorth(assets, debts, activeMemberFilter);
  const isRealNetMode = assetViewMode === 'real_net';
  const displayedMainFigure = isRealNetMode ? realNetWorth.realNetAsset : overview.totalAssets;

  const handleToggleAssetMode = (mode: 'liquid' | 'real_net') => {
    setAssetViewMode(mode);
    localStorage.setItem('arthasync_asset_view_view_mode', mode);
  };

  // Month cashflow calculation based on selectedYear & selectedMonth or current real month
  const now = new Date();
  const yearToUse = selectedYear || now.getFullYear();
  const monthToUse = selectedMonth || (now.getMonth() + 1);
  const currentMonthPrefix = `${yearToUse}-${String(monthToUse).padStart(2, '0')}`;

  const monthTransactions = transactions.filter((t) => {
    if (t.isDeleted || t.groupId !== currentGroup.id) return false;
    if (!t.date.startsWith(currentMonthPrefix)) return false;
    if (activeMemberFilter !== 'all' && activeMemberFilter !== 'joint') {
      if (t.memberId !== activeMemberFilter) return false;
    }
    return true;
  });

  const totalExpenseThisMonth = monthTransactions
    .filter((t) => t.type === 'expense' && !t.isTransfer)
    .reduce((sum, item) => sum + item.amount, 0);

  const totalIncomeThisMonth = monthTransactions
    .filter((t) => t.type === 'income' && !t.isTransfer)
    .reduce((sum, item) => sum + item.amount, 0);

  const netCashflow = totalIncomeThisMonth - totalExpenseThisMonth;

  const handleOpenAdd = () => {
    setEditingAsset(null);
    setName('');
    setType('bank');
    setInstitution('Bank BCA');
    setBalanceInput('');
    setAccountNumber('');
    setAssetMemberId('');
    setColor('#2563eb');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (asset: AssetAccount) => {
    setEditingAsset(asset);
    setName(asset.name);
    setType(asset.type);
    setInstitution(asset.institution);
    setBalanceInput(formatRupiah(asset.balance, { withPrefix: false }));
    setAccountNumber(asset.accountNumber || '');
    setAssetMemberId(asset.memberId || '');
    setColor(asset.color || '#2563eb');
    setError('');
    setModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama rekening atau kantong aset wajib diisi.');
      return;
    }

    const balance = parseRupiahInput(balanceInput);

    if (editingAsset) {
      const updatedAssets = assets.map((a) =>
        a.id === editingAsset.id
          ? {
              ...a,
              name: name.trim(),
              type,
              institution: institution.trim() || 'Lainnya',
              balance,
              accountNumber: accountNumber.trim(),
              memberId: assetMemberId || undefined,
              color,
              updatedAt: Date.now(),
            }
          : a
      );
      onUpdateGroup(currentGroup.id, {
        assets: updatedAssets,
        updatedAt: Date.now(),
      });
    } else {
      const newAsset: AssetAccount = {
        id: `ast-${Date.now()}`,
        name: name.trim(),
        type,
        institution: institution.trim() || 'Lainnya',
        balance,
        accountNumber: accountNumber.trim(),
        memberId: assetMemberId || undefined,
        color,
        updatedAt: Date.now(),
      };
      onUpdateGroup(currentGroup.id, {
        assets: [...assets, newAsset],
        updatedAt: Date.now(),
      });
    }

    setModalOpen(false);
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm('Hapus kantong aset ini dari daftar overview?')) {
      const updated = assets.filter((a) => a.id !== assetId);
      onUpdateGroup(currentGroup.id, {
        assets: updated,
        updatedAt: Date.now(),
      });
    }
  };

  const getAssetIcon = (assetType: AssetType) => {
    switch (assetType) {
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'kas':
        return <Wallet className="w-4 h-4" />;
      case 'ewallet':
        return <Smartphone className="w-4 h-4" />;
      case 'investasi':
        return <PiggyBank className="w-4 h-4" />;
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 shadow-xl border border-slate-800/80 relative overflow-hidden space-y-5">
      {/* Decorative ambient lighting */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Overview & Actions */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Overview Aset & Rekap Keuangan ({currentGroup.name})</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
            Total Estimasi Kekayaan & Kas
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenTransferModal && (
            <button
              onClick={onOpenTransferModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              title="Transfer antar rekening / kas"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Saldo</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Rekening</span>
          </button>
        </div>
      </div>

      {/* Feature 1: Member Filter Switcher for Dashboard Saldo */}
      <div className="relative z-10 pt-1 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3 text-emerald-400" /> Filter Saldo:
          </span>
          <button
            onClick={() => handleMemberFilterChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeMemberFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Saldo Bersama (Seluruh Rekening)
          </button>
          <button
            onClick={() => handleMemberFilterChange('joint')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeMemberFilter === 'joint'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            Hanya Rekening Bersama
          </button>
          {members.map((m) => {
            const isSelected = activeMemberFilter === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleMemberFilterChange(m.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-950 border-white shadow-sm font-black'
                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: m.avatarColor }}
                />
                <span>Hanya Saldo {m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Asset Figures */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Assets Big Display */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col justify-between">
          <div>
            {/* Top row: Label + View Mode Toggle + Eye hide button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10 mb-3">
              {/* Toggle View Mode: Saldo vs Aset Sebenarnya */}
              <div className="inline-flex items-center p-0.5 bg-black/30 rounded-xl border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleAssetMode('liquid')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !isRealNetMode
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <span className="sm:hidden">Saldo Kas</span>
                  <span className="hidden sm:inline">Saldo Rekening Saja</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAssetMode('real_net')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                    isRealNetMode
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span className="sm:hidden">Aset Riil</span>
                  <span className="hidden sm:inline">Aset Sebenarnya (+Piutang / -Utang)</span>
                </button>
              </div>

              {/* Eye Hide / Show Balance Button */}
              <button
                type="button"
                onClick={toggleHideBalance}
                className="self-end sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-semibold"
                title={isBalanceHidden ? 'Tampilkan Nominal Saldo' : 'Sembunyikan Saldo (****)'}
                aria-label={isBalanceHidden ? 'Tampilkan Nominal Saldo' : 'Sembunyikan Saldo (****)'}
              >
                {isBalanceHidden ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-300 font-mono">****</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-[11px] text-slate-300 hidden sm:inline">Sembunyikan</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  {isRealNetMode
                    ? activeMemberFilter === 'all'
                      ? 'Total Aset Bersih Sebenarnya (Keluarga)'
                      : activeMemberFilter === 'joint'
                      ? 'Aset Bersih Rekening Bersama'
                      : `Total Aset Bersih Sebenarnya (${memMap.get(activeMemberFilter)?.name || 'Anggota'})`
                    : activeMemberFilter === 'all'
                    ? 'Total Saldo Semua Rekening & Kas'
                    : activeMemberFilter === 'joint'
                    ? 'Total Saldo Rekening Bersama (Joint)'
                    : `Total Saldo Khusus ${memMap.get(activeMemberFilter)?.name || 'Anggota'}`}
                </span>
                {isRealNetMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Net Worth
                  </span>
                )}
              </div>

              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-mono tracking-tight text-white mt-1.5">
                {isBalanceHidden ? 'Rp ****' : formatRupiah(displayedMainFigure)}
              </div>

              {/* Dynamic Formula Pill for True Net Asset */}
              {isRealNetMode && !isBalanceHidden && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-slate-300">
                  <span className="text-slate-400">Kalkulasi:</span>
                  <span>Saldo <strong className="font-mono text-white">{formatRupiah(realNetWorth.liquidBalance, { compact: true })}</strong></span>
                  <span className="text-emerald-400 font-bold">+</span>
                  <span>Piutang <strong className="font-mono text-emerald-400">+{formatRupiah(realNetWorth.receivableRemaining, { compact: true })}</strong></span>
                  <span className="text-red-400 font-bold">-</span>
                  <span>Utang <strong className="font-mono text-red-400">-{formatRupiah(realNetWorth.payableRemaining, { compact: true })}</strong></span>
                  <span className="text-slate-400 font-bold">=</span>
                  <span className="font-mono font-bold text-amber-300">{formatRupiah(realNetWorth.realNetAsset, { compact: true })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Real Net Worth 4-Card Breakdown */}
          <div className="mt-4 pt-3.5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-slate-400 block">1. Saldo Rekening</span>
              <span className="font-mono font-bold text-white block mt-0.5">
                {isBalanceHidden ? '****' : formatRupiah(realNetWorth.liquidBalance, { compact: true })}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between text-[10px] text-emerald-300">
                <span>2. (+) Piutang</span>
                <span className="opacity-75">{realNetWorth.receivablesCount}</span>
              </div>
              <span className="font-mono font-bold text-emerald-400 block mt-0.5">
                {isBalanceHidden ? '****' : `+${formatRupiah(realNetWorth.receivableRemaining, { compact: true })}`}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between text-[10px] text-red-300">
                <span>3. (-) Utang</span>
                <span className="opacity-75">{realNetWorth.payablesCount}</span>
              </div>
              <span className="font-mono font-bold text-red-400 block mt-0.5">
                {isBalanceHidden ? '****' : `-${formatRupiah(realNetWorth.payableRemaining, { compact: true })}`}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] text-amber-300 font-semibold block">4. (=) Aset Riil</span>
              <span className="font-mono font-bold text-amber-300 block mt-0.5">
                {isBalanceHidden ? '****' : formatRupiah(realNetWorth.realNetAsset, { compact: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Cashflow / Rekap Keuangan Card */}
        <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Rekap Arus Kas ({monthToUse}/{yearToUse})
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  Pemasukan
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatRupiah(totalIncomeThisMonth)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  Pengeluaran
                </span>
                <span className="font-mono font-bold text-red-400">
                  {formatRupiah(totalExpenseThisMonth)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Sisa Kas Bulan Ini:</span>
            <span
              className={`font-mono font-bold ${
                netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {netCashflow >= 0 ? '+' : ''}
              {formatRupiah(netCashflow)}
            </span>
          </div>
        </div>
      </div>

      {/* Account Cards Carousel / Grid */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Daftar Kantong Kas & Rekening ({overview.accounts.length})
          </span>
          <span className="text-[11px] text-slate-400">Klik kartu untuk sesuaikan saldo</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {overview.accounts.map((account) => {
            const owner = account.memberId ? memMap.get(account.memberId) : undefined;
            return (
              <div
                key={account.id}
                onClick={() => handleOpenEdit(account)}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: account.color }}
                    >
                      {getAssetIcon(account.type)}
                    </div>
                    {/* Owner Badge */}
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        owner
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {owner ? owner.name : 'Bersama'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                    {account.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {account.institution} {account.accountNumber ? `· ${account.accountNumber}` : ''}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-white">
                    {isBalanceHidden ? '****' : formatRupiah(account.balance, { compact: true })}
                  </span>
                  <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Asset Account Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold">
                {editingAsset ? 'Sesuaikan Saldo / Edit Rekening' : 'Tambah Rekening / Kantong Aset'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveAsset} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nama Kantong / Rekening *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rekening BCA Utama, Dompet Tunai, Saldo GoPay"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Jenis Aset
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AssetType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="bank">Rekening Bank</option>
                    <option value="kas">Kas Tunai (Fisik)</option>
                    <option value="ewallet">E-Wallet (QRIS)</option>
                    <option value="investasi">Tabungan / Investasi</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Lembaga / Bank
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="BCA, Mandiri, Bibit, Cash"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* Ownership: Saldo Bersama vs Specific Member */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Kepemilikan Saldo Rekening
                </label>
                <select
                  value={assetMemberId}
                  onChange={(e) => setAssetMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                >
                  <option value="">Saldo Bersama / Rekening Keluarga (Gabungan)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      Milik Khusus: {m.name} ({m.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Rekening bersama akan dihitung saat melihat saldo gabungan keluarga
                </span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Saldo Saat Ini (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={balanceInput}
                    onChange={(e) => {
                      const num = parseRupiahInput(e.target.value);
                      setBalanceInput(
                        num === 0 && e.target.value === ''
                          ? ''
                          : formatRupiah(num, { withPrefix: false })
                      );
                    }}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Nomor Rekening / Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Contoh: ***-1234 atau Rekening Gaji"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                {editingAsset && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(editingAsset.id)}
                    className="text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                  >
                    Hapus Aset
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl border text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                  >
                    Simpan Saldo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
