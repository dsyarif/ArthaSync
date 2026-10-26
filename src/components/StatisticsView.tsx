import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  LineChart,
  BarChart3,
  PieChart,
  Users,
  Printer,
  Download,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Lightbulb,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  X,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { AssetAccount, Category, FamilyGroup, Transaction } from '../types/finance';
import {
  calculateMonthlyStats,
  calculateYearlyStats,
  formatIndonesianDate,
  formatRupiah,
  generateCsvData,
  MonthSummaryStat,
  YearlyStatsResult,
} from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface StatisticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: AssetAccount[];
  currentGroup: FamilyGroup;
  onOpenPrintReport: () => void;
  year?: number;
  month?: number;
  selectedMemberFilter?: string;
  onChangeMonth?: (year: number, month: number) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  transactions,
  categories,
  accounts,
  currentGroup,
  onOpenPrintReport,
  year,
  month,
  selectedMemberFilter = 'all',
  onChangeMonth,
}) => {
  const currentDate = new Date();
  const [internalYear, setInternalYear] = useState(currentDate.getFullYear());
  const [internalMonth, setInternalMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [periodMode, setPeriodMode] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredMonth, setHoveredMonth] = useState<MonthSummaryStat | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number; dateStr: string } | null>(null);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<Category | null>(null);

  const selectedYear = year !== undefined ? year : internalYear;
  const selectedMonth = month !== undefined ? month : internalMonth;

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      if (onChangeMonth) {
        onChangeMonth(selectedYear - 1, 12);
      } else {
        setInternalMonth(12);
        setInternalYear((y) => y - 1);
      }
    } else {
      if (onChangeMonth) {
        onChangeMonth(selectedYear, selectedMonth - 1);
      } else {
        setInternalMonth((m) => m - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      if (onChangeMonth) {
        onChangeMonth(selectedYear + 1, 1);
      } else {
        setInternalMonth(1);
        setInternalYear((y) => y + 1);
      }
    } else {
      if (onChangeMonth) {
        onChangeMonth(selectedYear, selectedMonth + 1);
      } else {
        setInternalMonth((m) => m + 1);
      }
    }
  };

  const handlePrevYear = () => {
    if (onChangeMonth) {
      onChangeMonth(selectedYear - 1, selectedMonth);
    } else {
      setInternalYear((y) => y - 1);
    }
  };

  const handleNextYear = () => {
    if (onChangeMonth) {
      onChangeMonth(selectedYear + 1, selectedMonth);
    } else {
      setInternalYear((y) => y + 1);
    }
  };

  // Filter transactions belonging to current group AND member filter from navbar
  const isMemberFiltered = selectedMemberFilter && selectedMemberFilter !== 'all';
  const activeMember = currentGroup.members?.find((m) => m.id === selectedMemberFilter);

  const groupTransactions = transactions.filter((t) => {
    if (t.groupId !== currentGroup.id) return false;
    if (isMemberFiltered && t.memberId !== selectedMemberFilter) return false;
    return true;
  });

  // Calculate current month stats
  const stats = calculateMonthlyStats(
    groupTransactions,
    categories,
    currentGroup.members || [],
    selectedYear,
    selectedMonth
  );

  // Calculate previous month stats for analytics comparison
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const prevStats = calculateMonthlyStats(
    groupTransactions,
    categories,
    currentGroup.members || [],
    prevYear,
    prevMonth
  );

  // Highest daily expense
  const maxDayExpense = Math.max(...stats.dailyTimeline.map((d) => d.amount), 0);
  const highestDay = stats.dailyTimeline.find((d) => d.amount === maxDayExpense && d.amount > 0);

  // SVG Line Chart coordinates calculation
  const chartWidth = 800;
  const chartHeight = 220;
  const paddingX = 35;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;
  const ceilingExpense = maxDayExpense > 0 ? maxDayExpense * 1.15 : 100000;

  const points = stats.dailyTimeline.map((item) => {
    const x = paddingX + ((item.day - 1) / Math.max(stats.daysInMonth - 1, 1)) * innerWidth;
    const y = chartHeight - paddingY - (item.amount / ceilingExpense) * innerHeight;
    return { ...item, x, y };
  });

  // Build SVG path with smooth cubic Bezier
  const linePath = points.length === 0
    ? ''
    : points.reduce((acc, point, index, array) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = array[index - 1];
        const cpX1 = prev.x + (point.x - prev.x) / 2;
        const cpY1 = prev.y;
        const cpX2 = prev.x + (point.x - prev.x) / 2;
        const cpY2 = point.y;
        return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${point.x} ${point.y}`;
      }, '');

  const areaPath = points.length === 0
    ? ''
    : `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  // Build Donut Chart Angles
  let cumulativeAngle = 0;
  const donutSlices = stats.categoryBreakdown.map((cat) => {
    const angle = (cat.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return {
      ...cat,
      startAngle,
      angle,
    };
  });

  // SVG Helper for donut arc
  const createArc = (startAngle: number, angle: number, radius: number, innerRadius: number) => {
    if (angle <= 0) return '';
    const endAngle = startAngle + angle;
    const isFullCircle = angle >= 359.99;

    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180.0;
    const startRad = rad(startAngle);
    const endRad = rad(isFullCircle ? 359.99 : endAngle);

    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);

    const x3 = 100 + innerRadius * Math.cos(endRad);
    const y3 = 100 + innerRadius * Math.sin(endRad);
    const x4 = 100 + innerRadius * Math.cos(startRad);
    const y4 = 100 + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Monthly Analytics Calculations
  const expenseDiff = stats.totalSpent - prevStats.totalSpent;
  const expenseMoMPercent = prevStats.totalSpent > 0
    ? Math.round((expenseDiff / prevStats.totalSpent) * 100)
    : 0;

  const savingsRate = stats.totalIncome > 0
    ? Math.round(((stats.totalIncome - stats.totalSpent) / stats.totalIncome) * 100)
    : 0;

  // Yearly Analytics Calculations (12 Bulan)
  const yearlyStats: YearlyStatsResult = calculateYearlyStats(
    groupTransactions,
    categories,
    currentGroup.members || [],
    selectedYear
  );

  let cumulativeYearlyAngle = 0;
  const yearlyDonutSlices = yearlyStats.categoryBreakdown.map((cat) => {
    const angle = (cat.percentage / 100) * 360;
    const startAngle = cumulativeYearlyAngle;
    cumulativeYearlyAngle += angle;
    return {
      ...cat,
      startAngle,
      angle,
    };
  });

  // Yearly Dual Bar Chart Calculations
  const yearlyChartWidth = 800;
  const yearlyChartHeight = 280;
  const yearlyPadLeft = 65;
  const yearlyPadRight = 25;
  const yearlyPadTop = 25;
  const yearlyPadBottom = 45;
  const yearlyPlotWidth = yearlyChartWidth - yearlyPadLeft - yearlyPadRight;
  const yearlyPlotHeight = yearlyChartHeight - yearlyPadTop - yearlyPadBottom;

  const maxYearlyMonthValue = Math.max(
    ...yearlyStats.monthlyTimeline.map((m) => Math.max(m.totalSpent, m.totalIncome)),
    100000
  ) * 1.15;

  const monthSlotWidth = yearlyPlotWidth / 12;
  const yearlyBarWidth = Math.min(18, Math.max(10, (monthSlotWidth - 14) / 2));
  const yearlyBarGap = 3;
  const barGroupWidth = yearlyBarWidth * 2 + yearlyBarGap;
  const barGroupOffset = (monthSlotWidth - barGroupWidth) / 2;

  // Trend line points for totalSpent across 12 months
  const yearlyTrendPoints = yearlyStats.monthlyTimeline.map((m, idx) => {
    const x = yearlyPadLeft + idx * monthSlotWidth + monthSlotWidth / 2;
    const y = yearlyChartHeight - yearlyPadBottom - (m.totalSpent / maxYearlyMonthValue) * yearlyPlotHeight;
    return { x, y, month: m };
  });

  const yearlyTrendLinePath = yearlyTrendPoints.reduce((acc, pt, index, arr) => {
    if (index === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[index - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '');

  // Transactions for selected category in modal
  const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const dateFilterPrefix = periodMode === 'monthly' ? targetPrefix : `${selectedYear}-`;
  const categoryTransactions = selectedCategoryModal
    ? groupTransactions
        .filter(
          (t) =>
            !t.isDeleted &&
            t.type === 'expense' &&
            t.categoryId === selectedCategoryModal.id &&
            t.date.startsWith(dateFilterPrefix)
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const categoryDetailTotal = categoryTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Map helpers
  const memberMap = new Map((currentGroup.members || []).map((m) => [m.id, m]));
  const effectiveAccounts = accounts || currentGroup.assets || [];
  const accountMap = new Map(effectiveAccounts.map((a) => [a.id, a]));

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Top Period Mode Switcher & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Left: Navigation (Month or Year) */}
        <div className="flex flex-wrap items-center gap-2">
          {periodMode === 'monthly' ? (
            <>
              <button
                onClick={handlePrevMonth}
                aria-label="Bulan Sebelumnya"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {monthNames[selectedMonth - 1]} {selectedYear}
                </span>
                <span className="text-xs text-slate-400">· {currentGroup.name}</span>
              </div>

              <button
                onClick={handleNextMonth}
                aria-label="Bulan Berikutnya"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handlePrevYear}
                aria-label="Tahun Sebelumnya"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  Tahun Penuh {selectedYear}
                </span>
                <span className="text-xs text-slate-400">· {currentGroup.name}</span>
              </div>

              <button
                onClick={handleNextYear}
                aria-label="Tahun Berikutnya"
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {isMemberFiltered && activeMember && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold ml-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: activeMember.avatarColor || '#10b981' }}
              />
              <span>Filter: {activeMember.name}</span>
            </div>
          )}
        </div>

        {/* Center / Right: Period Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher Pill */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPeriodMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Bulanan</span>
            </button>
            <button
              onClick={() => setPeriodMode('yearly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodMode === 'yearly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Tahunan (12 Bulan)</span>
            </button>
          </div>

          <button
            onClick={() => {
              const exportTxs = periodMode === 'monthly'
                ? groupTransactions.filter((t) => t.date.startsWith(targetPrefix))
                : groupTransactions.filter((t) => t.date.startsWith(`${selectedYear}-`));
              const csv = generateCsvData(exportTxs, categories);
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = periodMode === 'monthly'
                ? `Laporan-Keuangan-${monthNames[selectedMonth - 1]}-${selectedYear}.csv`
                : `Laporan-Keuangan-Tahunan-${selectedYear}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={onOpenPrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {periodMode === 'monthly' ? (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary KPI Cards Bulanan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Pengeluaran
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
                {formatRupiah(stats.totalSpent)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                {stats.daysInMonth} hari total periode
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Pemasukan
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatRupiah(stats.totalIncome)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Net: {formatRupiah(stats.netSavings)}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Rata-rata Harian
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatRupiah(stats.averageDaily)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">per hari aktif</span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Pengeluaran Tertinggi
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {highestDay ? formatRupiah(highestDay.amount) : 'Rp 0'}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                {highestDay ? `Tgl ${highestDay.day} ${monthNames[selectedMonth - 1]}` : 'Nihil'}
              </span>
            </div>
          </div>

      {/* Visual Chart 1: Daily Expense Line Chart (Diagram Garis Modern) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LineChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Grafik Tren Pengeluaran Harian</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pergerakan kurva pengeluaran harian sepanjang bulan {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
          {hoveredDay ? (
            <div className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <span className="text-slate-500">Tgl {hoveredDay.day}:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(hoveredDay.amount)}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-0.5 bg-emerald-500 rounded-full" />
              <span>Arahkan kursor / sentuh titik untuk melihat detail tanggal</span>
            </div>
          )}
        </div>

        {/* SVG Line Chart */}
        <div className="relative pt-2 pb-2">
          {maxDayExpense === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <LineChart className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <span>Belum ada transaksi pengeluaran pada bulan ini.</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[650px] sm:min-w-full">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-56 sm:h-64 overflow-visible"
                >
                  <defs>
                    <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="85%" stopColor="#10b981" stopOpacity="0.02" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* Horizontal Guideline Marks */}
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = chartHeight - paddingY - ratio * innerHeight;
                    const val = ceilingExpense * ratio;
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-100 dark:text-slate-800"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-400 text-[9px] font-mono select-none"
                        >
                          {formatRupiah(val, { compact: true })}
                        </text>
                      </g>
                    );
                  })}

                  {/* Base X Axis */}
                  <line
                    x1={paddingX}
                    y1={chartHeight - paddingY}
                    x2={chartWidth - paddingX}
                    y2={chartHeight - paddingY}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="1.5"
                  />

                  {/* Area fill under curve */}
                  {areaPath && (
                    <path
                      d={areaPath}
                      fill="url(#lineAreaGradient)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Main Line Stroke */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Data Points (Hover Dots) */}
                  {points.map((pt) => {
                    const isMax = pt.amount === maxDayExpense && maxDayExpense > 0;
                    const isHovered = hoveredDay?.day === pt.day;

                    return (
                      <g
                        key={pt.day}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDay({ day: pt.day, amount: pt.amount, dateStr: pt.dateStr })}
                        onMouseLeave={() => setHoveredDay(null)}
                        onClick={() =>
                          setHoveredDay(hoveredDay?.day === pt.day ? null : { day: pt.day, amount: pt.amount, dateStr: pt.dateStr })
                        }
                      >
                        {/* Invisible larger hover target */}
                        <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                        {/* Visible Point Dot */}
                        {pt.amount > 0 && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : isMax ? 5 : 3.5}
                            fill={isMax ? '#ef4444' : '#10b981'}
                            stroke="#ffffff"
                            strokeWidth={isHovered ? '2.5' : '1.5'}
                            className="transition-all duration-150"
                          />
                        )}

                        {/* X-axis Day Numbers */}
                        {(pt.day === 1 || pt.day === stats.daysInMonth || pt.day % 5 === 0) && (
                          <text
                            x={pt.x}
                            y={chartHeight - paddingY + 16}
                            textAnchor="middle"
                            className={`text-[10px] select-none ${
                              isHovered
                                ? 'fill-emerald-600 font-bold'
                                : 'fill-slate-400 dark:fill-slate-500'
                            }`}
                          >
                            Tgl {pt.day}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-2">
            <span>Tanggal 1</span>
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Rata-rata Harian: {formatRupiah(stats.averageDaily)}
            </span>
            <span>Tanggal {stats.daysInMonth}</span>
          </div>
        </div>
      </div>

      {/* Visual Chart 2 & 3: Category Donut & Family Member Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut + Clickable List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Distribusi Kategori Pengeluaran</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Klik kategori untuk melihat rincian riwayat transaksi
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
              {stats.categoryBreakdown.length} Kategori
            </span>
          </div>

          {stats.categoryBreakdown.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Tidak ada catatan pengeluaran pada periode ini.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* SVG Donut */}
              <div className="relative w-44 h-44 flex-shrink-0">
                <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                  {donutSlices.map((slice) => (
                    <path
                      key={slice.categoryId}
                      d={createArc(slice.startAngle, slice.angle, 90, 54)}
                      fill={slice.categoryColor}
                      className="hover:opacity-90 transition-opacity cursor-pointer"
                      onClick={() => {
                        const targetCat = categories.find((c) => c.id === slice.categoryId);
                        if (targetCat) setSelectedCategoryModal(targetCat);
                      }}
                    >
                      <title>{`${slice.categoryName}: ${slice.percentage}% (${formatRupiah(slice.amount)})`}</title>
                    </path>
                  ))}
                </svg>

                {/* Donut Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Total
                  </span>
                  <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                    {formatRupiah(stats.totalSpent, { compact: true })}
                  </span>
                </div>
              </div>

              {/* Category Clickable List */}
              <div className="flex-1 w-full space-y-2 max-h-64 overflow-y-auto pr-1">
                {stats.categoryBreakdown.map((cat) => {
                  const categoryObj = categories.find((c) => c.id === cat.categoryId);
                  return (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() => categoryObj && setSelectedCategoryModal(categoryObj)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.categoryColor }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {cat.categoryName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-mono">
                            {cat.percentage}%
                          </span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">
                            {formatRupiah(cat.amount)}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </div>
                      {/* Budget vs Actual mini progress */}
                      {cat.budget > 0 && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cat.amount > cat.budget ? 'bg-red-500' : 'bg-emerald-500'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.round((cat.amount / cat.budget) * 100))}%`,
                              }}
                            />
                          </div>
                          <span>Anggaran: {formatRupiah(cat.budget, { compact: true })}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Family Member Spending Share */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Pengeluaran per Anggota ({currentGroup.name})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparansi kontribusi pengeluaran dalam keluarga
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {currentGroup.members?.length || 1} Orang
            </span>
          </div>

          {stats.memberBreakdown.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Belum ada transaksi anggota keluarga pada periode ini.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Stacked Proportional Bar */}
              <div className="h-4 rounded-xl overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {stats.memberBreakdown.map((mem) => (
                  <div
                    key={mem.memberId}
                    style={{
                      width: `${mem.percentage}%`,
                      backgroundColor: mem.avatarColor,
                    }}
                    title={`${mem.memberName}: ${mem.percentage}% (${formatRupiah(mem.amount)})`}
                    className="h-full transition-all hover:opacity-90"
                  />
                ))}
              </div>

              {/* Members Detail List */}
              <div className="space-y-2.5">
                {stats.memberBreakdown.map((mem) => (
                  <div
                    key={mem.memberId}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: mem.avatarColor }}
                      >
                        {mem.memberName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {mem.memberName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {mem.count} transaksi · {mem.percentage}% dari total keluarga
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                        {formatRupiah(mem.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Financial Analytics & Recommendations Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-transparent border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900/40 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Analitik & Rekomendasi Finansial Cerdas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Wawasan otomatis berbasis data keuangan bulan {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold self-start sm:self-auto">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>AI Advisor</span>
          </div>
        </div>

        {/* 3 Metric Insight Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Savings Rate */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Rasio Tabungan</span>
              {savingsRate >= 20 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Sehat
                </span>
              ) : savingsRate >= 0 ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Cukup
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Defisit
                </span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {stats.totalIncome > 0 ? `${savingsRate}%` : '0%'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {savingsRate >= 0
                ? `Surplus tabungan: ${formatRupiah(stats.netSavings)}`
                : `Defisit belanja: ${formatRupiah(Math.abs(stats.netSavings))}`}
            </p>
          </div>

          {/* 2. MoM Comparison */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">vs Bulan Lalu</span>
              {expenseDiff < 0 ? (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ArrowDownRight className="w-3.5 h-3.5" /> Lebih Hemat
                </span>
              ) : expenseDiff > 0 ? (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Meningkat
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-400">Stabil</span>
              )}
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {expenseMoMPercent > 0 ? `+${expenseMoMPercent}%` : `${expenseMoMPercent}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {expenseDiff === 0
                ? 'Sama persis dengan bulan lalu'
                : expenseDiff > 0
                ? `Naik ${formatRupiah(expenseDiff)} dari ${monthNames[prevMonth - 1]}`
                : `Hemat ${formatRupiah(Math.abs(expenseDiff))} dari ${monthNames[prevMonth - 1]}`}
            </p>
          </div>

          {/* 3. Top Category Domination */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pos Pengeluaran Terbesar</span>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {stats.topExpenseCategory ? `${stats.topExpenseCategory.percentage}%` : '0%'}
              </span>
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
              {stats.topExpenseCategory ? stats.topExpenseCategory.categoryName : 'Belum Ada'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.topExpenseCategory
                ? formatRupiah(stats.topExpenseCategory.amount)
                : 'Nihil transaksi'}
            </p>
          </div>
        </div>

        {/* Actionable Recommendations List */}
        <div className="space-y-2.5 pt-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Rekomendasi Tindakan:
          </span>

          <div className="space-y-2">
            {/* Recommendation 1: Pacing Daily */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-white">Ritme Pengeluaran Harian: </strong>
                Rata-rata belanja Anda saat ini adalah{' '}
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(stats.averageDaily)}
                </strong>{' '}
                per hari. Pertahankan pengeluaran harian di bawah patokan ini agar arus kas tetap stabil sampai akhir bulan.
              </div>
            </div>

            {/* Recommendation 2: Top category mitigation */}
            {stats.topExpenseCategory && (
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 mt-0.5">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-white">Pengendalian Pos Terbesar: </strong>
                  Kategori <strong className="text-teal-600 dark:text-teal-400">{stats.topExpenseCategory.categoryName}</strong> mengambil porsi{' '}
                  <strong>{stats.topExpenseCategory.percentage}%</strong> dari total belanja. Disarankan untuk memasang batas pagu anggaran bulanan guna mencegah kebocoran pos ini.
                </div>
              </div>
            )}

            {/* Recommendation 3: Savings/Surplus allocation */}
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mt-0.5">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-white">Alokasi Dana Simpanan: </strong>
                {stats.netSavings > 0 ? (
                  <>
                    Terdapat surplus tabungan sebesar{' '}
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(stats.netSavings)}
                    </strong>
                    . Segera sisihkan ke pos tabungan terpisah atau instrumen dana darurat sebelum periode baru dimulai.
                  </>
                ) : (
                  <>
                    Arus kas bulan ini mengalami defisit. Evaluasi pengeluaran non-primer dan tunda rencana belanja sekunder sampai saldo pulih.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      ) : (
        /* ========================================================= */
        /* MODE TAHUNAN (12 BULAN)                                   */
        /* ========================================================= */
        <div className="space-y-6 animate-in fade-in">
          {/* Summary KPI Cards Tahunan (4 Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Pengeluaran Tahun {selectedYear}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                {formatRupiah(yearlyStats.totalSpent)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Rata-rata: {formatRupiah(yearlyStats.averageMonthlySpent)} / bulan
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Total Pemasukan Tahun {selectedYear}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatRupiah(yearlyStats.totalIncome)}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Net: {formatRupiah(yearlyStats.netSavings)}
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Rasio Tabungan Tahunan
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {yearlyStats.savingsRate}%
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
                Akumulasi tabungan bersih
              </span>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                Puncak Pengeluaran
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 truncate">
                {yearlyStats.highestExpenseMonth ? yearlyStats.highestExpenseMonth.monthName : 'Belum Ada'}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
                {yearlyStats.highestExpenseMonth ? formatRupiah(yearlyStats.highestExpenseMonth.totalSpent) : 'Nihil transaksi'}
              </span>
            </div>
          </div>

          {/* DIAGRAM UTAMA: DIAGRAM BULAN PER BULAN (12 BULAN JAN - DES) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Diagram Arus Kas Bulan per Bulan ({selectedYear})</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Perbandingan pengeluaran vs pemasukan Januari sampai Desember. Arahkan kursor atau ketuk bulan untuk melihat detail.
                </p>
              </div>

              {/* Diagram Legend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">Pengeluaran</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">Pemasukan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0.5 bg-indigo-500 rounded-full shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">Tren Belanja</span>
                </div>
              </div>
            </div>

            {/* Hovered Month Popover Banner */}
            {hoveredMonth && (
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {hoveredMonth.monthName} {selectedYear}:
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                    Keluar: {formatRupiah(hoveredMonth.totalSpent)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Masuk: {formatRupiah(hoveredMonth.totalIncome)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      hoveredMonth.netSavings >= 0
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    Net: {formatRupiah(hoveredMonth.netSavings)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({hoveredMonth.transactionCount} transaksi)
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (onChangeMonth) onChangeMonth(selectedYear, hoveredMonth.month);
                    else setInternalMonth(hoveredMonth.month);
                    setPeriodMode('monthly');
                  }}
                  className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <span>Buka Detail Bulan Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* SVG Dual Bar & Trend Line Chart */}
            <div className="relative pt-2 pb-2">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[700px] sm:min-w-full">
                  <svg
                    viewBox={`0 0 ${yearlyChartWidth} ${yearlyChartHeight}`}
                    className="w-full h-64 sm:h-72 overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
                        <stop offset="100%" stopColor="#e11d48" stopOpacity="0.85" />
                      </linearGradient>
                      <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
                      </linearGradient>
                      <filter id="yearlyGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#6366f1" floodOpacity="0.4" />
                      </filter>
                    </defs>

                    {/* Horizontal Guideline Marks */}
                    {[0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = yearlyChartHeight - yearlyPadBottom - ratio * yearlyPlotHeight;
                      const val = maxYearlyMonthValue * ratio;
                      return (
                        <g key={ratio}>
                          <line
                            x1={yearlyPadLeft}
                            y1={y}
                            x2={yearlyChartWidth - yearlyPadRight}
                            y2={y}
                            stroke="currentColor"
                            className="text-slate-100 dark:text-slate-800"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={yearlyPadLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-slate-400 text-[9px] font-mono select-none"
                          >
                            {formatRupiah(val, { compact: true })}
                          </text>
                        </g>
                      );
                    })}

                    {/* Base X Axis */}
                    <line
                      x1={yearlyPadLeft}
                      y1={yearlyChartHeight - yearlyPadBottom}
                      x2={yearlyChartWidth - yearlyPadRight}
                      y2={yearlyChartHeight - yearlyPadBottom}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="1.5"
                    />

                    {/* Dual Bars for each month */}
                    {yearlyStats.monthlyTimeline.map((m, idx) => {
                      const isHovered = hoveredMonth?.month === m.month;
                      const isSelected = selectedMonth === m.month;
                      const slotLeft = yearlyPadLeft + idx * monthSlotWidth;
                      const groupLeft = slotLeft + barGroupOffset;

                      const expHeight = Math.max(m.totalSpent > 0 ? 3 : 0, (m.totalSpent / maxYearlyMonthValue) * yearlyPlotHeight);
                      const expY = yearlyChartHeight - yearlyPadBottom - expHeight;

                      const incHeight = Math.max(m.totalIncome > 0 ? 3 : 0, (m.totalIncome / maxYearlyMonthValue) * yearlyPlotHeight);
                      const incY = yearlyChartHeight - yearlyPadBottom - incHeight;

                      return (
                        <g
                          key={m.month}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredMonth(m)}
                          onMouseLeave={() => setHoveredMonth(null)}
                          onClick={() => {
                            if (onChangeMonth) onChangeMonth(selectedYear, m.month);
                            else setInternalMonth(m.month);
                            setPeriodMode('monthly');
                          }}
                        >
                          {/* Translucent Highlight Column on Hover */}
                          <rect
                            x={slotLeft + 2}
                            y={yearlyPadTop}
                            width={monthSlotWidth - 4}
                            height={yearlyPlotHeight}
                            rx={8}
                            fill="currentColor"
                            className={`transition-colors duration-150 ${
                              isHovered
                                ? 'text-indigo-500/15'
                                : isSelected
                                ? 'text-slate-500/10'
                                : 'text-transparent hover:text-slate-500/5'
                            }`}
                          />

                          {/* Expense Bar (Rose) */}
                          {m.totalSpent > 0 && (
                            <rect
                              x={groupLeft}
                              y={expY}
                              width={yearlyBarWidth}
                              height={expHeight}
                              rx={3}
                              fill="url(#expenseBarGrad)"
                              className={`transition-all duration-200 ${isHovered ? 'filter drop-shadow-[0_2px_4px_rgba(244,63,94,0.4)] scale-y-105' : ''}`}
                            />
                          )}

                          {/* Income Bar (Emerald) */}
                          {m.totalIncome > 0 && (
                            <rect
                              x={groupLeft + yearlyBarWidth + yearlyBarGap}
                              y={incY}
                              width={yearlyBarWidth}
                              height={incHeight}
                              rx={3}
                              fill="url(#incomeBarGrad)"
                              className={`transition-all duration-200 ${isHovered ? 'filter drop-shadow-[0_2px_4px_rgba(16,185,129,0.4)] scale-y-105' : ''}`}
                            />
                          )}

                          {/* Bottom Month Label */}
                          <text
                            x={slotLeft + monthSlotWidth / 2}
                            y={yearlyChartHeight - yearlyPadBottom + 18}
                            textAnchor="middle"
                            className={`text-[10px] select-none transition-colors ${
                              isHovered
                                ? 'fill-indigo-600 dark:fill-indigo-400 font-bold'
                                : isSelected
                                ? 'fill-emerald-600 dark:fill-emerald-400 font-bold'
                                : 'fill-slate-500 dark:fill-slate-400 font-medium'
                            }`}
                          >
                            {m.monthShortName}
                          </text>
                        </g>
                      );
                    })}

                    {/* Trend Line (Spline) connecting Expense Points */}
                    {yearlyTrendLinePath && (
                      <path
                        d={yearlyTrendLinePath}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="url(#yearlyGlow)"
                        className="transition-all duration-300 opacity-90"
                      />
                    )}

                    {/* Trend Points */}
                    {yearlyTrendPoints.map((pt) => {
                      const isHovered = hoveredMonth?.month === pt.month.month;
                      if (pt.month.totalSpent === 0) return null;
                      return (
                        <circle
                          key={pt.month.month}
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5.5 : 3.5}
                          fill="#6366f1"
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 2.5 : 1.5}
                          className="transition-all duration-150 pointer-events-none"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-2">
                <span>Januari {selectedYear}</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">
                  💡 Ketuk salah satu diagram bulan di atas untuk membuka rincian bulanan
                </span>
                <span>Desember {selectedYear}</span>
              </div>
            </div>
          </div>

          {/* GRID KARTU PERFORMA 12 BULAN (Januari - Desember) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Rincian Performa Bulan ke Bulan (12 Bulan)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ringkasan nominal pengeluaran, pemasukan, dan saldo kas bersih setiap bulan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {yearlyStats.monthlyTimeline.map((m) => {
                const hasActivity = m.totalSpent > 0 || m.totalIncome > 0;
                const isSurplus = m.netSavings >= 0;
                const isSelected = selectedMonth === m.month;

                return (
                  <div
                    key={m.month}
                    onClick={() => {
                      if (onChangeMonth) onChangeMonth(selectedYear, m.month);
                      else setInternalMonth(m.month);
                      setPeriodMode('monthly');
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {m.monthName}
                      </span>
                      {hasActivity ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            isSurplus
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isSurplus ? 'Surplus' : 'Defisit'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-medium text-slate-400">Nihil</span>
                      )}
                    </div>

                    {/* Progress bars: Expense (Rose) vs Income (Emerald) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Keluar:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatRupiah(m.totalSpent)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Masuk:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(m.totalIncome)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Net:</span>
                      <span
                        className={`font-mono font-bold ${
                          isSurplus ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatRupiah(m.netSavings)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline pt-0.5">
                      <span>{m.transactionCount} transaksi</span>
                      <span className="flex items-center gap-0.5">
                        <span>Buka</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DISTRIBUSI KATEGORI PENGELUARAN 1 TAHUN & KONTRIBUSI ANGGOTA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown 1 Tahun */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Distribusi Kategori Pengeluaran Tahun {selectedYear}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pos pengeluaran terbesar sepanjang 1 tahun penuh
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {yearlyStats.categoryBreakdown.length} Kategori
                </span>
              </div>

              {yearlyStats.categoryBreakdown.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Tidak ada catatan pengeluaran pada tahun ini.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  {/* SVG Donut */}
                  <div className="relative w-44 h-44 flex-shrink-0">
                    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                      {yearlyDonutSlices.map((slice) => (
                        <path
                          key={slice.categoryId}
                          d={createArc(slice.startAngle, slice.angle, 90, 54)}
                          fill={slice.categoryColor}
                          className="hover:opacity-90 transition-opacity cursor-pointer"
                          onClick={() => {
                            const targetCat = categories.find((c) => c.id === slice.categoryId);
                            if (targetCat) setSelectedCategoryModal(targetCat);
                          }}
                        >
                          <title>{`${slice.categoryName}: ${slice.percentage}% (${formatRupiah(slice.amount)})`}</title>
                        </path>
                      ))}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Total 1 Thn
                      </span>
                      <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                        {formatRupiah(yearlyStats.totalSpent, { compact: true })}
                      </span>
                    </div>
                  </div>

                  {/* Category Clickable List */}
                  <div className="flex-1 w-full space-y-2 max-h-64 overflow-y-auto pr-1">
                    {yearlyStats.categoryBreakdown.map((cat) => {
                      const categoryObj = categories.find((c) => c.id === cat.categoryId);
                      return (
                        <button
                          key={cat.categoryId}
                          type="button"
                          onClick={() => categoryObj && setSelectedCategoryModal(categoryObj)}
                          className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/60 transition-all group cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.categoryColor }}
                              />
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                {cat.categoryName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {formatRupiah(cat.amount)}
                              </span>
                              <span className="text-[10px] text-slate-400 w-10 text-right">
                                {cat.percentage}%
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Member Breakdown 1 Tahun */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Kontribusi Anggota Keluarga Tahun {selectedYear}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proporsi belanja masing-masing anggota selama 1 tahun penuh
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                  {yearlyStats.memberBreakdown.length} Anggota
                </span>
              </div>

              {yearlyStats.memberBreakdown.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Tidak ada catatan anggota pada tahun ini.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {yearlyStats.memberBreakdown.map((mem) => (
                    <div
                      key={mem.memberId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                            style={{ backgroundColor: mem.avatarColor }}
                          >
                            {mem.memberName.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {mem.memberName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatRupiah(mem.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            ({mem.percentage}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, mem.percentage)}%`,
                            backgroundColor: mem.avatarColor,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Category Expense Transactions Detail Drilldown */}
      {selectedCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: selectedCategoryModal.color }}
                >
                  <CategoryIcon name={selectedCategoryModal.icon} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {selectedCategoryModal.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Periode: {periodMode === 'monthly' ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : `Tahun ${selectedYear} (12 Bulan)`} · {categoryTransactions.length} Transaksi
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCategoryModal(null)}
                aria-label="Tutup Detail"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Category Spending Summary */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Pengeluaran Kategori</span>
              <span className="text-base font-bold font-mono text-red-600 dark:text-red-400">
                {formatRupiah(categoryDetailTotal)}
              </span>
            </div>

            {/* Transaction Items List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {categoryTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ada transaksi pengeluaran pada kategori ini untuk {periodMode === 'monthly' ? `bulan ${monthNames[selectedMonth - 1]} ${selectedYear}` : `tahun ${selectedYear}`}.
                </div>
              ) : (
                categoryTransactions.map((tx) => {
                  const member = memberMap.get(tx.memberId);
                  const account = (tx as any).accountId
                    ? accountMap.get((tx as any).accountId)
                    : (tx as any).assetId
                    ? accountMap.get((tx as any).assetId)
                    : undefined;

                  return (
                    <div
                      key={tx.id}
                      className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {member && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5 shadow-xs"
                            style={{ backgroundColor: member.avatarColor || '#3b82f6' }}
                            title={member.name}
                          >
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {tx.description || 'Pengeluaran tanpa keterangan'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{formatIndonesianDate(tx.date, { monthFormat: 'short' })}</span>
                            {account && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium">{account.name}</span>
                              </>
                            )}
                            {member && !isMemberFiltered && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 dark:text-slate-400">{member.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="font-bold font-mono text-red-600 dark:text-red-400">
                          -{formatRupiah(tx.amount)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
