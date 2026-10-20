import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

interface MonthYearFilterBarProps {
  selectedYear: number;
  selectedMonth: number; // 1 - 12
  onChangeMonth: (year: number, month: number) => void;
  className?: string;
}

export const MonthYearFilterBar: React.FC<MonthYearFilterBarProps> = ({
  selectedYear,
  selectedMonth,
  onChangeMonth,
  className = '',
}) => {
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const now = new Date();
  const currentRealYear = now.getFullYear();
  const currentRealMonth = now.getMonth() + 1;
  const isCurrentMonth = selectedYear === currentRealYear && selectedMonth === currentRealMonth;

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onChangeMonth(selectedYear - 1, 12);
    } else {
      onChangeMonth(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onChangeMonth(selectedYear + 1, 1);
    } else {
      onChangeMonth(selectedYear, selectedMonth + 1);
    }
  };

  const handleGoToCurrentMonth = () => {
    onChangeMonth(currentRealYear, currentRealMonth);
  };

  const availableYears = [
    currentRealYear - 2,
    currentRealYear - 1,
    currentRealYear,
    currentRealYear + 1,
    currentRealYear + 2,
  ];

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors ${className}`}
    >
      {/* Month Navigation Prev */}
      <button
        type="button"
        onClick={handlePrevMonth}
        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        title="Bulan Sebelumnya"
        aria-label="Bulan Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Middle: Month & Year Selectors */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <Calendar className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Periode:</span>
        </div>

        {/* Month Dropdown */}
        <select
          value={selectedMonth}
          onChange={(e) => onChangeMonth(selectedYear, parseInt(e.target.value, 10))}
          className="px-2 sm:px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {monthNames.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>

        {/* Year Dropdown */}
        <select
          value={selectedYear}
          onChange={(e) => onChangeMonth(parseInt(e.target.value, 10), selectedMonth)}
          className="px-2 sm:px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>

        {/* Current Month Shortcut Pill */}
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleGoToCurrentMonth}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
            title="Kembali ke Bulan Berjalan"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden md:inline">Bulan Ini</span>
          </button>
        )}
      </div>

      {/* Month Navigation Next */}
      <button
        type="button"
        onClick={handleNextMonth}
        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        title="Bulan Berikutnya"
        aria-label="Bulan Berikutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
