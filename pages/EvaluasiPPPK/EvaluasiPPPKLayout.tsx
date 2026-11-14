import React, { useState } from 'react';
import { Pegawai, EvaluationPeriod } from '../../types';
import { SimRole } from '../../components/pppk/penilaian/RoleAndPeriodSelectorBar';
import { DEFAULT_LOGO } from '../../constants';

export interface EvaluasiPPPKNavTab {
  id: string;
  label: string;
  icon: string;
  badge?: number | string | null;
  badgeColor?: string;
}

interface EvaluasiPPPKLayoutProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  realRoles: SimRole[];
  onSelectRole: (role: SimRole) => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  periods: EvaluationPeriod[];
  selectedPeriodId: string;
  onChangePeriod: (periodId: string) => void;
  onLogout: () => void;
  onReturnToPortal: () => void;
  canReturnToPortal?: boolean;
  pendingCorrectionCount?: number;
  pendingAssignmentCount?: number;
  isSimulationActive?: boolean;
  onToggleSimulation?: () => void;
  children: React.ReactNode;
}

export const EvaluasiPPPKLayout: React.FC<EvaluasiPPPKLayoutProps> = ({
  activeRole,
  activePegawai,
  realRoles,
  onSelectRole,
  activeTab,
  onSelectTab,
  periods = [],
  selectedPeriodId,
  onChangePeriod,
  onLogout,
  onReturnToPortal,
  canReturnToPortal = false,
  pendingCorrectionCount = 0,
  pendingAssignmentCount = 0,
  isSimulationActive = false,
  onToggleSimulation,
  children
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];

  // Role Metadata & Visual Theme Display (Distinct per role)
  const getRoleDisplay = (role: SimRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Administrator SDM',
          subtitle: 'Pengelola Sistem & Otoritas Evaluasi',
          roleNote: 'Akses penuh: verifikasi pejabat penilai, manajemen periode, impor kehadiran & kunci finalisasi.',
          headerBg: 'bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 border-purple-500/30',
          sidebarBg: 'bg-slate-950 border-purple-900/40',
          badgeBg: 'bg-purple-500/15 text-purple-200 border-purple-400/30',
          chipColor: 'bg-purple-600',
          activeNavBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-700/25',
          iconHoverColor: 'group-hover:text-purple-400',
          bannerStyle: 'bg-white border-purple-200/80 text-slate-800',
          bannerIconBg: 'bg-purple-600 text-white',
          bannerAccentText: 'text-purple-700',
          icon: 'bi-shield-lock-fill'
        };
      case 'PEJABAT_PENILAI':
        return {
          title: 'Pejabat Penilai Kinerja',
          subtitle: 'Atasan Langsung / Ketua Tim Kerja',
          roleNote: 'Kewenangan: menetapkan 2 rekan penilai 360° (PNS & PPPK), menilai SKP (60%), perilaku & finalisasi.',
          headerBg: 'bg-gradient-to-r from-slate-950 via-blue-950 to-slate-950 border-blue-500/30',
          sidebarBg: 'bg-slate-950 border-blue-900/40',
          badgeBg: 'bg-blue-500/15 text-blue-200 border-blue-400/30',
          chipColor: 'bg-blue-600',
          activeNavBg: 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-lg shadow-blue-700/25',
          iconHoverColor: 'group-hover:text-blue-400',
          bannerStyle: 'bg-white border-blue-200/80 text-slate-800',
          bannerIconBg: 'bg-blue-600 text-white',
          bannerAccentText: 'text-blue-700',
          icon: 'bi-award-fill'
        };
      case 'REKAN_PNS':
      case 'PNS_PENILAI':
        return {
          title: 'Penilai Perilaku 360° (PNS)',
          subtitle: 'Rekan Sejawat Unsur PNS · Bobot 20%',
          roleNote: 'Kewenangan: menilai 7 dimensi perilaku BerAKHLAK pegawai PPPK yang ditugaskan secara objektif.',
          headerBg: 'bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 border-teal-500/30',
          sidebarBg: 'bg-slate-950 border-teal-900/40',
          badgeBg: 'bg-teal-500/15 text-teal-200 border-teal-400/30',
          chipColor: 'bg-teal-600',
          activeNavBg: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-700/25',
          iconHoverColor: 'group-hover:text-teal-400',
          bannerStyle: 'bg-white border-teal-200/80 text-slate-800',
          bannerIconBg: 'bg-teal-600 text-white',
          bannerAccentText: 'text-teal-700',
          icon: 'bi-person-check-fill'
        };
      case 'REKAN_PPPK':
      case 'PPPK_PENILAI':
        return {
          title: 'Penilai Perilaku 360° (PPPK)',
          subtitle: 'Rekan Sejawat Unsur PPPK · Bobot 20%',
          roleNote: 'Kewenangan: menilai 7 dimensi perilaku BerAKHLAK sesama rekan PPPK yang ditugaskan secara objektif.',
          headerBg: 'bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 border-emerald-500/30',
          sidebarBg: 'bg-slate-950 border-emerald-900/40',
          badgeBg: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
          chipColor: 'bg-emerald-600',
          activeNavBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-700/25',
          iconHoverColor: 'group-hover:text-emerald-400',
          bannerStyle: 'bg-white border-emerald-200/80 text-slate-800',
          bannerIconBg: 'bg-emerald-600 text-white',
          bannerAccentText: 'text-emerald-700',
          icon: 'bi-person-check'
        };
      case 'PPPK_DINILAI':
      case 'PPPK':
      default:
        return {
          title: 'Pegawai PPPK yang Dinilai',
          subtitle: 'Subjek Evaluasi Kinerja & Bukti Dukung',
          roleNote: 'Kewenangan: mengusulkan pejabat penilai, mengunggah realisasi SKP/bukti dukung & memantau hasil evaluasi.',
          headerBg: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-indigo-500/30',
          sidebarBg: 'bg-slate-950 border-indigo-900/40',
          badgeBg: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30',
          chipColor: 'bg-indigo-600',
          activeNavBg: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-700/25',
          iconHoverColor: 'group-hover:text-indigo-400',
          bannerStyle: 'bg-white border-indigo-200/80 text-slate-800',
          bannerIconBg: 'bg-indigo-600 text-white',
          bannerAccentText: 'text-indigo-700',
          icon: 'bi-person-workspace'
        };
    }
  };

  const roleMeta = getRoleDisplay(activeRole);

  // Compute navigation tabs based on user role
  const getNavTabs = (): EvaluasiPPPKNavTab[] => {
    switch (activeRole) {
      case 'PEJABAT_PENILAI':
        return [
          { id: 'dashboard', label: 'Dashboard Penilai', icon: 'bi-grid-1x2-fill' },
          { id: 'penetapan-penilai', label: 'Penetapan Rekan Kerja', icon: 'bi-people-fill', badge: pendingAssignmentCount > 0 ? pendingAssignmentCount : null, badgeColor: 'bg-amber-500' },
          { id: 'penilaian-hasil-kerja', label: 'Penilaian Hasil Kerja', icon: 'bi-journal-check' },
          { id: 'penilaian-perilaku', label: 'Penilaian Perilaku', icon: 'bi-heart-pulse-fill' },
          { id: 'penilaian-kehadiran', label: 'Penilaian Kehadiran', icon: 'bi-calendar-check-fill' },
          { id: 'hasil-penilaian', label: 'Hasil Penilaian Akhir', icon: 'bi-trophy-fill' },
          { id: 'finalisasi', label: 'Finalisasi Evaluasi', icon: 'bi-lock-fill' },
          { id: 'riwayat-penilaian', label: 'Riwayat Bawahan', icon: 'bi-clock-history' },
          { id: 'laporan', label: 'Laporan & Dokumen', icon: 'bi-file-earmark-pdf-fill' }
        ];

      case 'REKAN_PNS':
      case 'PNS_PENILAI':
      case 'REKAN_PPPK':
      case 'PPPK_PENILAI':
        return [
          { id: 'dashboard', label: 'Dashboard Tugas 360°', icon: 'bi-grid-1x2-fill' },
          { id: 'penilaian-perilaku', label: 'Penilaian Perilaku (Tugas)', icon: 'bi-pencil-square' },
          { id: 'riwayat-penilaian', label: 'Riwayat Penilaian Saya', icon: 'bi-clock-history' }
        ];

      case 'PPPK_DINILAI':
      case 'PPPK':
        return [
          { id: 'dashboard', label: 'Dashboard PPPK', icon: 'bi-grid-1x2-fill' },
          { id: 'penilaian-hasil-kerja', label: 'Hasil Kerja & Bukti Dukung', icon: 'bi-file-earmark-arrow-up-fill' },
          { id: 'penilaian-kehadiran', label: 'Rekapitulasi Kehadiran', icon: 'bi-calendar-check-fill' },
          { id: 'hasil-penilaian', label: 'Hasil Evaluasi Saya', icon: 'bi-award-fill' },
          { id: 'riwayat-penilaian', label: 'Riwayat Evaluasi Pribadi', icon: 'bi-clock-history' }
        ];

      case 'ADMIN':
      default:
        return [
          { id: 'dashboard', label: 'Dashboard Eksekutif', icon: 'bi-speedometer2' },
          { id: 'penetapan-penilai', label: 'Penetapan Penilai 360°', icon: 'bi-people-fill' },
          { id: 'penilaian-hasil-kerja', label: 'Pengelolaan Hasil Kerja', icon: 'bi-journal-check' },
          { id: 'penilaian-perilaku', label: 'Pengelolaan Perilaku', icon: 'bi-heart-pulse-fill' },
          { id: 'penilaian-kehadiran', label: 'Kehadiran & Impor Absensi', icon: 'bi-file-earmark-arrow-up-fill' },
          { id: 'hasil-penilaian', label: 'Hasil Penilaian Rekap', icon: 'bi-trophy-fill' },
          { id: 'finalisasi', label: 'Monitoring Finalisasi', icon: 'bi-lock-fill' },
          { id: 'koreksi', label: 'Persetujuan Koreksi', icon: 'bi-unlock-fill', badge: pendingCorrectionCount > 0 ? pendingCorrectionCount : null, badgeColor: 'bg-rose-500' },
          { id: 'riwayat-penilaian', label: 'Riwayat Penilaian', icon: 'bi-clock-history' },
          { id: 'laporan', label: 'Laporan & Ekspor', icon: 'bi-file-earmark-spreadsheet-fill' },
          { id: 'pengaturan-periode', label: 'Pengaturan Periode & Bobot', icon: 'bi-sliders' },
          { id: 'audit-log', label: 'Log Audit & Aktivitas', icon: 'bi-journal-text' }
        ];
    }
  };

  const navTabs = getNavTabs();
  const activeTabMeta = navTabs.find(t => t.id === activeTab) || navTabs[0];

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans text-slate-800 flex flex-col antialiased">
      
      {/* Top Application Header */}
      <header className={`sticky top-0 z-40 border-b text-white shadow-md transition-colors duration-300 ${roleMeta.headerBg}`}>
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Mobile Toggle & Brand Identity */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Buka Menu Navigasi"
              className="lg:hidden p-2 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <i className="bi bi-list text-xl"></i>
            </button>

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            >
              <i className={`bi ${isSidebarCollapsed ? 'bi-layout-sidebar-inset' : 'bi-layout-sidebar'} text-lg`}></i>
            </button>

            <div className="flex items-center gap-3">
              <img 
                src={DEFAULT_LOGO} 
                alt="Logo DJKI" 
                className="w-8 h-8 object-contain drop-shadow shrink-0"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-extrabold tracking-wide text-white whitespace-nowrap block">
                  Evaluasi Kinerja PPPK
                </span>
                <span className="text-[10px] text-slate-300/80 font-medium whitespace-nowrap block">
                  DJKI · Kementerian Hukum RI
                </span>
              </div>
            </div>
          </div>

          {/* Center: Period Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-slate-100 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <i className="bi bi-calendar3 text-slate-300"></i>
              <span className="hidden md:inline text-[11px] text-slate-300">Periode:</span>
              <span className="max-w-[140px] sm:max-w-xs truncate text-xs text-white font-bold tabular-nums">
                {currentPeriod?.name || 'Semester I - 2026'}
              </span>
              <span className="hidden sm:inline text-[10px] text-emerald-300 font-semibold">· Aktif</span>
              <i className={`bi bi-chevron-${isPeriodDropdownOpen ? 'up' : 'down'} text-[10px] text-slate-300`}></i>
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Pilih Periode Penilaian
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {periods.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChangePeriod(p.id);
                        setIsPeriodDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-800 transition-colors ${
                        p.id === selectedPeriodId ? 'text-indigo-400 font-black bg-indigo-500/10' : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tahun {p.year} &bull; Sem {p.semester}</div>
                      </div>
                      {p.id === selectedPeriodId && (
                        <i className="bi bi-check-circle-fill text-indigo-400"></i>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Role & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Multi-role Switcher (if user has multiple verified roles) */}
            {realRoles.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ganti Peran Aktif Anda"
                >
                  <i className={`bi ${roleMeta.icon} text-indigo-400`}></i>
                  <span className="hidden xl:inline text-[11px]">{roleMeta.title}</span>
                  <i className={`bi bi-chevron-${isRoleDropdownOpen ? 'up' : 'down'} text-[10px] text-slate-400`}></i>
                </button>

                {isRoleDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      Pilih Peran Sah Anda
                    </div>
                    {realRoles.map(r => {
                      const meta = getRoleDisplay(r);
                      const isCur = r === activeRole;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            onSelectRole(r);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-slate-800 transition-colors ${
                            isCur ? 'text-indigo-400 font-black bg-indigo-500/10' : 'text-slate-300'
                          }`}
                        >
                          <i className={`bi ${meta.icon}`}></i>
                          <div className="flex-1 overflow-hidden">
                            <div className="font-bold truncate">{meta.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">{meta.subtitle}</div>
                          </div>
                          {isCur && <i className="bi bi-check2 text-indigo-400"></i>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Return to Main Portal Button (Admin & Editor only) */}
            {canReturnToPortal && (
              <button
                type="button"
                onClick={onReturnToPortal}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Kembali ke Dashboard Portal SDM KI Utama"
              >
                <i className="bi bi-box-arrow-left"></i>
                <span className="hidden md:inline">Portal SDM</span>
              </button>
            )}

            {/* User Profile Chip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-2xl hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-700"
              >
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-bold text-white max-w-[150px] truncate">
                    {activePegawai?.nama || 'Pengguna Terverifikasi'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    NIP: {activePegawai?.nip || '-'}
                  </div>
                </div>

                {activePegawai?.foto ? (
                  <img
                    src={activePegawai.foto}
                    alt={activePegawai.nama}
                    className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/30 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-black shadow shrink-0">
                    {activePegawai?.nama?.charAt(0) || 'U'}
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50 text-xs animate-fade-in">
                  <div className="pb-3 border-b border-slate-800">
                    <div className="font-black text-white text-sm truncate">{activePegawai?.nama || 'Pengguna'}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">NIP: {activePegawai?.nip || '-'}</div>
                    <div className="text-[11px] text-indigo-400 font-semibold mt-1 truncate">{activePegawai?.jabatan || '-'}</div>
                    <div className="text-[10px] text-slate-400 truncate">{activePegawai?.unitKerja || '-'}</div>
                  </div>

                  <div className="py-2 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">
                      Peran Aktif: <span className="text-indigo-400">{roleMeta.title}</span>
                    </div>
                  </div>

                  <div className={`pt-2 border-t border-slate-800 flex items-center ${canReturnToPortal ? 'justify-between' : 'justify-end'}`}>
                    {canReturnToPortal && (
                      <button
                        type="button"
                        onClick={onReturnToPortal}
                        className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <i className="bi bi-house-door"></i>
                        <span>Portal Utama</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer py-1"
                    >
                      <i className="bi bi-box-arrow-right"></i>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Main Body with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Dedicated Sidebar */}
        <aside 
          className={`${roleMeta.sidebarBg} border-r text-slate-300 flex flex-col justify-between shrink-0 transition-all duration-300 z-30 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          } ${
            isMobileMenuOpen ? 'fixed inset-y-0 left-0 pt-16 z-50' : 'hidden lg:flex'
          }`}
        >
          {/* Sidebar Top: Role Badge & Nav Tabs */}
          <div className="py-4 space-y-3 overflow-y-auto flex-1">
            
            {/* Role Header Banner inside Sidebar */}
            <div className={`mx-3 p-3 rounded-2xl border ${roleMeta.badgeBg} transition-all`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${roleMeta.chipColor} flex items-center justify-center text-white text-base shrink-0 shadow-sm`}>
                  <i className={`bi ${roleMeta.icon}`}></i>
                </div>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden">
                    <div className="text-[10px] font-bold tracking-wide text-slate-300/80">
                      Ruang Kerja Peran
                    </div>
                    <div className="text-xs font-extrabold text-white truncate">
                      {roleMeta.title}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="px-2.5 space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400">
                  Navigasi Modul
                </div>
              )}

              {navTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group relative ${
                      isActive
                        ? roleMeta.activeNavBg
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={isSidebarCollapsed ? tab.label : undefined}
                  >
                    <i className={`bi ${tab.icon} text-base shrink-0 ${isActive ? 'text-white' : `text-slate-400 ${roleMeta.iconHoverColor}`}`}></i>
                    
                    {!isSidebarCollapsed && (
                      <span className="flex-1 text-left truncate whitespace-nowrap">
                        {tab.label}
                      </span>
                    )}

                    {tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white tabular-nums ${tab.badgeColor || 'bg-indigo-500'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom: Back to Portal (Admin & Editor only) & Logout */}
          <div className="p-3 border-t border-white/10 space-y-1 shrink-0">
            {canReturnToPortal && (
              <button
                type="button"
                onClick={onReturnToPortal}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isSidebarCollapsed ? "Kembali ke Portal SDM KI" : undefined}
              >
                <i className="bi bi-arrow-left-circle text-base text-indigo-400 shrink-0"></i>
                {!isSidebarCollapsed && (
                  <span className="truncate whitespace-nowrap">Kembali ke Portal SDM</span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Keluar Akun" : undefined}
            >
              <i className="bi bi-box-arrow-right text-base shrink-0"></i>
              {!isSidebarCollapsed && (
                <span className="whitespace-nowrap">Keluar (Logout)</span>
              )}
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile menu */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
          ></div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-5">
            
            {/* Contextual Role Workspace Strip & Breadcrumb */}
            <div className={`rounded-2xl border px-4 py-3.5 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${roleMeta.bannerStyle}`}>
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${roleMeta.bannerIconBg}`}>
                  <i className={`bi ${roleMeta.icon}`}></i>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <span>Evaluasi PPPK</span>
                    <span aria-hidden="true">/</span>
                    <span className={`font-bold ${roleMeta.bannerAccentText}`}>{roleMeta.title}</span>
                    <span aria-hidden="true">/</span>
                    <span className="text-slate-800 font-semibold truncate">{activeTabMeta?.label || 'Dashboard'}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {roleMeta.roleNote}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                <div className="text-left md:text-right">
                  <div className="font-bold text-slate-800 truncate max-w-[200px]">
                    {activePegawai?.nama || 'Pengguna Terverifikasi'}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                    NIP {activePegawai?.nip || '-'} · {currentPeriod?.name || 'Semester Aktif'}
                  </div>
                </div>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>

    </div>
  );
};
