import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { StatisticsView } from './components/StatisticsView';
import { CategoriesView } from './components/CategoriesView';
import { FamilyGroupView } from './components/FamilyGroupView';
import { SettingsView } from './components/SettingsView';
import { DebtsView } from './components/DebtsView';
import { TransactionModal } from './components/TransactionModal';
import { TransferModal } from './components/TransferModal';
import { PrintReportModal } from './components/PrintReportModal';
import { BiometricLockScreen } from './components/BiometricLockScreen';
import { BottomNav } from './components/BottomNav';
import { StorageService } from './services/storage';
import { BiometricService } from './services/biometric';
import { NotificationService } from './services/notification';
import {
  Category,
  CloudSyncState,
  DebtRecord,
  FamilyGroup,
  PaymentMethod,
  ReminderSettings,
  SecuritySettings,
  Transaction,
  TransactionType,
} from './types/finance';
import { Plus, WifiOff } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string>('');
  const [syncState, setSyncState] = useState<CloudSyncState>({
    isOnline: true,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    simulatedOffline: false,
    syncError: null,
  });

  // Global Month and Year Filter State (Applied across all views)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Global Member Filter State (Controlled from Navbar dropdown, applied globally)
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');

  // Services States
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(
    NotificationService.getSettings()
  );
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    BiometricService.getSettings()
  );

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('arthasync_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Modals
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [duplicateTransaction, setDuplicateTransaction] = useState<Transaction | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Synchronize dark mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('arthasync_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('arthasync_dark_mode', 'false');
    }
  }, [darkMode]);

  // Initial load and service subscriptions
  useEffect(() => {
    // Initialize services
    StorageService.init();
    NotificationService.init();
    BiometricService.initInactivityListener();

    const loadData = () => {
      setTransactions(StorageService.getTransactions());
      setCategories(StorageService.getCategories());
      setDebts(StorageService.getDebts());
      setGroups(StorageService.getGroups());
      setCurrentGroupId(StorageService.getCurrentGroupId());
      setSyncState(StorageService.getSyncState());
    };

    loadData();

    const unsubStorage = StorageService.subscribe(() => {
      loadData();
    });

    const unsubReminder = NotificationService.subscribe((settings) => {
      setReminderSettings(settings);
    });

    const unsubSecurity = BiometricService.subscribe((settings) => {
      setSecuritySettings(settings);
    });

    return () => {
      unsubStorage();
      unsubReminder();
      unsubSecurity();
    };
  }, []);

  const currentGroup =
    groups.find((g) => g.id === currentGroupId) ||
    groups[0] || {
      id: 'grp-default',
      name: 'Keluarga Utama',
      type: 'keluarga' as const,
      currency: 'IDR',
      monthlyBudget: 15000000,
      updatedAt: 1,
      members: [
        { id: 'mem-1', name: 'Ayah', role: 'kepala_keluarga' as const, avatarColor: '#3b82f6' },
      ],
    };

  // Transaction Actions
  const handleOpenQuickAdd = () => {
    if (!syncState.isOnline) {
      alert('Koneksi internet diperlukan untuk mencatat transaksi baru. Anda sedang dalam Mode Offline (Hanya Lihat).');
      return;
    }
    setEditingTransaction(null);
    setDuplicateTransaction(null);
    setTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    if (!syncState.isOnline) {
      alert('Koneksi internet diperlukan untuk mengedit transaksi. Anda sedang dalam Mode Offline (Hanya Lihat).');
      return;
    }
    setEditingTransaction(tx);
    setDuplicateTransaction(null);
    setTxModalOpen(true);
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    if (!syncState.isOnline) {
      alert('Koneksi internet diperlukan untuk menduplikasi transaksi. Anda sedang dalam Mode Offline (Hanya Lihat).');
      return;
    }
    setDuplicateTransaction(tx);
    setEditingTransaction(null);
    setTxModalOpen(true);
  };

  const handleQuickSaveTransaction = (txData: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    description: string;
    date: string;
    time: string;
    paymentMethod: PaymentMethod;
    assetId?: string;
    memberId: string;
    groupId: string;
  }) => {
    try {
      StorageService.addTransaction(txData);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mencatat transaksi.');
    }
  };

  const handleInlineUpdateTransaction = (id: string, updates: Partial<Transaction>) => {
    try {
      StorageService.updateTransaction(id, updates);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mengubah transaksi.');
    }
  };

  const handleSaveTransaction = (txData: {
    amount: number;
    type: TransactionType;
    categoryId: string;
    description: string;
    date: string;
    time: string;
    paymentMethod: PaymentMethod;
    assetId?: string;
    memberId: string;
    groupId: string;
  }) => {
    try {
      if (editingTransaction) {
        StorageService.updateTransaction(editingTransaction.id, txData);
      } else {
        StorageService.addTransaction(txData);
      }
      setDuplicateTransaction(null);
      setTxModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk menyimpan transaksi.');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    try {
      StorageService.deleteTransaction(id);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk menghapus transaksi.');
    }
  };

  // Transfer Actions
  const handleTransfer = (data: {
    groupId: string;
    fromAssetId: string;
    toAssetId: string;
    amount: number;
    adminFee?: number;
    memberId: string;
    date: string;
    time: string;
    note?: string;
  }) => {
    try {
      return StorageService.transferBetweenAssets(data);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk melakukan transfer saldo.');
    }
  };

  // Debt & Piutang Actions
  const handleAddDebt = (
    debtData: Omit<DebtRecord, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'payments' | 'status'>,
    options?: { affectAssetBalance?: boolean; assetId?: string }
  ) => {
    try {
      StorageService.addDebt(debtData, options);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mencatat utang/piutang.');
    }
  };

  const handleUpdateDebt = (id: string, updates: Partial<DebtRecord>) => {
    try {
      StorageService.updateDebt(id, updates);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mengubah utang/piutang.');
    }
  };

  const handleDeleteDebt = (id: string) => {
    try {
      StorageService.deleteDebt(id);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk menghapus utang/piutang.');
    }
  };

  const handleAddDebtPayment = (
    debtId: string,
    payment: { amount: number; date: string; note?: string; assetId?: string; recipientAssetId?: string },
    affectAssetBalance?: boolean
  ) => {
    try {
      StorageService.addDebtPayment(debtId, payment, affectAssetBalance);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mencatat pembayaran cicilan.');
    }
  };

  const handleDeleteDebtPayment = (debtId: string, paymentId: string) => {
    try {
      StorageService.deleteDebtPayment(debtId, paymentId);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk menghapus pembayaran cicilan.');
    }
  };

  const handleUpdateDebtPayment = (
    debtId: string,
    paymentId: string,
    updates: { amount: number; date: string; note?: string }
  ) => {
    try {
      StorageService.updateDebtPayment(debtId, paymentId, updates);
    } catch (err: any) {
      alert(err.message || 'Koneksi internet diperlukan untuk mengubah pembayaran cicilan.');
    }
  };

  // Category Actions
  const handleAddCategory = (cat: Omit<Category, 'id' | 'updatedAt'>) => {
    StorageService.addCategory(cat);
  };

  const handleUpdateCategory = (id: string, updates: Partial<Category>) => {
    StorageService.updateCategory(id, updates);
  };

  const handleDeleteCategory = (id: string) => {
    StorageService.deleteCategory(id);
  };

  // Group Actions
  const handleSelectGroup = (groupId: string) => {
    StorageService.setCurrentGroupId(groupId);
    setCurrentGroupId(groupId);
  };

  const handleUpdateGroup = (id: string, updates: Partial<FamilyGroup>) => {
    StorageService.updateGroup(id, updates);
  };

  const handleAddGroup = (groupData: Omit<FamilyGroup, 'id' | 'updatedAt'>) => {
    const created = StorageService.addGroup(groupData);
    setCurrentGroupId(created.id);
  };

  const handleDeleteGroup = (groupId: string) => {
    StorageService.deleteGroup(groupId);
  };

  const handleClearAllTransactions = async () => {
    await StorageService.clearAllTransactions();
  };

  const handleResetAllData = async () => {
    await StorageService.resetAllData();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row font-sans transition-colors duration-150">
      {/* Biometric Security Lock Screen Overlay */}
      {securitySettings.isLocked && (
        <BiometricLockScreen onUnlock={() => BiometricService.unlockApp()} />
      )}

      {/* Desktop Left Sidebar Menu Bar (Fixed, never scrolls with content) */}
      <Sidebar
        groups={groups}
        currentGroup={currentGroup}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickAdd={handleOpenQuickAdd}
        onSelectGroup={handleSelectGroup}
        onOpenNewGroupModal={() => setActiveTab('family')}
        syncState={syncState}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        reminderSettings={reminderSettings}
        onOpenSettings={() => setActiveTab('settings')}
      />

      {/* Main Content Area Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        {/* Header: Desktop Top Bar / Mobile Header (Sticky at top, never scrolls away) */}
        <Header
          groups={groups}
          currentGroup={currentGroup}
          syncState={syncState}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onSelectGroup={handleSelectGroup}
          onOpenNewGroupModal={() => setActiveTab('family')}
          reminderSettings={reminderSettings}
          onOpenSettings={() => setActiveTab('settings')}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onQuickAdd={handleOpenQuickAdd}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onChangeMonth={(y, m) => {
            setSelectedYear(y);
            setSelectedMonth(m);
          }}
          selectedMemberFilter={selectedMemberFilter}
          onSelectMemberFilter={setSelectedMemberFilter}
        />

        {/* ONLY THIS MAIN CONTENT IS SCROLLABLE! */}
        <main className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 lg:pb-8">
          <div className="max-w-7xl w-full mx-auto">
            {/* Offline Alert Banner */}
            {!syncState.isOnline && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    <b>Mode Offline (Hanya Lihat):</b> Perangkat tidak terhubung ke internet. Anda hanya dapat melihat data. Koneksi internet diperlukan untuk mencatat atau mengubah transaksi.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => StorageService.triggerCloudSync()}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 cursor-pointer shrink-0"
                >
                  Hubungkan
                </button>
              </div>
            )}
        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            categories={categories}
            currentGroup={currentGroup}
            syncState={syncState}
            onQuickAdd={handleOpenQuickAdd}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateTab={setActiveTab}
            onOpenPrintReport={() => setPrintModalOpen(true)}
            onUpdateGroup={handleUpdateGroup}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedMemberFilter={selectedMemberFilter}
            onSelectMemberFilter={setSelectedMemberFilter}
            onDuplicateTransaction={handleDuplicateTransaction}
            onQuickSaveTransaction={handleQuickSaveTransaction}
            onInlineUpdateTransaction={handleInlineUpdateTransaction}
            onOpenTransferModal={() => setTransferModalOpen(true)}
            debts={debts}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            categories={categories}
            currentGroup={currentGroup}
            onQuickAdd={handleOpenQuickAdd}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenPrintReport={() => setPrintModalOpen(true)}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedMemberFilter={selectedMemberFilter}
            onSelectMemberFilter={setSelectedMemberFilter}
            onDuplicateTransaction={handleDuplicateTransaction}
            onQuickSaveTransaction={handleQuickSaveTransaction}
            onInlineUpdateTransaction={handleInlineUpdateTransaction}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsView
            transactions={transactions}
            categories={categories}
            currentGroup={currentGroup}
            onOpenPrintReport={() => setPrintModalOpen(true)}
            year={selectedYear}
            month={selectedMonth}
            onChangeMonth={(y, m) => {
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            transactions={transactions}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsView
            debts={debts}
            currentGroup={currentGroup}
            assets={currentGroup.assets || []}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onAddPayment={handleAddDebtPayment}
            onDeletePayment={handleDeleteDebtPayment}
            onUpdatePayment={handleUpdateDebtPayment}
          />
        )}

        {activeTab === 'family' && (
          <FamilyGroupView
            groups={groups}
            currentGroup={currentGroup}
            transactions={transactions}
            onSelectGroup={handleSelectGroup}
            onUpdateGroup={handleUpdateGroup}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            reminderSettings={reminderSettings}
            onUpdateReminder={(settings) => NotificationService.saveSettings(settings)}
            securitySettings={securitySettings}
            onUpdateSecurity={(settings) => BiometricService.saveSettings(settings)}
            syncState={syncState}
            currentGroup={currentGroup}
            transactions={transactions}
            categories={categories}
            onOpenPrintReport={() => setPrintModalOpen(true)}
            onClearAllTransactions={handleClearAllTransactions}
            onResetAllData={handleResetAllData}
          />
        )}
          </div>
        </main>

      {/* Transaction Add / Edit / Duplicate Modal Dialog */}
      <TransactionModal
        isOpen={txModalOpen}
        isOnline={syncState.isOnline}
        onClose={() => {
          setTxModalOpen(false);
          setDuplicateTransaction(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        categories={categories}
        members={currentGroup.members || []}
        assets={currentGroup.assets || []}
        groupId={currentGroup.id}
        editingTransaction={editingTransaction}
        duplicateTransaction={duplicateTransaction}
      />

      {/* Transfer Antar Rekening Modal */}
      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        assets={currentGroup.assets || []}
        members={currentGroup.members || []}
        groupId={currentGroup.id}
        onTransfer={handleTransfer}
      />

      {/* Printable / PDF Export Statement Modal */}
      <PrintReportModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        transactions={transactions}
        categories={categories}
        currentGroup={currentGroup}
        year={selectedYear}
        month={selectedMonth}
      />
    </div>

    {/* Modern Bottom Navigation Bar with Center Elevated Add Button */}
    <BottomNav
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onQuickAdd={handleOpenQuickAdd}
    />
  </div>
  );
}
