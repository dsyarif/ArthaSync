import { AssetAccount, Category, FamilyMember, PaymentMethod, TransactionType } from '../types/finance';

export interface ParsedTransactionResult {
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  assetId?: string;
  assetName?: string;
  paymentMethod: PaymentMethod;
  memberId: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  confidence: number; // 0 to 1
  source: 'gemini' | 'local_nlp';
  rawInput: string;
}

// Slang numbers in Indonesian
const SLANG_NUMBERS: Record<string, number> = {
  seceng: 1000,
  goceng: 5000,
  cepek: 100000,
  secepek: 100000,
  noban: 20000,
  gocap: 50000,
  sejuta: 1000000,
  sejutaa: 1000000,
  seribu: 1000,
  seratus: 100,
  seperak: 1,
};

// Indonesian text word to number mapping
const INDO_DIGITS: Record<string, number> = {
  nol: 0,
  kosong: 0,
  satu: 1,
  se: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
};

/**
 * Convert Indonesian spelled out words to number
 * e.g. "dua puluh lima ribu" -> 25000
 */
export function parseSpelledIndonesianNumber(text: string): number {
  const words = text.toLowerCase().trim().split(/\s+/);
  let total = 0;
  let currentGroup = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (SLANG_NUMBERS[w] !== undefined) {
      currentGroup += SLANG_NUMBERS[w];
      continue;
    }

    if (INDO_DIGITS[w] !== undefined) {
      currentGroup += INDO_DIGITS[w];
      continue;
    }

    if (w === 'belas') {
      currentGroup += 10;
      continue;
    }

    if (w === 'puluh') {
      currentGroup = (currentGroup === 0 ? 1 : currentGroup) * 10;
      continue;
    }

    if (w === 'ratus' || w === 'seratus') {
      const mult = w === 'seratus' ? 100 : (currentGroup === 0 ? 1 : currentGroup) * 100;
      currentGroup = mult;
      continue;
    }

    if (w === 'ribu' || w === 'seribu') {
      const mult = w === 'seribu' ? 1000 : (currentGroup === 0 ? 1 : currentGroup) * 1000;
      total += mult;
      currentGroup = 0;
      continue;
    }

    if (w === 'juta' || w === 'sejuta') {
      const mult = w === 'sejuta' ? 1000000 : (currentGroup === 0 ? 1 : currentGroup) * 1000000;
      total += mult;
      currentGroup = 0;
      continue;
    }
  }

  return total + currentGroup;
}

/**
 * Extract amount and the matched text segment from user utterance
 */
export function extractAmount(text: string): { amount: number; matchedText: string } {
  const lower = text.toLowerCase().trim();

  // 1. Check slang words standalone (e.g., "cepek", "goceng", "gocap")
  for (const [slang, val] of Object.entries(SLANG_NUMBERS)) {
    const reg = new RegExp(`\\b${slang}\\b`, 'i');
    if (reg.test(lower)) {
      return { amount: val, matchedText: slang };
    }
  }

  // 2. Multipliers with numbers: "25rb", "25 rb", "25 k", "25k", "25 ribu", "1.5jt", "1,5 juta", "2 juta"
  // Handles decimal: 1.5jt, 2,5 jt, 1.5 juta
  const millionRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i;
  const millionMatch = lower.match(millionRegex);
  if (millionMatch) {
    const num = parseFloat(millionMatch[1].replace(',', '.'));
    if (!isNaN(num)) {
      return { amount: Math.round(num * 1_000_000), matchedText: millionMatch[0] };
    }
  }

  const thousandRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu)\b/i;
  const thousandMatch = lower.match(thousandRegex);
  if (thousandMatch) {
    const num = parseFloat(thousandMatch[1].replace(',', '.'));
    if (!isNaN(num)) {
      return { amount: Math.round(num * 1_000), matchedText: thousandMatch[0] };
    }
  }

  // 3. Spelled out words: "dua puluh lima ribu", "tiga ratus ribu", "satu juta lima ratus ribu"
  const spelledRegex = /(?:(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|se|seratus|seribu|sejuta)\s+)+(?:puluh|belas|ratus|ribu|juta)(?:\s+(?:satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|belas|puluh|ratus|ribu))*/i;
  const spelledMatch = lower.match(spelledRegex);
  if (spelledMatch) {
    const parsed = parseSpelledIndonesianNumber(spelledMatch[0]);
    if (parsed > 0) {
      return { amount: parsed, matchedText: spelledMatch[0] };
    }
  }

  // 4. Formatted digits: "Rp 50.000", "50.000", "50000"
  const formattedRegex = /(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,9})\b/i;
  const formattedMatch = lower.match(formattedRegex);
  if (formattedMatch) {
    const cleanNum = parseInt(formattedMatch[1].replace(/\./g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      return { amount: cleanNum, matchedText: formattedMatch[0] };
    }
  }

  return { amount: 0, matchedText: '' };
}

/**
 * Detect transaction type: 'income' or 'expense'
 */
export function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();

  const incomeKeywords = [
    'gaji', 'payroll', 'thr', 'bonus', 'dividen', 'dapat uang', 'terima uang',
    'penghasilan', 'omset', 'omzet', 'hasil jualan', 'jualan', 'transferan masuk',
    'cashback', 'dikasih', 'uang saku masuk', 'cuan', 'pemasukan', 'honor', 'komisi',
    'upah', 'uang makan masuk', 'klaim', 'reimbursement', 'untung'
  ];

  for (const kw of incomeKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
      return 'income';
    }
  }

  return 'expense';
}

/**
 * Comprehensive category keywords mapping
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  makan: [
    'makan', 'minum', 'sarapan', 'siang', 'malam', 'soto', 'bakso', 'nasi', 'ayam', 'bebek',
    'mie', 'indomie', 'martabak', 'geprek', 'padang', 'warteg', 'cafe', 'kafe', 'kopi',
    'starbucks', 'chatime', 'janji jiwa', 'kfc', 'mcd', 'gofood', 'grabfood', 'shopeefood',
    'jajan', 'snack', 'cemilan', 'roti', 'cilok', 'seblak', 'es teh', 'jus', 'boba', 'makanan',
    'minuman', 'resto', 'kuliner'
  ],
  transpor: [
    'bensin', 'pertalite', 'pertamax', 'solar', 'spbu', 'shell', 'gojek', 'goride', 'grab',
    'ojol', 'ongkos', 'taxi', 'taksi', 'kereta', 'krl', 'mrt', 'lrt', 'bus', 'busway',
    'transjakarta', 'parkir', 'tol', 'tambal ban', 'cuci motor', 'cuci mobil', 'ganti oli',
    'servis', 'transport', 'transportasi'
  ],
  belanja: [
    'belanja', 'minimarket', 'indomaret', 'alfamart', 'supermarket', 'pasar', 'sayur',
    'buah', 'beras', 'minyak', 'telur', 'sabun', 'odol', 'sampo', 'skincare', 'baju',
    'kaos', 'celana', 'sepatu', 'sandal', 'shopee', 'tokopedia', 'lazada', 'tiktok shop',
    'mall', 'kebutuhan'
  ],
  tagihan: [
    'listrik', 'pln', 'token', 'air', 'pdam', 'wifi', 'indihome', 'firstmedia', 'biznet',
    'internet', 'kuota', 'pulsa', 'telkomsel', 'indosat', 'xl', 'smartfren', 'bpjs', 'pbb',
    'iuran', 'rt', 'keamanan', 'sampah', 'langganan', 'netflix', 'spotify', 'youtube',
    'icloud', 'tagihan', 'utilitas'
  ],
  hiburan: [
    'bioskop', 'nonton', 'xxi', 'cinema', 'film', 'jalan-jalan', 'liburan', 'staycation',
    'hotel', 'rekreasi', 'wisata', 'wahana', 'tiket', 'karaoke', 'game', 'main',
    'top up game', 'steam', 'ml', 'mobile legends', 'hiburan'
  ],
  kesehatan: [
    'dokter', 'obat', 'apotek', 'kimia farma', 'k24', 'rumah sakit', 'rs', 'klinik',
    'puskesmas', 'vitamin', 'suplemen', 'paracetamol', 'periksa', 'cek darah',
    'dokter gigi', 'kacamata', 'kesehatan', 'medis'
  ],
  pendidikan: [
    'spp', 'ukt', 'kuliah', 'sekolah', 'kursus', 'les', 'buku', 'alat tulis', 'fotocopy',
    'print', 'seragam', 'wisuda', 'pendaftaran', 'pendidikan', 'les privat'
  ],
  donasi: [
    'infaq', 'infak', 'sedekah', 'zakat', 'donasi', 'sumbangan', 'amal', 'panti',
    'masjid', 'gereja', 'sosial'
  ],
  gaji: [
    'gaji', 'payroll', 'salary', 'upah bulanan', 'penerimaan gaji'
  ],
  bonus: [
    'bonus', 'thr', 'insentif', 'komisi', 'reward', 'lembur'
  ],
  bisnis: [
    'omzet', 'omset', 'jualan', 'dagang', 'laba', 'profit', 'hasil jualan', 'invoice',
    'klien', 'projek', 'freelance', 'bisnis'
  ],
  investasi: [
    'dividen', 'reksadana', 'crypto', 'saham', 'bunga', 'yield', 'investasi'
  ],
};

/**
 * Match best category for given text and transaction type
 */
export function matchCategory(
  text: string,
  categories: Category[],
  type: TransactionType
): { categoryId: string; categoryName: string } {
  const lower = text.toLowerCase();

  // Filter categories matching the type
  const eligibleCategories = categories.filter((c) =>
    type === 'expense' ? c.type !== 'income' : c.type === 'income'
  );

  // Fallback category if none matches
  const fallback = eligibleCategories[0] || categories[0] || { id: '', name: 'Lain-lain' };

  // 1. Direct name match (e.g., category name is "Makanan & Minuman" and text has "makanan")
  for (const cat of eligibleCategories) {
    const catNameLower = cat.name.toLowerCase();
    if (lower.includes(catNameLower)) {
      return { categoryId: cat.id, categoryName: cat.name };
    }
  }

  // 2. Keyword match
  let bestScore = 0;
  let bestCategory = fallback;

  for (const cat of eligibleCategories) {
    const catNameLower = cat.name.toLowerCase();
    let score = 0;

    // Check each keyword cluster
    for (const [clusterKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      // Does this cluster belong to this category?
      if (catNameLower.includes(clusterKey) || clusterKey.includes(catNameLower.slice(0, 5))) {
        for (const kw of keywords) {
          if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) {
            score += kw.length > 4 ? 3 : 2;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  return { categoryId: bestCategory.id, categoryName: bestCategory.name };
}

/**
 * Match asset / rekening account from text
 */
export function matchAssetAndPaymentMethod(
  text: string,
  assets: AssetAccount[]
): {
  assetId?: string;
  assetName?: string;
  paymentMethod: PaymentMethod;
  matchedText?: string;
} {
  const lower = text.toLowerCase();

  // 1. Direct match with available asset accounts
  for (const asset of assets) {
    const assetNameLower = asset.name.toLowerCase();
    const instLower = asset.institution ? asset.institution.toLowerCase() : '';

    // Check words like "sea bank", "seabank", "bca", "mandiri", "cash", "bima"
    const nameMatch = new RegExp(`\\b${escapeRegExp(assetNameLower)}\\b`, 'i').test(lower);
    const instMatch = instLower && new RegExp(`\\b${escapeRegExp(instLower)}\\b`, 'i').test(lower);

    // Also match space-compressed (e.g. "seabank" matches "Sea Bank")
    const compressedAssetName = assetNameLower.replace(/\s+/g, '');
    const compressedText = lower.replace(/\s+/g, '');
    const compressedMatch = compressedAssetName.length > 3 && compressedText.includes(compressedAssetName);

    if (nameMatch || instMatch || compressedMatch) {
      let pm: PaymentMethod = 'transfer_bank';
      if (asset.type === 'kas') pm = 'tunai';
      else if (asset.type === 'ewallet') pm = 'qris_ewallet';

      return {
        assetId: asset.id,
        assetName: asset.name,
        paymentMethod: pm,
        matchedText: asset.name,
      };
    }
  }

  // 2. Generic payment method keywords
  if (/\b(?:tunai|cash|uang tunai|uang fisik)\b/i.test(lower)) {
    // Find first cash asset if available
    const cashAsset = assets.find((a) => a.type === 'kas');
    return {
      assetId: cashAsset?.id,
      assetName: cashAsset?.name,
      paymentMethod: 'tunai',
      matchedText: 'tunai',
    };
  }

  if (/\b(?:qris|scan|dana|gopay|ovo|shopeepay|spay|linkaja)\b/i.test(lower)) {
    const ewalletAsset = assets.find((a) => a.type === 'ewallet');
    return {
      assetId: ewalletAsset?.id,
      assetName: ewalletAsset?.name,
      paymentMethod: 'qris_ewallet',
      matchedText: 'qris',
    };
  }

  if (/\b(?:debit|kartu debit|gesek debit)\b/i.test(lower)) {
    return {
      paymentMethod: 'kartu_debit',
      matchedText: 'debit',
    };
  }

  if (/\b(?:kredit|kartu kredit|cc)\b/i.test(lower)) {
    return {
      paymentMethod: 'kartu_kredit',
      matchedText: 'kartu kredit',
    };
  }

  if (/\b(?:transfer|m-banking|mbanking|bank)\b/i.test(lower)) {
    const bankAsset = assets.find((a) => a.type === 'bank');
    return {
      assetId: bankAsset?.id,
      assetName: bankAsset?.name,
      paymentMethod: 'transfer_bank',
      matchedText: 'transfer',
    };
  }

  // Default fallback: first available asset or tunai
  const defaultAsset = assets[0];
  let defaultPm: PaymentMethod = 'tunai';
  if (defaultAsset) {
    if (defaultAsset.type === 'bank') defaultPm = 'transfer_bank';
    else if (defaultAsset.type === 'ewallet') defaultPm = 'qris_ewallet';
  }

  return {
    assetId: defaultAsset?.id,
    assetName: defaultAsset?.name,
    paymentMethod: defaultPm,
  };
}

/**
 * Match family member from text
 */
export function matchMember(
  text: string,
  members: FamilyMember[],
  defaultMemberId?: string
): { memberId: string; matchedName?: string } {
  const lower = text.toLowerCase();

  for (const m of members) {
    const nameLower = m.name.toLowerCase();
    // Split names like "Dwi Syarif" into ["dwi", "syarif"]
    const parts = nameLower.split(/\s+/);

    if (new RegExp(`\\b${escapeRegExp(nameLower)}\\b`, 'i').test(lower)) {
      return { memberId: m.id, matchedName: m.name };
    }

    for (const p of parts) {
      if (p.length >= 3 && new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(lower)) {
        return { memberId: m.id, matchedName: m.name };
      }
    }
  }

  const fallbackId = defaultMemberId || members[0]?.id || '';
  return { memberId: fallbackId };
}

/**
 * Match date from text: "kemarin", "tadi", or formatted dates
 */
export function matchDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (/\b(?:kemarin|semalam)\b/i.test(lower)) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  return today.toISOString().split('T')[0];
}

/**
 * Clean description by removing extracted amounts, accounts, dates, and filler words
 */
export function cleanDescription(
  text: string,
  matchedAmountText?: string,
  matchedAssetText?: string
): string {
  let cleaned = text;

  // Remove filler prefixes
  cleaned = cleaned.replace(/^(?:tolong\s+)?(?:catat|catatkan|masukkan|masukin|tambah|input|tuliskan|tulis)\s+/i, '');

  // Remove matched amount
  if (matchedAmountText) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(matchedAmountText), 'i'), '');
  }

  // Remove account mentions
  if (matchedAssetText) {
    cleaned = cleaned.replace(
      new RegExp(`(?:pakai|lewat|pake|dari|ke|melalui|dengan|via)?\\s*${escapeRegExp(matchedAssetText)}`, 'i'),
      ''
    );
  }

  // Remove standard payment phrases
  cleaned = cleaned.replace(/\b(?:pakai|pake|lewat|via|dengan)?\s*(?:tunai|cash|qris|transfer|bank|debit|kartu kredit)\b/gi, '');
  cleaned = cleaned.replace(/\b(?:kemarin|semalam|tadi|hari ini)\b/gi, '');

  // Clean trailing spaces and punctuation
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/^[\s,.-]+|[\s,.-]+$/g, '').trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return 'Transaksi Baru';
}

/**
 * Helper to escape regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 0ms Local NLP Parser (Offline, Free, Resilient)
 */
export function parseTransactionWithLocalNLP(
  input: string,
  categories: Category[],
  assets: AssetAccount[],
  members: FamilyMember[],
  defaultMemberId?: string
): ParsedTransactionResult {
  const cleanInput = input.trim();
  const { amount, matchedText: matchedAmountText } = extractAmount(cleanInput);
  const type = detectTransactionType(cleanInput);
  const { categoryId, categoryName } = matchCategory(cleanInput, categories, type);
  const { assetId, assetName, paymentMethod, matchedText: matchedAssetText } = matchAssetAndPaymentMethod(cleanInput, assets);
  const { memberId } = matchMember(cleanInput, members, defaultMemberId);
  const date = matchDate(cleanInput);

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const description = cleanDescription(cleanInput, matchedAmountText, matchedAssetText);

  // Confidence calculation based on extracted fields
  let confidence = 0.5;
  if (amount > 0) confidence += 0.3;
  if (assetId) confidence += 0.1;
  if (categoryId) confidence += 0.1;

  return {
    amount,
    type,
    categoryId,
    categoryName,
    assetId,
    assetName,
    paymentMethod,
    memberId,
    description: description || categoryName,
    date,
    time,
    confidence: Math.min(confidence, 1),
    source: 'local_nlp',
    rawInput: cleanInput,
  };
}

/**
 * Retrieve effective Gemini API Key from localStorage or environment variables
 */
export function getEffectiveGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('arthasync_gemini_api_key');
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.GEMINI_API_KEY) ||
    ''
  ).trim();
}

/**
 * Google Gemini AI Parser with fallback to Local NLP
 */
export async function parseTransactionWithGemini(
  input: string,
  categories: Category[],
  assets: AssetAccount[],
  members: FamilyMember[],
  apiKey: string,
  defaultMemberId?: string
): Promise<ParsedTransactionResult> {
  const cleanInput = input.trim();
  const effectiveKey = apiKey || getEffectiveGeminiApiKey();

  // If no API Key or offline, immediately use Local NLP
  if (!effectiveKey || !navigator.onLine) {
    return parseTransactionWithLocalNLP(cleanInput, categories, assets, members, defaultMemberId);
  }

  const categoryContext = categories.map((c) => ({ id: c.id, name: c.name, type: c.type || 'expense' }));
  const assetContext = assets.map((a) => ({ id: a.id, name: a.name, type: a.type }));
  const memberContext = members.map((m) => ({ id: m.id, name: m.name }));

  const prompt = `Anda adalah asisten AI keuangan ArthaSync. Tugas Anda adalah membedah kalimat transaksi bahasa Indonesia menjadi format JSON yang presisi.

Kalimat pengguna: "${cleanInput}"
Tanggal hari ini: ${new Date().toISOString().split('T')[0]}

Daftar Kategori yang tersedia:
${JSON.stringify(categoryContext)}

Daftar Rekening/Dompet yang tersedia:
${JSON.stringify(assetContext)}

Daftar Anggota Keluarga:
${JSON.stringify(memberContext)}

Kembalikan HANYA objek JSON dengan schema berikut (tanpa markdown backtick):
{
  "amount": number, // Nominal integer (contoh: 25000 untuk "25rb" atau "25 ribu", 1500000 untuk "1.5jt")
  "type": "expense" | "income", // Tentukan apakah pengeluaran atau pemasukan
  "categoryId": string, // ID kategori yang paling cocok dari daftar di atas
  "categoryName": string, // Nama kategori yang cocok
  "assetId": string | null, // ID rekening/dompet yang cocok dari daftar di atas, atau null jika tidak disebut
  "assetName": string | null, // Nama rekening/dompet
  "paymentMethod": "tunai" | "transfer_bank" | "qris_ewallet" | "kartu_debit" | "kartu_kredit",
  "memberId": string, // ID anggota keluarga jika disebut namanya, atau kosongkan ""
  "description": string, // Keterangan bersih (misal: "Makan Bakso", buang kata nominal dan cara bayar)
  "date": string // Format YYYY-MM-DD
}`;

  // Multi-tier model cascade: 2.5-flash is ultra-fast (<1.5s), with 3.8-flash and 1.5-flash
  const modelsToTry = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-1.5-flash'];

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`Gemini model ${model} error: ${response.status} ${response.statusText}. Trying next...`);
        continue;
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        continue;
      }

      // Clean JSON markdown if wrapped
      const cleanedJsonStr = candidateText.replace(/^```json/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanedJsonStr);

      const now = new Date();
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Verify category exists
      const validCategory = categories.find((c) => c.id === parsed.categoryId) || categories[0];
      const validAsset = assets.find((a) => a.id === parsed.assetId) || assets[0];
      const validMemberId = members.find((m) => m.id === parsed.memberId)?.id || defaultMemberId || members[0]?.id || '';

      return {
        amount: typeof parsed.amount === 'number' ? parsed.amount : parseInt(parsed.amount, 10) || 0,
        type: parsed.type === 'income' ? 'income' : 'expense',
        categoryId: validCategory?.id || parsed.categoryId || '',
        categoryName: validCategory?.name || parsed.categoryName || 'Lain-lain',
        assetId: validAsset?.id,
        assetName: validAsset?.name,
        paymentMethod: parsed.paymentMethod || (validAsset?.type === 'bank' ? 'transfer_bank' : 'tunai'),
        memberId: validMemberId,
        description: parsed.description || cleanInput,
        date: parsed.date || now.toISOString().split('T')[0],
        time,
        confidence: 0.95,
        source: 'gemini',
        rawInput: cleanInput,
      };
    } catch (modelErr) {
      console.warn(`Gemini attempt with ${model} failed:`, modelErr);
      continue;
    }
  }

  // Graceful fallback to Local NLP if all cloud calls fail
  return parseTransactionWithLocalNLP(cleanInput, categories, assets, members, defaultMemberId);
}

/**
 * Test Gemini API connection
 */
export async function testGeminiConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  const effectiveKey = (apiKey || getEffectiveGeminiApiKey()).trim();
  if (!effectiveKey) {
    return { success: false, message: 'API Key tidak boleh kosong.' };
  }

  const models = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-1.5-flash'];
  let lastErrMsg = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Balas dengan satu kata: "OK"' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          success: true,
          message: `Koneksi ke Google Gemini AI berhasil (${model})! Model aktif & siap digunakan.`,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        lastErrMsg = errData.error?.message || `HTTP ${response.status} ${response.statusText}`;
      }
    } catch (err: any) {
      lastErrMsg = err.message || 'Koneksi internet bermasalah / timeout';
    }
  }

  return { success: false, message: `Gagal terhubung: ${lastErrMsg}` };
}
