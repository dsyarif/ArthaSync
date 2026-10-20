import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Building2,
  Trash2,
  Edit2,
  HandCoins,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { AssetAccount, DebtPayment, DebtRecord, FamilyGroup } from '../types/finance';
import { calculateDebtSummary, formatIndonesianDate, formatRupiah, getMemberColorTheme } from '../utils/finance';
import { DebtModal } from './DebtModal';
import { DebtPaymentModal } from './DebtPaymentModal';

interface DebtsViewProps {
  debts: DebtRecord[];
  currentGroup: FamilyGroup;
  assets: AssetAccount[];
  onAddDebt: (data: any) => void;
  onUpdateDebt: (id: string, updates: Partial<DebtRecord>) => void;
  onDeleteDebt: (id: string) => void;
  onAddPayment: (debtId: string, payment: any) => void;
  onDeletePayment?: (debtId: string, paymentId: string) => void;
  onUpdatePayment?: (debtId: string, paymentId: string, updates: any) => void;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  debts,
  currentGroup,
  assets,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onAddPayment,
  onDeletePayment,
  onUpdatePayment,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtRecord | null>(null);
  const [editingPayment, setEditingPayment] = useState<DebtPayment | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'bersama' | 'perorangan'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'utang' | 'piutang'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid_partial' | 'paid'>('all');
  const [partyFilter, setPartyFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [memberFilter, setMemberFilter] = useState('all');

  const members = currentGroup.members || [];
  const memMap = new Map(members.map((m) => [m.id, m]));
  const astMap = new Map(assets.map((a) => [a.id, a]));

  const groupDebts = debts.filter((d) => !d.isDeleted && d.groupId === currentGroup.id);
  const summary = calculateDebtSummary(groupDebts);

  // Filter list
  const filteredDebts = groupDebts.filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (partyFilter !== 'all' && d.partyType !== partyFilter) return false;
    const isDebtJoint = d.scope === 'bersama' || d.isJoint === true || d.memberId === 'joint';
    if (scopeFilter === 'bersama' && !isDebtJoint) return false;
    if (scopeFilter === 'perorangan' && isDebtJoint) return false;

    if (memberFilter !== 'all' && d.memberId !== memberFilter && d.otherMemberId !== memberFilter) {
      return false;
    }
    if (statusFilter === 'unpaid_partial' && d.status === 'paid') return false;
    if (statusFilter === 'paid' && d.status !== 'paid') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = d.description.toLowerCase().includes(q);
      const matchOther = (d.otherPersonName || '').toLowerCase().includes(q);
      const matchMem = (memMap.get(d.memberId)?.name || '').toLowerCase().includes(q);
      if (!matchDesc && !matchOther && !matchMem) return false;
    }

    return true;
  });

  const handleOpenAdd = () => {
    setEditingDebt(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setModalOpen(true);
  };

  const handleOpenPayment = (debt: DebtRecord) => {
    setSelectedDebtForPayment(debt);
    setEditingPayment(null);
    setPaymentModalOpen(true);
  };

  const handleOpenEditPayment = (debt: DebtRecord, payment: DebtPayment) => {
    setSelectedDebtForPayment(debt);
    setEditingPayment(payment);
    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-500" />
            <span>Pencatatan Utang & Piutang</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola pinjaman dana antar anggota keluarga maupun dengan pihak luar
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Utang / Piutang</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Piutang (Aset Tagihan) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total Piutang (Hak Tagih)
            </span>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 dark:text-white mt-1">
              {formatRupiah(summary.totalReceivable)}
            </div>
            <span className="text-[10px] text-slate-400">Uang Anda di orang/anggota lain</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Total Utang (Liabilitas / Kewajiban) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Total Utang (Kewajiban Bayar)
            </span>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {formatRupiah(summary.totalPayable)}
            </div>
            <span className="text-[10px] text-slate-400">Kewajiban yang wajib Anda lunasi</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Net Debt Position */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Posisi Bersih (Net Saldo)
            </span>
            <div
              className={`text-lg sm:text-xl font-extrabold font-mono mt-1 ${
                summary.netBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.netBalance >= 0 ? '+' : ''}
              {formatRupiah(summary.netBalance)}
            </div>
            <span className="text-[10px] text-slate-400">
              {summary.unpaidCount} belum lunas · {summary.paidCount} sudah lunas
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan keterangan, nama pihak, atau anggota..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Status Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setStatusFilter('unpaid_partial')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'unpaid_partial'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Belum Lunas ({summary.unpaidCount})
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                Lunas ({summary.paidCount})
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Filter Tipe:</span>

          {/* Tipe: Piutang vs Utang */}
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Semua Tipe
          </button>
          <button
            onClick={() => setTypeFilter('piutang')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              typeFilter === 'piutang'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Piutang</span>
          </button>
          <button
            onClick={() => setTypeFilter('utang')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              typeFilter === 'utang'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Utang</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>

          {/* Pihak: Internal vs External */}
          <button
            onClick={() => setPartyFilter(partyFilter === 'internal' ? 'all' : 'internal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partyFilter === 'internal'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Antar Anggota</span>
          </button>
          <button
            onClick={() => setPartyFilter(partyFilter === 'external' ? 'all' : 'external')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              partyFilter === 'external'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Pihak Luar</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 mx-1">|</span>
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Cakupan:</span>

          {/* Scope: Bersama vs Perorangan */}
          <button
            onClick={() => setScopeFilter(scopeFilter === 'bersama' ? 'all' : 'bersama')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'bersama'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bersama (Keluarga)</span>
          </button>
          <button
            onClick={() => setScopeFilter(scopeFilter === 'perorangan' ? 'all' : 'perorangan')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'perorangan'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Perorangan</span>
          </button>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-3">
        {filteredDebts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Tidak ada data utang atau piutang yang cocok
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Catat pinjaman atau tagihan dengan tombol di bawah untuk mulai memantau pelunasan
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Utang / Piutang Baru</span>
            </button>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const isUtang = debt.type === 'utang';
            const remaining = Math.max(0, debt.amount - (debt.paidAmount || 0));
            const progress = Math.min(100, Math.round(((debt.paidAmount || 0) / debt.amount) * 100));
            const isPaid = debt.status === 'paid' || remaining <= 0;

            const mem = memMap.get(debt.memberId);
            const otherMem = debt.otherMemberId ? memMap.get(debt.otherMemberId) : undefined;
            const mTheme = getMemberColorTheme(mem?.avatarColor || '#3b82f6');
            const linkedAsset = debt.assetId ? astMap.get(debt.assetId) : undefined;

            const isExpanded = expandedPaymentId === debt.id;
            const payments = debt.payments || [];
            const isJointDebt = debt.scope === 'bersama' || debt.isJoint === true || debt.memberId === 'joint';

            const isOverdue = !isPaid && debt.dueDate && debt.dueDate < todayStr;

            return (
              <div
                key={debt.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                style={{
                  borderLeftWidth: '5px',
                  borderLeftColor: isUtang ? '#e11d48' : '#059669',
                }}
              >
                {/* Row 1: Badges, Titles & Amounts */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tipe Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isUtang
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isUtang ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{isUtang ? 'Utang (Wajib Bayar)' : 'Piutang (Hak Tagih)'}</span>
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : debt.status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isPaid ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3" />}
                        <span>{isPaid ? 'Lunas' : debt.status === 'partial' ? 'Dicicil Sebagian' : 'Belum Dibayar'}</span>
                      </span>

                      {/* Scope Badge */}
                      {isJointDebt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Bersama (Keluarga)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span>Perorangan</span>
                        </span>
                      )}

                      {/* Party Badge */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {debt.partyType === 'internal' ? <Users className="w-3 h-3 text-blue-500" /> : <Building2 className="w-3 h-3 text-purple-500" />}
                        <span>{debt.partyType === 'internal' ? 'Antar Anggota' : 'Pihak Luar'}</span>
                      </span>

                      {/* Overdue Warning */}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Lewat Jatuh Tempo</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {debt.description}
                    </h3>

                    {/* Parties involved */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {isJointDebt ? 'Kas Bersama Keluarga' : mem?.name || 'Anggota'}
                      </span>
                      <span>{isUtang ? 'berutang ke' : 'meminjamkan ke'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {debt.partyType === 'internal' ? otherMem?.name || 'Anggota Lain' : debt.otherPersonName || 'Pihak Luar'}
                      </span>
                      {debt.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                            Jatuh tempo: {formatIndonesianDate(debt.dueDate)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Amounts & Quick Pay Button */}
                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0">
                    <div>
                      <div className="text-xs text-slate-400">Sisa Tagihan:</div>
                      <div
                        className={`text-base font-extrabold font-mono ${
                          isPaid ? 'text-slate-400 line-through' : isUtang ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatRupiah(remaining)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Pokok: {formatRupiah(debt.amount)}
                      </div>
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => handleOpenPayment(debt)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                          isUtang ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>{isUtang ? 'Bayar / Cicil' : 'Terima Cicilan'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                    <span>
                      Terbayar: <strong className="text-emerald-600 dark:text-emerald-400">{formatRupiah(debt.paidAmount || 0)}</strong> ({progress}%)
                    </span>
                    <span>
                      {isPaid ? 'Lunas Sepenuhnya' : `Sisa ${formatRupiah(remaining)}`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPaid ? 'bg-emerald-500' : isUtang ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setExpandedPaymentId(isExpanded ? null : debt.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Riwayat Pembayaran ({payments.length})</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(debt)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Data"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus catatan "${debt.description}"?`)) {
                          onDeleteDebt(debt.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Payment History */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 animate-in fade-in">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Rincian Cicilan & Pelunasan:
                    </div>
                    {payments.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400 text-xs">
                        Belum ada riwayat pembayaran yang dicatat.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {payments.map((p, idx) => (
                          <div
                            key={p.id || idx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs border border-slate-100 dark:border-slate-800 group"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {p.note || `Pembayaran / Cicilan #${idx + 1}`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {formatIndonesianDate(p.date)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                +{formatRupiah(p.amount)}
                              </div>

                              {/* Edit Cicilan */}
                              {onUpdatePayment && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPayment(debt, p)}
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Nominal / Tanggal Cicilan"
                                  aria-label="Edit cicilan"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Sekali Hapus Cicilan Langsung Mempengaruhi Transaksi */}
                              {onDeletePayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Hapus catatan cicilan ${formatRupiah(p.amount)} (${formatIndonesianDate(p.date)})?\n\nSaldo rekening dan mutasi transaksi yang terpengaruh akan otomatis dikembalikan!`
                                      )
                                    ) {
                                      onDeletePayment(debt.id, p.id);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Sekali Klik Hapus Cicilan & Kembalikan Saldo/Transaksi"
                                  aria-label="Hapus cicilan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Debt Modal */}
      <DebtModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={(data) => {
          if (editingDebt) {
            onUpdateDebt(editingDebt.id, data);
          } else {
            onAddDebt(data);
          }
        }}
        members={members}
        assets={assets}
        groupId={currentGroup.id}
        editingDebt={editingDebt}
        onDelete={onDeleteDebt}
      />

      {/* Payment / Installment Modal */}
      <DebtPaymentModal
        isOpen={paymentModalOpen}
        onClose={handleClosePaymentModal}
        debt={selectedDebtForPayment}
        assets={assets}
        members={members}
        editingPayment={editingPayment}
        onConfirmPayment={onAddPayment}
        onUpdatePayment={onUpdatePayment}
      />
    </div>
  );
};
