import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  Users,
  Printer,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Category, FamilyGroup, Transaction } from '../types/finance';
import { calculateMonthlyStats, formatRupiah, generateCsvData } from '../utils/finance';
import { CategoryIcon } from './CategoryIcon';

interface StatisticsViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentGroup: FamilyGroup;
  onOpenPrintReport: () => void;
  year?: number;
  month?: number;
  onChangeMonth?: (year: number, month: number) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  transactions,
  categories,
  currentGroup,
  onOpenPrintReport,
  year,
  month,
  onChangeMonth,
}) => {
  const currentDate = new Date();
  const [internalYear, setInternalYear] = useState(currentDate.getFullYear());
  const [internalMonth, setInternalMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [hoveredDay, setHoveredDay] = useState<{ day: number; amount: number } | null>(null);

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

  // Filter transactions belonging to current group
  const groupTransactions = transactions.filter((t) => t.groupId === currentGroup.id);

  const stats = calculateMonthlyStats(
    groupTransactions,
    categories,
    currentGroup.members || [],
    selectedYear,
    selectedMonth
  );

  // Highest daily expense
  const maxDayExpense = Math.max(...stats.dailyTimeline.map((d) => d.amount), 0);
  const highestDay = stats.dailyTimeline.find((d) => d.amount === maxDayExpense && d.amount > 0);

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

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Month Selector Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            aria-label="Bulan Sebelumnya"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
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
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenPrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF Statistik</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Total Pengeluaran
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {formatRupiah(stats.totalSpent)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Bulan {monthNames[selectedMonth - 1]}</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Total Pemasukan
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(stats.totalIncome)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Arus kas masuk</span>
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

      {/* Visual Chart 1: Daily Expense Timeline (Bar Chart) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Grafik Pengeluaran Harian Sepanjang Bulan</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualisasi pengeluaran setiap hari di bulan {monthNames[selectedMonth - 1]}{' '}
              {selectedYear}
            </p>
          </div>
          {hoveredDay && (
            <div className="text-right text-xs">
              <span className="text-slate-400">Tgl {hoveredDay.day}: </span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(hoveredDay.amount)}
              </span>
            </div>
          )}
        </div>

        {/* Bar Chart Canvas */}
        <div className="relative pt-4 pb-2">
          <div className="h-52 flex items-end gap-1 sm:gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
            {stats.dailyTimeline.map((item) => {
              const maxVal = Math.max(maxDayExpense, 100000);
              const heightPercent =
                item.amount > 0 ? Math.max(6, Math.round((item.amount / maxVal) * 100)) : 3;

              const isMax = item.amount === maxDayExpense && maxDayExpense > 0;

              return (
                <div
                  key={item.day}
                  onMouseEnter={() => setHoveredDay(item)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setHoveredDay(hoveredDay?.day === item.day ? null : item)}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                >
                  {/* Tooltip on Hover / Tap */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-20 font-mono">
                    Tgl {item.day}: {formatRupiah(item.amount)}
                  </div>

                  <div
                    className={`w-full rounded-t transition-all group-hover:brightness-110 ${
                      isMax
                        ? 'bg-red-500'
                        : item.amount > 0
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[9px] sm:text-[10px] text-slate-400 mt-1">
                    <span className="sm:hidden">{item.day === 1 || item.day % 5 === 0 ? item.day : ''}</span>
                    <span className="hidden sm:inline">{item.day === 1 || item.day % 2 === 0 ? item.day : ''}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
            <span>Tanggal 1</span>
            <span>Rata-rata: {formatRupiah(stats.averageDaily)} / hari</span>
            <span>Tanggal {stats.daysInMonth}</span>
          </div>
        </div>
      </div>

      {/* Visual Chart 2 & 3: Category Donut & Family Member Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut + List */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Distribusi Kategori Pengeluaran</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Porsi pengeluaran berdasarkan pos anggaran
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
                      className="hover:opacity-90 transition-opacity"
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

              {/* Category List */}
              <div className="flex-1 w-full space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {stats.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.categoryColor }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
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
                      </div>
                    </div>
                    {/* Budget vs Actual mini progress */}
                    {cat.budget > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
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
                  </div>
                ))}
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
                Transparansi kontribusi dan pembagian pengeluaran keluarga
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
              <div className="space-y-3">
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
    </div>
  );
};
