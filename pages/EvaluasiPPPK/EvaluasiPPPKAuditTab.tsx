import React, { useState, useMemo } from 'react';
import { PPPKAuditLogRecord } from '../../types';
import { getAuditLogs } from '../../services/pppkPenilaianModuleService';

export const EvaluasiPPPKAuditTab: React.FC = () => {
  const [logs, setLogs] = useState<PPPKAuditLogRecord[]>(() => getAuditLogs());
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const reloadLogs = () => {
    setLogs(getAuditLogs());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        !search ||
        (log.actorName || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.targetNip || '').includes(search);
      
      const matchAction = filterAction === 'ALL' || log.action === filterAction;
      return matchSearch && matchAction;
    });
  }, [logs, search, filterAction]);

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map(l => l.action).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <i className="bi bi-journal-text text-2xl"></i>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <i className="bi bi-shield-lock-fill"></i>
              Tamper-Proof Audit Trail
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">
              Log Audit & Riwayat Aktivitas Evaluasi PPPK
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Seluruh rekam jejak penetapan penilai, penilaian SKP, pengiriman perilaku, impor absensi, finalisasi, dan koreksi tercatat secara permanen untuk akuntabilitas.
            </p>
          </div>
        </div>

        <button
          onClick={reloadLogs}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 border border-slate-700 cursor-pointer self-start md:self-center"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, NIP, aksi, detail..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Aksi:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Aksi ({logs.length})</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <i className="bi bi-journal-x text-3xl text-slate-300"></i>
          <h3 className="text-sm font-bold text-slate-800 mt-2">Tidak ada log aktivitas ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau filter yang dipilih.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Waktu</th>
                  <th className="px-5 py-3.5">Pengguna / Aktor</th>
                  <th className="px-5 py-3.5">Aksi</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Detail & Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {log.timestamp}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{log.actorName || 'Sistem'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">NIP: {log.actorNip || '-'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{log.targetName || '-'}</div>
                      {log.targetNip && (
                        <div className="text-[10px] text-slate-500 font-mono">NIP: {log.targetNip}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-md">
                      <div className="font-medium text-slate-700 line-clamp-2">
                        {log.details || '-'}
                      </div>
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
