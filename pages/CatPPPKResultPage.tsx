import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ArrowLeft,
  Building,
  User,
  Clock,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle
} from 'lucide-react';
import {
  HasilCatPPPK,
  getHasilCatPPPKList,
  getBankSoalPPPK,
  SoalCatPPPK
} from '../services/catPPPKService';

export const CatPPPKResultPage: React.FC = () => {
  const [result, setResult] = useState<HasilCatPPPK | null>(null);
  const [questions, setQuestions] = useState<SoalCatPPPK[]>([]);
  const [showReview, setShowReview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const last = sessionStorage.getItem('cat_pppk_last_result');
    if (last) {
      try {
        setResult(JSON.parse(last));
      } catch (e) {}
    } else {
      const all = getHasilCatPPPKList();
      if (all.length > 0) {
        setResult(all[0]);
      }
    }

    setQuestions(getBankSoalPPPK());
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-400 mb-4">Tidak ada data hasil evaluasi yang ditemukan.</p>
        <button
          onClick={() => navigate('/cat-pppk/login')}
          className="px-6 py-2.5 bg-emerald-600 rounded-xl text-xs font-bold text-white hover:bg-emerald-500 transition-all cursor-pointer"
        >
          Kembali ke Login CAT
        </button>
      </div>
    );
  }

  const getRecommendationBadge = (rek: string) => {
    if (rek.includes('SANGAT')) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: 'text-emerald-400',
        label: 'SANGAT MEMUASKAN'
      };
    } else if (rek.includes('DIREKOMENDASIKAN') && !rek.includes('TIDAK') && !rek.includes('PEMBINAAN')) {
      return {
        bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        icon: 'text-blue-400',
        label: 'MEMENUHI SYARAT'
      };
    } else if (rek.includes('PEMBINAAN')) {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: 'text-amber-400',
        label: 'PERLU PEMBINAAN'
      };
    } else {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: 'text-rose-400',
        label: 'DI BAWAH AMBANG BATAS'
      };
    }
  };

  const badge = getRecommendationBadge(result.rekomendasi);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Action Header (Hidden during Print) */}
        <div className="flex justify-between items-center no-print">
          <button
            onClick={() => navigate('/cat-pppk/dashboard')}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Cetak Lembar Hasil Evaluasi</span>
            </button>
            <button
              onClick={() => navigate('/cat-pppk/admin')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Rekap Seluruh Pegawai
            </button>
          </div>
        </div>

        {/* Official Printable Scorecard Document */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Header Kop Lembar Hasil */}
          <div className="text-center pb-6 border-b border-slate-800">
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
              Kementerian Hukum Republik Indonesia
            </span>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mt-1">
              Direktorat Jenderal Kekayaan Intelektual
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              LEMBAR HASIL EVALUASI KOMPETENSI & KINERJA CAT PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PPPK)
            </p>
          </div>

          {/* Biodata Peserta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-800 text-xs">
            <div className="space-y-1.5">
              <p className="text-slate-400">Nama Lengkap: <b className="text-white text-sm">{result.nama}</b></p>
              <p className="text-slate-400">Nomor Induk PPPK: <span className="font-mono text-emerald-400 font-bold">{result.nip}</span></p>
              <p className="text-slate-400">Jabatan: <span className="text-slate-200">{result.jabatan}</span></p>
            </div>
            <div className="space-y-1.5 sm:text-right">
              <p className="text-slate-400">Unit Kerja: <span className="text-slate-200 font-bold">{result.unitKerja}</span></p>
              <p className="text-slate-400">Tanggal Pelaksanaan CAT: <span className="text-white">{result.tanggalUjian}</span></p>
              <p className="text-slate-400">Durasi Pengerjaan: <span className="text-white">{result.durasiPengerjaanMenit} Menit</span></p>
            </div>
          </div>

          {/* Skor Total Banner */}
          <div className="py-8 text-center bg-slate-950/70 rounded-3xl my-6 border border-slate-800/80">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              NILAI AKHIR EVALUASI CAT (SKALA 100)
            </span>
            <div className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-2 font-mono">
              {result.nilaiSkala100}
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <span className={`px-4 py-1.5 rounded-full border text-xs font-black tracking-wider uppercase ${badge.bg}`}>
                {result.rekomendasi}
              </span>
              <p className="text-xs text-slate-300 max-w-lg mt-2 px-4 leading-relaxed">
                {result.keterangan}
              </p>
            </div>
          </div>

          {/* Komposisi Skor per Kategori */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3">
              Rincian Perolehan Skor Kompetensi:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Manajerial</span>
                <span className="text-xl font-black text-white font-mono">{result.skorManajerial}</span>
                <span className="text-[10px] text-slate-500 block">Integritas & Kerjasama</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sosio-Kultural</span>
                <span className="text-xl font-black text-white font-mono">{result.skorSosioKultural}</span>
                <span className="text-[10px] text-slate-500 block">Perekat Bangsa</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Teknis DJKI</span>
                <span className="text-xl font-black text-white font-mono">{result.skorTeknis}</span>
                <span className="text-[10px] text-slate-500 block">Substantif KI</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">BerAKHLAK</span>
                <span className="text-xl font-black text-white font-mono">{result.skorBerakhlak}</span>
                <span className="text-[10px] text-slate-500 block">Core Values ASN</span>
              </div>
            </div>
          </div>

          {/* Bagian Tanda Tangan / Validasi untuk Cetak */}
          <div className="mt-12 pt-6 border-t border-slate-800 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="text-slate-400">Peserta Ujian,</p>
              <div className="h-16"></div>
              <p className="font-bold text-white underline">{result.nama}</p>
              <p className="text-slate-400 font-mono text-[11px]">NIP. {result.nip}</p>
            </div>
            <div>
              <p className="text-slate-400">Jakarta, {result.tanggalUjian}</p>
              <p className="text-slate-400">Ketua Tim Evaluasi Kinerja SDM DJKI,</p>
              <div className="h-16"></div>
              <p className="font-bold text-white underline">Tim Penilai Kompetensi PPPK</p>
              <p className="text-slate-400 text-[11px]">Biro SDM & SOTK DJKI</p>
            </div>
          </div>
        </motion.div>

        {/* Toggle Pembahasan Butir Soal */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 no-print">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Lihat Pembahasan Butir Soal & Kunci Jawaban
            </span>
            {showReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showReview && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
              {questions.map((q, idx) => {
                const userChoice = result.jawabanDetail[q.id];
                const isCorrect = userChoice === q.kunciJawaban;
                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[11px] font-bold text-indigo-400">
                        Soal No. {idx + 1} &bull; {q.kategoriLabel}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        Jawaban Anda: <b>{userChoice || 'Tidak Dijawab'}</b> (Kunci: {q.kunciJawaban})
                      </span>
                    </div>
                    <p className="text-xs text-slate-200">{q.pertanyaan}</p>
                    <div className="p-2.5 rounded-xl bg-slate-900 text-[11px] text-slate-400 border border-slate-800/80">
                      <b className="text-emerald-400">Pembahasan:</b> {q.pembahasan}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default CatPPPKResultPage;
