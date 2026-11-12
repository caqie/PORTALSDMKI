import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import {
  PPPKEvaluation,
  EvaluationPeriod,
  PPPKPenugasanPenilai,
  Pegawai,
  BehaviorAspect,
  BehaviorAssessment,
  PPPKConfigSettings
} from '../../types';
import {
  initializePPPKEvaluationData,
  getEvaluationPeriods,
  getPPPKEvaluations,
  getBehaviorAspects,
  getPPPKSettings,
  savePPPKSettings,
  getPPPKLogs,
  createOrUpdateEvaluation,
  recalculateEvaluation,
  finalizeEvaluation,
  requestCorrection,
  approveCorrection,
  deleteEvaluation,
  saveEvaluationPeriod,
  deleteEvaluationPeriod,
  saveBehaviorAspect,
  deleteBehaviorAspect,
  saveBehaviorAssessment,
  getPPPKEmployees,
  getEvaluationAssignments,
  getAllEmployees
} from '../../services/pppkEvaluationService';
import {
  getPenugasanPenilaiList,
  getMasterPeriodePenilaian,
  saveMasterPeriodePenilaian,
  deleteMasterPeriodePenilaian
} from '../../services/pppkPenilaianModuleService';

// Layout & Login
import { EvaluasiPPPKLayout } from './EvaluasiPPPKLayout';
import { EvaluasiPPPKLoginPage } from './EvaluasiPPPKLoginPage';
import { EvaluasiPPPKCorrectionTab } from './EvaluasiPPPKCorrectionTab';
import { EvaluasiPPPKAuditTab } from './EvaluasiPPPKAuditTab';

// 10 Enterprise Submenus
import { SimRole } from '../../components/pppk/penilaian/RoleAndPeriodSelectorBar';
import { PPPKDashboardTab as PPPKEnterpriseDashboardTab } from '../../components/pppk/penilaian/PPPKDashboardTab';
import { PPPKPenetapanPenilaiTab } from '../../components/pppk/penilaian/PPPKPenetapanPenilaiTab';
import { PPPKPenilaianHasilKerjaTab } from '../../components/pppk/penilaian/PPPKPenilaianHasilKerjaTab';
import { PPPKPenilaianPerilakuTab } from '../../components/pppk/penilaian/PPPKPenilaianPerilakuTab';
import { PPPKPenilaianKehadiranTab } from '../../components/pppk/penilaian/PPPKPenilaianKehadiranTab';
import { PPPKHasilPenilaianTab } from '../../components/pppk/penilaian/PPPKHasilPenilaianTab';
import { PPPKFinalisasiTab } from '../../components/pppk/penilaian/PPPKFinalisasiTab';
import { PPPKRiwayatPenilaianTab } from '../../components/pppk/penilaian/PPPKRiwayatPenilaianTab';
import { PPPKLaporanTab } from '../../components/pppk/penilaian/PPPKLaporanTab';
import { PPPKPengaturanPeriodeTab } from '../../components/pppk/penilaian/PPPKPengaturanPeriodeTab';

export const EvaluasiPPPKApp: React.FC = () => {
  const { user, logout, isAuthenticated, isSuperadmin } = useAuth();

  // Load employee master list and periods
  const [allEmployees, setAllEmployees] = useState<Pegawai[]>(() => getAllEmployees());
  const [enterprisePeriods, setEnterprisePeriods] = useState<EvaluationPeriod[]>(() => getMasterPeriodePenilaian());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('PERIOD-2026-I');
  const [assignments, setAssignments] = useState<PPPKPenugasanPenilai[]>(() => getPenugasanPenilaiList());
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Sync data initialization
  useEffect(() => {
    try {
      initializePPPKEvaluationData();
      setEnterprisePeriods(getMasterPeriodePenilaian());
      setAssignments(getPenugasanPenilaiList());
      setAllEmployees(getAllEmployees());
    } catch (e) {
      console.warn("Init data warning in EvaluasiPPPKApp:", e);
    }
  }, []);

  // Superadmin Simulation Mode (strictly testing only)
  const isUserSuperadmin = Boolean(
    isSuperadmin ||
    user?.role === 'Superadmin' ||
    (Array.isArray(user?.roles) && user.roles.includes('Superadmin'))
  );
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const isSimulationActive = isUserSuperadmin && isSimulationMode;
  const [simRole, setSimRole] = useState<SimRole>('ADMIN');
  const [simPegawai, setSimPegawai] = useState<Pegawai | null>(null);

  // Authentically resolve realPegawai (NO DUMMY NIP 198801012015031001, NO DUMMY USER-ADMIN)
  const { realPegawai, isUnlinkedPegawai } = useMemo(() => {
    if (!user) return { realPegawai: null, isUnlinkedPegawai: false };

    const cleanUserNip = (user.nip || '').replace(/\D/g, '');
    const matched = allEmployees.find(e => {
      const cleanEmpNip = (e.nip || '').replace(/\D/g, '');
      if (cleanUserNip && cleanEmpNip && cleanUserNip === cleanEmpNip) return true;
      if (user.id && (e.id === user.id || e.nip === user.id)) return true;
      if (user.name && e.nama && (
        e.nama.toLowerCase().trim() === user.name.toLowerCase().trim()
      )) return true;
      return false;
    });

    if (matched) {
      return { realPegawai: matched, isUnlinkedPegawai: false };
    }

    // Explicitly unlinked: Do NOT invent fake NIP or role
    return {
      realPegawai: {
        id: user.id || user.nip || 'UNLINKED',
        nip: user.nip || '',
        nama: user.name || 'Pengguna Belum Terhubung',
        jabatan: user.role || 'Staf',
        unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
        jenisPegawai: (user.role && user.role.toLowerCase().includes('pppk')) ? 'PPPK' : 'PNS',
        status: 'Aktif'
      } as Pegawai,
      isUnlinkedPegawai: true
    };
  }, [allEmployees, user]);

  // Authentically derive realRoles from verified data and assignments
  // NO keyword guessing on 'direktur' / 'ketua tim' / 'koordinator'
  const realRoles = useMemo<SimRole[]>(() => {
    if (!user) return [];
    const roles: SimRole[] = [];
    const userNip = realPegawai?.nip || user?.nip || '';

    // 1. Administrator SDM / Editor Otoritas Sistem
    const isAdminSDM = Boolean(
      isUserSuperadmin ||
      user?.role === 'Admin SDM' ||
      user?.role === 'Admin' ||
      user?.role === 'Administrator' ||
      user?.role === 'Editor' ||
      (Array.isArray(user?.roles) && (
        user.roles.includes('Superadmin') ||
        user.roles.includes('Admin SDM') ||
        user.roles.includes('Admin') ||
        user.roles.includes('Editor') ||
        user.roles.includes('Admin Perencanaan & Layanan') ||
        user.roles.includes('Admin Pengelolaan Karier') ||
        user.roles.includes('Admin Pengembangan Kompetensi')
      ))
    );
    if (isAdminSDM) {
      roles.push('ADMIN');
    }

    // 2. Pejabat Penilai Kinerja (Atasan Langsung)
    // Strictly derived from assignments database where user is assigned as pejabatPenilaiId
    const hasAssignedPppk = assignments.some(a => 
      a && ((a.pejabatPenilaiId && a.pejabatPenilaiId === userNip) || ((a as any).pejabatPenilaiNip && (a as any).pejabatPenilaiNip === userNip))
    );
    if (hasAssignedPppk) {
      roles.push('PEJABAT_PENILAI');
    }

    // 3. Pegawai PPPK yang Dinilai
    // Strictly derived from employee category or being the subject pppkDinilaiId in assignments
    const isPppkEmployee = Boolean(
      (realPegawai?.jenisPegawai || (realPegawai as any)?.status || '').toUpperCase().includes('PPPK') ||
      assignments.some(a => a && ((a.pppkDinilaiId && a.pppkDinilaiId === userNip) || ((a as any).pppkDinilaiNip && (a as any).pppkDinilaiNip === userNip)))
    );
    if (isPppkEmployee) {
      roles.push('PPPK_DINILAI');
    }

    // 4. Penilai Eksternal (Rekan Kerja PNS)
    const isRekanPns = assignments.some(a => a && ((a.rekanPnsId && a.rekanPnsId === userNip) || ((a as any).rekanPnsNip && (a as any).rekanPnsNip === userNip)));
    if (isRekanPns) {
      roles.push('PNS_PENILAI');
    }

    // 5. Penilai Eksternal (Rekan Kerja PPPK)
    const isRekanPppk = assignments.some(a => a && ((a.rekanPppkId && a.rekanPppkId === userNip) || ((a as any).rekanPppkNip && (a as any).rekanPppkNip === userNip)));
    if (isRekanPppk) {
      roles.push('PPPK_PENILAI');
    }

    // Fallback if no specific role matched:
    if (roles.length === 0) {
      if (isAdminSDM) {
        roles.push('ADMIN');
      } else if (isPppkEmployee) {
        roles.push('PPPK_DINILAI');
      } else {
        // If employee is PNS but not yet assigned as supervisor, set PEJABAT_PENILAI as viewer
        roles.push('PEJABAT_PENILAI');
      }
    }

    return Array.from(new Set(roles));
  }, [realPegawai, user, isUserSuperadmin, assignments]);

  // Selected active role
  const [selectedRealRole, setSelectedRealRole] = useState<SimRole | null>(null);

  const effectiveRealRole: SimRole = useMemo(() => {
    if (selectedRealRole && realRoles.includes(selectedRealRole)) {
      return selectedRealRole;
    }
    return realRoles[0] || 'PPPK_DINILAI';
  }, [selectedRealRole, realRoles]);

  const activeRole: SimRole = isSimulationActive ? simRole : effectiveRealRole;
  const activePegawai: Pegawai | null = isSimulationActive ? simPegawai : realPegawai;

  // Active Tab & URL syncing
  const getInitialTabFromUrl = (): string => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('penetapan')) return 'penetapan-penilai';
    if (path.includes('hasil-kerja')) return 'penilaian-hasil-kerja';
    if (path.includes('perilaku')) return 'penilaian-perilaku';
    if (path.includes('kehadiran')) return 'penilaian-kehadiran';
    if (path.includes('hasil-penilaian')) return 'hasil-penilaian';
    if (path.includes('finalisasi')) return 'finalisasi';
    if (path.includes('riwayat')) return 'riwayat-penilaian';
    if (path.includes('laporan')) return 'laporan';
    if (path.includes('pengaturan')) return 'pengaturan-periode';
    if (path.includes('koreksi')) return 'koreksi';
    if (path.includes('audit')) return 'audit-log';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTabFromUrl);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    // Sync browser address bar with standalone namespace prefix
    const newPath = tabId === 'dashboard' ? '/EvaluasiPPPK' : `/EvaluasiPPPK/${tabId}`;
    try {
      window.history.pushState(null, '', newPath);
    } catch (e) {}
  };

  const handleReturnToPortal = () => {
    window.location.href = '/';
  };

  const handleLogout = () => {
    logout();
    try {
      window.history.pushState(null, '', '/EvaluasiPPPK/login');
    } catch (e) {}
  };

  const refreshAllData = useCallback(() => {
    setAssignments(getPenugasanPenilaiList());
    setEnterprisePeriods(getMasterPeriodePenilaian());
    setAllEmployees(getAllEmployees());
  }, []);

  // If user is not authenticated, show standalone Evaluasi PPPK Login
  if (!isAuthenticated) {
    return (
      <EvaluasiPPPKLoginPage
        onSuccessLogin={() => {
          showToast('Berhasil masuk ke Sistem Evaluasi Kinerja PPPK DJKI.', 'success');
        }}
        onReturnToPortal={handleReturnToPortal}
      />
    );
  }

  // Active period entity
  const currentPeriod = enterprisePeriods.find(p => p.id === selectedPeriodId) || enterprisePeriods[0];

  // Count pending items
  const pendingCorrections = getPPPKEvaluations().filter(e => e.status === 'CORRECTION_REQUESTED').length;
  const pendingAssignments = assignments.filter(a => a.status === 'MENUNGGU_VERIFIKASI').length;

  return (
    <EvaluasiPPPKLayout
      activeRole={activeRole}
      activePegawai={activePegawai}
      realRoles={realRoles}
      onSelectRole={(r) => setSelectedRealRole(r)}
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      periods={enterprisePeriods}
      selectedPeriodId={selectedPeriodId}
      onChangePeriod={(pid) => setSelectedPeriodId(pid)}
      onLogout={handleLogout}
      onReturnToPortal={handleReturnToPortal}
      pendingCorrectionCount={pendingCorrections}
      pendingAssignmentCount={pendingAssignments}
      isSimulationActive={isSimulationActive}
      onToggleSimulation={() => setIsSimulationMode(!isSimulationMode)}
    >
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl bg-slate-900 text-white border border-slate-700 animate-fade-in text-xs font-bold">
          {toast.type === 'success' && <i className="bi bi-check-circle-fill text-emerald-400 text-base"></i>}
          {toast.type === 'error' && <i className="bi bi-exclamation-triangle-fill text-rose-400 text-base"></i>}
          {toast.type === 'info' && <i className="bi bi-info-circle-fill text-blue-400 text-base"></i>}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Warning if account is not linked to official master pegawai */}
      {isUnlinkedPegawai && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-900 flex items-start gap-3 text-xs">
          <i className="bi bi-shield-exclamation text-amber-600 text-lg shrink-0 mt-0.5"></i>
          <div>
            <div className="font-black text-amber-950 uppercase tracking-wide">Pemberitahuan Status Akun</div>
            <p className="mt-0.5 text-amber-800">
              Akun Anda telah terotentikasi, namun data NIP ({user?.nip || '-'}) belum terhubung dengan master pegawai resmi DJKI. Fitur penilaian operasional dinonaktifkan hingga data penugasan Anda dipetakan oleh Administrator SDM.
            </p>
          </div>
        </div>
      )}

      {/* Render Active Tab Content */}
      {activeTab === 'dashboard' && (
        <PPPKEnterpriseDashboardTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          onNavigateTab={(tabKey, assignmentId) => {
            if (assignmentId) setSelectedAssignmentId(assignmentId);
            handleSelectTab(tabKey);
          }}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
        />
      )}

      {activeTab === 'penetapan-penilai' && (
        <PPPKPenetapanPenilaiTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          allPegawai={allEmployees}
          allEmployees={allEmployees}
          selectedAssignmentId={selectedAssignmentId}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          onNavigateToNext={(id) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab('penilaian-hasil-kerja');
          }}
          showToast={showToast}
        />
      )}

      {activeTab === 'penilaian-hasil-kerja' && (
        <PPPKPenilaianHasilKerjaTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          preselectedAssignmentId={selectedAssignmentId}
          onNavigateNext={(id) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab('penilaian-perilaku');
          }}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'penilaian-perilaku' && (
        <PPPKPenilaianPerilakuTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          preselectedAssignmentId={selectedAssignmentId}
          onNavigateNext={(id) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab('penilaian-kehadiran');
          }}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'penilaian-kehadiran' && (
        <PPPKPenilaianKehadiranTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          onNavigateTab={(tabKey?: string, id?: string) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab((tabKey as any) || 'hasil-penilaian');
          }}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'hasil-penilaian' && (
        <PPPKHasilPenilaianTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          preselectedAssignmentId={selectedAssignmentId}
          onNavigateToFinalisasi={(id?: string) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab('finalisasi');
          }}
          onNavigateTab={(tabKey?: string, id?: string) => {
            if (id) setSelectedAssignmentId(id);
            handleSelectTab((tabKey as any) || 'finalisasi');
          }}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'finalisasi' && (
        <PPPKFinalisasiTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'koreksi' && (
        <EvaluasiPPPKCorrectionTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          onRefreshData={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'riwayat-penilaian' && (
        <PPPKRiwayatPenilaianTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          periods={enterprisePeriods}
          assignments={assignments}
          onSelectPeriod={(pid: string) => setSelectedPeriodId(pid)}
          onNavigateTab={(tabKey?: string, id?: string) => {
            if (id) setSelectedAssignmentId(id);
            if (tabKey) handleSelectTab(tabKey as any);
          }}
        />
      )}

      {activeTab === 'laporan' && (
        <PPPKLaporanTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          selectedPeriod={currentPeriod}
          selectedPeriodId={selectedPeriodId}
          assignments={assignments}
          selectedAssignmentId={selectedAssignmentId}
          preselectedAssignmentId={selectedAssignmentId}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'pengaturan-periode' && (
        <PPPKPengaturanPeriodeTab
          activeRole={activeRole}
          activePegawai={activePegawai}
          periods={enterprisePeriods}
          onRefreshData={refreshAllData}
          onRefreshAll={refreshAllData}
          showToast={showToast}
        />
      )}

      {activeTab === 'audit-log' && (
        <EvaluasiPPPKAuditTab />
      )}

    </EvaluasiPPPKLayout>
  );
};

export default EvaluasiPPPKApp;
