import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Cloud,
  CloudOff,
  Calendar,
  X,
  RotateCcw,
  Copy,
  Edit3,
  Check,
  Zap,
  LayoutList,
  List,
  ArrowDownUp,
  Clock,
  User,
  Wallet,
  Tag,
} from 'lucide-react';
import { Category, FamilyGroup, Transaction } from '../types/finance';
import {
  filterTransactions,
  formatIndonesianDate,
  formatRupiah,
  generateCsvData,
  getEligibleAssetsForMember,
  getMemberColorTheme,
  groupTransactionsByDate,
  parseRupiahInput,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';
import { HorizontalQuickAddBar } from './HorizontalQuickAddBar';

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentGroup: FamilyGroup;
  onQuickAdd: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenPrintReport: () => void;
  selectedYear?: number;
  selectedMonth?: number;
  selectedMemberFilter?: string;
  onSelectMemberFilter?: (memberId: string) => void;
  onDuplicateTransaction?: (tx: Transaction) => void;
  onQuickSaveTransaction?: (txData: any) => void;
  onInlineUpdateTransaction?: (id: string, updates: Partial<Transaction>) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  currentGroup,
  onQuickAdd,
  onEditTransaction,
  onDeleteTransaction,
  onOpenPrintReport,
  selectedYear,
  selectedMonth,
  selectedMemberFilter,
  onDuplicateTransaction,
  onQuickSaveTransaction,
  onInlineUpdateTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterByMonth, setFilterByMonth] = useState(true);
  const [showQuickAddBar, setShowQuickAddBar] = useState(false);
  const [viewMode, setViewMode] = useState<'detail' | 'simple'>('detail');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // Category frequency calculation: prioritize most frequently used categories
  const categoryUsageCount = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      if (!t.isDeleted) {
        counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [transactions]);

  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const countA = categoryUsageCount[a.id] || 0;
      const countB = categoryUsageCount[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [categories, categoryUsageCount]);

  // Inline editing state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineDate, setInlineDate] = useState('');
  const [inlineAmount, setInlineAmount] = useState('');
  const [inlineDesc, setInlineDesc] = useState('');
  const [inlineCatId, setInlineCatId] = useState('');
  const [inlineAssetId, setInlineAssetId] = useState('');
  const [inlineMemberId, setInlineMemberId] = useState('');

  const now = new Date();
  const activeYear = selectedYear || now.getFullYear();
  const activeMonth = selectedMonth || (now.getMonth() + 1);
  const monthPrefix = `${activeYear}-${String(activeMonth).padStart(2, '0')}`;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const activeMonthName = monthNames[activeMonth - 1];

  // Base list filtered by month if active
  const baseTransactions = transactions.filter((t) => {
    if (t.isDeleted || t.groupId !== currentGroup.id) return false;
    if (filterByMonth && !t.date.startsWith(monthPrefix)) return false;
    return true;
  });

  // Filter items for current group (Member filter strictly controlled by navbar)
  const filtered = filterTransactions(baseTransactions, {
    groupId: currentGroup.id,
    searchQuery,
    categoryId: selectedCategory,
    memberId: selectedMemberFilter || 'all',
    type: selectedType,
    assetId: selectedAsset,
    startDate,
    endDate,
  });

  const rawGrouped = groupTransactionsByDate(filtered);

  // Group and sort by date according to sortOrder (desc vs asc)
  const grouped = [...rawGrouped]
    .sort((a, b) => {
      return sortOrder === 'desc'
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    })
    .map((grp) => ({
      ...grp,
      items: [...grp.items].sort((a, b) => {
        return sortOrder === 'desc'
          ? (b.time || '').localeCompare(a.time || '')
          : (a.time || '').localeCompare(b.time || '');
      }),
    }));

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const memMap = new Map((currentGroup.members || []).map((m) => [m.id, m]));
  const assetMap = new Map((currentGroup.assets || []).map((a) => [a.id, a]));

  const activeNavbarMember = (currentGroup.members || []).find((m) => m.id === selectedMemberFilter);

  const handleExportCsv = () => {
    const csvString = generateCsvData(
      filtered,
      categories,
      currentGroup.members || [],
      currentGroup.assets || []
    );
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Transaksi_${currentGroup.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedAsset('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    (selectedMemberFilter && selectedMemberFilter !== 'all') ||
    selectedType !== 'all' ||
    selectedAsset !== 'all' ||
    startDate ||
    endDate;

  const totalFilteredExpense = filtered
    .filter((t) => t.type === 'expense' && !t.isTransfer)
    .reduce((sum, item) => sum + item.amount, 0);

  const totalFilteredIncome = filtered
    .filter((t) => t.type === 'income' && !t.isTransfer)
    .reduce((sum, item) => sum + item.amount, 0);

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
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Riwayat Transaksi Keuangan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar pemasukan & pengeluaran {filterByMonth ? `Bulan ${activeMonthName} ${activeYear}` : 'Semua Periode'} · {currentGroup.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowQuickAddBar(!showQuickAddBar)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showQuickAddBar
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>{showQuickAddBar ? 'Tutup Input Cepat' : 'Input Cepat Horizontal'}</span>
          </button>
          <button
            onClick={onQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Modal</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Ekspor ke format Excel CSV"
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

      {/* Feature 5: Horizontal Quick Add Bar */}
      {showQuickAddBar && (
        <HorizontalQuickAddBar
          categories={sortedCategories}
          members={currentGroup.members || []}
          assets={currentGroup.assets || []}
          groupId={currentGroup.id}
          onSave={onQuickSaveTransaction || onQuickAdd}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi berdasarkan catatan atau nominal..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toolbar Controls: View Mode, Sort Order, Month Scope, Filter Toggle */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* View Mode Toggle: Detail vs Simple */}
            <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'detail'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Detail"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Detail</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('simple')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'simple'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Simple & Clean"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simple</span>
              </button>
            </div>

            {/* Sort Order Toggle: Desc (Terbaru) vs Asc (Terlama) */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shrink-0"
              title={`Urutkan tanggal: ${sortOrder === 'desc' ? 'Terbaru ke Terlama' : 'Terlama ke Terbaru'}`}
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
            </button>

            <button
              onClick={() => setFilterByMonth(!filterByMonth)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                filterByMonth
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {filterByMonth ? `Bulan ${activeMonthName}` : 'Semua Bulan'}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                showFilters || hasActiveFilters
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter {hasActiveFilters ? '(Aktif)' : ''}</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Details Accordion - Member filter handled globally by Navbar */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Kategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">Semua Kategori</option>
                {sortedCategories.map((c) => {
                  const count = categoryUsageCount[c.id] || 0;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {count > 0 ? `(${count}x)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Rekening / Kantong Aset Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Rekening / Aset
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">Semua Rekening</option>
                {(currentGroup.assets || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution})
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Tipe Transaksi
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">Semua Tipe (Masuk & Keluar)</option>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span>{' '}
              transaksi
            </span>
            {activeNavbarMember && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: activeNavbarMember.avatarColor }}
                />
                <span>Navbar Filter: {activeNavbarMember.name}</span>
              </span>
            )}
            {selectedMemberFilter === 'joint' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span>Navbar Filter: Rekening Bersama</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              Pengeluaran:{' '}
              <strong className="text-red-600 dark:text-red-400">
                {formatRupiah(totalFilteredExpense)}
              </strong>
            </span>
            <span>·</span>
            <span>
              Pemasukan:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatRupiah(totalFilteredIncome)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Transaction List Grouped by Date */}
      {grouped.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <p className="text-sm">Tidak ditemukan transaksi yang sesuai dengan filter.</p>
          {hasActiveFilters ? (
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Hapus Filter
            </button>
          ) : (
            <button
              onClick={onQuickAdd}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Catat Transaksi Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const dateObj = new Date(group.date);
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <div
                key={group.date}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                {/* Date Header with Daily Sum */}
                <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {dateFormatted}
                    </span>
                    <span className="text-slate-400 text-[11px]">({group.items.length})</span>
                  </div>
                  {group.totalDaily > 0 && (
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                      Total:{' '}
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatRupiah(group.totalDaily)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items in this date */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.items.map((tx) => {
                    const cat = catMap.get(tx.categoryId);
                    const mem = memMap.get(tx.memberId);
                    const linkedAsset = tx.assetId ? assetMap.get(tx.assetId) : undefined;
                    const memTheme = getMemberColorTheme(mem?.avatarColor || '#3b82f6');
                    const isExpense = tx.type === 'expense';
                    const isInlineEditing = inlineEditingId === tx.id;

                    if (isInlineEditing) {
                      return (
                        <div
                          key={tx.id}
                          className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 space-y-2 animate-in fade-in"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                            <span>Edit Cepat Transaksi</span>
                            <span>{formatIndonesianDate(inlineDate)} · {tx.time} WIB</span>
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

                            {/* Description Input (Broad & Comfortable) */}
                            <div className="col-span-2 sm:col-span-1 sm:min-w-[200px] sm:flex-1">
                              <input
                                type="text"
                                value={inlineDesc}
                                onChange={(e) => setInlineDesc(e.target.value)}
                                placeholder="Keterangan lengkap transaksi"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
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

                            {/* Member Select */}
                            <div className="col-span-1 sm:min-w-[90px]">
                              <select
                                value={inlineMemberId}
                                onChange={(e) => handleInlineMemberChange(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                                title="Pilih Anggota"
                              >
                                {(currentGroup.members || []).map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Rekening Select */}
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

                    {/* OPTION A: SIMPLE & CLEAN VIEW */}
                    if (viewMode === 'simple') {
                      return (
                        <div
                          key={tx.id}
                          onClick={() => setSelectedDetailTx(tx)}
                          className="px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-3 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                          title="Klik untuk melihat detail lengkap transaksi"
                        >
                          {/* Left: Dot, Time, Description, Category Tag */}
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: cat?.color || '#94a3b8' }}
                              title={cat?.name || 'Kategori'}
                            />
                            <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden xs:inline">
                              {tx.time}
                            </span>
                            <div className="min-w-0 flex-1 flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {tx.description}
                              </span>
                              <span className="text-[10px] text-slate-400 hidden md:inline truncate">
                                ({cat?.name || 'Lainnya'})
                              </span>
                              {tx.isTransfer && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0">
                                  Transfer
                                </span>
                              )}
                            </div>

                            {/* Member & Asset subtle tag */}
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: mem?.avatarColor || '#3b82f6' }}
                              />
                              <span className="font-medium text-slate-600 dark:text-slate-300">{mem?.name}</span>
                              {linkedAsset && (
                                <span className="text-slate-400 truncate max-w-[110px]">· {linkedAsset.name}</span>
                              )}
                            </div>
                          </div>

                          {/* Right: Nominal & Hover Actions */}
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <span
                              className={`text-xs sm:text-sm font-bold font-mono text-right ${
                                isExpense
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isExpense ? '-' : '+'}
                              {formatRupiah(tx.amount)}
                            </span>

                            {/* Simple Quick Action Icons */}
                            <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              {onDuplicateTransaction && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicateTransaction(tx);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors cursor-pointer"
                                  title="Duplikat Transaksi"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartInlineEdit(tx);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                title="Edit Cepat Horizontal"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditTransaction(tx);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Edit Lengkap"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Yakin ingin menghapus catatan "${tx.description}"?`)) {
                                    onDeleteTransaction(tx.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    {/* OPTION B: DETAIL RICH VIEW */}
                    return (
                      <div
                        key={tx.id}
                        onClick={() => setSelectedDetailTx(tx)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        style={{ borderLeftWidth: '4px', borderLeftColor: mem?.avatarColor || '#2563eb' }}
                        title="Klik untuk melihat detail lengkap transaksi"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Category Icon Badge */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm"
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
                                <span title="Tersinkronisasi Cloud Real-time">
                                  <Cloud className="w-3 h-3 text-emerald-500" />
                                </span>
                              ) : (
                                <span title="Offline / Menunggu Sinkronisasi Cloud">
                                  <CloudOff className="w-3 h-3 text-amber-500" />
                                </span>
                              )}
                            </div>

                            {/* Distinct Member Badge & Metadata */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${memTheme.bgLight} ${memTheme.text} ${memTheme.borderLight}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full shrink-0"
                                  style={{ backgroundColor: mem?.avatarColor || '#2563eb' }}
                                />
                                <span>{mem?.name || 'Anggota'}</span>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{cat?.name || 'Lainnya'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{tx.time} WIB</span>
                              {linkedAsset && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: linkedAsset.color || '#2563eb' }}
                                    />
                                    <span>{linkedAsset.name}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-xs font-bold font-mono ${
                                isExpense
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isExpense ? '-' : '+'}
                              {formatRupiah(tx.amount)}
                            </div>
                          </div>

                          {/* Action Buttons: Duplicate, Inline Edit, Modal Edit, Delete */}
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {onDuplicateTransaction && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateTransaction(tx);
                                }}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Duplikat Transaksi Ini"
                                aria-label={`Duplikat ${tx.description}`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartInlineEdit(tx);
                              }}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Langsung Horizontal"
                              aria-label={`Edit Cepat ${tx.description}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTransaction(tx);
                              }}
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit di Modal"
                              aria-label={`Edit ${tx.description}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
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
              </div>
            );
          })}
        </div>
      )}

      {/* Pop-up Modal: Detail Lengkap Transaksi */}
      {selectedDetailTx && (() => {
        const detailCat = categories.find((c) => c.id === selectedDetailTx.categoryId);
        const detailMem = (currentGroup.members || []).find((m) => m.id === selectedDetailTx.memberId);
        const detailAsset = (currentGroup.assets || []).find((a) => a.id === selectedDetailTx.assetId);
        const isExp = selectedDetailTx.type === 'expense';

        const paymentLabel =
          selectedDetailTx.paymentMethod === 'tunai'
            ? 'Uang Tunai / Kas Fisik'
            : selectedDetailTx.paymentMethod === 'qris_ewallet'
            ? 'QRIS / Dompet Digital (E-Wallet)'
            : 'Transfer Bank';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{ backgroundColor: detailCat?.color || '#94a3b8' }}
                  >
                    <CategoryIcon name={detailCat?.icon || 'Tag'} className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {detailCat?.name || 'Kategori Lainnya'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedDetailTx.isTransfer
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : isExp
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {selectedDetailTx.isTransfer ? 'Transfer Antar Rekening' : isExp ? 'Pengeluaran' : 'Pemasukan'}
                      </span>
                      {selectedDetailTx.syncStatus === 'synced' ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Cloud className="w-3 h-3" /> Cloud Synced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                          <CloudOff className="w-3 h-3" /> Offline
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDetailTx(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Detail"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                {/* Nominal Display Banner */}
                <div
                  className={`p-4 rounded-2xl text-center border ${
                    isExp
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nominal Transaksi
                  </span>
                  <div className="text-2xl sm:text-3xl font-bold font-mono mt-1">
                    {isExp ? '-' : '+'}{formatRupiah(selectedDetailTx.amount)}
                  </div>
                </div>

                {/* Description Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Keterangan / Catatan:
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 break-words">
                    {selectedDetailTx.description || 'Tidak ada keterangan'}
                  </p>
                </div>

                {/* Metadata List */}
                <div className="space-y-2.5 text-xs">
                  {/* Tanggal & Waktu */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tanggal & Waktu</span>
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {formatIndonesianDate(selectedDetailTx.date)} · {selectedDetailTx.time} WIB
                    </span>
                  </div>

                  {/* Anggota Pencatat */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dicatat Oleh</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: detailMem?.avatarColor || '#3b82f6' }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {detailMem?.name || 'Anggota'}
                      </span>
                    </div>
                  </div>

                  {/* Rekening / Sumber Dana */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" />
                      <span>Rekening / Sumber Dana</span>
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {detailAsset ? detailAsset.name : 'Tidak terhubung rekening'}
                    </span>
                  </div>

                  {/* Metode Pembayaran */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Metode Pembayaran</span>
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {paymentLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {onDuplicateTransaction && (
                    <button
                      type="button"
                      onClick={() => {
                        const tx = selectedDetailTx;
                        setSelectedDetailTx(null);
                        onDuplicateTransaction(tx);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Duplikat transaksi ini"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Duplikat</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const tx = selectedDetailTx;
                      setSelectedDetailTx(null);
                      onEditTransaction(tx);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                    title="Edit transaksi"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus catatan "${selectedDetailTx.description}"?`)) {
                        const id = selectedDetailTx.id;
                        setSelectedDetailTx(null);
                        onDeleteTransaction(id);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Hapus transaksi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailTx(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
