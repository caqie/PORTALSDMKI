import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Maximize,
  Minimize,
  FileCheck2,
  Sparkles
} from 'lucide-react';
import {
  getBankSoalPPPK,
  SoalCatPPPK,
  simpanHasilCatPPPK,
  HasilCatPPPK,
  hitungRekomendasiPerpanjanganKontrak
} from '../services/catPPPKService';

interface AnswerMap {
  [soalId: string]: {
    jawaban: 'A' | 'B' | 'C' | 'D' | 'E' | '';
    isRagu: boolean;
  };
}

export const CatPPPKExamPage: React.FC = () => {
  const [peserta, setPeserta] = useState<any>(null);
  const [questions, setQuestions] = useState<SoalCatPPPK[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(new Date().toLocaleTimeString('id-ID'));

  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    const saved = sessionStorage.getItem('cat_pppk_peserta');
    if (!saved) {
      navigate('/cat-pppk/login');
      return;
    }
    try {
      setPeserta(JSON.parse(saved));
    } catch (e) {
      navigate('/cat-pppk/login');
      return;
    }

    const bank = getBankSoalPPPK();
    setQuestions(bank);

    // Initial answer state
    const initialAnswers: AnswerMap = {};
    bank.forEach(q => {
      initialAnswers[q.id] = { jawaban: '', isRagu: false };
    });
    setAnswers(initialAnswers);
  }, [navigate]);

  // Timer countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleFinishExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (pilihanKey: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        jawaban: pilihanKey
      }
    }));
  };

  const handleToggleRagu = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: {
        ...prev[currentQ.id],
        isRagu: !prev[currentQ.id]?.isRagu
      }
    }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Calculate score and submit
  const handleFinishExam = useCallback((autoSubmit = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (timerRef.current) clearInterval(timerRef.current);

    let skorManajerial = 0;
    let skorSosioKultural = 0;
    let skorTeknis = 0;
    let skorBerakhlak = 0;
    let maxPossibleScore = 0;
    let totalScoreObtained = 0;

    const detailRecord: Record<string, string> = {};

    questions.forEach(q => {
      const userAns = answers[q.id]?.jawaban || '';
      detailRecord[q.id] = userAns;

      const chosenOption = q.pilihan.find(p => p.key === userAns);
      const earnedScore = chosenOption ? chosenOption.skor : 0;
      totalScoreObtained += earnedScore;
      maxPossibleScore += 5; // each question has max 5 points

      if (q.kategori === 'MANAJERIAL') skorManajerial += earnedScore;
      else if (q.kategori === 'SOSIO_KULTURAL') skorSosioKultural += earnedScore;
      else if (q.kategori === 'TEKNIS_DJKI') skorTeknis += earnedScore;
      else if (q.kategori === 'BERAKHLAK') skorBerakhlak += earnedScore;
    });

    const nilaiSkala100 = maxPossibleScore > 0 
      ? Math.round((totalScoreObtained / maxPossibleScore) * 100 * 10) / 10 
      : 0;

    const rekomendasiInfo = hitungRekomendasiPerpanjanganKontrak(nilaiSkala100);

    const hasilRecord: HasilCatPPPK = {
      id: 'CAT-' + Date.now(),
      nip: peserta.nip,
      nama: peserta.nama,
      unitKerja: peserta.unitKerja,
      jabatan: peserta.jabatan,
      tanggalUjian: new Date().toISOString().split('T')[0],
      waktuMulai: startTime,
      waktuSelesai: new Date().toLocaleTimeString('id-ID'),
      durasiPengerjaanMenit: Math.ceil((1800 - timeLeft) / 60),
      skorManajerial,
      skorSosioKultural,
      skorTeknis,
      skorBerakhlak,
      skorTotal: totalScoreObtained,
      nilaiSkala100,
      rekomendasi: rekomendasiInfo.rekomendasi,
      keterangan: rekomendasiInfo.keterangan,
      jawabanDetail: detailRecord
    };

    simpanHasilCatPPPK(hasilRecord);
    sessionStorage.setItem('cat_pppk_last_result', JSON.stringify(hasilRecord));

    setTimeout(() => {
      navigate('/cat-pppk/hasil');
    }, 400);
  }, [answers, questions, peserta, startTime, timeLeft, isSubmitting, navigate]);

  if (!peserta || questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ?.id] || { jawaban: '', isRagu: false };

  // Calculate statistics for question palette
  const answeredCount = Object.values(answers).filter(a => a.jawaban !== '').length;
  const raguCount = Object.values(answers).filter(a => a.isRagu).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3.5 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs md:text-sm font-black uppercase tracking-tight text-white flex items-center gap-2">
              RUANG UJIAN CAT EVALUASI PPPK
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">
              Peserta: <b className="text-slate-200">{peserta.nama}</b> &bull; NIP: <span className="font-mono text-emerald-400">{peserta.nip}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown Timer */}
          <div className={`px-4 py-2 rounded-2xl border font-mono font-black text-sm md:text-base flex items-center gap-2 transition-all ${
            timeLeft < 300 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' 
              : timeLeft < 600 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
              : 'bg-slate-800 text-emerald-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all hidden sm:block"
            title="Layar Penuh / Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content: Left Question Area + Right Navigation Palette */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Soal & Pilihan Jawaban */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <div>
            {/* Header Soal */}
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                  {currentIndex + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  dari {questions.length} Soal
                </span>
              </div>

              <span className="text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                {currentQ.kategoriLabel}
              </span>
            </div>

            {/* Teks Pertanyaan */}
            <div className="text-sm md:text-base text-slate-100 font-medium leading-relaxed mb-8">
              {currentQ.pertanyaan}
            </div>

            {/* Pilihan Jawaban */}
            <div className="space-y-3">
              {currentQ.pilihan.map(pil => {
                const isSelected = currentAnswer.jawaban === pil.key;
                return (
                  <button
                    key={pil.key}
                    type="button"
                    onClick={() => handleSelectAnswer(pil.key)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer group active:scale-[0.99] ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                    }`}>
                      {pil.key}
                    </div>
                    <span className="text-xs md:text-sm pt-0.5 leading-snug">
                      {pil.teks}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigasi Bawah */}
          <div className="pt-8 mt-8 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <button
              onClick={handleToggleRagu}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                currentAnswer.isRagu
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/20'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{currentAnswer.isRagu ? 'Hilangkan Ragu-ragu' : 'Tandai Ragu-ragu'}</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Jawaban Akhir</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Lembar Navigasi Nomor Soal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-slate-800">
              Navigasi Soal
            </h3>

            {/* Nomor Palet */}
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAnswered = ans && ans.jawaban !== '';
                const isRagu = ans && ans.isRagu;

                let colorClass = 'bg-slate-800 text-slate-400 border-slate-700';
                if (isRagu) {
                  colorClass = 'bg-amber-500 text-slate-950 font-black border-amber-400';
                } else if (isAnswered) {
                  colorClass = 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-sm';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs flex flex-col items-center justify-center font-bold border transition-all cursor-pointer relative ${colorClass} ${
                      isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105 z-10' : 'hover:scale-102'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isAnswered && (
                      <span className="text-[9px] leading-none opacity-80">{ans.jawaban}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda Warna */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-[10px]">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-3.5 rounded-md bg-emerald-600 inline-block"></span>
                <span>Sudah Dijawab: <b>{answeredCount}</b></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-3.5 rounded-md bg-amber-500 inline-block"></span>
                <span>Ragu-ragu: <b>{raguCount}</b></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-800 border border-slate-700 inline-block"></span>
                <span>Belum Dijawab: <b>{unansweredCount}</b></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="w-full mt-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Selesai & Kumpulkan</span>
          </button>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                  <Send className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-white">Konfirmasi Selesai Ujian</h3>
                <p className="text-xs text-slate-400">
                  Apakah Anda yakin ingin mengakhiri dan mengumpulkan hasil evaluasi CAT ini?
                </p>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Soal:</span>
                  <span className="font-bold text-white">{questions.length}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Sudah Terjawab:</span>
                  <span className="font-bold text-emerald-400">{answeredCount}</span>
                </div>
                {raguCount > 0 && (
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Masih Ragu-ragu:</span>
                    <span>{raguCount}</span>
                  </div>
                )}
                {unansweredCount > 0 && (
                  <div className="flex justify-between text-rose-400 font-semibold">
                    <span>Belum Dijawab:</span>
                    <span>{unansweredCount}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal / Lanjut Ujian
                </button>
                <button
                  type="button"
                  onClick={() => handleFinishExam(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Ya, Kumpulkan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default CatPPPKExamPage;
