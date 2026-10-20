import React, { useState } from 'react';
import {
  Wallet,
  Cloud,
  CloudOff,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Fingerprint,
  ChevronDown,
  Users,
  Check,
  Plus,
  WifiOff,
} from 'lucide-react';
import { CloudSyncState, FamilyGroup, ReminderSettings } from '../types/finance';
import { StorageService } from '../services/storage';
import { BiometricService } from '../services/biometric';
import { NotificationService } from '../services/notification';
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
  reminderSettings,
  onOpenSettings,
  activeTab,
  setActiveTab,
  onQuickAdd,
  selectedYear,
  selectedMonth,
  onChangeMonth,
  selectedMemberFilter = 'all',
  onSelectMemberFilter,
}) => {
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showSyncMenu, setShowSyncMenu] = useState(false);
  const [showMemberFilterMenu, setShowMemberFilterMenu] = useState(false);

  const activeMember = currentGroup.members?.find((m) => m.id === selectedMemberFilter);
  const activeFilterLabel =
    selectedMemberFilter === 'joint'
      ? 'Rek. Bersama'
      : activeMember
      ? `Saldo: ${activeMember.name}`
      : 'Semua Saldo';

  const handleManualSync = async () => {
    await StorageService.triggerCloudSync();
  };

  const handleLockScreen = () => {
    BiometricService.lockApp();
  };

  const navItems = [
    { id: 'dashboard', label: 'Ringkasan' },
    { id: 'transactions', label: 'Transaksi' },
    { id: 'statistics', label: 'Statistik & Grafik' },
    { id: 'debts', label: 'Utang Piutang' },
    { id: 'categories', label: 'Kategori' },
    { id: 'family', label: 'Grup Keluarga' },
    { id: 'settings', label: 'Pengaturan' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                  ArthaSync
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Cloud
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Pencatat Pengeluaran & Sinkronisasi
              </p>
            </div>
          </div>

          {/* Group / Family Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
              aria-label="Pilih akun atau grup keluarga"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="max-w-[90px] sm:max-w-[160px] truncate font-bold text-slate-800 dark:text-slate-100">
                {currentGroup.name}
              </span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                ({currentGroup.members?.length || 1})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showGroupMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowGroupMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pilih Akun / Grup
                  </div>
                  {groups.map((group) => {
                    const isSelected = group.id === currentGroup.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => {
                          onSelectGroup(group.id);
                          setShowGroupMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{group.name}</span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {group.type === 'keluarga'
                              ? 'Keluarga'
                              : group.type === 'kost_grup'
                              ? 'Grup Rekan / Kost'
                              : 'Akun Pribadi'}{' '}
                            · {group.members.length} anggota
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      setShowGroupMenu(false);
                      onOpenNewGroupModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Grup / Keluarga Baru</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Top Actions: Sync Status, Reminder, Dark Mode, Quick Lock */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Cloud Sync Status Indicator */}
            <div className="relative">
              <button
                onClick={() => setShowSyncMenu(!showSyncMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  syncState.isSyncing
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900'
                    : syncState.isOnline
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
                title="Status Sinkronisasi Cloud"
                aria-label="Status Sinkronisasi Cloud"
              >
                {syncState.isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : syncState.isOnline ? (
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span className="hidden md:inline">
                  {syncState.isSyncing
                    ? 'Sinkronisasi...'
                    : syncState.isOnline
                    ? 'Cloud Realtime'
                    : 'Mode Offline'}
                </span>
                {syncState.pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                    {syncState.pendingCount}
                  </span>
                )}
              </button>

              {showSyncMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSyncMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        Status Sinkronisasi Cloud
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          syncState.isOnline
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {syncState.isOnline ? 'Terhubung' : 'Offline'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Antrian Offline:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {syncState.pendingCount} transaksi
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Terakhir Sinkron:</span>
                        <span className="font-medium">
                          {syncState.lastSyncedAt
                            ? new Date(syncState.lastSyncedAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : 'Belum pernah'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                      <button
                        onClick={handleManualSync}
                        disabled={syncState.isSyncing || !syncState.isOnline}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                        />
                        <span>Sinkronkan Sekarang</span>
                      </button>

                      <button
                        onClick={() => {
                          StorageService.toggleSimulatedOffline();
                          setShowSyncMenu(false);
                        }}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                          syncState.simulatedOffline
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <WifiOff className="w-3.5 h-3.5" />
                        <span>
                          {syncState.simulatedOffline
                            ? 'Matikan Simulasi Offline'
                            : 'Uji Coba Mode Offline'}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reminder Bell quick trigger */}
            <button
              onClick={() => {
                NotificationService.playReminderChime();
                onOpenSettings('reminder');
              }}
              title={`Pengingat Harian (${reminderSettings.enabled ? reminderSettings.time : 'Nonaktif'})`}
              aria-label="Pengingat Harian"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {reminderSettings.enabled && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              aria-label="Toggle Mode Gelap/Terang"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Biometric Quick Lock */}
            <button
              onClick={handleLockScreen}
              title="Kunci Aplikasi (Keamanan Sidik Jari / PIN)"
              aria-label="Kunci Aplikasi Sekarang"
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Month/Year & Saldo Member Filter Bar across all views */}
      {selectedYear && selectedMonth && onChangeMonth && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/70 px-3 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5">
              <MonthYearFilterBar
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onChangeMonth={onChangeMonth}
                className="shrink-0"
              />

              {/* Global Filter Saldo Dropdown */}
              {onSelectMemberFilter && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowMemberFilterMenu(!showMemberFilterMenu)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-2xl transition-all border shadow-2xs cursor-pointer ${
                      selectedMemberFilter && selectedMemberFilter !== 'all'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Filter Saldo / Anggota Global"
                    aria-label="Filter Saldo / Anggota Global"
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
                    <span className="truncate max-w-[105px] sm:max-w-[150px]">
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
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMemberFilterMenu(false)}
                      />
                      <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Filter Saldo & Anggota
                        </div>

                        {/* Option: Semua Saldo */}
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

                        {/* Option: Rekening Bersama */}
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

                        {/* Individual Members */}
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

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Desktop Quick Add Button */}
              <button
                onClick={onQuickAdd}
                className="ml-2 flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Catat Transaksi Baru"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Catat Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
