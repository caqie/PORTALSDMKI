import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { fetchUsersFromSheets, fetchPegawaiFromSheets } from '../../spreadsheetService';
import { DEFAULT_LOGO } from '../../constants';
import { AdminUser, Pegawai } from '../../types';

interface EvaluasiPPPKLoginPageProps {
  onSuccessLogin?: () => void;
  onReturnToPortal?: () => void;
}

export const EvaluasiPPPKLoginPage: React.FC<EvaluasiPPPKLoginPageProps> = ({
  onSuccessLogin,
  onReturnToPortal
}) => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);

  useEffect(() => {
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setSystemLogo(savedLogo);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const rawIdentifier = nip.trim();
    const rawIdentifierLower = rawIdentifier.toLowerCase();
    const cleanNip = rawIdentifier.replace(/\D/g, '');
    const cleanPassword = password.trim();

    if (!rawIdentifier || !cleanPassword) {
      setError('Silakan masukkan NIP/Username dan kata sandi Anda.');
      setLoading(false);
      return;
    }

    const matchUser = (u: AdminUser) => {
      const uNipRaw = (u.nip || '').trim();
      const uNipDigits = uNipRaw.replace(/\D/g, '');
      const identifierMatches =
        (cleanNip.length > 0 && uNipDigits === cleanNip) ||
        uNipRaw.toLowerCase() === rawIdentifierLower;
      return identifierMatches && (u.password || '').trim() === cleanPassword;
    };

    try {
      // 1. Verifikasi kredensial pengguna dari spreadsheet
      let users = await fetchUsersFromSheets();
      let foundUser = users.find(matchUser);

      if (!foundUser) {
        // Coba sinkronisasi langsung jika belum ada di cache
        try {
          const freshUsers = await fetchUsersFromSheets(true);
          if (freshUsers && freshUsers.length > 0) {
            users = freshUsers;
            foundUser = users.find(matchUser);
          }
        } catch (fetchErr) {
          console.warn('Gagal bypass cache sheets:', fetchErr);
        }
      }

      if (!foundUser) {
        const userExists = users.some(u => {
          const uNipRaw = (u.nip || '').trim();
          const uNipDigits = uNipRaw.replace(/\D/g, '');
          return (cleanNip.length > 0 && uNipDigits === cleanNip) || uNipRaw.toLowerCase() === rawIdentifierLower;
        });
        setError(
          userExists
            ? 'Kata sandi yang Anda masukkan tidak sesuai.'
            : 'NIP atau Username tidak terdaftar dalam sistem.'
        );
        setLoading(false);
        return;
      }

      if (foundUser.status === 'Nonaktif') {
        setError('Akun Anda dinonaktifkan. Silakan hubungi Administrator SDM.');
        setLoading(false);
        return;
      }

      // 2. Ambil profil master pegawai DJKI untuk melengkapi data
      try {
        const pegawaiList = await fetchPegawaiFromSheets();
        const foundDigits = (foundUser.nip || '').replace(/\D/g, '');
        const profileMatch = foundDigits
          ? pegawaiList.find(p => (p.nip || '').replace(/\D/g, '') === foundDigits)
          : undefined;
        if (profileMatch) {
          foundUser = {
            ...foundUser,
            name: profileMatch.nama,
            foto: profileMatch.foto
          };
        }
      } catch (pegErr) {
        console.warn('Gagal memuat profil pegawai:', pegErr);
      }

      login(foundUser);

      // Simpan rute Evaluasi PPPK aktif
      sessionStorage.setItem('portal_last_path', '/EvaluasiPPPK');

      if (onSuccessLogin) {
        onSuccessLogin();
      }
    } catch (err: any) {
      console.error('Login Evaluasi PPPK error:', err);
      setError(err?.message || 'Terjadi kesalahan sistem saat memproses login.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPortal = () => {
    try {
      sessionStorage.setItem('portal_last_path', '/');
    } catch (e) {}
    if (onReturnToPortal) {
      onReturnToPortal();
    } else {
      window.location.href = '/';
    }
  };

  const roleArchitecture = [
    {
      role: 'Administrator SDM',
      desc: 'Verifikasi pejabat penilai, manajemen periode, impor presensi & finalisasi.',
      color: 'text-purple-300',
      iconBg: 'bg-purple-500/20 border-purple-400/30 text-purple-300',
      icon: 'bi-shield-lock-fill'
    },
    {
      role: 'Pejabat Penilai Kinerja',
      desc: 'Menetapkan 2 rekan 360° (PNS & PPPK), menilai SKP (60%), perilaku & atasan.',
      color: 'text-sky-300',
      iconBg: 'bg-sky-500/20 border-sky-400/30 text-sky-300',
      icon: 'bi-award-fill'
    },
    {
      role: 'Penilai Perilaku 360° (Rekan PNS & PPPK)',
      desc: 'Memberikan penilaian perilaku BerAKHLAK (bobot 20% masing-masing rekan).',
      color: 'text-teal-300',
      iconBg: 'bg-teal-500/20 border-teal-400/30 text-teal-300',
      icon: 'bi-people-fill'
    },
    {
      role: 'Pegawai PPPK yang Dinilai',
      desc: 'Mengusulkan pejabat penilai, mengunggah realisasi SKP & memantau hasil.',
      color: 'text-indigo-300',
      iconBg: 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300',
      icon: 'bi-person-workspace'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-[#070B16] relative overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans text-slate-100">
      
      {/* Architectural Background Layers */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-24 w-[520px] h-[520px] rounded-full bg-indigo-600/15 blur-[120px]"></div>
        <div className="absolute -bottom-40 -right-24 w-[520px] h-[520px] rounded-full bg-blue-600/15 blur-[120px]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px]"></div>
      </div>

      {/* Top Institutional Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 shadow-inner shrink-0">
            <img 
              src={systemLogo || DEFAULT_LOGO} 
              alt="Logo DJKI" 
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-extrabold tracking-wide text-white whitespace-nowrap">
              Direktorat Jenderal Kekayaan Intelektual
            </h1>
            <p className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              Kementerian Hukum Republik Indonesia
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackToPortal}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-2 border border-white/10 cursor-pointer whitespace-nowrap shrink-0"
        >
          <i className="bi bi-arrow-left"></i>
          <span className="hidden sm:inline">Portal SDM Utama</span>
        </button>
      </header>

      {/* Main Split Workspace */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-8 lg:my-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Executive Overview & Role Differentiation Guide */}
        <section className="lg:col-span-7 space-y-7">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
              <img
                src="/logo_garuda_resmi.svg"
                alt="Lambang Garuda Pancasila"
                className="w-6 h-6 object-contain opacity-90"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span>Sistem Penilaian Kinerja Terpadu</span>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-300 font-semibold">Evaluasi 360° PPPK</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-tight text-white leading-[1.15] text-balance">
              Evaluasi Kinerja &amp; Perilaku BerAKHLAK Pegawai PPPK
            </h2>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-2xl">
              Masuk satu pintu menggunakan akun Portal SDM KI. Ruang kerja, tema tampilan, dan hak akses Anda disesuaikan otomatis berdasarkan peran penugasan pada periode berjalan.
            </p>
          </div>

          {/* 4-Role Architecture Guide (Clean Hairline Divided Rows) */}
          <div className="pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-slate-400 mb-3">
              Struktur Akses &amp; Perbedaan Ruang Kerja Peran:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {roleArchitecture.map((item) => (
                <div key={item.role} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}>
                    <i className={`bi ${item.icon} text-sm`}></i>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${item.color}`}>
                      {item.role}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Login Form Card */}
        <section className="lg:col-span-5">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            <div className="mb-6">
              <div className="text-xs font-semibold text-indigo-300 mb-1">
                Autentikasi Akun Kepegawaian
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Masuk ke Modul Evaluasi PPPK
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Masukkan NIP 18 digit dan kata sandi akun Portal SDM KI Anda.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-start gap-2.5">
                <i className="bi bi-exclamation-triangle-fill text-rose-400 shrink-0 mt-0.5"></i>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor Induk Pegawai (NIP)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="bi bi-person-badge text-base"></i>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Masukkan 18 digit NIP"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="bi bi-lock text-base"></i>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Memverifikasi Kredensial...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Ruang Evaluasi</span>
                      <i className="bi bi-arrow-right text-base"></i>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer Guidance inside Card */}
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                Hak akses penilai dan peserta ditentukan otomatis dari data penugasan periode aktif dan manajemen user.
              </p>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleBackToPortal}
                  className="text-xs text-indigo-300 hover:text-indigo-200 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="bi bi-house-door"></i>
                  <span>Kembali ke Portal SDM Utama</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Quiet Institutional Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto text-center py-2 border-t border-white/5">
        <p className="text-[11px] text-slate-500 font-medium">
          Portal Manajemen SDM DJKI · Kementerian Hukum Republik Indonesia · 2026
        </p>
      </footer>

    </div>
  );
};
