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

    const cleanNip = nip.trim().replace(/\D/g, '');
    const cleanPassword = password.trim();

    if (!cleanNip || !cleanPassword) {
      setError('Silakan masukkan NIP dan password Anda.');
      setLoading(false);
      return;
    }

    try {
      // 1. Verifikasi kredensial pengguna dari spreadsheet
      let users = await fetchUsersFromSheets();
      let foundUser = users.find(u => 
        (u.nip || '').replace(/\D/g, '') === cleanNip && 
        (u.password || '').trim() === cleanPassword
      );

      if (!foundUser) {
        // Coba sinkronisasi langsung jika belum ada di cache
        try {
          const freshUsers = await fetchUsersFromSheets(true);
          if (freshUsers && freshUsers.length > 0) {
            users = freshUsers;
            foundUser = users.find(u => 
              (u.nip || '').replace(/\D/g, '') === cleanNip && 
              (u.password || '').trim() === cleanPassword
            );
          }
        } catch (fetchErr) {
          console.warn('Gagal bypass cache sheets:', fetchErr);
        }
      }

      if (!foundUser) {
        setError('NIP atau Password yang Anda masukkan tidak sesuai.');
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
        const profileMatch = pegawaiList.find(p => (p.nip || '').replace(/\D/g, '') === (foundUser!.nip || '').replace(/\D/g, ''));
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
    if (onReturnToPortal) {
      onReturnToPortal();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans text-slate-100">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={systemLogo || DEFAULT_LOGO} 
            alt="Logo DJKI" 
            className="w-10 h-10 object-contain drop-shadow"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">DJKI KEMENKUM RI</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Direktorat Jenderal Kekayaan Intelektual</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBackToPortal}
          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/10 cursor-pointer"
        >
          <i className="bi bi-arrow-left"></i>
          <span className="hidden sm:inline">Portal SDM Utama</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Badge & Title */}
          <div className="text-center mb-6 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-3">
              <i className="bi bi-award-fill text-indigo-400"></i>
              Modul Mandiri Evaluasi Kinerja
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Evaluasi Kinerja PPPK
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sistem Penilaian Hasil Kerja, Perilaku BerAKHLAK & Kehadiran Pegawai Pemerintah dengan Perjanjian Kerja DJKI
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-shake">
              <i className="bi bi-exclamation-triangle-fill text-rose-400 shrink-0 mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Nomor Induk Pegawai (NIP)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="bi bi-person-badge text-base"></i>
                </div>
                <input
                  type="text"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Contoh: 199605152024212001"
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Password Akun
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <i className="bi bi-lock text-base"></i>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right text-base"></i>
                    <span>Masuk ke Modul Evaluasi PPPK</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-400">
              Gunakan NIP dan password yang sama dengan akun Portal SDM KI Anda.
            </p>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs">
              <button
                type="button"
                onClick={handleBackToPortal}
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <i className="bi bi-house-door"></i>
                <span>Kembali ke Portal SDM Utama</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto text-center py-2">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Sistem Manajemen SDM DJKI &bull; Kementerian Hukum Republik Indonesia &bull; © 2026
        </p>
      </div>

    </div>
  );
};
