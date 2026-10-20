import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Plus,
  BarChart3,
  Users,
  Tag,
  Settings,
  MoreHorizontal,
  ChevronUp,
  Scale,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onQuickAdd,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isMoreTabActive = ['debts', 'categories', 'family', 'settings'].includes(activeTab);

  return (
    <>
      {/* Quick More Menu Popover / Sheet */}
      {showMoreMenu && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="lg:hidden fixed bottom-20 right-4 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-bottom-5">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Menu Lainnya
            </div>

            <button
              onClick={() => {
                setActiveTab('debts');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Utang & Piutang</div>
                <div className="text-[10px] text-slate-400 font-normal">Pinjaman keluarga & rekan</div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('family');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'family'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Grup & Akun Keluarga</div>
                <div className="text-[10px] text-slate-400 font-normal">Kelola anggota & peran</div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('categories');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Kategori Pengeluaran</div>
                <div className="text-[10px] text-slate-400 font-normal">Pos anggaran & limit</div>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Pengaturan & Keamanan</div>
                <div className="text-[10px] text-slate-400 font-normal">Sidik jari, pengingat, sync</div>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Main Modern Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Menu Bawah"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.4)]"
      >
        <div className="max-w-lg mx-auto px-4 h-18 sm:h-20 flex items-center justify-between relative">
          {/* Tab 1: Ringkasan */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all ${
              activeTab === 'dashboard'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Ringkasan</span>
          </button>

          {/* Tab 2: Transaksi */}
          <button
            onClick={() => {
              setActiveTab('transactions');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all ${
              activeTab === 'transactions'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'transactions' ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Transaksi</span>
          </button>

          {/* Center Elevated Action Button (Tombol Tambah di Tengah) */}
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <button
              onClick={onQuickAdd}
              aria-label="Catat Transaksi Pengeluaran Baru"
              className="-top-5 absolute flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/40 border-4 border-slate-50 dark:border-slate-950 transition-all duration-200 hover:scale-110 active:scale-95 hover:shadow-emerald-500/60 cursor-pointer group"
            >
              <Plus className="w-7 h-7 stroke-[2.8] transition-transform group-hover:rotate-90 duration-300" />
            </button>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-7 tracking-tight">
              Catat
            </span>
          </div>

          {/* Tab 4: Statistik */}
          <button
            onClick={() => {
              setActiveTab('statistics');
              setShowMoreMenu(false);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all ${
              activeTab === 'statistics'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'statistics' ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">Statistik</span>
          </button>

          {/* Tab 5: Menu / Lainnya */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            aria-label="Menu Tambahan dan Akun"
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative ${
              isMoreTabActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold scale-105'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${isMoreTabActive ? 'bg-emerald-50 dark:bg-emerald-950/50' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[11px] mt-0.5 tracking-tight font-medium">
              {activeTab === 'family'
                ? 'Keluarga'
                : activeTab === 'categories'
                ? 'Kategori'
                : activeTab === 'settings'
                ? 'Pengaturan'
                : 'Lainnya'}
            </span>
            {isMoreTabActive && (
              <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
