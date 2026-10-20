import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  Calendar,
  AlertTriangle,
  Plus,
  ArrowRight,
  WifiOff,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Users,
  Edit2,
  Trash2,
  Copy,
  Edit3,
  Check,
  X,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
} from 'lucide-react';
import { Category, CloudSyncState, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import {
  calculateBudgetStatus,
  calculateDebtSummary,
  calculateMonthlyStats,
  formatIndonesianDate,
  formatRupiah,
  generateCsvData,
  getEligibleAssetsForMember,
  getMemberColorTheme,
  parseRupiahInput,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { AssetOverviewCard } from './AssetOverviewCard';
import { HorizontalQuickAddBar } from './HorizontalQuickAddBar';

interface DashboardViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentGroup: FamilyGroup;
  syncState: CloudSyncState;
  onQuickAdd: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenPrintReport: () => void;
  onUpdateGroup: (id: string, updates: Partial<FamilyGroup>) => void;
  selectedYear?: number;
  selectedMonth?: number;
  onDuplicateTransaction?: (tx: Transaction) => void;
  onQuickSaveTransaction?: (txData: any) => void;
  onInlineUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
  onOpenTransferModal?: () => void;
  debts?: DebtRecord[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  categories,
  currentGroup,
  syncState,
  onQuickAdd,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateTab,
  onOpenPrintReport,
  onUpdateGroup,
  selectedYear,
  selectedMonth,
  onDuplicateTransaction,
  onQuickSaveTransaction,
  onInlineUpdateTransaction,
  onOpenTransferModal,
  debts = [],
}) => {
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [showQuickAddBar, setShowQuickAddBar] = useState(true);

  // Inline editing state for recent transaction rows
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDate, setInlineDate] = useState('');
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineDesc, setInlineDesc] = useState('');
  const [inlineCatId, setInlineCatId] = useState('');
  const [inlineAssetId, setInlineAssetId] = useState('');
  const [inlineMemberId, setInlineMemberId] = useState('');

  const currentDate = new Date();
  const currentYear = selectedYear || currentDate.getFullYear();
  const currentMonth = selectedMonth || (currentDate.getMonth() + 1); // 1-12

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const memMap = new Map((currentGroup.members || []).map((m) => [m.id, m]));
  const assetMap = new Map((currentGroup.assets || []).map((a) => [a.id, a]));

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const currentMonthName = monthNames[currentMonth - 1];

  // Requirement 3: Filter transactions according to selectedMemberFilter for dashboard overview
  const filteredTransactionsForSummary = transactions.filter((t) => {
    if (t.isDeleted || t.groupId !== currentGroup.id) return false;
    if (selectedMemberFilter === 'all') return true;
    if (selectedMemberFilter === 'joint') {
      if (!t.assetId) return !t.memberId;
      const ast = assetMap.get(t.assetId);
      return !ast?.memberId || ast.memberId === 'joint';
    }
    // Specific member
    if (t.memberId === selectedMemberFilter) return true;
    if (t.assetId) {
      const ast = assetMap.get(t.assetId);
      return ast?.memberId === selectedMemberFilter;
    }
    return false;
  });

  const stats = calculateMonthlyStats(
    filteredTransactionsForSummary,
    categories,
    currentGroup.members || [],
    currentYear,
    currentMonth
  );

  const netBalanceThisMonth = stats.totalIncome - stats.totalSpent;
  const budgetInfo = calculateBudgetStatus(stats.totalSpent, currentGroup.monthlyBudget);

  const allRecentTransactions = transactions
    .filter((t) => !t.isDeleted && t.groupId === currentGroup.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const recentTransactions = allRecentTransactions
    .filter((t) => {
      if (selectedMemberFilter === 'all') return true;
      if (selectedMemberFilter === 'joint') {
        if (!t.assetId) return !t.memberId;
        const ast = assetMap.get(t.assetId);
        return !ast?.memberId || ast.memberId === 'joint';
      }
      return (
        t.memberId === selectedMemberFilter ||
        (t.assetId && assetMap.get(t.assetId)?.memberId === selectedMemberFilter)
      );
    })
    .slice(0, 10);

  // Debt Summary for current group
  const groupDebts = debts.filter((d) => !d.isDeleted && d.groupId === currentGroup.id);
  const debtSummary = calculateDebtSummary(groupDebts);

  // Download CSV directly
  const handleExportCsv = () => {
    const csvString = generateCsvData(
      transactions.filter((t) => t.groupId === currentGroup.id),
      categories,
      currentGroup.members || [],
      currentGroup.assets || []
    );
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Pengeluaran_${currentGroup.name.replace(/\s+/g, '_')}_${currentMonthName}_${currentYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Last 7 days mini chart (reacts to selectedMemberFilter)
  const last7Days: { dateStr: string; label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    const dayAmount = filteredTransactionsForSummary
      .filter((t) => t.type === 'expense' && !t.isTransfer && t.date === dateStr)
      .reduce((sum, item) => sum + item.amount, 0);

    last7Days.push({ dateStr, label: dayLabel, amount: dayAmount });
  }

  const maxDailyIn7 = Math.max(...last7Days.map((d) => d.amount), 50000);

  // Start inline editing (safeguards account selection per member)
  const handleStartInlineEdit = (tx: Transaction) => {
    setInlineEditingId(tx.id);
    setInlineDate(tx.date || new Date().toISOString().split('T')[0]);
    setInlineDesc(tx.description);
    setInlineAmount(formatRupiah(tx.amount, { withPrefix: false }));
    setInlineCatId(tx.categoryId);
    setInlineMemberId(tx.memberId);
    const eligible = getEligibleAssetsForMember(currentGroup.assets || [], tx.memberId);
    setInlineAssetId(
      tx.assetId && eligible.some((a) => a.id === tx.assetId)
        ? tx.assetId
        : eligible[0]?.id || ''
    );
  };

  const handleInlineMemberChange = (newMemId: string) => {
    setInlineMemberId(newMemId);
    const eligible = getEligibleAssetsForMember(currentGroup.assets || [], newMemId);
    if (!eligible.some((a) => a.id === inlineAssetId)) {
      setInlineAssetId(eligible[0]?.id || '');
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  const handleSaveInlineEdit = (txId: string) => {
    const num = parseRupiahInput(inlineAmount);
    if (num <= 0 || !inlineDesc.trim()) return;

    if (onInlineUpdateTransaction) {
      onInlineUpdateTransaction(txId, {
        description: inlineDesc.trim(),
        amount: num,
        categoryId: inlineCatId,
        date: inlineDate || undefined,
        assetId: inlineAssetId || undefined,
        memberId: inlineMemberId,
      });
    }
    setInlineEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Offline Notice Banner */}
      {!syncState.isOnline && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">Mode Offline Aktif.</span> Aplikasi tetap berfungsi
              penuh tanpa internet. Semua transaksi disimpan aman di perangkat Anda dan otomatis
              disinkronkan ke cloud saat online.
            </div>
          </div>
          {syncState.pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[11px] whitespace-nowrap">
              {syncState.pendingCount} menunggu sync
            </span>
          )}
        </div>
      )}

      {/* 1. ASSET OVERVIEW & REKAP KEUANGAN CARD (With Member Filter, Real Net Assets & Transfer Action) */}
      <AssetOverviewCard
        currentGroup={currentGroup}
        transactions={transactions}
        onUpdateGroup={onUpdateGroup}
        selectedYear={currentYear}
        selectedMonth={currentMonth}
        selectedMemberFilter={selectedMemberFilter}
        onSelectMemberFilter={setSelectedMemberFilter}
        onOpenTransferModal={onOpenTransferModal}
        debts={debts}
      />

      {/* Top Banner / Actions Bar (Reacts to selectedMemberFilter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {currentMonthName} {currentYear} · {currentGroup.name}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>
              Ringkasan Keuangan {selectedMemberFilter === 'all' ? 'Seluruh Keluarga' : selectedMemberFilter === 'joint' ? 'Rekening Bersama' : `Khusus ${memMap.get(selectedMemberFilter)?.name || 'Anggota'}`}
            </span>
            {selectedMemberFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Filter Aktif
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Unduh Data CSV Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={onOpenPrintReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Cetak Laporan / PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards: Adjusts automatically to selectedMemberFilter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Expense */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Pengeluaran ({selectedMemberFilter === 'all' ? currentMonthName : selectedMemberFilter === 'joint' ? 'Bersama' : memMap.get(selectedMemberFilter)?.name})
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-red-600 dark:text-red-400 tracking-tight">
              {formatRupiah(stats.totalSpent)}
            </div>
          </div>
          <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{stats.expenseCount} transaksi tercatat</span>
          </div>
        </div>

        {/* Total Income */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Pemasukan ({selectedMemberFilter === 'all' ? currentMonthName : selectedMemberFilter === 'joint' ? 'Bersama' : memMap.get(selectedMemberFilter)?.name})
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatRupiah(stats.totalIncome)}
            </div>
          </div>
          <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span>{stats.incomeCount} sumber pendapatan</span>
          </div>
        </div>

        {/* Card 3: Sisa Anggaran (All) vs Selisih Kas Bersih (Member Filter) */}
        {selectedMemberFilter === 'all' ? (
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Sisa Anggaran Bulanan
                </span>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    budgetInfo.status === 'danger'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                      : budgetInfo.status === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div
                className={`text-base sm:text-xl font-bold font-mono tracking-tight ${
                  budgetInfo.remaining < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {formatRupiah(budgetInfo.remaining)}
              </div>
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] flex items-center gap-1.5 flex-wrap">
              <span
                className={`font-bold ${
                  budgetInfo.status === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : budgetInfo.status === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {budgetInfo.percentage}% terpakai
              </span>
              <span className="text-slate-400 hidden sm:inline">·</span>
              <span className="text-slate-500 capitalize hidden sm:inline">
                {budgetInfo.status === 'danger'
                  ? 'Over Budget'
                  : budgetInfo.status === 'warning'
                  ? 'Waspada'
                  : 'Aman'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Selisih Kas ({selectedMemberFilter === 'joint' ? 'Bersama' : memMap.get(selectedMemberFilter)?.name})
                </span>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    netBalanceThisMonth >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div
                className={`text-base sm:text-xl font-bold font-mono tracking-tight ${
                  netBalanceThisMonth >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {netBalanceThisMonth >= 0 ? '+' : ''}{formatRupiah(netBalanceThisMonth)}
              </div>
            </div>
            <div className="mt-2 text-[10px] sm:text-[11px] flex items-center gap-1.5">
              <span
                className={`font-bold ${
                  netBalanceThisMonth >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {netBalanceThisMonth >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
              </span>
            </div>
          </div>
        )}

        {/* Average Daily */}
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Rata-rata/Hari ({selectedMemberFilter === 'all' ? 'Keluarga' : selectedMemberFilter === 'joint' ? 'Bersama' : memMap.get(selectedMemberFilter)?.name})
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {formatRupiah(stats.averageDaily)}
            </div>
          </div>
          <div className="mt-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
            <span>Estimasi harian {currentMonthName}</span>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Status Batas Anggaran Bulanan ({currentGroup.name})
          </span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {formatRupiah(stats.totalSpent)} / {formatRupiah(currentGroup.monthlyBudget)}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetInfo.status === 'danger'
                ? 'bg-red-500'
                : budgetInfo.status === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, budgetInfo.percentage)}%` }}
          />
        </div>
        {budgetInfo.isOverBudget && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 pt-1">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Perhatian: Pengeluaran telah melebihi batas anggaran bulanan sebesar{' '}
              {formatRupiah(Math.abs(budgetInfo.remaining))}.
            </span>
          </div>
        )}
      </div>

      {/* Feature 3: Compact Utang & Piutang Summary Widget */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Utang & Piutang ({currentGroup.name})
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {debtSummary.unpaidCount} belum lunas
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> Piutang: <strong>{formatRupiah(debtSummary.totalReceivable)}</strong>
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3" /> Utang: <strong>{formatRupiah(debtSummary.totalPayable)}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('debts')}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <span>Kelola Utang Piutang</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-Column: Mini 7-Day Chart & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Spending Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tren Pengeluaran 7 Hari Terakhir
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Grafik pengeluaran kas harian akun {currentGroup.name}
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('statistics')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Statistik Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simple Bar Chart Visualization */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2">
              {last7Days.map((item) => {
                const heightPercent = item.amount > 0 ? Math.max(10, Math.round((item.amount / maxDailyIn7) * 100)) : 4;
                return (
                  <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatRupiah(item.amount, { compact: true })}
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-32 flex items-end p-1">
                      <div
                        className="w-full rounded-md bg-emerald-500 dark:bg-emerald-400 group-hover:bg-emerald-600 transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 capitalize">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top 4 Categories Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Kategori Terbesar
              </h3>
              <button
                onClick={() => onNavigateTab('categories')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Kelola Pos
              </button>
            </div>

            {stats.categoryBreakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada transaksi di bulan {currentMonthName}.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.categoryBreakdown.slice(0, 4).map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: cat.categoryColor }}
                        >
                          <CategoryIcon name={cat.categoryIcon} className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatRupiah(cat.amount)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.categoryColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Kategori Aktif:</span>
            <span className="font-bold">{categories.length} kategori</span>
          </div>
        </div>
      </div>

      {/* Feature 5: Recent Transactions List with Horizontal Quick-Add & Inline-Edit */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Catatan Transaksi Terakhir
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Warna khusus menandai anggota yang melakukan transaksi · Tersedia opsi duplikat & edit langsung
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickAddBar(!showQuickAddBar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showQuickAddBar
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{showQuickAddBar ? 'Tutup Input Cepat' : 'Buka Input Cepat'}</span>
            </button>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Semua Transaksi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Feature 5: Horizontal Quick Add Bar */}
        {showQuickAddBar && (
          <HorizontalQuickAddBar
            categories={categories}
            members={currentGroup.members || []}
            assets={currentGroup.assets || []}
            groupId={currentGroup.id}
            onSave={onQuickSaveTransaction || onQuickAdd}
          />
        )}

        {/* Member Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3" /> Anggota:
          </span>
          <button
            onClick={() => setSelectedMemberFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedMemberFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua ({allRecentTransactions.length})
          </button>
          {(currentGroup.members || []).map((m) => {
            const isSelected = selectedMemberFilter === m.id;
            const mTheme = getMemberColorTheme(m.avatarColor);
            const count = allRecentTransactions.filter((t) => t.memberId === m.id).length;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMemberFilter(isSelected ? 'all' : m.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  isSelected
                    ? `${mTheme.badge} shadow-xs border-transparent`
                    : `${mTheme.bgLight} ${mTheme.text} ${mTheme.borderLight} hover:scale-105`
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: m.avatarColor }}
                />
                <span>{m.name}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <p className="text-xs">Tidak ada transaksi ditemukan untuk filter ini.</p>
            <button
              onClick={onQuickAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi Baru</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const cat = catMap.get(tx.categoryId);
              const mem = memMap.get(tx.memberId);
              const linkedAsset = tx.assetId ? assetMap.get(tx.assetId) : undefined;
              const memTheme = getMemberColorTheme(mem?.avatarColor || '#3b82f6');
              const isExpense = tx.type === 'expense';
              const isInlineEditing = inlineEditingId === tx.id;

              if (isInlineEditing) {
                // Feature 5: Horizontal Inline Edit Form Row
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30 space-y-2 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      <span>Edit Langsung Horizontal</span>
                      <span>{formatIndonesianDate(inlineDate)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-stretch sm:items-center gap-2">
                      {/* Date Picker Button with Indonesian Date Display */}
                      <div className="relative flex items-center col-span-1 sm:min-w-[125px] sm:max-w-[155px] flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.parentElement?.querySelector('input[type="date"]') as HTMLInputElement | null;
                            if (input) {
                              if (typeof input.showPicker === 'function') {
                                try { input.showPicker(); return; } catch {}
                              }
                              input.focus();
                            }
                          }}
                          className="w-full flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors shadow-2xs group"
                          title="Klik untuk ubah tanggal transaksi"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                          <span className="truncate">{formatIndonesianDate(inlineDate)}</span>
                        </button>
                        <input
                          type="date"
                          value={inlineDate}
                          onChange={(e) => setInlineDate(e.target.value)}
                          className="sr-only"
                          tabIndex={-1}
                          aria-hidden="true"
                        />
                      </div>

                      {/* Amount Input */}
                      <div className="relative col-span-1 sm:min-w-[110px] sm:max-w-[150px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={inlineAmount}
                          onChange={(e) => {
                            const num = parseRupiahInput(e.target.value);
                            setInlineAmount(num === 0 && e.target.value === '' ? '' : formatRupiah(num, { withPrefix: false }));
                          }}
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                          autoFocus
                        />
                      </div>

                      {/* Description Input */}
                      <div className="col-span-2 sm:col-span-1 sm:min-w-[150px] sm:flex-1">
                        <input
                          type="text"
                          value={inlineDesc}
                          onChange={(e) => setInlineDesc(e.target.value)}
                          placeholder="Keterangan transaksi"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        />
                      </div>

                      {/* Category Select */}
                      <div className="col-span-1 sm:min-w-[120px]">
                        <select
                          value={inlineCatId}
                          onChange={(e) => setInlineCatId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Member Select: Positioned before Rekening so accounts filter automatically */}
                      <div className="col-span-1 sm:min-w-[90px]">
                        <select
                          value={inlineMemberId}
                          onChange={(e) => handleInlineMemberChange(e.target.value)}
                          className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                          title="Pilih Anggota Pemilik"
                        >
                          {(currentGroup.members || []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Rekening Select: Filtered for Selected Member */}
                      <div className="col-span-2 sm:col-span-1 sm:min-w-[130px]">
                        <select
                          value={inlineAssetId}
                          onChange={(e) => setInlineAssetId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          title="Rekening / Sumber Dana"
                        >
                          {getEligibleAssetsForMember(currentGroup.assets || [], inlineMemberId).map((a) => {
                            const isJoint = !a.memberId || a.memberId === 'joint';
                            return (
                              <option key={a.id} value={a.id}>
                                {a.name} ({formatRupiah(a.balance, { compact: true })}){isJoint ? ' · Bersama' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Save & Cancel Buttons */}
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1.5 sm:ml-auto">
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(tx.id)}
                          className="flex items-center justify-center gap-1 px-4 py-2 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex-1 sm:flex-initial"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelInlineEdit}
                          className="p-2 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl flex items-center justify-between gap-3 group hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30"
                  style={{ borderLeftWidth: '4px', borderLeftColor: mem?.avatarColor || '#2563eb' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: cat?.color || '#94a3b8' }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </span>
                        {tx.isTransfer && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Transfer
                          </span>
                        )}
                        {tx.syncStatus === 'synced' ? (
                          <span title="Tersinkronisasi Cloud">
                            <Cloud className="w-3 h-3 text-emerald-500" />
                          </span>
                        ) : (
                          <span title="Disimpan Lokal / Offline">
                            <CloudOff className="w-3 h-3 text-amber-500" />
                          </span>
                        )}
                      </div>

                      {/* Distinct Member Badge & Metadata */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {/* Member badge with signature color */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${memTheme.bgLight} ${memTheme.text} ${memTheme.borderLight}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: mem?.avatarColor || '#2563eb' }}
                          />
                          <span>{mem?.name || 'Anggota'}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{cat?.name || 'Lainnya'}</span>
                        {linkedAsset && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: linkedAsset.color || '#2563eb' }}
                              />
                              <span>{linkedAsset.name}</span>
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{formatIndonesianDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xs font-bold font-mono ${
                          isExpense ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {formatRupiah(tx.amount)}
                      </div>
                    </div>

                    {/* Actions: Duplicate, Inline Edit, Modal Edit, Delete */}
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {/* Feature 5: Duplicate Button */}
                      {onDuplicateTransaction && (
                        <button
                          onClick={() => onDuplicateTransaction(tx)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Duplikat Transaksi Ini"
                          aria-label={`Duplikat ${tx.description}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Feature 5: Inline Edit Button */}
                      <button
                        onClick={() => handleStartInlineEdit(tx)}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Edit Langsung Horizontal"
                        aria-label={`Edit Cepat ${tx.description}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                        title="Edit Transaksi di Modal"
                        aria-label={`Edit ${tx.description}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus catatan "${tx.description}"?`)) {
                            onDeleteTransaction(tx.id);
                          }
                        }}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Transaksi"
                        aria-label={`Hapus ${tx.description}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
