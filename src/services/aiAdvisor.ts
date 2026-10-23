import { AssetAccount, Category, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import { calculateMonthlyStats, formatRupiah, getEligibleAssetsForMember } from '../utils/finance';
import { getEffectiveGeminiApiKey } from './aiParser';

export interface FinancialContext {
  groupName: string;
  year: number;
  month: number;
  monthName: string;
  selectedMemberFilter?: string;
  activeMemberName?: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage (e.g. 25)
  avgDailyExpense: number;
  daysInMonth: number;
  totalAssetsBalance: number;
  liquidBalance: number;
  topExpenseCategoryName: string;
  topExpenseCategoryAmount: number;
  topExpenseCategoryPercent: number;
  expenseMoMPercent: number;
  expenseDiff: number;
  categoriesBreakdown: {
    id: string;
    name: string;
    spent: number;
    budget: number;
    percentageOfTotal: number;
    isOverBudget: boolean;
  }[];
  membersBreakdown: {
    id: string;
    name: string;
    spent: number;
    percentage: number;
  }[];
  assetsSummary: {
    name: string;
    type: string;
    institution: string;
    balance: number;
  }[];
  debtSummary: {
    totalUtang: number;
    totalPiutang: number;
    netBalance: number;
  };
  recentTransactions: {
    date: string;
    description: string;
    amount: number;
    type: string;
    category: string;
  }[];
}

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Build rich financial context from current dataset
 * Uses the exact same calculateMonthlyStats calculation as StatisticsView for 100% parity
 */
export function buildFinancialContext(
  transactions: Transaction[] = [],
  categories: Category[] = [],
  currentGroup?: FamilyGroup,
  debts: DebtRecord[] = [],
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1,
  selectedMemberFilter: string = 'all'
): FinancialContext {
  const safeGroup: FamilyGroup = currentGroup || {
    id: 'default',
    name: 'Grup Keuangan',
    members: [],
    assets: [],
    createdAt: Date.now(),
  };

  const isMemberFiltered = selectedMemberFilter && selectedMemberFilter !== 'all';
  const activeMember = safeGroup.members?.find((m) => m.id === selectedMemberFilter);

  // Filter transactions belonging to current group AND member filter from navbar (identical to StatisticsView)
  const groupTransactions = (transactions || []).filter((t) => {
    if (t.isDeleted) return false;
    if (t.groupId && safeGroup.id && t.groupId !== safeGroup.id) return false;
    if (isMemberFiltered && t.memberId !== selectedMemberFilter) return false;
    return true;
  });

  // Calculate current month stats using central finance engine
  const stats = calculateMonthlyStats(
    groupTransactions,
    categories || [],
    safeGroup.members || [],
    year,
    month
  );

  // Calculate previous month stats for MoM comparison
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStats = calculateMonthlyStats(
    groupTransactions,
    categories || [],
    safeGroup.members || [],
    prevYear,
    prevMonth
  );

  const expenseDiff = (stats?.totalSpent || 0) - (prevStats?.totalSpent || 0);
  const expenseMoMPercent = (prevStats?.totalSpent || 0) > 0
    ? Math.round((expenseDiff / prevStats.totalSpent) * 100)
    : 0;

  const savingsRate = (stats?.totalIncome || 0) > 0
    ? Math.round((((stats?.totalIncome || 0) - (stats?.totalSpent || 0)) / stats.totalIncome) * 100)
    : 0;

  // Categories breakdown directly from stats
  const categoriesBreakdown = (stats?.categoryBreakdown || []).map((c) => ({
    id: c.categoryId,
    name: c.categoryName,
    spent: c.amount || 0,
    budget: c.budget || 0,
    percentageOfTotal: Math.round(c.percentage || 0),
    isOverBudget: (c.budget || 0) > 0 && (c.amount || 0) > c.budget,
  }));

  // Members breakdown directly from stats
  const membersBreakdown = (stats?.memberBreakdown || []).map((m) => ({
    id: m.memberId,
    name: m.memberName,
    spent: m.amount || 0,
    percentage: Math.round(m.percentage || 0),
  }));

  // Eligible assets
  const eligibleAssets = isMemberFiltered
    ? getEligibleAssetsForMember(safeGroup.assets || [], selectedMemberFilter)
    : safeGroup.assets || [];

  const totalAssetsBalance = eligibleAssets.reduce((sum, a) => sum + (a.balance || 0), 0);
  const liquidBalance = eligibleAssets
    .filter((a) => a.type === 'kas' || a.type === 'bank' || a.type === 'ewallet')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const assetsSummary = eligibleAssets.map((a) => ({
    name: a.name || 'Aset',
    type: a.type || 'kas',
    institution: a.institution || '',
    balance: a.balance || 0,
  }));

  // Debt summary
  const activeDebts = (debts || []).filter((d) => {
    if (d.isDeleted || d.status === 'paid') return false;
    if (d.groupId && safeGroup.id && d.groupId !== safeGroup.id) return false;
    if (isMemberFiltered && d.memberId !== selectedMemberFilter) return false;
    return true;
  });

  const totalUtang = activeDebts
    .filter((d) => d.type === 'utang')
    .reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0);
  const totalPiutang = activeDebts
    .filter((d) => d.type === 'piutang')
    .reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0);

  // Recent 8 transactions in active month
  const catNameMap = new Map((categories || []).map((c) => [c.id, c.name]));
  const targetPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const recentTransactions = groupTransactions
    .filter((t) => t.date && t.date.startsWith(targetPrefix))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 8)
    .map((t) => ({
      date: t.date,
      description: t.description || 'Transaksi',
      amount: t.amount || 0,
      type: t.type || 'expense',
      category: catNameMap.get(t.categoryId) || 'Lain-lain',
    }));

  return {
    groupName: safeGroup.name || 'Grup Keuangan',
    year,
    month,
    monthName: INDONESIAN_MONTHS[month - 1] || 'Bulan Ini',
    selectedMemberFilter,
    activeMemberName: activeMember ? activeMember.name : 'Semua Anggota',
    totalIncome: stats?.totalIncome || 0,
    totalExpense: stats?.totalSpent || 0,
    netSavings: stats?.netSavings || 0,
    savingsRate,
    avgDailyExpense: stats?.averageDaily || 0,
    daysInMonth: stats?.daysInMonth || 30,
    totalAssetsBalance,
    liquidBalance,
    topExpenseCategoryName: stats?.topExpenseCategory?.categoryName || 'Belum Ada',
    topExpenseCategoryAmount: stats?.topExpenseCategory?.amount || 0,
    topExpenseCategoryPercent: stats?.topExpenseCategory ? Math.round(stats.topExpenseCategory.percentage || 0) : 0,
    expenseMoMPercent,
    expenseDiff,
    categoriesBreakdown,
    membersBreakdown,
    assetsSummary,
    debtSummary: {
      totalUtang,
      totalPiutang,
      netBalance: totalPiutang - totalUtang,
    },
    recentTransactions,
  };
}

/**
 * Local Rule-based Advisor (0ms, Offline, No API Key needed)
 */
export function generateLocalAdvisorResponse(
  question: string,
  ctx: FinancialContext
): string {
  const q = question.toLowerCase();

  // 1. Pengeluaran Makanan / Kuliner
  if (q.includes('makan') || q.includes('kuliner') || q.includes('resto') || q.includes('minum')) {
    const foodCat = ctx.categoriesBreakdown.find((c) =>
      c.name.toLowerCase().includes('makan') || c.name.toLowerCase().includes('kuliner')
    );
    if (!foodCat || foodCat.spent === 0) {
      return `Belum ada catatan pengeluaran kategori Makanan & Minuman untuk bulan **${ctx.monthName} ${ctx.year}**.\n\nTips: Catat pengeluaran makan harian Anda melalui fitur input cepat agar riwayat konsumsi terpantau akurat!`;
    }
    const percent = foodCat.percentageOfTotal;
    const isHigh = percent > 35;
    return `### 🍔 Analisa Pengeluaran Makanan & Minuman (${ctx.monthName} ${ctx.year})
- **Total Pengeluaran Makan**: **${formatRupiah(foodCat.spent)}** (${percent}% dari seluruh pengeluaran)
- **Rata-rata Harian**: Sekitar **${formatRupiah(Math.round(foodCat.spent / ctx.daysInMonth))}** / hari.
${foodCat.budget > 0 ? `- **Batas Anggaran**: ${formatRupiah(foodCat.budget)} (${foodCat.spent > foodCat.budget ? '⚠️ **Melebihi anggaran!**' : '✅ Masih dalam batas aman'})` : '- *Belum ada limit anggaran khusus untuk pos ini.*'}

**Rekomendasi Finansial**:
${isHigh
  ? 'Pos makan memakan lebih dari 35% total pengeluaran Anda. Pertimbangkan untuk memasak di rumah pada hari kerja dan membatasi pemesanan ojol/cafe di akhir pekan untuk menghemat hingga 20-30%.'
  : 'Pengeluaran makanan Anda terkontrol dengan baik di bawah batas wajar (kurang dari 35%). Pertahankan disiplin konsumsi ini!'}`;
  }

  // 2. Anggota Keluarga / Siapa Paling Boros
  if (q.includes('anggota') || q.includes('siapa') || q.includes('boros') || q.includes('keluarga')) {
    if (ctx.membersBreakdown.length === 0) {
      return `Belum ada data transaksi per anggota terdaftar pada filter ini di grup **${ctx.groupName}**.`;
    }
    const topSpender = ctx.membersBreakdown[0];
    const breakdownList = ctx.membersBreakdown
      .map((m) => `- **${m.name}**: ${formatRupiah(m.spent)} (${m.percentage}%)`)
      .join('\n');

    return `### 👥 Perbandingan Pengeluaran per Anggota (${ctx.monthName} ${ctx.year})
${breakdownList}

- **Pengeluaran Terbesar**: Tercatat atas nama **${topSpender.name}** sebesar **${formatRupiah(topSpender.spent)}** (${topSpender.percentage}% dari total pengeluaran).

**Catatan AI**:
Pastikan pengeluaran yang tercatat merupakan kebutuhan bersama keluarga yang telah disepakati atau alokasi pribadi yang sesuai dengan pembagian pos anggaran.`;
  }

  // 3. Utang & Piutang
  if (q.includes('utang') || q.includes('piutang') || q.includes('pinjam') || q.includes('cicilan')) {
    return `### 💳 Ringkasan Utang & Piutang Berjalan
- **Total Utang (Harus Dibayar)**: **${formatRupiah(ctx.debtSummary.totalUtang)}**
- **Total Piutang (Hak Tagih)**: **${formatRupiah(ctx.debtSummary.totalPiutang)}**
- **Posisi Saldo Bersih**: **${formatRupiah(ctx.debtSummary.netBalance)}**

**Saran Finansial**:
${ctx.debtSummary.totalUtang > 0
  ? 'Prioritaskan pelunasan utang yang memiliki jatuh tempo terdekat atau bunga tertinggi. Sisihkan minimal 10-15% pemasukan bulanan untuk akselerasi pelunasan utang.'
  : 'Kondisi finansial Anda bebas dari utang luar yang belum lunas. Pertahankan skor kesehatan kredit ini!'}
${ctx.debtSummary.totalPiutang > 0 ? `\nJangan lupa menindaklanjuti hak tagih piutang sebesar ${formatRupiah(ctx.debtSummary.totalPiutang)} secara berkala.` : ''}`;
  }

  // 4. Rekomendasi Hemat / Menabung / Budget
  if (q.includes('hemat') || q.includes('nabung') || q.includes('menabung') || q.includes('anggaran') || q.includes('budget') || q.includes('rekomendasi') || q.includes('saran')) {
    const overBudgetCats = ctx.categoriesBreakdown.filter((c) => c.isOverBudget);
    const top3Cats = ctx.categoriesBreakdown.slice(0, 3);

    return `### 🎯 Rekomendasi Strategi Finansial & Menabung (${ctx.monthName} ${ctx.year})

#### 1. Evaluasi Rasio 50/30/20:
- **Kebutuhan & Pengeluaran**: ${formatRupiah(ctx.totalExpense)} (${ctx.totalIncome > 0 ? Math.round((ctx.totalExpense / ctx.totalIncome) * 100) : 100}% dari pemasukan).
- **Sisa Tabungan/Surplus**: **${formatRupiah(ctx.netSavings)}** (Rasio tabungan: **${ctx.savingsRate}%**).
${ctx.savingsRate >= 20 ? '✅ Rasio tabungan Anda sangat ideal (di atas 20%).' : '⚠️ Rasio tabungan di bawah 20%. Disarankan menekan pos hiburan dan belanja impulsif.'}

#### 2. Kategori dengan Pengeluaran Terbesar:
${top3Cats.map((c, i) => `${i + 1}. **${c.name}**: ${formatRupiah(c.spent)} (${c.percentageOfTotal}%)`).join('\n')}

${overBudgetCats.length > 0 ? `#### ⚠️ Pos yang Melebihi Anggaran:\n${overBudgetCats.map((c) => `- Pos **${c.name}** melebihi batas (Terpakai: ${formatRupiah(c.spent)} / Batas: ${formatRupiah(c.budget)})`).join('\n')}` : '✅ Seluruh pos pengeluaran masih berada dalam batas anggaran yang ditentukan.'}

#### 3. Tiga Langkah Konkret Bulan Depan:
1. Alokasikan tabungan di awal bulan begitu pemasukan masuk, bukan dari sisa akhir bulan.
2. Tinjau langganan digital / utilitas yang jarang digunakan.
3. Jaga pengeluaran harian rata-rata tetap di bawah **${formatRupiah(ctx.avgDailyExpense)}** per hari.`;
  }

  // 5. Default / Analisa Umum Keuangan
  const topCat = ctx.categoriesBreakdown[0];
  return `### 📊 Ringkasan Eksekutif Keuangan (${ctx.monthName} ${ctx.year})

- **Total Pemasukan**: **${formatRupiah(ctx.totalIncome)}**
- **Total Pengeluaran**: **${formatRupiah(ctx.totalExpense)}**
- **Selisih / Tabungan Bersih**: **${formatRupiah(ctx.netSavings)}** (${ctx.netSavings >= 0 ? 'Surplus ✅' : 'Defisit ⚠️'})
- **Tingkat Tabungan (Savings Rate)**: **${ctx.savingsRate}%**
- **Rata-rata Pengeluaran Harian**: **${formatRupiah(ctx.avgDailyExpense)}** / hari (${ctx.daysInMonth} hari periode)
- **Saldo Kas & Bank Likuid**: **${formatRupiah(ctx.liquidBalance)}**
${topCat ? `- **Pengeluaran Terbesar**: Kategori **${topCat.name}** sebesar **${formatRupiah(topCat.spent)}** (${topCat.percentageOfTotal}%)` : ''}

**Kesimpulan AI**:
${ctx.netSavings >= 0
  ? `Arus kas keluarga Anda dalam kondisi **sehat & positif** dengan surplus sebesar ${formatRupiah(ctx.netSavings)}. Pertahankan pola belanja ini dan tempatkan surplus pada tabungan likuid atau investasi rendah risiko.`
  : `Arus kas Anda mengalami **defisit** sebesar ${formatRupiah(Math.abs(ctx.netSavings))}. Segera evaluasi kategori pengeluaran terbesar dan batasi pengeluaran non-esensial untuk mencegah pengurangan dana darurat.`}`;
}

/**
 * Ask Financial AI (Gemini 2.5 Flash / 3.8 Flash with fallback to Local Advisor)
 */
export async function askFinancialAi(
  question: string,
  context: FinancialContext,
  apiKey?: string
): Promise<{ answer: string; source: 'gemini' | 'local_nlp'; modelUsed?: string }> {
  const effectiveKey = (apiKey || getEffectiveGeminiApiKey()).trim();

  // If no API Key or offline, use smart local advisor
  if (!effectiveKey || !navigator.onLine) {
    return {
      answer: generateLocalAdvisorResponse(question, context),
      source: 'local_nlp',
    };
  }

  const systemInstruction = `Anda adalah "ArthaSync AI Advisor", seorang Certified Financial Planner (CFP) profesional dan penasihat keuangan pribadi keluarga.
Tugas Anda adalah menganalisis data keuangan riil pengguna yang telah terverifikasi sinkron dengan menu statistik, menjawab pertanyaan pengguna secara komprehensif, tajam, ramah, dan solutif.

PANDUAN FORMAT JAWABAN:
1. Gunakan bahasa Indonesia yang bersahabat, profesional, dan mudah dipahami.
2. Gunakan markdown: Heading (###, ####), bullet points (-), dan tabel jika diperlukan.
3. Format setiap nominal rupiah dengan format standar Indonesia (contoh: **Rp 1.500.000**).
4. Angka-angka total pengeluaran, pemasukan, dan rata-rata harus konsisten dengan data ringkasan yang diberikan.
5. Berikan insight kritis, soroti pos yang boros atau membahayakan, dan berikan langkah aksi nyata (actionable advice).
6. Fokus menjawab apa yang ditanyakan pengguna secara presisi dengan data yang disediakan.`;

  const contextJson = JSON.stringify(context, null, 2);
  const prompt = `Berikut adalah data keuangan riil pengguna untuk periode ${context.monthName} ${context.year} pada grup "${context.groupName}" (Filter: ${context.activeMemberName}):

\`\`\`json
${contextJson}
\`\`\`

Pertanyaan / Prompt Pengguna:
"${question}"

Jawablah pertanyaan tersebut berdasarkan data keuangan di atas.`;

  // Prioritaskan Gemini 3.8 Flash sesuai permintaan pengguna, dengan fallback cerdas ke model aktif
  const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.5-flash'];
  let lastErrorMessage = '';

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemInstruction}\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`Gemini advisor model ${model} returned status ${response.status}: ${errorText.slice(0, 150)}`);
        lastErrorMessage = `Model ${model} (${response.status})`;
        continue;
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        continue;
      }

      return {
        answer: reply,
        source: 'gemini',
        modelUsed: model,
      };
    } catch (err: any) {
      console.warn(`Gemini attempt with ${model} failed:`, err?.message || err);
      lastErrorMessage = err?.message || 'Koneksi timeout';
      continue;
    }
  }

  // Graceful fallback to local advisor with clear explanation
  const localAnswer = generateLocalAdvisorResponse(question, context);
  const footnote = lastErrorMessage
    ? `\n\n*(Catatan: Server online Gemini 3.8 Flash sedang mengalami lonjakan antrean/503 atau timeout [${lastErrorMessage}]. Hasil analisa di atas disajikan oleh ArthaSync Smart Local AI secara akurat dari data statistik).*`
    : '';

  return {
    answer: localAnswer + footnote,
    source: 'local_nlp',
  };
}
