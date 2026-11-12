import React, { useState, useMemo } from 'react';
import { PPPKEvaluation, EvaluationPeriod, Pegawai } from '../../types';
import { SimRole } from '../../components/pppk/penilaian/RoleAndPeriodSelectorBar';
import { getPPPKEvaluations, approveCorrection } from '../../services/pppkEvaluationService';
import { getMasterPeriods } from '../../services/pppkPenilaianModuleService';

interface EvaluasiPPPKCorrectionTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  onRefreshData?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const EvaluasiPPPKCorrectionTab: React.FC<EvaluasiPPPKCorrectionTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  onRefreshData,
  showToast
}) => {
  const [evaluations, setEvaluations] = useState<PPPKEvaluation[]>(() => getPPPKEvaluations());
  const [selectedEvaluation, setSelectedEvaluation] = useState<PPPKEvaluation | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'REQUESTED' | 'APPROVED'>('REQUESTED');
  const [isApproving, setIsApproving] = useState(false);

  const reloadList = () => {
    const list = getPPPKEvaluations();
    setEvaluations(list);
    if (onRefreshData) onRefreshData();
  };

  const correctionList = useMemo(() => {
    return evaluations.filter(e => {
      if (filterStatus === 'REQUESTED') {
        return e.status === 'CORRECTION_REQUESTED';
      }
      if (filterStatus === 'APPROVED') {
        return Boolean(e.correctionApprovedAt);
      }
      return Boolean(e.correctionReason || e.status === 'CORRECTION_REQUESTED' || e.correctionApprovedAt);
    });
  }, [evaluations, filterStatus]);

  const handleApprove = async (id: string) => {
    if (!window.confirm('Setujui pembukaan koreksi data final evaluasi ini? Nilai akan dibuka kembali untuk diperbaiki.')) {
      return;
    }
    try {
      setIsApproving(true);
      const approverId = activePegawai?.nip || 'ADMIN';
      const approverName = activePegawai?.nama || 'Administrator SDM';
      approveCorrection(id, approverId, approverName);
      reloadList();
      setSelectedEvaluation(null);
      if (showToast) {
        showToast('Permohonan koreksi berhasil disetujui. Data evaluasi telah dibuka kembali untuk diedit.', 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err?.message || 'Gagal menyetujui koreksi evaluasi.', 'error');
      }
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <i className="bi bi-unlock-fill text-2xl"></i>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                <i className="bi bi-shield-check"></i>
                Prosedur Persetujuan Koreksi Data Final
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Persetujuan & Manajemen Koreksi Evaluasi PPPK
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Evaluasi yang telah difinalisasi terkunci secara permanen. Pembukaan kunci hanya dapat dilakukan melalui permohonan koreksi resmi yang disetujui oleh Administrator SDM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-amber-400 border border-slate-700">
              {correctionList.length} Permohonan
            </span>
            <button
              onClick={reloadList}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Segarkan Data"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterStatus('REQUESTED')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            filterStatus === 'REQUESTED'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="bi bi-clock-history"></i>
          <span>Menunggu Persetujuan</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
            {evaluations.filter(e => e.status === 'CORRECTION_REQUESTED').length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('APPROVED')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            filterStatus === 'APPROVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="bi bi-check-circle-fill"></i>
          <span>Riwayat Disetujui</span>
        </button>

        <button
          onClick={() => setFilterStatus('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            filterStatus === 'ALL'
              ? 'bg-slate-800 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <i className="bi bi-list-ul"></i>
          <span>Semua Permohonan</span>
        </button>
      </div>

      {/* List or Table */}
      {correctionList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3 text-2xl">
            <i className="bi bi-inbox"></i>
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada permohonan koreksi saat ini</h3>
          <p className="text-xs text-slate-500 mt-1">
            {filterStatus === 'REQUESTED' 
              ? 'Semua data evaluasi yang final berada dalam status terkunci dengan aman.' 
              : 'Belum ada riwayat koreksi yang tercatat.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Pegawai PPPK</th>
                  <th className="px-5 py-3.5">Periode</th>
                  <th className="px-5 py-3.5">Alasan Permohonan Koreksi</th>
                  <th className="px-5 py-3.5">Diajukan Oleh</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {correctionList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{item.nama || (item as any).employeeName || item.employeeId}</div>
                      <div className="text-[11px] text-slate-500">NIP: {item.employeeId}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {item.periodId}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-medium text-slate-800 line-clamp-2">
                        {item.correctionReason || '-'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Waktu: {item.correctionRequestedAt || item.updatedAt || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <span className="font-medium">{item.correctionRequestedBy || 'Penilai'}</span>
                    </td>
                    <td className="px-5 py-4">
                      {item.status === 'CORRECTION_REQUESTED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          <i className="bi bi-clock-fill"></i>
                          Menunggu Persetujuan
                        </span>
                      ) : item.correctionApprovedAt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i className="bi bi-check-circle-fill"></i>
                          Disetujui ({item.correctionApprovedBy || 'Admin'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700">
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.status === 'CORRECTION_REQUESTED' && (activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') ? (
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={isApproving}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50"
                        >
                          <i className="bi bi-unlock-fill"></i>
                          <span>Setujui Buka Kunci</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
