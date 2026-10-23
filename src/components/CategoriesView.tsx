import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  AlertCircle,
  X,
  Check,
  Percent,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Wallet,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Category, FamilyGroup, Transaction } from '../types/finance';
import { formatIndonesianDate, formatRupiah, parseRupiahInput } from '../utils/finance';
import { CategoryIcon, ICON_OPTIONS } from './CategoryIcon';

interface CategoriesViewProps {
  categories: Category[];
  transactions: Transaction[];
  currentGroup?: FamilyGroup;
  onAddCategory: (cat: Omit<Category, 'id' | 'updatedAt'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
  selectedYear?: number;
  selectedMonth?: number;
}

const COLOR_PALETTE = [
  '#f97316', // Orange / Food
  '#10b981', // Emerald / Grocery
  '#3b82f6', // Blue / Transport
  '#eab308', // Amber / Bills
  '#8b5cf6', // Violet / Education
  '#ec4899', // Pink / Health
  '#06b6d4', // Cyan / Entertainment
  '#14b8a6', // Teal / Investment
  '#ef4444', // Red
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#64748b', // Slate
];

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  transactions,
  currentGroup,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  selectedYear,
  selectedMonth,
}) => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Detail Modal per category state
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<Category | null>(null);

  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Utensils');
  const [color, setColor] = useState('#f97316');
  const [budgetInput, setBudgetInput] = useState('');
  const [error, setError] = useState('');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  // Calculate selected month spending & income per category
  const now = new Date();
  const yearToUse = selectedYear || now.getFullYear();
  const monthToUse = selectedMonth || (now.getMonth() + 1);
  const currentMonthPrefix = `${yearToUse}-${String(monthToUse).padStart(2, '0')}`;

  const [detailYear, setDetailYear] = useState<number>(yearToUse);
  const [detailMonth, setDetailMonth] = useState<number>(monthToUse);

  React.useEffect(() => {
    setDetailYear(yearToUse);
    setDetailMonth(monthToUse);
  }, [yearToUse, monthToUse]);

  const memMap = useMemo(() => new Map((currentGroup?.members || []).map((m) => [m.id, m])), [currentGroup?.members]);
  const assetMap = useMemo(() => new Map((currentGroup?.assets || []).map((a) => [a.id, a])), [currentGroup?.assets]);

  // Frequency count of transactions per category across all transactions
  const categoryUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of transactions) {
      if (!t.isDeleted) {
        counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [transactions]);
  
  const currentMonthExpenseTransactions = transactions.filter(
    (t) => !t.isDeleted && t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
  );
  const spentPerCat: Record<string, number> = {};
  for (const t of currentMonthExpenseTransactions) {
    spentPerCat[t.categoryId] = (spentPerCat[t.categoryId] || 0) + t.amount;
  }

  const currentMonthIncomeTransactions = transactions.filter(
    (t) => !t.isDeleted && t.type === 'income' && t.date.startsWith(currentMonthPrefix)
  );
  const receivedPerCat: Record<string, number> = {};
  for (const t of currentMonthIncomeTransactions) {
    receivedPerCat[t.categoryId] = (receivedPerCat[t.categoryId] || 0) + t.amount;
  }

  const expenseCategories = categories.filter((c) => c.type !== 'income');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  // Categories sorted by transaction count (most transactions first)
  const displayedCategories = useMemo(() => {
    const list = activeTab === 'expense' ? expenseCategories : incomeCategories;
    return [...list].sort((a, b) => {
      const countA = categoryUsageCount[a.id] || 0;
      const countB = categoryUsageCount[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [activeTab, expenseCategories, incomeCategories, categoryUsageCount]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setCategoryType(activeTab);
    setName('');
    setIcon(activeTab === 'expense' ? 'Tag' : 'Coins');
    setColor(activeTab === 'expense' ? COLOR_PALETTE[0] : '#10b981');
    setBudgetInput('');
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryType(cat.type || 'expense');
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setBudgetInput(formatRupiah(cat.monthlyBudget, { withPrefix: false }));
    setError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori tidak boleh kosong.');
      return;
    }

    const budget = parseRupiahInput(budgetInput);

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, {
        name: name.trim(),
        icon,
        color,
        monthlyBudget: budget,
        type: categoryType,
        updatedAt: Date.now(),
      });
    } else {
      onAddCategory({
        name: name.trim(),
        icon,
        color,
        monthlyBudget: budget,
        type: categoryType,
      });
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Kelola Kategori Keuangan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pisahkan dan atur pos kategori pengeluaran dan pemasukan sesuai kebutuhan Anda
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori {activeTab === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</span>
        </button>
      </div>

      {/* Switcher Tab: Pengeluaran vs Pemasukan */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'expense'
              ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Kategori Pengeluaran</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
            {expenseCategories.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'income'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>Kategori Pemasukan</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            {incomeCategories.length}
          </span>
        </button>
      </div>

      {/* Categories Cards Grid */}
      {displayedCategories.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <p className="text-sm">
            Belum ada kategori {activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'} yang terdaftar.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Tambah Kategori Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCategories.map((cat) => {
            const isExpense = cat.type !== 'income';
            const spent = spentPerCat[cat.id] || 0;
            const received = receivedPerCat[cat.id] || 0;
            const amount = isExpense ? spent : received;
            const targetOrBudget = cat.monthlyBudget || 0;
            const percentage = targetOrBudget > 0 ? Math.round((amount / targetOrBudget) * 100) : 0;
            const isOverExpense = isExpense && targetOrBudget > 0 && spent > targetOrBudget;
            const isIncomeTargetAchieved = !isExpense && targetOrBudget > 0 && received >= targetOrBudget;

            const count = categoryUsageCount[cat.id] || 0;

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategoryDetail(cat);
                  setDetailYear(yearToUse);
                  setDetailMonth(monthToUse);
                }}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:shadow-md transition-all group cursor-pointer"
                title="Klik untuk melihat rincian riwayat transaksi bulanan"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{cat.name}</span>
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400">
                            {cat.isDefault ? 'Kategori Bawaan' : 'Kategori Kustom'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-1.5 py-0.2 rounded-full">
                            {count}x dicatat
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(cat);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!cat.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Hapus kategori "${cat.name}"?`)) {
                              onDeleteCategory(cat.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Kategori"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Spending or Income Progress */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {isExpense ? 'Terpakai Bulan Ini:' : 'Diterima Bulan Ini:'}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          isExpense
                            ? 'text-slate-900 dark:text-white'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatRupiah(amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">
                        {isExpense ? 'Batas Anggaran:' : 'Target Pemasukan:'}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {targetOrBudget > 0 ? formatRupiah(targetOrBudget) : 'Tidak dibatasi'}
                      </span>
                    </div>

                    {targetOrBudget > 0 && (
                      <div className="pt-1.5">
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExpense
                                ? isOverExpense
                                  ? 'bg-red-500'
                                  : percentage >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                : isIncomeTargetAchieved
                                ? 'bg-emerald-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                          <span
                            className={
                              isOverExpense
                                ? 'text-red-500 font-bold'
                                : isIncomeTargetAchieved
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : ''
                            }
                          >
                            {percentage}% {isExpense ? 'terpakai' : 'tercapai'}
                          </span>
                          <span>
                            {isExpense
                              ? isOverExpense
                                ? 'Melebihi Anggaran'
                                : 'Dalam Batas'
                              : isIncomeTargetAchieved
                              ? 'Target Tercapai'
                              : 'Dalam Proses'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Clickable Footer Pill */}
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-500 transition-colors">
                  <span>Lihat Rincian Transaksi</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingCategory
                  ? `Edit Kategori ${categoryType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`
                  : `Tambah Kategori ${categoryType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}`}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Category Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tipe Kategori
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCategoryType('expense')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      categoryType === 'expense'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('income')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      categoryType === 'income'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Kategori *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    categoryType === 'expense'
                      ? 'Contoh: Langganan Streaming, Hewan Peliharaan'
                      : 'Contoh: Honor Mengajar, Penjualan Online'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Monthly Budget / Target */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {categoryType === 'expense'
                    ? 'Batas Anggaran Bulanan (Opsional)'
                    : 'Target Pemasukan Bulanan (Opsional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetInput}
                    onChange={(e) => {
                      const num = parseRupiahInput(e.target.value);
                      setBudgetInput(num === 0 && e.target.value === '' ? '' : formatRupiah(num, { withPrefix: false }));
                    }}
                    placeholder="Contoh: 1.000.000"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Warna Kategori
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = color === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Ikon Kategori
                </label>
                <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
                  {ICON_OPTIONS.map((item) => {
                    const isSelected = icon.toLowerCase() === item.id.toLowerCase();
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIcon(item.id)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border text-[10px] transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="truncate max-w-[50px]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30"
                >
                  {editingCategory ? 'Perbarui Kategori' : 'Simpan Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Pop-up Modal: Detail Transaksi Kategori Per Bulan */}
      {selectedCategoryDetail && (() => {
        const isExp = selectedCategoryDetail.type !== 'income';
        const targetPrefix = `${detailYear}-${String(detailMonth).padStart(2, '0')}`;
        const catMonthTransactions = transactions
          .filter(
            (t) =>
              !t.isDeleted &&
              t.categoryId === selectedCategoryDetail.id &&
              t.date.startsWith(targetPrefix)
          )
          .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

        const totalMonthAmount = catMonthTransactions.reduce((acc, t) => acc + t.amount, 0);
        const budgetOrTarget = selectedCategoryDetail.monthlyBudget || 0;
        const percentBudget = budgetOrTarget > 0 ? Math.round((totalMonthAmount / budgetOrTarget) * 100) : 0;
        const avgPerTx = catMonthTransactions.length > 0 ? Math.round(totalMonthAmount / catMonthTransactions.length) : 0;

        const handlePrevMonth = () => {
          if (detailMonth === 1) {
            setDetailMonth(12);
            setDetailYear((y) => y - 1);
          } else {
            setDetailMonth((m) => m - 1);
          }
        };

        const handleNextMonth = () => {
          if (detailMonth === 12) {
            setDetailMonth(1);
            setDetailYear((y) => y + 1);
          } else {
            setDetailMonth((m) => m + 1);
          }
        };

        const isCurrentMonthView = detailYear === yearToUse && detailMonth === monthToUse;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[88vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                    style={{ backgroundColor: selectedCategoryDetail.color }}
                  >
                    <CategoryIcon name={selectedCategoryDetail.icon} className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {selectedCategoryDetail.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isExp
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isExp ? 'Pengeluaran' : 'Pemasukan'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Rincian riwayat transaksi bulanan
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCategoryDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Modal"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Month Navigator Toolbar */}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Bulan Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {monthNames[detailMonth - 1]} {detailYear}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Bulan Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {!isCurrentMonthView && (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailYear(yearToUse);
                      setDetailMonth(monthToUse);
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Kembali ke Bulan Ini
                  </button>
                )}
              </div>

              {/* Summary KPI Cards */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Total {isExp ? 'Belanja' : 'Pemasukan'}
                  </span>
                  <div
                    className={`text-base font-bold font-mono mt-1 ${
                      isExp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatRupiah(totalMonthAmount)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Jumlah Transaksi
                  </span>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {catMonthTransactions.length}x
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Rata-rata: {formatRupiah(avgPerTx, { compact: true })}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {isExp ? 'Pagu Anggaran' : 'Target'}
                  </span>
                  <div className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {budgetOrTarget > 0 ? formatRupiah(budgetOrTarget) : 'Bebas'}
                  </div>
                  {budgetOrTarget > 0 && (
                    <span
                      className={`text-[10px] font-bold ${
                        isExp && totalMonthAmount > budgetOrTarget
                          ? 'text-red-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {percentBudget}% terpakai
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions List */}
              <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {catMonthTransactions.length === 0 ? (
                  <div className="py-14 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      Belum Ada Transaksi
                    </p>
                    <p>
                      Tidak ada catatan {isExp ? 'pengeluaran' : 'pemasukan'} pada kategori{' '}
                      <strong>{selectedCategoryDetail.name}</strong> di bulan{' '}
                      {monthNames[detailMonth - 1]} {detailYear}.
                    </p>
                  </div>
                ) : (
                  catMonthTransactions.map((tx) => {
                    const mem = memMap.get(tx.memberId);
                    const ast = tx.assetId ? assetMap.get(tx.assetId) : undefined;

                    return (
                      <div
                        key={tx.id}
                        className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {mem ? (
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs"
                              style={{ backgroundColor: mem.avatarColor || '#3b82f6' }}
                              title={mem.name}
                            >
                              {mem.name.charAt(0)}
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {tx.description || 'Tanpa keterangan'}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{formatIndonesianDate(tx.date, { monthFormat: 'short' })}</span>
                              <span>·</span>
                              <span>{tx.time} WIB</span>
                              {mem && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-slate-600 dark:text-slate-400">
                                    {mem.name}
                                  </span>
                                </>
                              )}
                              {ast && (
                                <>
                                  <span>·</span>
                                  <span className="text-slate-500 dark:text-slate-400">
                                    {ast.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-bold font-mono text-xs ${
                              isExp ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isExp ? '-' : '+'}{formatRupiah(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono">
                  {catMonthTransactions.length} transaksi di {monthNames[detailMonth - 1]} {detailYear}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryDetail(null)}
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
