import React, { useState } from 'react';
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Scale,
  Tag,
  Users,
  Settings,
  Plus,
  Cloud,
  CloudOff,
  RefreshCw,
  Bell,
  Sun,
  Moon,
  Fingerprint,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import { CloudSyncState, FamilyGroup, ReminderSettings } from '../types/finance';
import { StorageService } from '../services/storage';
import { BiometricService } from '../services/biometric';
import { NotificationService } from '../services/notification';

interface SidebarProps {
  groups: FamilyGroup[];
  currentGroup: FamilyGroup;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickAdd: () => void;
  onSelectGroup: (groupId: string) => void;
  onOpenNewGroupModal: () => void;
  syncState: CloudSyncState;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  reminderSettings: ReminderSettings;
  onOpenSettings: (tab?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  currentGroup,
  activeTab,
  setActiveTab,
  onQuickAdd,
  onSelectGroup,
  onOpenNewGroupModal,
  syncState,
  darkMode,
  onToggleDarkMode,
  reminderSettings,
  onOpenSettings,
}) => {
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  const handleManualSync = async () => {
    await StorageService.triggerCloudSync();
  };

  const handleLockScreen = () => {
    BiometricService.lockApp();
  };

  const navItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaksi', icon: Receipt },
    { id: 'statistics', label: 'Statistik & Grafik', icon: BarChart3 },
    { id: 'ai-analysis', label: 'Analisa AI', icon: Sparkles, isAi: true },
    { id: 'debts', label: 'Utang Piutang', icon: Scale },
    { id: 'categories', label: 'Kategori Pos', icon: Tag },
    { id: 'family', label: 'Grup Keluarga', icon: Users },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-30 select-none transition-colors">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shadow-emerald-500/20 shrink-0">
            <img src="/favicon.svg" alt="ArthaSync Logo" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                ArthaSync
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Cloud
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Pencatat Keuangan & Sync
            </p>
          </div>
        </div>

        {/* Group / Family Switcher Dropdown */}
        <div className="relative mt-4">
          <button
            onClick={() => setShowGroupMenu(!showGroupMenu)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition-colors border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{currentGroup?.name || 'Belum Ada Grup'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <span className="text-[10px]">({currentGroup?.members?.length || 0})</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </button>

          {showGroupMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowGroupMenu(false)}
              />
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
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
                  <div className="px-3 py-2 text-xs text-slate-400">Belum ada grup terdaftar</div>
                )}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => {
                    setShowGroupMenu(false);
                    onOpenNewGroupModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Grup Baru</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick Add Button */}
        <button
          onClick={onQuickAdd}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Catat Transaksi</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-l-4 border-emerald-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : item.isAi ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.isAi && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-2xs">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: Cloud Sync Status & Quick Controls */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Cloud Sync Status */}
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {syncState.isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              ) : syncState.isOnline ? (
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                {syncState.isSyncing
                  ? 'Sinkronisasi...'
                  : syncState.isOnline
                  ? 'Cloud Realtime'
                  : 'Mode Offline'}
              </span>
            </div>

            {syncState.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {syncState.pendingCount}
              </span>
            )}
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncState.isSyncing || !syncState.isOnline}
            className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            <span>Sinkronkan</span>
          </button>
        </div>

        {/* Quick Tools: Dark Mode, Reminder, Lock */}
        <div className="flex items-center justify-between px-1 text-slate-500 dark:text-slate-400">
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={() => {
              NotificationService.playReminderChime();
              onOpenSettings('reminder');
            }}
            title="Pengingat Harian"
            className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {reminderSettings.enabled && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </button>

          <button
            onClick={handleLockScreen}
            title="Kunci Aplikasi (Biometrik / PIN)"
            className="p-2 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <Fingerprint className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};
