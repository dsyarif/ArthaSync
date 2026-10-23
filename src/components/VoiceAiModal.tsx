import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Check,
  AlertCircle,
  Volume2,
  Calendar,
  Building2,
  Tag,
  User,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Zap,
} from 'lucide-react';
import {
  AssetAccount,
  Category,
  FamilyMember,
  PaymentMethod,
  TransactionType,
} from '../types/finance';
import {
  ParsedTransactionResult,
  parseTransactionWithGemini,
  parseTransactionWithLocalNLP,
} from '../services/aiParser';
import { formatRupiah, getEligibleAssetsForMember, parseRupiahInput } from '../utils/finance';

interface VoiceAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  assets: AssetAccount[];
  members: FamilyMember[];
  groupId: string;
  defaultMemberId?: string;
  onSave: (txData: {
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
  }) => void;
  onOpenFullModalWithData?: (data: Partial<ParsedTransactionResult>) => void;
}

export const VoiceAiModal: React.FC<VoiceAiModalProps> = ({
  isOpen,
  onClose,
  categories,
  assets,
  members,
  groupId,
  defaultMemberId,
  onSave,
  onOpenFullModalWithData,
}) => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedTransactionResult | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Editable parsed values
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAssetId, setEditAssetId] = useState('');
  const [editMemberId, setEditMemberId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState(() => new Date().toISOString().split('T')[0]);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setTranscript(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Izin mikrofon ditolak. Silakan izinkan akses mikrofon di browser Anda atau ketik kalimat secara manual.');
        } else if (event.error !== 'no-speech') {
          setErrorMessage(`Terjadi kendala pada suara: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // When modal opens/closes, reset or start
  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setParsedResult(null);
      setErrorMessage('');
      setJustSaved(false);
      setEditDate(new Date().toISOString().split('T')[0]);

      // Auto start listening if supported
      if (speechSupported && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
    }
  }, [isOpen, speechSupported]);

  // When parsed result changes, sync editable fields
  useEffect(() => {
    if (parsedResult) {
      setEditAmount(parsedResult.amount > 0 ? formatRupiah(parsedResult.amount, { withPrefix: false }) : '');
      setEditType(parsedResult.type);
      setEditCategoryId(parsedResult.categoryId);
      setEditAssetId(parsedResult.assetId || '');
      setEditMemberId(parsedResult.memberId);
      setEditDescription(parsedResult.description);
      setEditDate(parsedResult.date);
    }
  }, [parsedResult]);

  // Process text with Gemini or Local NLP
  const handleProcessText = async (textToProcess?: string) => {
    const text = (textToProcess !== undefined ? textToProcess : transcript).trim();
    if (!text) {
      setErrorMessage('Silakan ucapkan atau ketik kalimat transaksi terlebih dahulu.');
      return;
    }

    setIsParsing(true);
    setErrorMessage('');

    try {
      const apiKey = localStorage.getItem('arthasync_gemini_api_key') || '';
      let result: ParsedTransactionResult;

      if (apiKey.trim()) {
        result = await parseTransactionWithGemini(
          text,
          categories,
          assets,
          members,
          apiKey.trim(),
          defaultMemberId
        );
      } else {
        result = parseTransactionWithLocalNLP(
          text,
          categories,
          assets,
          members,
          defaultMemberId
        );
      }

      setParsedResult(result);
    } catch (err: any) {
      console.error('Error parsing transaction:', err);
      // Fallback local NLP
      const fallback = parseTransactionWithLocalNLP(
        text,
        categories,
        assets,
        members,
        defaultMemberId
      );
      setParsedResult(fallback);
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (!speechSupported) {
      setErrorMessage('Web Speech API tidak didukung pada peramban ini. Anda bisa mengetik langsung di kolom teks.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      if (transcript.trim()) {
        handleProcessText(transcript);
      }
    } else {
      setErrorMessage('');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // If already started, stop and start
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        }
      }
    }
  };

  // Quick prompt chips
  const handleSelectQuickExample = (exampleText: string) => {
    setTranscript(exampleText);
    handleProcessText(exampleText);
  };

  // Eligible assets for chosen member
  const eligibleAssets = useMemo(() => {
    return getEligibleAssetsForMember(assets, editMemberId);
  }, [assets, editMemberId]);

  // Filtered categories for current type
  const currentCategories = useMemo(() => {
    return categories.filter((c) => (editType === 'expense' ? c.type !== 'income' : c.type === 'income'));
  }, [categories, editType]);

  // Handle Save
  const handleSave = () => {
    const rawNominal = parseRupiahInput(editAmount);
    if (rawNominal <= 0) {
      setErrorMessage('Nominal transaksi harus lebih dari Rp 0.');
      return;
    }

    let finalAsset = assets.find((a) => a.id === editAssetId);
    let pm: PaymentMethod = 'tunai';
    if (finalAsset) {
      if (finalAsset.type === 'bank') pm = 'transfer_bank';
      else if (finalAsset.type === 'ewallet') pm = 'qris_ewallet';
    }

    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    onSave({
      amount: rawNominal,
      type: editType,
      categoryId: editCategoryId || currentCategories[0]?.id || '',
      description: editDescription.trim() || 'Transaksi Baru',
      date: editDate,
      time,
      paymentMethod: pm,
      assetId: editAssetId || undefined,
      memberId: editMemberId || defaultMemberId || members[0]?.id || '',
      groupId,
    });

    setJustSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  // If modal is not open, do not render
  if (!isOpen) return null;

  const hasApiKey = Boolean(localStorage.getItem('arthasync_gemini_api_key'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-ai-title"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 id="voice-ai-title" className="text-base font-bold tracking-tight flex items-center gap-2">
                Catat Transaksi Suara & AI
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-medium">
                  {hasApiKey ? '✨ Gemini AI' : '⚡ Smart NLP'}
                </span>
              </h2>
              <p className="text-[11px] text-white/80">
                Ucapkan kalimat transaksi dalam Bahasa Indonesia sehari-hari
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 transition-colors cursor-pointer text-white/90 hover:text-white"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Animated Microphone Area */}
          <div className="flex flex-col items-center justify-center py-4 bg-gradient-to-b from-slate-50 to-slate-100/70 dark:from-slate-800/40 dark:to-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 relative">
            <button
              type="button"
              onClick={toggleListening}
              className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 cursor-pointer shadow-lg ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/40 ring-8 ring-rose-400/30 animate-pulse scale-105'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 hover:scale-105 active:scale-95'
              }`}
              title={isListening ? 'Klik untuk berhenti mendengar' : 'Klik untuk mulai bicara'}
            >
              {isListening ? (
                <Mic className="w-9 h-9 animate-bounce" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            {/* Live Audio Waves Simulation */}
            {isListening && (
              <div className="flex items-center gap-1.5 mt-3 h-5">
                <span className="w-1 bg-rose-500 rounded-full animate-[ping_0.8s_ease-in-out_infinite] h-3"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-[ping_0.6s_ease-in-out_infinite_0.1s] h-5"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-[ping_0.9s_ease-in-out_infinite_0.2s] h-4"></span>
                <span className="w-1 bg-rose-500 rounded-full animate-[ping_0.7s_ease-in-out_infinite_0.15s] h-2"></span>
              </div>
            )}

            <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
              {isListening
                ? 'Sedang mendengarkan... Katakan transaksi Anda sekarang!'
                : 'Tekan mikrofon untuk mulai bicara'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-0.5">
              Contoh: &ldquo;Makan siang 25 ribu pakai Sea Bank&rdquo; atau &ldquo;Beli bensin 30rb tunai&rdquo;
            </p>
          </div>

          {/* Transcript / Natural Language Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <label htmlFor="transcript-input" className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Hasil Suara / Ketik Kalimat:</span>
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Bersihkan
                </button>
              )}
            </div>
            <div className="relative">
              <textarea
                id="transcript-input"
                rows={2}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Contoh: Makan soto 25 ribu pakai Sea Bank, atau Gaji 5 juta masuk Bank Bima..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none transition-all"
              />
            </div>
          </div>

          {/* Quick Example Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Coba Contoh Cepat:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Makan soto 25 ribu pakai Sea Bank',
                'Beli bensin pertalite 30rb tunai',
                'Kopi janji jiwa 22k QRIS',
                'Gaji bulanan 5jt masuk Bank Bima',
              ].map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectQuickExample(ex)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  &ldquo;{ex}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Error / Alert Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Process Button */}
          <button
            type="button"
            onClick={() => handleProcessText()}
            disabled={isParsing || !transcript.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sedang Memproses Kalimat dengan AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Bedah & Ekstrak Transaksi</span>
              </>
            )}
          </button>

          {/* Parsed Result Preview & Edit Card */}
          {parsedResult && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Hasil Ekstraksi AI (Dapat Diedit)
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                  {parsedResult.source === 'gemini' ? (
                    <>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Gemini 3.8 Flash
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-emerald-600" />
                      Smart Local NLP (0ms)
                    </>
                  )}
                </span>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Nominal */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nominal (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={editAmount}
                      onChange={(e) => {
                        const parsed = parseRupiahInput(e.target.value);
                        setEditAmount(parsed > 0 ? formatRupiah(parsed, { withPrefix: false }) : '');
                      }}
                      placeholder="0"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Jenis Transaksi */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Jenis Transaksi
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditType('expense')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        editType === 'expense'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Pengeluaran</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditType('income')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        editType === 'income'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Pemasukan</span>
                    </button>
                  </div>
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Kategori
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {currentCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rekening / Dompet */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rekening / Dompet
                  </label>
                  <select
                    value={editAssetId}
                    onChange={(e) => setEditAssetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Rekening / Tunai --</option>
                    {eligibleAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.institution || a.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anggota */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Anggota Keluarga
                  </label>
                  <select
                    value={editMemberId}
                    onChange={(e) => setEditMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Keterangan */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Keterangan Transaksi
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Keterangan..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {onOpenFullModalWithData && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFullModalWithData({
                        amount: parseRupiahInput(editAmount),
                        type: editType,
                        categoryId: editCategoryId,
                        assetId: editAssetId,
                        memberId: editMemberId,
                        description: editDescription,
                        date: editDate,
                      });
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Buka Form Lengkap
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                    justSaved
                      ? 'bg-emerald-700 shadow-emerald-700/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {justSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Tersimpan!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Transaksi Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
