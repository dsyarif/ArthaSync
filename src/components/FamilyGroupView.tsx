import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  Plus,
  Check,
  X,
  CreditCard,
  DollarSign,
  AlertCircle,
  Building,
  User,
  Split,
} from 'lucide-react';
import { FamilyGroup, FamilyMember, Transaction } from '../types/finance';
import { formatRupiah, getMemberColorTheme, parseRupiahInput } from '../utils/finance';

interface FamilyGroupViewProps {
  groups: FamilyGroup[];
  currentGroup: FamilyGroup;
  transactions: Transaction[];
  onSelectGroup: (groupId: string) => void;
  onUpdateGroup: (id: string, updates: Partial<FamilyGroup>) => void;
  onAddGroup: (group: Omit<FamilyGroup, 'id' | 'updatedAt'>) => void;
  onDeleteGroup?: (id: string) => void;
}

const AVATAR_COLORS = [
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const FamilyGroupView: React.FC<FamilyGroupViewProps> = ({
  groups,
  currentGroup,
  transactions,
  onSelectGroup,
  onUpdateGroup,
  onAddGroup,
  onDeleteGroup,
}) => {
  // Modal states
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  // Edit Group state & modal
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [targetEditGroup, setTargetEditGroup] = useState<FamilyGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupType, setEditGroupType] = useState<FamilyGroup['type']>('keluarga');
  const [editGroupBudgetInput, setEditGroupBudgetInput] = useState('');
  const [editGroupError, setEditGroupError] = useState('');

  // Edit Member state & modal
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<FamilyMember['role']>('anggota');
  const [editMemberColor, setEditMemberColor] = useState(AVATAR_COLORS[0]);
  const [editMemberError, setEditMemberError] = useState('');

  // Member form state (Add)
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<FamilyMember['role']>('anggota');
  const [memberColor, setMemberColor] = useState(AVATAR_COLORS[0]);
  const [memberError, setMemberError] = useState('');

  // Group form state (Add)
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<FamilyGroup['type']>('keluarga');
  const [groupBudgetInput, setGroupBudgetInput] = useState('10.000.000');
  const [groupError, setGroupError] = useState('');

  // Budget edit state
  const [newBudgetInput, setNewBudgetInput] = useState('');

  // Current month transactions for this group
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const groupExpenses = transactions.filter(
    (t) =>
      !t.isDeleted &&
      t.groupId === currentGroup.id &&
      t.type === 'expense' &&
      t.date.startsWith(currentMonthPrefix)
  );

  const totalSpent = groupExpenses.reduce((sum, item) => sum + item.amount, 0);

  // Calculate each member's total spend
  const memberSpending: Record<string, number> = {};
  for (const t of groupExpenses) {
    memberSpending[t.memberId] = (memberSpending[t.memberId] || 0) + t.amount;
  }

  // Handle Add Member
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      setMemberError('Nama anggota tidak boleh kosong.');
      return;
    }

    const newMember: FamilyMember = {
      id: `mem-${Date.now()}`,
      name: memberName.trim(),
      role: memberRole,
      avatarColor: memberColor,
    };

    const updatedMembers = [...(currentGroup.members || []), newMember];
    onUpdateGroup(currentGroup.id, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    setMemberModalOpen(false);
    setMemberName('');
    setMemberError('');
  };

  const handleRemoveMember = (memberId: string) => {
    if ((currentGroup.members || []).length <= 1) {
      alert('Grup harus memiliki setidaknya satu anggota pencatat.');
      return;
    }
    const mem = currentGroup.members.find((m) => m.id === memberId);
    if (confirm(`Hapus anggota "${mem?.name}" dari grup ini?`)) {
      const updatedMembers = currentGroup.members.filter((m) => m.id !== memberId);
      onUpdateGroup(currentGroup.id, {
        members: updatedMembers,
        updatedAt: Date.now(),
      });
    }
  };

  // Handle Open and Save Edit Group
  const handleOpenEditGroup = (grp?: FamilyGroup) => {
    const target = grp || currentGroup;
    setTargetEditGroup(target);
    setEditGroupName(target.name);
    setEditGroupType(target.type);
    setEditGroupBudgetInput(formatRupiah(target.monthlyBudget, { withPrefix: false }));
    setEditGroupError('');
    setEditGroupModalOpen(true);
  };

  const handleSaveEditGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupName.trim()) {
      setEditGroupError('Nama akun / grup tidak boleh kosong.');
      return;
    }
    const budget = parseRupiahInput(editGroupBudgetInput);
    if (budget <= 0) {
      setEditGroupError('Target anggaran bulanan harus lebih dari Rp 0.');
      return;
    }

    const targetId = targetEditGroup ? targetEditGroup.id : currentGroup.id;
    onUpdateGroup(targetId, {
      name: editGroupName.trim(),
      type: editGroupType,
      monthlyBudget: budget,
      updatedAt: Date.now(),
    });
    setEditGroupModalOpen(false);
  };

  const handleDeleteGroupAction = (groupId: string) => {
    if (groups.length <= 1) {
      alert('Tidak dapat menghapus satu-satunya akun keuangan yang tersisa.');
      return;
    }
    const grp = groups.find((g) => g.id === groupId);
    if (
      confirm(
        `PERINGATAN: Apakah Anda yakin ingin menghapus akun/grup "${grp?.name}"? Seluruh riwayat transaksi di akun ini akan dihapus.`
      )
    ) {
      onDeleteGroup?.(groupId);
      setEditGroupModalOpen(false);
    }
  };

  // Handle Open and Save Edit Member
  const handleOpenEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberRole(member.role);
    setEditMemberColor(member.avatarColor || AVATAR_COLORS[0]);
    setEditMemberError('');
    setEditMemberModalOpen(true);
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMemberName.trim()) {
      setEditMemberError('Nama anggota tidak boleh kosong.');
      return;
    }
    if (!editingMember) return;

    const updatedMembers = (currentGroup.members || []).map((m) =>
      m.id === editingMember.id
        ? {
            ...m,
            name: editMemberName.trim(),
            role: editMemberRole,
            avatarColor: editMemberColor,
          }
        : m
    );

    onUpdateGroup(currentGroup.id, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    setEditMemberModalOpen(false);
    setEditingMember(null);
  };

  // Handle Create Group
  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setGroupError('Nama grup tidak boleh kosong.');
      return;
    }

    const budget = parseRupiahInput(groupBudgetInput);

    onAddGroup({
      name: groupName.trim(),
      type: groupType,
      currency: 'IDR',
      monthlyBudget: budget || 5000000,
      members: [
        {
          id: `mem-${Date.now()}`,
          name: 'Saya (Kepala / Admin)',
          role: 'kepala_keluarga',
          avatarColor: AVATAR_COLORS[0],
        },
      ],
    });

    setGroupModalOpen(false);
    setGroupName('');
    setGroupError('');
  };

  // Handle Update Monthly Budget
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parseRupiahInput(newBudgetInput);
    if (budget <= 0) return;

    onUpdateGroup(currentGroup.id, {
      monthlyBudget: budget,
      updatedAt: Date.now(),
    });
    setBudgetModalOpen(false);
  };

  const memberCount = currentGroup.members?.length || 1;
  const equalSplitPerPerson = Math.round(totalSpent / memberCount);

  return (
    <div className="space-y-6 animate-in fade-in pb-28 lg:pb-12">
      {/* Top Banner & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Manajemen Akun Keluarga & Grup
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola pembagian peran, anggota keluarga, dan transparansi pengeluaran bersama
          </p>
        </div>

        <button
          onClick={() => {
            setGroupName('');
            setGroupError('');
            setGroupModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
        >
          <Building className="w-4 h-4" />
          <span>Buat Akun / Grup Baru</span>
        </button>
      </div>

      {/* Account Cards Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {groups.map((grp) => {
          const isSelected = grp.id === currentGroup.id;
          return (
            <button
              key={grp.id}
              onClick={() => onSelectGroup(grp.id)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {grp.type === 'keluarga'
                      ? 'Keluarga'
                      : grp.type === 'kost_grup'
                      ? 'Rekan / Kost'
                      : 'Pribadi'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        Aktif
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditGroup(grp);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                      title={`Edit Profil ${grp.name}`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {grp.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {grp.members?.length || 1} Anggota Terdaftar
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center text-slate-500">
                <span>Anggaran:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatRupiah(grp.monthlyBudget, { compact: true })}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Active Group Management Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {currentGroup.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize font-medium">
                {currentGroup.type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Anggaran bulanan grup:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatRupiah(currentGroup.monthlyBudget)}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenEditGroup(currentGroup)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Akun</span>
            </button>
            <button
              onClick={() => {
                setNewBudgetInput(formatRupiah(currentGroup.monthlyBudget, { withPrefix: false }));
                setBudgetModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Ubah Anggaran
            </button>
            <button
              onClick={() => {
                setMemberName('');
                setMemberError('');
                setMemberModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Anggota</span>
            </button>
          </div>
        </div>

        {/* Members Roster Grid */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Daftar Anggota Keluarga ({currentGroup.members?.length || 0})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(currentGroup.members || []).map((member) => {
              const spent = memberSpending[member.id] || 0;
              const percent = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
              const mTheme = getMemberColorTheme(member.avatarColor);

              return (
                <div
                  key={member.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  style={{ borderLeftWidth: '4px', borderLeftColor: member.avatarColor }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: member.avatarColor }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        {member.name}
                      </h3>
                      <div className="mt-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold border capitalize ${mTheme.bgLight} ${mTheme.text} ${mTheme.borderLight}`}
                        >
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                        {formatRupiah(spent)} ({percent}%)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditMember(member)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                      title="Edit Anggota"
                      aria-label={`Edit profil anggota ${member.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {currentGroup.members.length > 1 && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                        title="Hapus Anggota"
                        aria-label={`Hapus anggota ${member.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bill Split & Contribution Calculator Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Split className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Simulasi Patungan & Pembagian Pengeluaran
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 text-center sm:text-left">
              <div>
                Total Pengeluaran Bulan Ini:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {formatRupiah(totalSpent)}
                </strong>
              </div>
              <div className="text-slate-400 text-[11px]">
                Jika dibagi rata kepada {memberCount} anggota keluarga / penghuni kost:
              </div>
            </div>

            <div className="text-center sm:text-right">
              <div className="text-xs text-slate-400">Rata-rata per Orang:</div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatRupiah(equalSplitPerPerson)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Member Modal */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Anggota Keluarga
              </h2>
              <button
                onClick={() => setMemberModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {memberError && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{memberError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Anggota *
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Contoh: Ayah, Ibu, Kakak, Budi"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Hubungan
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="kepala_keluarga">Kepala Keluarga / Pengelola</option>
                  <option value="pasangan">Pasangan / Istri / Suami</option>
                  <option value="anak">Anak</option>
                  <option value="anggota">Anggota / Rekan Kost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Warna Avatar
                </label>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setMemberColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                    >
                      {memberColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMemberModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Buat Akun / Grup Baru
              </h2>
              <button
                onClick={() => setGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {groupError && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{groupError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Akun / Grup *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Contoh: Keluarga Bandung, Kost Melati"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Grup
                </label>
                <select
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="keluarga">Keluarga</option>
                  <option value="kost_grup">Kost / Rekan Serumah</option>
                  <option value="pribadi">Dompet Pribadi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Anggaran Bulanan (IDR)
                </label>
                <input
                  type="text"
                  value={groupBudgetInput}
                  onChange={(e) => {
                    const num = parseRupiahInput(e.target.value);
                    setGroupBudgetInput(formatRupiah(num, { withPrefix: false }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Buat Grup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Budget Modal */}
      {budgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Ubah Batas Anggaran Grup
              </h2>
              <button
                onClick={() => setBudgetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batas Anggaran Bulanan (Rupiah)
                </label>
                <input
                  type="text"
                  value={newBudgetInput}
                  onChange={(e) => {
                    const num = parseRupiahInput(e.target.value);
                    setNewBudgetInput(formatRupiah(num, { withPrefix: false }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Perbarui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {editGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Profil Akun / Grup
              </h2>
              <button
                onClick={() => setEditGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editGroupError && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{editGroupError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditGroup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Akun / Grup *
                </label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Akun
                </label>
                <select
                  value={editGroupType}
                  onChange={(e) => setEditGroupType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="keluarga">Keluarga</option>
                  <option value="kost_grup">Kost / Rekan Serumah</option>
                  <option value="pribadi">Dompet Pribadi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Anggaran Bulanan (IDR)
                </label>
                <input
                  type="text"
                  value={editGroupBudgetInput}
                  onChange={(e) => {
                    const num = parseRupiahInput(e.target.value);
                    setEditGroupBudgetInput(formatRupiah(num, { withPrefix: false }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {groups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGroupAction(targetEditGroup ? targetEditGroup.id : currentGroup.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Akun</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditGroupModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Edit Profil Anggota Keluarga
              </h2>
              <button
                onClick={() => {
                  setEditMemberModalOpen(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editMemberError && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{editMemberError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Anggota *
                </label>
                <input
                  type="text"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  placeholder="Contoh: Ayah, Ibu, Adik"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Hubungan
                </label>
                <select
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  <option value="kepala_keluarga">Kepala Keluarga / Pengelola</option>
                  <option value="pasangan">Pasangan / Istri / Suami</option>
                  <option value="anak">Anak</option>
                  <option value="anggota">Anggota / Rekan Kost</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Warna Identitas Anggota
                </label>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditMemberColor(c)}
                      style={{ backgroundColor: c }}
                      className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    >
                      {editMemberColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditMemberModalOpen(false);
                    setEditingMember(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
