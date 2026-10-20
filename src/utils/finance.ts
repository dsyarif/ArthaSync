import { AssetAccount, Category, DebtRecord, FamilyMember, Transaction } from '../types/finance';

/**
 * Format number to Indonesian Rupiah currency format
 * Example: 150000 -> "Rp 150.000"
 */
export function formatRupiah(amount: number, options?: { withPrefix?: boolean; compact?: boolean }): string {
  const withPrefix = options?.withPrefix ?? true;
  const compact = options?.compact ?? false;

  const validAmount = isNaN(amount) ? 0 : amount;
  const prefix = withPrefix ? 'Rp ' : '';

  if (compact && Math.abs(validAmount) >= 1_000_000_000) {
    return `${prefix}${(validAmount / 1_000_000_000).toFixed(1)}M`.replace('.0M', 'M');
  }
  if (compact && Math.abs(validAmount) >= 1_000_000) {
    return `${prefix}${(validAmount / 1_000_000).toFixed(1)}jt`.replace('.0jt', 'jt');
  }
  if (compact && Math.abs(validAmount) >= 1_000) {
    return `${prefix}${(validAmount / 1_000).toFixed(0)}rb`;
  }

  const parts = Math.round(validAmount).toString().split('');
  let formatted = '';
  let count = 0;

  const isNegative = validAmount < 0;
  const digits = isNegative ? parts.slice(1) : parts;

  for (let i = digits.length - 1; i >= 0; i--) {
    count++;
    formatted = digits[i] + formatted;
    if (count % 3 === 0 && i !== 0) {
      formatted = '.' + formatted;
    }
  }

  return `${isNegative ? '-' : ''}${prefix}${formatted || '0'}`;
}

/**
 * Parse raw string input into clean integer amount
 * "Rp 150.000" -> 150000
 */
export function parseRupiahInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format YYYY-MM-DD to Indonesian Date string format
 * Example: "2026-10-13" -> "13 Okt 2026"
 */
export function formatIndonesianDate(
  dateStr: string,
  options?: { monthFormat?: 'short' | 'long' }
): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const longMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const months = options?.monthFormat === 'long' ? longMonths : shortMonths;
  const monthName = months[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Calculate Monthly Statistics
 */
export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  count: number;
  budget: number;
}

export interface MemberStat {
  memberId: string;
  memberName: string;
  avatarColor: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface DailyStat {
  day: number;
  dateStr: string;
  amount: number;
}

export interface MonthlyStatsResult {
  year: number;
  month: number; // 1-12
  totalSpent: number;
  totalIncome: number;
  netSavings: number;
  averageDaily: number;
  daysInMonth: number;
  categoryBreakdown: CategoryStat[];
  dailyTimeline: DailyStat[];
  memberBreakdown: MemberStat[];
  topExpenseCategory: CategoryStat | null;
}

export function calculateMonthlyStats(
  transactions: Transaction[],
  categories: Category[],
  members: FamilyMember[],
  year: number,
  month: number // 1-12
): MonthlyStatsResult {
  const daysInMonth = new Date(year, month, 0).getDate();

  // Filter transactions for specific year and month
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthlyItems = transactions.filter(
    (t) => !t.isDeleted && t.date.startsWith(targetPrefix)
  );

  let totalSpent = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  const memberTotals: Record<string, { amount: number; count: number }> = {};
  const dailyTotalsMap: Record<number, number> = {};

  // Initialize daily totals map
  for (let d = 1; d <= daysInMonth; d++) {
    dailyTotalsMap[d] = 0;
  }

  for (const item of monthlyItems) {
    if (item.type === 'expense') {
      totalSpent += item.amount;

      // Category breakdown
      if (!categoryTotals[item.categoryId]) {
        categoryTotals[item.categoryId] = { amount: 0, count: 0 };
      }
      categoryTotals[item.categoryId].amount += item.amount;
      categoryTotals[item.categoryId].count += 1;

      // Member breakdown
      if (!memberTotals[item.memberId]) {
        memberTotals[item.memberId] = { amount: 0, count: 0 };
      }
      memberTotals[item.memberId].amount += item.amount;
      memberTotals[item.memberId].count += 1;

      // Daily breakdown
      const dayNum = parseInt(item.date.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        dailyTotalsMap[dayNum] = (dailyTotalsMap[dayNum] || 0) + item.amount;
      }
    } else if (item.type === 'income') {
      totalIncome += item.amount;
    }
  }

  // Build category stats array
  const categoryMap = new Map<string, Category>(categories.map((c) => [c.id, c]));
  const categoryBreakdown: CategoryStat[] = Object.entries(categoryTotals)
    .map(([catId, data]) => {
      const cat = categoryMap.get(catId);
      const percentage = totalSpent > 0 ? Math.round((data.amount / totalSpent) * 1000) / 10 : 0;
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Lainnya',
        categoryColor: cat?.color || '#94a3b8',
        categoryIcon: cat?.icon || 'Tag',
        amount: data.amount,
        percentage,
        count: data.count,
        budget: cat?.monthlyBudget || 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Build member stats array
  const memberMap = new Map<string, FamilyMember>(members.map((m) => [m.id, m]));
  const memberBreakdown: MemberStat[] = Object.entries(memberTotals)
    .map(([memId, data]) => {
      const mem = memberMap.get(memId);
      const percentage = totalSpent > 0 ? Math.round((data.amount / totalSpent) * 1000) / 10 : 0;
      return {
        memberId: memId,
        memberName: mem?.name || 'Anggota',
        avatarColor: mem?.avatarColor || '#3b82f6',
        amount: data.amount,
        percentage,
        count: data.count,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Build daily timeline
  const dailyTimeline: DailyStat[] = Object.entries(dailyTotalsMap).map(([d, amt]) => {
    const day = parseInt(d, 10);
    return {
      day,
      dateStr: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      amount: amt,
    };
  });

  const activeDays = new Date().getMonth() + 1 === month && new Date().getFullYear() === year
    ? Math.max(1, new Date().getDate())
    : daysInMonth;

  const averageDaily = Math.round(totalSpent / activeDays);

  return {
    year,
    month,
    totalSpent,
    totalIncome,
    netSavings: totalIncome - totalSpent,
    averageDaily,
    daysInMonth,
    categoryBreakdown,
    dailyTimeline,
    memberBreakdown,
    topExpenseCategory: categoryBreakdown.length > 0 ? categoryBreakdown[0] : null,
  };
}

/**
 * Calculate Budget Health
 */
export function calculateBudgetStatus(spent: number, budget: number) {
  if (budget <= 0) {
    return {
      percentage: 0,
      remaining: 0,
      isOverBudget: false,
      status: 'safe' as const,
    };
  }

  const percentage = Math.round((spent / budget) * 100);
  const remaining = budget - spent;
  const isOverBudget = remaining < 0;

  let status: 'safe' | 'warning' | 'danger' = 'safe';
  if (percentage >= 100) {
    status = 'danger';
  } else if (percentage >= 80) {
    status = 'warning';
  }

  return {
    percentage,
    remaining,
    isOverBudget,
    status,
  };
}

/**
 * Filter transactions based on query criteria
 */
export interface TransactionFilters {
  searchQuery?: string;
  categoryId?: string;
  memberId?: string;
  paymentMethod?: string;
  assetId?: string;
  type?: 'expense' | 'income' | 'all';
  startDate?: string;
  endDate?: string;
  groupId?: string;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter((t) => {
    if (t.isDeleted) return false;

    if (filters.groupId && t.groupId !== filters.groupId) {
      return false;
    }

    if (filters.type && filters.type !== 'all' && t.type !== filters.type) {
      return false;
    }

    if (filters.categoryId && filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.memberId && filters.memberId !== 'all' && t.memberId !== filters.memberId) {
      return false;
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all' && t.paymentMethod !== filters.paymentMethod) {
      return false;
    }

    if (filters.assetId && filters.assetId !== 'all' && t.assetId !== filters.assetId) {
      return false;
    }

    if (filters.startDate && t.date < filters.startDate) {
      return false;
    }

    if (filters.endDate && t.date > filters.endDate) {
      return false;
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchAmt = t.amount.toString().includes(q);
      if (!matchDesc && !matchAmt) return false;
    }

    return true;
  });
}

/**
 * Group transactions by Date string for feed rendering
 */
export function groupTransactionsByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    if (!groups[t.date]) {
      groups[t.date] = [];
    }
    groups[t.date].push(t);
  }

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({
      date,
      items: groups[date].sort((a, b) => b.time.localeCompare(a.time)),
      totalDaily: groups[date]
        .filter((i) => i.type === 'expense')
        .reduce((sum, item) => sum + item.amount, 0),
    }));
}

/**
 * Generate CSV Content for Data Export with Excel UTF-8 BOM
 */
export function generateCsvData(
  transactions: Transaction[],
  categories: Category[],
  members: FamilyMember[],
  assets?: AssetAccount[]
): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const memMap = new Map(members.map((m) => [m.id, m.name]));
  const astMap = new Map((assets || []).map((a) => [a.id, `${a.name} (${a.institution})`]));

  const headers = [
    'ID Transaksi',
    'Tanggal',
    'Waktu',
    'Tipe',
    'Kategori',
    'Nominal (IDR)',
    'Deskripsi / Catatan',
    'Rekening / Aset',
    'Metode Pembayaran',
    'Anggota Keluarga',
    'Status Sinkronisasi',
  ];

  const paymentLabels: Record<string, string> = {
    tunai: 'Tunai',
    transfer_bank: 'Transfer Bank',
    qris_ewallet: 'QRIS / E-Wallet',
    kartu_debit: 'Kartu Debit',
    kartu_kredit: 'Kartu Kredit',
  };

  const rows = transactions
    .filter((t) => !t.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .map((t) => {
      const escape = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escape(t.id),
        escape(t.date),
        escape(t.time),
        escape(t.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'),
        escape(catMap.get(t.categoryId) || 'Lainnya'),
        t.amount,
        escape(t.description),
        escape(t.assetId ? astMap.get(t.assetId) || 'Rekening Terkait' : '-'),
        escape(paymentLabels[t.paymentMethod] || t.paymentMethod),
        escape(memMap.get(t.memberId) || 'Anggota'),
        escape(t.syncStatus === 'synced' ? 'Tersinkronisasi' : 'Lokal/Pending'),
      ].join(',');
    });

  // Include UTF-8 BOM \uFEFF so Indonesian Excel opens characters properly
  const quotedHeaders = headers.map((h) => `"${h}"`).join(',');
  return '\uFEFF' + [quotedHeaders, ...rows].join('\r\n');
}

/**
 * Sync conflict resolution using Last-Write-Wins (LWW) based on updatedAt
 */
export function resolveItemConflict<T extends { id: string; updatedAt: number }>(
  local: T,
  remote: T
): T {
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

/**
 * Asset Overview calculations for net worth and liquidity
 */
export interface AssetOverviewResult {
  totalAssets: number;
  liquidAssets: number; // kas + bank + ewallet
  investmentAssets: number; // investasi & tabungan
  byType: {
    kas: number;
    bank: number;
    ewallet: number;
    investasi: number;
  };
  accounts: AssetAccount[];
}

export function calculateAssetOverview(
  assets: AssetAccount[] = [],
  memberFilter?: string
): AssetOverviewResult {
  // Filter accounts if memberFilter is specified
  const filteredAssets = assets.filter((a) => {
    if (!memberFilter || memberFilter === 'all') return true;
    if (memberFilter === 'joint') return !a.memberId || a.memberId === 'joint';
    return a.memberId === memberFilter;
  });

  let kas = 0;
  let bank = 0;
  let ewallet = 0;
  let investasi = 0;

  for (const a of filteredAssets) {
    const bal = typeof a.balance === 'number' && !isNaN(a.balance) ? a.balance : 0;
    if (a.type === 'kas') kas += bal;
    else if (a.type === 'bank') bank += bal;
    else if (a.type === 'ewallet') ewallet += bal;
    else if (a.type === 'investasi') investasi += bal;
  }

  const liquidAssets = kas + bank + ewallet;
  const totalAssets = liquidAssets + investasi;

  return {
    totalAssets,
    liquidAssets,
    investmentAssets: investasi,
    byType: { kas, bank, ewallet, investasi },
    accounts: filteredAssets,
  };
}

/**
 * Summary calculations for Utang & Piutang
 */
export interface DebtSummaryResult {
  totalReceivable: number; // Piutang belum lunas (hak tagih)
  totalPayable: number; // Utang belum lunas (kewajiban bayar)
  netBalance: number; // totalReceivable - totalPayable
  unpaidCount: number;
  paidCount: number;
  upcomingDueCount: number;
}

export function calculateDebtSummary(debts: DebtRecord[] = []): DebtSummaryResult {
  let totalReceivable = 0;
  let totalPayable = 0;
  let unpaidCount = 0;
  let paidCount = 0;
  let upcomingDueCount = 0;

  const todayStr = new Date().toISOString().split('T')[0];

  for (const d of debts) {
    if (d.isDeleted) continue;
    const remaining = Math.max(0, d.amount - (d.paidAmount || 0));

    if (d.status === 'paid' || remaining <= 0) {
      paidCount++;
      continue;
    }

    unpaidCount++;

    if (d.type === 'piutang') {
      totalReceivable += remaining;
    } else {
      totalPayable += remaining;
    }

    if (d.dueDate && d.dueDate >= todayStr) {
      upcomingDueCount++;
    }
  }

  return {
    totalReceivable,
    totalPayable,
    netBalance: totalReceivable - totalPayable,
    unpaidCount,
    paidCount,
    upcomingDueCount,
  };
}

/**
 * Real Net Worth calculations: Saldo Rekening + Piutang (belum lunas) - Utang (belum dibayar)
 */
export interface RealNetWorthResult {
  liquidBalance: number; // Saldo rekening & kas
  receivableRemaining: number; // (+) Total piutang yang belum dilunasi pihak lain
  payableRemaining: number; // (-) Total utang yang belum kita bayar
  realNetAsset: number; // liquidBalance + receivableRemaining - payableRemaining
  receivablesCount: number;
  payablesCount: number;
}

export function calculateRealNetWorth(
  assets: AssetAccount[] = [],
  debts: DebtRecord[] = [],
  memberFilter?: string
): RealNetWorthResult {
  const overview = calculateAssetOverview(assets, memberFilter);
  const liquidBalance = overview.totalAssets;

  let receivableRemaining = 0;
  let payableRemaining = 0;
  let receivablesCount = 0;
  let payablesCount = 0;

  for (const d of debts) {
    if (d.isDeleted || d.status === 'paid') continue;
    const remaining = Math.max(0, d.amount - (d.paidAmount || 0));
    if (remaining <= 0) continue;

    const isDebtJoint = d.scope === 'bersama' || d.isJoint === true || d.memberId === 'joint';

    if (!memberFilter || memberFilter === 'all') {
      if (d.type === 'piutang') {
        receivableRemaining += remaining;
        receivablesCount++;
      } else {
        payableRemaining += remaining;
        payablesCount++;
      }
    } else if (memberFilter === 'joint') {
      // Joint group debts only (Utang / Piutang Bersama Keluarga)
      if (isDebtJoint) {
        if (d.type === 'piutang') {
          receivableRemaining += remaining;
          receivablesCount++;
        } else {
          payableRemaining += remaining;
          payablesCount++;
        }
      }
    } else {
      // Specific individual member (e.g. Ayah):
      // CRITICAL: Utang/Piutang Bersama MUST NOT affect personal assets of an individual member!
      if (isDebtJoint) {
        continue;
      }

      if (d.partyType === 'internal') {
        const lenderId = d.type === 'piutang' ? d.memberId : d.otherMemberId;
        const borrowerId = d.type === 'piutang' ? d.otherMemberId : d.memberId;
        if (lenderId === memberFilter) {
          receivableRemaining += remaining;
          receivablesCount++;
        } else if (borrowerId === memberFilter) {
          payableRemaining += remaining;
          payablesCount++;
        }
      } else {
        // External
        if (d.memberId === memberFilter) {
          if (d.type === 'piutang') {
            receivableRemaining += remaining;
            receivablesCount++;
          } else {
            payableRemaining += remaining;
            payablesCount++;
          }
        }
      }
    }
  }

  const realNetAsset = liquidBalance + receivableRemaining - payableRemaining;

  return {
    liquidBalance,
    receivableRemaining,
    payableRemaining,
    realNetAsset,
    receivablesCount,
    payablesCount,
  };
}

/**
 * Filter asset accounts eligible for a specific member:
 * Returns Joint / Rekening Bersama accounts + accounts specifically owned by that member.
 * This prevents Anggota A from selecting Anggota B's private account.
 */
export function getEligibleAssetsForMember(
  assets: AssetAccount[] = [],
  memberId?: string
): AssetAccount[] {
  if (!memberId) return assets;
  return assets.filter((a) => !a.memberId || a.memberId === 'joint' || a.memberId === memberId);
}

/**
 * Visual styling theme for distinct family member colors
 */
export interface MemberColorTheme {
  primary: string;
  bgLight: string;
  borderLight: string;
  text: string;
  badge: string;
  chipBorder: string;
}

export function getMemberColorTheme(color: string): MemberColorTheme {
  const c = color ? color.toLowerCase() : '#3b82f6';

  if (c.includes('3b82f6') || c.includes('2563eb') || c.includes('blue')) {
    return {
      primary: '#2563eb',
      bgLight: 'bg-blue-50 dark:bg-blue-950/60',
      borderLight: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-600 text-white',
      chipBorder: 'border-blue-400 dark:border-blue-500',
    };
  }
  if (c.includes('ec4899') || c.includes('e11d48') || c.includes('pink') || c.includes('rose')) {
    return {
      primary: '#e11d48',
      bgLight: 'bg-rose-50 dark:bg-rose-950/60',
      borderLight: 'border-rose-200 dark:border-rose-800',
      text: 'text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-600 text-white',
      chipBorder: 'border-rose-400 dark:border-rose-500',
    };
  }
  if (c.includes('10b981') || c.includes('059669') || c.includes('emerald') || c.includes('green')) {
    return {
      primary: '#059669',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/60',
      borderLight: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      badge: 'bg-emerald-600 text-white',
      chipBorder: 'border-emerald-400 dark:border-emerald-500',
    };
  }
  if (c.includes('f59e0b') || c.includes('d97706') || c.includes('amber') || c.includes('orange')) {
    return {
      primary: '#d97706',
      bgLight: 'bg-amber-50 dark:bg-amber-950/60',
      borderLight: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-600 text-white',
      chipBorder: 'border-amber-400 dark:border-amber-500',
    };
  }
  if (c.includes('8b5cf6') || c.includes('7c3aed') || c.includes('purple') || c.includes('violet')) {
    return {
      primary: '#7c3aed',
      bgLight: 'bg-purple-50 dark:bg-purple-950/60',
      borderLight: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      badge: 'bg-purple-600 text-white',
      chipBorder: 'border-purple-400 dark:border-purple-500',
    };
  }
  if (c.includes('06b6d4') || c.includes('0891b2') || c.includes('cyan') || c.includes('teal')) {
    return {
      primary: '#0891b2',
      bgLight: 'bg-cyan-50 dark:bg-cyan-950/60',
      borderLight: 'border-cyan-200 dark:border-cyan-800',
      text: 'text-cyan-700 dark:text-cyan-300',
      badge: 'bg-cyan-600 text-white',
      chipBorder: 'border-cyan-400 dark:border-cyan-500',
    };
  }

  return {
    primary: color || '#4f46e5',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/60',
    borderLight: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-600 text-white',
    chipBorder: 'border-indigo-400 dark:border-indigo-500',
  };
}
