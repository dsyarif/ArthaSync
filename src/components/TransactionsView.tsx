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
  onSelectMemberFilter,
  onDuplicateTransaction,
  onQuickSaveTransaction,
  onInlineUpdateTransaction,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [localSelectedMember, setLocalSelectedMember] = useState('all');
  const currentMemberFilter = selectedMemberFilter !== undefined ? selectedMemberFilter : localSelectedMember;
  const setMemberFilter = (val: string) => {
    setLocalSelectedMember(val);
    if (onSelectMemberFilter) onSelectMemberFilter(val);
  };
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterByMonth, setFilterByMonth] = useState(true);
  const [showQuickAddBar, setShowQuickAddBar] = useState(false);

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

  // Filter items for current group
  const filtered = filterTransactions(baseTransactions, {
    groupId: currentGroup.id,
    searchQuery,
    categoryId: selectedCategory,
    memberId: currentMemberFilter,
    type: selectedType,
    assetId: selectedAsset,
    startDate,
    endDate,
  });

  const grouped = groupTransactionsByDate(filtered);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const memMap = new Map((currentGroup.members || []).map((m) => [m.id, m]));
  const assetMap = new Map((currentGroup.assets || []).map((a) => [a.id, a]));

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
    setMemberFilter('all');
    setSelectedType('all');
    setSelectedAsset('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    currentMemberFilter !== 'all' ||
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
          categories={categories}
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

          {/* Month Scope Toggle Pill & Advanced Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

        {/* Filter Details Accordion */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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

            {/* Member Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Anggota Keluarga
              </label>
              <select
                value={currentMemberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">Semua Anggota</option>
                {(currentGroup.members || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Tipe
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">Semua Tipe</option>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
          </div>
        )}

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-slate-50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400">
          <div>
            Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span>{' '}
            transaksi
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

      {/* Quick Member Filter Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
          Filter Anggota:
        </span>
        <button
          onClick={() => setMemberFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            currentMemberFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
          }`}
        >
          Semua Anggota
        </button>
        {(currentGroup.members || []).map((m) => {
          const isSelected = currentMemberFilter === m.id;
          const mTheme = getMemberColorTheme(m.avatarColor);
          return (
            <button
              key={m.id}
              onClick={() => setMemberFilter(isSelected ? 'all' : m.id)}
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
            </button>
          );
        })}
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
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
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
                            <span>Edit Langsung Horizontal</span>
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
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        style={{ borderLeftWidth: '4px', borderLeftColor: mem?.avatarColor || '#2563eb' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Category Icon Badge */}
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
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
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
                        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
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
                                onClick={() => onDuplicateTransaction(tx)}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Duplikat Transaksi Ini"
                                aria-label={`Duplikat ${tx.description}`}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                              className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit di Modal"
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
