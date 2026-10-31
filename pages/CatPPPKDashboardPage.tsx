import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Award,
  Clock,
  FileCheck2,
  Play,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building,
  User,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { getHasilCatPPPKList, HasilCatPPPK } from '../services/catPPPKService';

export const CatPPPKDashboardPage: React.FC = () => {
  const [peserta, setPeserta] = useState<any>(null);
  const [prevResult, setPrevResult] = useState<HasilCatPPPK | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = sessionStorage.getItem('cat_pppk_peserta');
    if (!saved) {
      navigate('/cat-pppk/login');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setPeserta(parsed);

      // Check existing result
      const allResults = getHasilCatPPPKList();
      const existing = allResults.find(r => r.nip === parsed.nip);
      if (existing) {
        setPrevResult(existing);
      }
    } catch (e) {
      navigate('/cat-pppk/login');
    }
  }, [navigate]);

  const handleStartExam = () => {
    if (window.confirm('Apakah Anda siap memulai Ujian CAT Evaluasi PPPK sekarang? Waktu ujian akan langsung berjalan.')) {
      navigate('/cat-pppk/exam');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cat_pppk_peserta');
    navigate('/cat-pppk/login');
  };

  if (!peserta) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-10 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <div className="max-w-5xl mx-auto w-full space-y-8 my-auto">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-2.5 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
                  Dashboard Peserta CAT
                </h1>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  EVALUASI PPPK
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Sistem Uji Kompetensi & Penilaian Perpanjangan Perjanjian Kerja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cat-pppk/admin')}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 px-3.5 py-2 rounded-xl transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Rekap Admin</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/40 rounded-xl transition-all shadow-sm"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Identitas Peserta Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-2xl font-black shadow-inner">
                {peserta.nama ? peserta.nama.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Data Pegawai Pemerintah dengan Perjanjian Kerja
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {peserta.nama}
                </h2>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs text-slate-300 mt-1 font-mono">
                  <span>NIP: <b className="text-white">{peserta.nip}</b></span>
                  <span>&bull;</span>
                  <span>Gol/Ruang: <b className="text-emerald-400">{peserta.golRuang || 'IX'}</b></span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-right md:min-w-[260px]">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit Penempatan:</p>
              <p className="text-xs font-black text-white mt-0.5">{peserta.unitKerja}</p>
              <p className="text-[10px] text-slate-400 mt-1 truncate">{peserta.jabatan}</p>
            </div>
          </div>
        </div>

        {/* Status Evaluasi / Hasil Sebelumnya jika Ada */}
        {prevResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-slate-900/90 border border-emerald-500/30 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ujian Sudah Pernah Dikerjakan
                </span>
                <h3 className="text-lg font-black text-white">
                  Hasil Evaluasi Kinerja CAT: {prevResult.nilaiSkala100} / 100
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Status Rekomendasi: <b className="text-emerald-400">{prevResult.rekomendasi}</b>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/cat-pppk/hasil')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Lihat Lembar Hasil CAT</span>
                </button>
                <button
                  onClick={handleStartExam}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ujian Ulang / Remedial"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ulangi Ujian</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Detail Paket Ujian & Petunjuk */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Durasi Waktu Ujian</p>
              <h4 className="text-base font-black text-white mt-0.5">30 Menit</h4>
              <p className="text-[10px] text-slate-500 mt-1">Timer otomatis menghitung mundur sejak tombol mulai ditekan.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Jumlah Soal Evaluasi</p>
              <h4 className="text-base font-black text-white mt-0.5">10 Butir Soal Terbobot</h4>
              <p className="text-[10px] text-slate-500 mt-1">Manajerial, Sosio-Kultural, Teknis KI, dan Core Values BerAKHLAK.</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nilai Ambang Batas</p>
              <h4 className="text-base font-black text-white mt-0.5">70.00 Poin</h4>
              <p className="text-[10px] text-slate-500 mt-1">Syarat rekomendasi perpanjangan kontrak kerja PPPK DJKI.</p>
            </div>
          </div>
        </div>

        {/* Tata Tertib Ujian & Tombol Mulai */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 space-y-6">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              Tata Tertib & Petunjuk Pengerjaan CAT
            </h3>
            <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
              <li>Pastikan koneksi internet stabil sebelum menekan tombol mulai ujian.</li>
              <li>Pilih satu jawaban terbaik untuk setiap butir pertanyaan skenario kasus.</li>
              <li>Gunakan tombol <b>Ragu-ragu (Warna Kuning)</b> jika Anda ingin menandai soal yang belum pasti untuk dicek kembali.</li>
              <li>Waktu ujian akan otomatis mengirimkan jawaban Anda jika batas waktu 30 menit telah habis.</li>
              <li>Nilai hasil evaluasi dan rekomendasi perpanjangan perjanjian kerja akan langsung terbit seketika ujian selesai.</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Status Server CAT: <b>Siap & Terhubung</b></span>
            </div>

            <button
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{prevResult ? 'Mulai Ujian Kembali' : 'Mulai Ujian Evaluasi Kinerja (CAT)'}</span>
            </button>
          </div>
        </div>
      </div>

      <footer className="text-center text-slate-600 text-[10px] py-4">
        Direktorat Jenderal Kekayaan Intelektual &bull; Evaluasi & Uji Kompetensi PPPK
      </footer>
    </div>
  );
};
export default CatPPPKDashboardPage;
