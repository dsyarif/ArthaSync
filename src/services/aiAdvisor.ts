import { AssetAccount, Category, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import { formatRupiah } from '../utils/finance';

export interface FinancialContext {
  groupName: string;
  year: number;
  month: number;
  monthName: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // percentage (e.g. 25.5)
  avgDailyExpense: number;
  totalAssetsBalance: number;
  liquidBalance: number;
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
 */
export function buildFinancialContext(
  transactions: Transaction[],
  categories: Category[],
  currentGroup: FamilyGroup,
  debts: DebtRecord[],
  year: number,
  month: number
): FinancialContext {
  const activeMonthTransactions = transactions.filter((t) => {
    if (t.isDeleted) return false;
    const [y, m] = t.date.split('-').map(Number);
    return y === year && m === month;
  });

  const totalIncome = activeMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = activeMonthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Days in month
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysPassed = isCurrentMonth ? Math.max(1, now.getDate()) : 30;
  const avgDailyExpense = Math.round(totalExpense / daysPassed);

  // Categories breakdown
  const catMap = new Map<string, number>();
  activeMonthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      catMap.set(t.categoryId, (catMap.get(t.categoryId) || 0) + t.amount);
    });

  const categoriesBreakdown = categories
    .filter((c) => c.type !== 'income')
    .map((c) => {
      const spent = catMap.get(c.id) || 0;
      const budget = c.monthlyBudget || 0;
      return {
        id: c.id,
        name: c.name,
        spent,
        budget,
        percentageOfTotal: totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0,
        isOverBudget: budget > 0 && spent > budget,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  // Members breakdown
  const memMap = new Map<string, number>();
  activeMonthTransactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      memMap.set(t.memberId, (memMap.get(t.memberId) || 0) + t.amount);
    });

  const membersBreakdown = (currentGroup.members || []).map((m) => {
    const spent = memMap.get(m.id) || 0;
    return {
      id: m.id,
      name: m.name,
      spent,
      percentage: totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0,
    };
  }).sort((a, b) => b.spent - a.spent);

  // Assets summary
  const assets = currentGroup.assets || [];
  const totalAssetsBalance = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
  const liquidBalance = assets
    .filter((a) => a.type === 'kas' || a.type === 'bank' || a.type === 'ewallet')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const assetsSummary = assets.map((a) => ({
    name: a.name,
    type: a.type,
    institution: a.institution || '',
    balance: a.balance || 0,
  }));

  // Debt summary
  const activeDebts = debts.filter((d) => !d.isDeleted && d.status !== 'paid');
  const totalUtang = activeDebts
    .filter((d) => d.type === 'utang')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
  const totalPiutang = activeDebts
    .filter((d) => d.type === 'piutang')
    .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

  // Recent 8 transactions
  const catNameMap = new Map(categories.map((c) => [c.id, c.name]));
  const recentTransactions = [...activeMonthTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: catNameMap.get(t.categoryId) || 'Lain-lain',
    }));

  return {
    groupName: currentGroup.name,
    year,
    month,
    monthName: INDONESIAN_MONTHS[month - 1] || 'Bulan',
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    avgDailyExpense,
    totalAssetsBalance,
    liquidBalance,
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
- **Rata-rata Harian**: Sekitar **${formatRupiah(Math.round(foodCat.spent / 30))}** / hari.
${foodCat.budget > 0 ? `- **Batas Anggaran**: ${formatRupiah(foodCat.budget)} (${foodCat.spent > foodCat.budget ? '⚠️ **Melebihi anggaran!**' : '✅ Masih dalam batas aman'})` : '- *Belum ada limit anggaran khusus untuk pos ini.*'}

**Rekomendasi AI**:
${isHigh
  ? 'Pos makan memakan lebih dari 35% total pengeluaran Anda. Pertimbangkan untuk memasak di rumah pada hari kerja dan membatasi pemesanan ojol/cafe di akhir pekan untuk menghemat hingga 20-30%.'
  : 'Pengeluaran makanan Anda terkontrol dengan baik di bawah batas wajar (kurang dari 35%). Pertahankan disiplin konsumsi ini!'}`;
  }

  // 2. Anggota Keluarga / Siapa Paling Boros
  if (q.includes('anggota') || q.includes('siapa') || q.includes('boros') || q.includes('keluarga')) {
    if (ctx.membersBreakdown.length === 0) {
      return `Belum ada data anggota keluarga terdaftar pada grup **${ctx.groupName}**.`;
    }
    const topSpender = ctx.membersBreakdown[0];
    const breakdownList = ctx.membersBreakdown
      .map((m) => `- **${m.name}**: ${formatRupiah(m.spent)} (${m.percentage}%)`)
      .join('\n');

    return `### 👥 Perbandingan Pengeluaran per Anggota (${ctx.monthName} ${ctx.year})
${breakdownList}

- **Pengeluaran Terbesar**: Tercatat atas nama **${topSpender.name}** sebesar **${formatRupiah(topSpender.spent)}** (${topSpender.percentage}% dari total).

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
- **Rata-rata Pengeluaran Harian**: **${formatRupiah(ctx.avgDailyExpense)}** / hari
- **Saldo Kas & Bank Likuid**: **${formatRupiah(ctx.liquidBalance)}**
${topCat ? `- **Pengeluaran Terbesar**: Kategori **${topCat.name}** sebesar **${formatRupiah(topCat.spent)}** (${topCat.percentageOfTotal}%)` : ''}

**Kesimpulan AI**:
${ctx.netSavings >= 0
  ? `Arus kas keluarga Anda dalam kondisi **sehat & positif** dengan surplus sebesar ${formatRupiah(ctx.netSavings)}. Pertahankan pola belanja ini dan tempatkan surplus pada tabungan likuid atau investasi rendah risiko.`
  : `Arus kas Anda mengalami **defisit** sebesar ${formatRupiah(Math.abs(ctx.netSavings))}. Segera evaluasi kategori pengeluaran terbesar dan batasi pengeluaran non-esensial untuk mencegah pengurangan dana darurat.`}`;
}

/**
 * Ask Financial AI (Gemini 3.8 Flash with fallback to Local Advisor)
 */
export async function askFinancialAi(
  question: string,
  context: FinancialContext,
  apiKey?: string
): Promise<{ answer: string; source: 'gemini' | 'local_nlp' }> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  // If no API Key or offline, use smart local advisor
  if (!cleanKey || !navigator.onLine) {
    return {
      answer: generateLocalAdvisorResponse(question, context),
      source: 'local_nlp',
    };
  }

  const systemInstruction = `Anda adalah "ArthaSync AI Advisor", seorang Certified Financial Planner (CFP) profesional dan penasihat keuangan pribadi keluarga.
Tugas Anda adalah menganalisis data keuangan riil pengguna, menjawab pertanyaan pengguna secara komprehensif, tajam, ramah, dan solutif.

PANDUAN FORMAT JAWABAN:
1. Gunakan bahasa Indonesia yang bersahabat, profesional, dan mudah dipahami.
2. Gunakan markdown: Heading (###, ####), bullet points (-), dan tabel jika diperlukan.
3. Format setiap nominal rupiah dengan format standar Indonesia (contoh: **Rp 1.500.000**).
4. Berikan insight kritis, soroti pos yang boros atau membahayakan, dan berikan langkah aksi nyata (actionable advice).
5. Fokus menjawab apa yang ditanyakan pengguna secara presisi dengan data yang disediakan.`;

  const contextJson = JSON.stringify(context, null, 2);
  const prompt = `Berikut adalah data keuangan riil pengguna untuk periode ${context.monthName} ${context.year} pada grup "${context.groupName}":

\`\`\`json
${contextJson}
\`\`\`

Pertanyaan / Prompt Pengguna:
"${question}"

Jawablah pertanyaan tersebut berdasarkan data keuangan di atas.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${cleanKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${systemInstruction}\n\n${prompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Gemini advisor failed with status ${response.status}. Using local advisor.`);
      return {
        answer: generateLocalAdvisorResponse(question, context),
        source: 'local_nlp',
      };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return {
        answer: generateLocalAdvisorResponse(question, context),
        source: 'local_nlp',
      };
    }

    return {
      answer: reply,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('Gemini advisor error, fallback to local:', err);
    return {
      answer: generateLocalAdvisorResponse(question, context),
      source: 'local_nlp',
    };
  }
}
