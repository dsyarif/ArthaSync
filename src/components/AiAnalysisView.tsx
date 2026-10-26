import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AssetAccount, Category, DebtRecord, FamilyGroup, Transaction } from '../types/finance';
import { buildFinancialContext, askFinancialAi, FinancialContext } from '../services/aiAdvisor';
import { getEffectiveGeminiApiKey } from '../services/aiParser';
import { formatRupiah } from '../utils/finance';

interface AiAnalysisViewProps {
  transactions: Transaction[];
  categories: Category[];
  currentGroup: FamilyGroup;
  debts?: DebtRecord[];
  selectedYear: number;
  selectedMonth: number;
  selectedMemberFilter?: string;
  onNavigateSettings?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  source?: 'gemini' | 'local_nlp';
  modelUsed?: string;
  timestamp: string;
}

const PRESET_PROMPTS = [
  { label: '📊 Ringkasan Kesehatan Finansial', prompt: 'Berikan ringkasan dan analisis kesehatan keuangan saya bulan ini.' },
  { label: '📅 Analisis 1 Tahun (Bulan per Bulan)', prompt: 'Berikan analisis tren finansial saya selama 1 tahun penuh, bandingkan performa bulan ke bulan, pos pengeluaran tertinggi, dan evaluasi tahunannya.' },
  { label: '🍔 Analisa Pengeluaran Makanan', prompt: 'Berapa total dan rata-rata pengeluaran makan minum saya bulan ini, serta evaluasinya?' },
  { label: '👥 Perbandingan Anggota Keluarga', prompt: 'Siapa anggota keluarga yang memiliki pengeluaran terbesar dan bagaimana distribusinya?' },
  { label: '🎯 Rekomendasi Menabung & Berhemat', prompt: 'Bagaimana cara berhemat bulan depan dan apa rekomendasi strategi menabung berdasarkan data pengeluaran saya?' },
  { label: '⚠️ Cek Pos yang Melebihi Anggaran', prompt: 'Apakah ada pos kategori anggaran yang melebihi batas (over budget) bulan ini?' },
  { label: '💳 Status Utang & Piutang', prompt: 'Bagaimana status utang dan piutang saya saat ini serta saran pembayarannya?' },
];

export const AiAnalysisView: React.FC<AiAnalysisViewProps> = ({
  transactions,
  categories,
  currentGroup,
  debts = [],
  selectedYear,
  selectedMonth,
  selectedMemberFilter = 'all',
  onNavigateSettings,
}) => {
  const groupId = currentGroup?.id || 'default_group';
  const groupName = currentGroup?.name || 'Grup Keuangan';

  if (!currentGroup) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
        <Bot className="w-10 h-10 animate-bounce text-indigo-500" />
        <p className="text-sm font-semibold">Memuat data grup keuangan...</p>
      </div>
    );
  }

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load existing chat history if any
    try {
      const saved = localStorage.getItem(`arthasync_ai_chat_${groupId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Gemini API Key from localStorage or environment (.env)
  const effectiveApiKey = getEffectiveGeminiApiKey();
  const hasApiKey = Boolean(effectiveApiKey);

  // Save chat history per group
  useEffect(() => {
    try {
      if (groupId) {
        localStorage.setItem(`arthasync_ai_chat_${groupId}`, JSON.stringify(messages));
      }
    } catch {}
  }, [messages, groupId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Build financial context with full parity with StatisticsView
  const financialContext: FinancialContext = useMemo(() => {
    return buildFinancialContext(
      transactions,
      categories,
      currentGroup,
      debts,
      selectedYear,
      selectedMonth,
      selectedMemberFilter
    );
  }, [transactions, categories, currentGroup, debts, selectedYear, selectedMonth, selectedMemberFilter]);

  // Voice Recognition for prompts
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => setIsListeningVoice(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInputPrompt(currentTranscript);
        }
      };
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onend = () => setIsListeningVoice(false);

      recognitionRef.current = recognition;
    } catch {}

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Fitur input suara belum didukung di browser ini.');
      return;
    }
    if (isListeningVoice) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      }
    }
  };

  // Submit Prompt Handler
  const handleSendPrompt = async (promptToSend?: string) => {
    const q = (promptToSend !== undefined ? promptToSend : inputPrompt).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const response = await askFinancialAi(q, financialContext, effectiveApiKey);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.answer,
        source: response.source,
        modelUsed: response.modelUsed,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Maaf, terjadi kendala saat memproses analisa. Silakan coba kembali sesaat lagi.',
        source: 'local_nlp',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat percakapan analisa AI pada grup ini?')) {
      setMessages([]);
      localStorage.removeItem(`arthasync_ai_chat_${groupId}`);
    }
  };

  // Basic markdown text renderer helper (bold, headers, bullets, linebreaks)
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Heading 4
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-2 mb-0.5">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      // Bullet list item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = line.slice(2);
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-200">
            {parseBoldText(content)}
          </li>
        );
      }
      // Numbered list item
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs leading-relaxed text-slate-700 dark:text-slate-200">
            {parseBoldText(numMatch[2])}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
          {parseBoldText(line)}
        </p>
      );
    });
  };

  const parseBoldText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-28 lg:pb-12 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Analisa Keuangan AI
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {hasApiKey ? '✨ Gemini AI' : '⚡ Smart Local AI'}
              </span>
              {selectedMemberFilter && selectedMemberFilter !== 'all' && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Filter: {financialContext.activeMemberName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Analisis cerdas & rekomendasi finansial berdasarkan data pembukuan {financialContext.monthName} {selectedYear} · {groupName}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer self-start sm:self-auto transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Bersihkan Obrolan</span>
          </button>
        )}
      </div>

      {/* Summary KPI Cards - 100% Paritas dengan Menu Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Pengeluaran */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Total Pengeluaran
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
            {formatRupiah(financialContext.totalExpense)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
            {financialContext.daysInMonth} hari total periode
          </span>
        </div>

        {/* Card 2: Total Pemasukan */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Total Pemasukan
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(financialContext.totalIncome)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
            Net: {formatRupiah(financialContext.netSavings)}
          </span>
        </div>

        {/* Card 3: Rata-rata Harian */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Rata-rata Harian
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {formatRupiah(financialContext.avgDailyExpense)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
            per hari aktif
          </span>
        </div>

        {/* Card 4: Rasio Tabungan */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
            Rasio Tabungan
          </span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {financialContext.savingsRate}%
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
            Top: {financialContext.topExpenseCategoryName} ({financialContext.topExpenseCategoryPercent}%)
          </span>
        </div>
      </div>

      {/* Preset Prompts Pills */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          Pilihan Topik Analisa Instan (Klik untuk Menanyakan):
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(p.prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700/80 text-xs font-medium transition-all shadow-2xs hover:scale-[1.01] active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[420px] max-h-[580px]">
        {/* Messages List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Halo! Saya ArthaSync AI Advisor
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                Saya telah mempelajari catatan pengeluaran, pemasukan, pos anggaran, dan saldo kas grup <b>{groupName}</b>. Pilih salah satu topik instan di atas atau ajukan pertanyaan spesifik tentang keuangan Anda di kolom bawah.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-1">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs space-y-2 ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 border-b pb-1.5 border-black/10 dark:border-white/10">
                    <span className="font-semibold">
                      {m.sender === 'user' ? 'Anda' : 'ArthaSync AI Advisor'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {m.source && (
                        <span className="px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono text-[9px]">
                          {m.source === 'gemini' ? (m.modelUsed ? m.modelUsed.replace('gemini-', 'Gemini ') : 'Gemini AI') : 'Local NLP'}
                        </span>
                      )}
                      <span>{m.timestamp}</span>
                    </div>
                  </div>

                  <div className="prose-xs">
                    {renderFormattedMarkdown(m.text)}
                  </div>

                  {m.sender === 'ai' && (
                    <div className="pt-1 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Salin jawaban"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex gap-3 items-start animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                <span>AI sedang menganalisis data keuangan Anda...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                isListeningVoice
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title={isListeningVoice ? 'Berhenti bicara' : 'Tanya menggunakan suara'}
            >
              {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder={
                isListeningVoice
                  ? 'Mendengarkan suara Anda...'
                  : 'Ketik pertanyaan keuangan Anda (contoh: Pos apa yang paling boros bulan ini?)...'
              }
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
            />

            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Helpful banner if API key is not yet configured */}
      {!hasApiKey && onNavigateSettings && (
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
              <b>Mode Saat Ini: Smart Local AI (0ms, Offline & Gratis)</b>. Ingin konsultasi keuangan yang lebih bebas dan mendalam? Hubungkan Google Gemini API Key gratis di menu Pengaturan.
            </p>
          </div>
          <button
            onClick={onNavigateSettings}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all shadow-2xs"
          >
            Atur Gemini AI
          </button>
        </div>
      )}
    </div>
  );
};
