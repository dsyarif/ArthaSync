import React, { useState } from 'react';
import {
  Wallet,
  Cloud,
  CloudOff,
  RefreshCw,
  Sun,
  Moon,
  Fingerprint,
  ChevronDown,
  Users,
  Check,
  Plus,
} from 'lucide-react';
import { CloudSyncState, FamilyGroup, ReminderSettings } from '../types/finance';
import { StorageService } from '../services/storage';
import { BiometricService } from '../services/biometric';
import { isLocalhost } from '../services/supabase';
import { MonthYearFilterBar } from './MonthYearFilterBar';

interface HeaderProps {
  groups: FamilyGroup[];
  currentGroup: FamilyGroup;
  syncState: CloudSyncState;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenNewGroupModal: () => void;
  reminderSettings: ReminderSettings;
  onOpenSettings: (tab?: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickAdd: () => void;
  selectedYear?: number;
  selectedMonth?: number;
  onChangeMonth?: (year: number, month: number) => void;
  selectedMemberFilter?: string;
  onSelectMemberFilter?: (memberId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  groups,
  currentGroup,
  syncState,
  darkMode,
  onToggleDarkMode,
  onSelectGroup,
  onOpenNewGroupModal,
  activeTab,
  selectedYear,
  selectedMonth,
  onChangeMonth,
  selectedMemberFilter = 'all',
  onSelectMemberFilter,
}) => {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showMemberFilterMenu, setShowMemberFilterMenu] = useState(false);

  const activeMember = currentGroup.members?.find((m) => m.id === selectedMemberFilter);
  const activeFilterLabel =
    selectedMemberFilter === 'joint'
      ? 'Rek. Bersama'
      : activeMember
      ? `Saldo: ${activeMember.name}`
      : 'Semua Saldo';

  const tabTitles: Record<string, string> = {
    dashboard: 'Ringkasan Keuangan',
    transactions: 'Daftar Transaksi',
    statistics: 'Statistik & Grafik',
    'ai-analysis': 'Analisa Keuangan AI',
    debts: 'Utang & Piutang',
    categories: 'Kategori Pos Keuangan',
    family: 'Grup & Anggota Keluarga',
    settings: 'Pengaturan & Keamanan',
  };

  const handleLockScreen = () => {
    BiometricService.lockApp();
  };

  const handleManualSync = async () => {
    await StorageService.triggerCloudSync();
  };

  return (
    <>
      {/* 1. DESKTOP TOP BAR (Only visible on lg screens and up) */}
      <header className="hidden lg:flex items-center justify-between h-16 px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 shrink-0 transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
            {tabTitles[activeTab] || 'Dashboard'}
          </h1>
          <span className="text-xs text-slate-400 font-medium hidden xl:inline">
            · {currentGroup?.name || 'Belum Ada Grup'}
          </span>
          {isLocalhost() && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0"
              title="Mode Local Sandbox: Perubahan localhost tidak mempengaruhi Supabase Production"
            >
              Sandbox (Supabase Aman)
            </span>
          )}
        </div>

        {/* Desktop Global Filters: Month/Year & Filter Saldo */}
        <div className="flex items-center gap-2.5 shrink-0">
          {selectedYear && selectedMonth && onChangeMonth && (
            <MonthYearFilterBar
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onChangeMonth={onChangeMonth}
              className="shrink-0"
            />
          )}

          {/* Global Filter Saldo Dropdown (Desktop) */}
          {onSelectMemberFilter && (
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowMemberFilterMenu(!showMemberFilterMenu);
                  setShowGroupMenu(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-2xl transition-all border shadow-2xs cursor-pointer ${
                  selectedMemberFilter && selectedMemberFilter !== 'all'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Filter Saldo / Anggota Global"
              >
                {selectedMemberFilter === 'joint' ? (
                  <Wallet className="w-3.5 h-3.5" />
                ) : activeMember ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/50"
                    style={{ backgroundColor: activeMember.avatarColor }}
                  />
                ) : (
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className="truncate max-w-[140px]">
                  {activeFilterLabel}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showMemberFilterMenu ? 'rotate-180' : ''
                  } ${selectedMemberFilter && selectedMemberFilter !== 'all' ? 'text-slate-950' : 'text-slate-400'}`}
                />
              </button>

              {showMemberFilterMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-xs"
                    onClick={() => setShowMemberFilterMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Filter Saldo & Anggota
                    </div>

                    <button
                      onClick={() => {
                        onSelectMemberFilter('all');
                        setShowMemberFilterMenu(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                        !selectedMemberFilter || selectedMemberFilter === 'all'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="flex flex-col">
                          <span>Semua Saldo (Gabungan)</span>
                          <span className="text-[10px] text-slate-400">Seluruh rekening keluarga</span>
                        </div>
                      </div>
                      {(!selectedMemberFilter || selectedMemberFilter === 'all') && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        onSelectMemberFilter('joint');
                        setShowMemberFilterMenu(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                        selectedMemberFilter === 'joint'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="flex flex-col">
                          <span>Hanya Rekening Bersama</span>
                          <span className="text-[10px] text-slate-400">Khusus saldo patungan/bersama</span>
                        </div>
                      </div>
                      {selectedMemberFilter === 'joint' && (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </button>

                    <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                    <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Saldo Perorangan
                    </div>

                    {(currentGroup.members || []).map((m) => {
                      const isSelected = selectedMemberFilter === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            onSelectMemberFilter(m.id);
                            setShowMemberFilterMenu(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: m.avatarColor }}
                            />
                            <div className="flex flex-col">
                              <span>Hanya Saldo {m.name}</span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {m.role.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. MOBILE HEADER (< lg screens) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 w-full shrink-0 transition-colors">
        {/* Mobile Top Row: Logo, Group Switcher, Sync & Theme Icons */}
        <div className="flex items-center justify-between h-14 px-3 sm:px-4 gap-2">
          {/* Brand */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-xs shrink-0">
              <img src="/favicon.svg" alt="ArthaSync Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
              ArthaSync
            </span>
            {isLocalhost() && (
              <span
                className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                title="Sandbox: Supabase production aman"
              >
                Sandbox
              </span>
            )}
          </div>

          {/* Group Switcher Button */}
          <div className="relative shrink min-w-0">
            <button
              onClick={() => {
                setShowGroupMenu(!showGroupMenu);
                setShowMemberFilterMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="max-w-[85px] sm:max-w-[120px] truncate">
                {currentGroup?.name || 'Pilih Grup'}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${showGroupMenu ? 'rotate-180' : ''}`} />
            </button>

            {showGroupMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
                  onClick={() => setShowGroupMenu(false)}
                />
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Akun / Grup
                  </div>
                  {groups && groups.length > 0 ? (
                    groups.map((group) => {
                      const isSelected = group.id === currentGroup.id;
                      return (
                        <button
                          key={group.id}
                          onClick={() => {
                            onSelectGroup(group.id);
                            setShowGroupMenu(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex flex-col truncate">
                            <span className="truncate font-semibold">{group.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {group.type?.replace('_', ' ') || 'Grup'} · {group.members?.length || 0} anggota
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3.5 py-2 text-xs text-slate-400">Belum ada grup terdaftar</div>
                  )}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenNewGroupModal();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Grup Baru</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Icons: Sync, Dark Mode, Lock */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleManualSync}
              disabled={syncState.isSyncing}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                syncState.isSyncing
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 border-blue-200'
                  : syncState.isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-200 dark:border-amber-800'
              }`}
              title="Sinkronisasi Cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onToggleDarkMode}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleLockScreen}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Kunci Aplikasi"
            >
              <Fingerprint className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Row: Compact Period & Filter Saldo (NO overflow-hidden, dropdowns float freely!) */}
        {selectedYear && selectedMonth && onChangeMonth && (
          <div className="px-2.5 sm:px-4 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-1.5 relative">
            <MonthYearFilterBar
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onChangeMonth={onChangeMonth}
              className="flex-1 min-w-0"
            />

            {/* Mobile Filter Saldo Dropdown */}
            {onSelectMemberFilter && (
              <div className="relative shrink-0">
                <button
                  onClick={() => {
                    setShowMemberFilterMenu(!showMemberFilterMenu);
                    setShowGroupMenu(false);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition-all border cursor-pointer ${
                    selectedMemberFilter && selectedMemberFilter !== 'all'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {selectedMemberFilter === 'joint' ? (
                    <Wallet className="w-3 h-3" />
                  ) : activeMember ? (
                    <span
                      className="w-2 h-2 rounded-full shrink-0 border border-white/50"
                      style={{ backgroundColor: activeMember.avatarColor }}
                    />
                  ) : (
                    <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span className="truncate max-w-[80px]">
                    {activeFilterLabel}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showMemberFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {showMemberFilterMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs"
                      onClick={() => setShowMemberFilterMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter Saldo & Anggota
                      </div>

                      <button
                        onClick={() => {
                          onSelectMemberFilter('all');
                          setShowMemberFilterMenu(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                          !selectedMemberFilter || selectedMemberFilter === 'all'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold">Semua Saldo (Gabungan)</span>
                            <span className="text-[10px] text-slate-400">Seluruh rekening keluarga</span>
                          </div>
                        </div>
                        {(!selectedMemberFilter || selectedMemberFilter === 'all') && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          onSelectMemberFilter('joint');
                          setShowMemberFilterMenu(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                          selectedMemberFilter === 'joint'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-semibold">Hanya Rekening Bersama</span>
                            <span className="text-[10px] text-slate-400">Khusus saldo patungan/bersama</span>
                          </div>
                        </div>
                        {selectedMemberFilter === 'joint' && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1.5" />
                      <div className="px-3.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Saldo Perorangan
                      </div>

                      {(currentGroup.members || []).map((m) => {
                        const isSelected = selectedMemberFilter === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              onSelectMemberFilter(m.id);
                              setShowMemberFilterMenu(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: m.avatarColor }}
                              />
                              <span className="truncate font-medium">Hanya Saldo {m.name}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
};
