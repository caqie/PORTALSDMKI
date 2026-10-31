import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, User, Lock, ArrowLeft, Award, Sparkles, Building2, HelpCircle } from 'lucide-react';
import { Pegawai } from '../types';

export const CatPPPKLoginPage: React.FC = () => {
  const [nipInput, setNipInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [pppkList, setPppkList] = useState<Pegawai[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load PPPK employees from cache
    const cached = localStorage.getItem('portal_pegawai_db');
    if (cached) {
      try {
        const parsed: Pegawai[] = JSON.parse(cached);
        const pppks = parsed.filter(p => {
          const jen = (p.jenisPegawai || '').toUpperCase();
          const stat = (p.status || '').toUpperCase();
          return jen.includes('PPPK') && stat === 'AKTIF';
        });
        setPppkList(pppks);
      } catch (e) {}
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanInput = nipInput.trim();
    if (!cleanInput) {
      setErrorMsg('Harap masukkan NIP PPPK atau NIK Anda.');
      setLoading(false);
      return;
    }

    // Find in PPPK list or create fallback peserta
    let matched = pppkList.find(p => 
      p.nip === cleanInput || 
      p.nip?.replace(/\D/g, '') === cleanInput.replace(/\D/g, '') ||
      p.nama?.toLowerCase().includes(cleanInput.toLowerCase())
    );

    if (!matched) {
      // Allow demo login with entered name/NIP
      matched = {
        id: 'pppk-sim-' + Date.now(),
        nip: cleanInput.length >= 8 ? cleanInput : '199501012023211001',
        nama: cleanInput.length < 8 ? cleanInput : 'Pegawai PPPK DJKI',
        jabatan: 'Ahli Pertama - Analis Hukum / Pengelola Pengadaan',
        unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
        gender: 'L',
        golRuang: 'IX',
        jenisPegawai: 'PPPK',
        status: 'Aktif'
      };
    }

    const sessionData = {
      nip: matched.nip,
      nama: matched.nama,
      jabatan: matched.jabatan || 'PPPK Teknis DJKI',
      unitKerja: matched.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual',
      golRuang: matched.golRuang || 'IX',
      loginTime: new Date().toISOString()
    };

    sessionStorage.setItem('cat_pppk_peserta', JSON.stringify(sessionData));
    setTimeout(() => {
      setLoading(false);
      navigate('/cat-pppk/dashboard');
    }, 400);
  };

  const handleQuickDemoSelect = (p: Pegawai) => {
    setNipInput(p.nip || p.nama);
    setPasswordInput('123456');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col justify-between text-white font-sans selection:bg-emerald-500 selection:text-white p-4 md:p-8">
      {/* Top Bar */}
      <header className="flex justify-between items-center max-w-6xl mx-auto w-full py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black tracking-tight uppercase flex items-center gap-2">
              CAT EVALUASI PPPK
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                STANDALONE
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium">
              Sistem Uji Kompetensi & Penilaian Perpanjangan Kontrak DJKI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cat-pppk/admin')}
            className="text-[11px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Monitoring</span>
          </button>
          <button
            onClick={() => window.close()}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
            title="Kembali ke Portal SDM"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto w-full my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3 h-3" /> Ujian Komputer Mandiri (CAT)
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Masuk Peserta Evaluasi
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
              Gunakan NIP PPPK Anda untuk mengakses ruang ujian evaluasi kinerja dan uji kompetensi.
            </p>
          </div>

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></div>
              <span>{errorMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                NIP PPPK / Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Contoh: 199505122023211002"
                  value={nipInput}
                  onChange={e => setNipInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-emerald-500 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Kata Sandi / PIN Ujian
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Masukkan kata sandi (atau biarkan default)"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-700/80 focus:border-emerald-500 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                Default: 4 digit terakhir NIP atau tanggal lahir (YYYYMMDD).
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Ruang Ujian CAT</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pickers if PPPK available */}
          {pppkList.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-800 relative z-10">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Simulasi Cepat (Pilih Pegawai PPPK DJKI):
              </p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {pppkList.slice(0, 6).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickDemoSelect(p)}
                    className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-700/60 transition-all truncate max-w-[220px] text-left"
                    title={`${p.nama} (${p.nip})`}
                  >
                    <span className="font-semibold">{p.nama}</span>
                    <span className="text-slate-500 block text-[9px] truncate">{p.unitKerja}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer Info */}
      <footer className="text-center text-slate-500 text-[11px] py-4">
        <p>Direktorat Jenderal Kekayaan Intelektual &copy; {new Date().getFullYear()} &bull; Sistem CAT Evaluasi Kinerja Pegawai Pemerintah dengan Perjanjian Kerja</p>
      </footer>
    </div>
  );
};
export default CatPPPKLoginPage;
