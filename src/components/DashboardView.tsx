import React from 'react';
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
  Clock,
  Cloud,
  CloudOff,
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react';
import { Category, CloudSyncState, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import {
  calculateBudgetStatus,
  calculateDebtSummary,
  calculateMonthlyStats,
  formatIndonesianDate,
  formatRupiah,
  generateCsvData,
  getMemberColorTheme,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { AssetOverviewCard } from './AssetOverviewCard';

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
  selectedMemberFilter?: string;
  onSelectMemberFilter?: (memberId: string) => void;
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
  onNavigateTab,
  onOpenPrintReport,
  onUpdateGroup,
  selectedYear,
  selectedMonth,
  selectedMemberFilter = 'all',
  onSelectMemberFilter,
  onOpenTransferModal,
  debts = [],
}) => {
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

  // Filter transactions according to selectedMemberFilter for dashboard overview
  const filteredTransactionsForSummary = transactions.filter((t) => {
    if (t.isDeleted || t.groupId !== currentGroup.id) return false;
    if (!selectedMemberFilter || selectedMemberFilter === 'all') return true;
    if (selectedMemberFilter === 'joint') {
      if (!t.assetId) return !t.memberId;
      const ast = assetMap.get(t.assetId);
      return !ast?.memberId || ast.memberId === 'joint';
    }
    // Specific member: filter strictly by the member who recorded / owns the transaction
    return t.memberId === selectedMemberFilter;
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

  // Compact: Display 5 recent transactions on Dashboard
  const recentTransactions = allRecentTransactions
    .filter((t) => {
      if (!selectedMemberFilter || selectedMemberFilter === 'all') return true;
      if (selectedMemberFilter === 'joint') {
        if (!t.assetId) return !t.memberId;
        const ast = assetMap.get(t.assetId);
        return !ast?.memberId || ast.memberId === 'joint';
      }
      return t.memberId === selectedMemberFilter;
    })
    .slice(0, 5);

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

  // Last 7 days mini chart
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

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in pb-28 lg:pb-12">
      {/* Offline Notice Banner - Compact on Mobile */}
      {!syncState.isOnline && (
        <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">
              <strong>Mode Offline:</strong> Disimpan aman di perangkat & otomatis sinkron saat online.
            </span>
          </div>
          {syncState.pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shrink-0 whitespace-nowrap">
              {syncState.pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* 1. ASSET OVERVIEW CARD */}
      <AssetOverviewCard
        currentGroup={currentGroup}
        transactions={transactions}
        onUpdateGroup={onUpdateGroup}
        selectedYear={currentYear}
        selectedMonth={currentMonth}
        selectedMemberFilter={selectedMemberFilter}
        onSelectMemberFilter={onSelectMemberFilter}
        onOpenTransferModal={onOpenTransferModal}
        debts={debts}
      />

      {/* Compact Header Actions Bar */}
      <div className="flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            Ringkasan {currentMonthName} {currentYear}
          </h2>
          {selectedMemberFilter !== 'all' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
              {selectedMemberFilter === 'joint' ? 'Bersama' : memMap.get(selectedMemberFilter)?.name || 'Filter'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Unduh Data CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={onOpenPrintReport}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            title="Cetak Laporan / PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Expense */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Pengeluaran
              </span>
              <div className="w-7 h-7 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-red-600 dark:text-red-400 tracking-tight">
              {formatRupiah(stats.totalSpent)}
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
            {stats.expenseCount} transaksi
          </div>
        </div>

        {/* Total Income */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Pemasukan
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatRupiah(stats.totalIncome)}
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
            {stats.incomeCount} pemasukan
          </div>
        </div>

        {/* Card 3: Sisa Anggaran (All) vs Selisih Kas (Filtered) */}
        {selectedMemberFilter === 'all' ? (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Sisa Anggaran
                </span>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    budgetInfo.status === 'danger'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                      : budgetInfo.status === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
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
            <div className="mt-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-500">
              {budgetInfo.percentage}% terpakai
            </div>
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  Selisih Kas
                </span>
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    netBalanceThisMonth >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
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
            <div className="mt-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500">
              {netBalanceThisMonth >= 0 ? 'Surplus' : 'Defisit'}
            </div>
          </div>
        )}

        {/* Average Daily */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                Rata-rata/Hari
              </span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {formatRupiah(stats.averageDaily)}
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
            Estimasi harian
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Batas Anggaran Bulanan
          </span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {formatRupiah(stats.totalSpent)} / {formatRupiah(currentGroup.monthlyBudget)}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
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
          <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 pt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Melebihi batas anggaran sebesar {formatRupiah(Math.abs(budgetInfo.remaining))}.
            </span>
          </div>
        )}
      </div>

      {/* Utang & Piutang Summary Widget */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Utang & Piutang
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {debtSummary.unpaidCount} belum lunas
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px] sm:text-xs">
                <ArrowUpRight className="w-3 h-3" /> Piutang: <strong>{formatRupiah(debtSummary.totalReceivable)}</strong>
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 text-[11px] sm:text-xs">
                <ArrowDownLeft className="w-3 h-3" /> Utang: <strong>{formatRupiah(debtSummary.totalPayable)}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('debts')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <span>Kelola</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2-Column: Mini 7-Day Chart & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* 7-Day Spending Chart */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tren Pengeluaran 7 Hari Terakhir
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('statistics')}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Statistik Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Simple Bar Chart Visualization */}
            <div className="h-40 flex items-end justify-between gap-1.5 sm:gap-2 pt-4 pb-1">
              {last7Days.map((item) => {
                const heightPercent = item.amount > 0 ? Math.max(10, Math.round((item.amount / maxDailyIn7) * 100)) : 4;
                return (
                  <div key={item.dateStr} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                    <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatRupiah(item.amount, { compact: true })}
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-28 flex items-end p-1">
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
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
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
              <div className="py-6 text-center text-slate-400 text-xs">
                Belum ada pengeluaran di {currentMonthName}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats.categoryBreakdown.slice(0, 4).map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
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

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Pos:</span>
            <span className="font-bold">{categories.length}</span>
          </div>
        </div>
      </div>

      {/* Ringkasan Beberapa Transaksi Terakhir (Ringkas, Tanpa Input Form) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Transaksi Terakhir
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">
              ({recentTransactions.length} terbaru)
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <p className="text-xs">Belum ada transaksi untuk filter ini.</p>
            <button
              onClick={onQuickAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Transaksi</span>
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

              return (
                <div
                  key={tx.id}
                  onClick={() => onEditTransaction(tx)}
                  className="p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-2.5 group hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-all border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30 cursor-pointer"
                  style={{ borderLeftWidth: '4px', borderLeftColor: mem?.avatarColor || '#2563eb' }}
                  title="Klik untuk detail / edit transaksi"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                      style={{ backgroundColor: cat?.color || '#94a3b8' }}
                    >
                      <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {tx.description}
                        </span>
                        {tx.isTransfer && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Transfer
                          </span>
                        )}
                        {tx.syncStatus === 'synced' ? (
                          <span title="Cloud Synced">
                            <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
                          </span>
                        ) : (
                          <span title="Disimpan Lokal">
                            <CloudOff className="w-3 h-3 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${memTheme.bgLight} ${memTheme.text} ${memTheme.borderLight}`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: mem?.avatarColor || '#2563eb' }}
                          />
                          <span>{mem?.name || 'Anggota'}</span>
                        </span>
                        <span>·</span>
                        <span>{cat?.name || 'Lainnya'}</span>
                        {linkedAsset && (
                          <>
                            <span>·</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[80px] sm:max-w-none">
                              {linkedAsset.name}
                            </span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatIndonesianDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`text-xs sm:text-sm font-bold font-mono ${
                        isExpense ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatRupiah(tx.amount)}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              );
            })}

            {/* Bottom Button to view full transactions */}
            <button
              onClick={() => onNavigateTab('transactions')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>Lihat Seluruh Transaksi ({allRecentTransactions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
