import React from 'react';
import { X, Printer, Download, Calendar, Users, Wallet } from 'lucide-react';
import { Category, FamilyGroup, Transaction } from '../types/finance';
import { calculateMonthlyStats, formatRupiah } from '../utils/finance';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  categories: Category[];
  currentGroup: FamilyGroup;
  year: number;
  month: number;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  categories,
  currentGroup,
  year,
  month,
}) => {
  if (!isOpen) return null;

  const stats = calculateMonthlyStats(
    transactions,
    categories,
    currentGroup.members || [],
    year,
    month
  );

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const monthTitle = `${monthNames[month - 1]} ${year}`;

  const monthlyItems = transactions
    .filter((t) => !t.isDeleted && t.date.startsWith(`${year}-${String(month).padStart(2, '0')}`))
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const memMap = new Map((currentGroup.members || []).map((m) => [m.id, m.name]));
  const astMap = new Map((currentGroup.assets || []).map((a) => [a.id, a.name]));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Controls Bar (hidden during print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              Pratinjau Cetak / Ekspor PDF Laporan Keuangan
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan ke PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans print:p-0 print:m-0">
          {/* Statement Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl font-extrabold tracking-tight text-slate-900">
                  ARTHASYNC
                </span>
                <span className="text-xs px-2 py-0.5 font-bold uppercase rounded bg-slate-100 text-slate-700">
                  Laporan Keuangan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pencatatan Keuangan Harian & Sinkronisasi Cloud
              </p>
              <div className="mt-2 text-xs font-semibold text-slate-700">
                Grup / Akun: <span className="font-bold">{currentGroup.name}</span> (
                {currentGroup.members?.length || 1} Anggota)
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">Periode: {monthTitle}</div>
              <div className="text-xs text-slate-500 mt-1">
                Dicetak pada:{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {/* Key Figures Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">
                Total Pengeluaran
              </div>
              <div className="text-base font-bold text-red-600 mt-1 font-mono">
                {formatRupiah(stats.totalSpent)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">
                Total Pemasukan
              </div>
              <div className="text-base font-bold text-emerald-600 mt-1 font-mono">
                {formatRupiah(stats.totalIncome)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">
                Selisih / Sisa Kas
              </div>
              <div
                className={`text-base font-bold mt-1 font-mono ${
                  stats.netSavings >= 0 ? 'text-slate-900' : 'text-red-600'
                }`}
              >
                {formatRupiah(stats.netSavings)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">
                Rata-rata / Hari
              </div>
              <div className="text-base font-bold text-slate-800 mt-1 font-mono">
                {formatRupiah(stats.averageDaily)}
              </div>
            </div>
          </div>

          {/* Category Summary Table */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              Rekapitulasi Kategori Pengeluaran
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  <th className="py-1.5 font-semibold">Kategori</th>
                  <th className="py-1.5 font-semibold text-center">Jumlah Transaksi</th>
                  <th className="py-1.5 font-semibold text-right">Porsi (%)</th>
                  <th className="py-1.5 font-semibold text-right">Total Pengeluaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.categoryBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 text-center text-slate-400">
                      Belum ada catatan pengeluaran pada periode ini.
                    </td>
                  </tr>
                ) : (
                  stats.categoryBreakdown.map((cat) => (
                    <tr key={cat.categoryId}>
                      <td className="py-1.5 font-medium text-slate-800">{cat.categoryName}</td>
                      <td className="py-1.5 text-center text-slate-600">{cat.count}x</td>
                      <td className="py-1.5 text-right text-slate-600">{cat.percentage}%</td>
                      <td className="py-1.5 text-right font-mono font-semibold text-slate-900">
                        {formatRupiah(cat.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Itemized Transactions Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b border-slate-200 pb-1">
              Daftar Rincian Transaksi ({monthlyItems.length} Catatan)
            </h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  <th className="py-1.5 font-semibold">Tanggal & Waktu</th>
                  <th className="py-1.5 font-semibold">Keterangan</th>
                  <th className="py-1.5 font-semibold">Kategori</th>
                  <th className="py-1.5 font-semibold">Rekening / Aset</th>
                  <th className="py-1.5 font-semibold">Anggota</th>
                  <th className="py-1.5 font-semibold text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      Tidak ada transaksi pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  monthlyItems.map((item) => {
                    const isExpense = item.type === 'expense';
                    return (
                      <tr key={item.id} className="print-break-inside-avoid">
                        <td className="py-1.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {item.date} {item.time}
                        </td>
                        <td className="py-1.5 font-medium text-slate-800 max-w-[180px] truncate">
                          {item.description}
                        </td>
                        <td className="py-1.5 text-slate-600">
                          {catMap.get(item.categoryId) || 'Lainnya'}
                        </td>
                        <td className="py-1.5 text-slate-700 font-medium">
                          {item.assetId ? astMap.get(item.assetId) || '-' : '-'}
                        </td>
                        <td className="py-1.5 text-slate-600">
                          {memMap.get(item.memberId) || 'Anggota'}
                        </td>
                        <td
                          className={`py-1.5 text-right font-mono font-semibold whitespace-nowrap ${
                            isExpense ? 'text-red-600' : 'text-emerald-600'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Statement Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-400">
            <div>Dihasilkan secara otomatis oleh Sistem ArthaSync Keuangan Keluarga</div>
            <div>Dokumen Resmi Ringkasan Kas Pribadi & Grup</div>
          </div>
        </div>
      </div>
    </div>
  );
};
