import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Pegawai } from '../types';
import { safeJsonToSheet, safeWriteExcel } from '../lib/excelSanitizer';
import {
  PopulatedOrganisasiNode,
  OrganisasiNodeDef,
  buildPopulatedOrganisasiTree,
  getAtasanLangsung,
  getAllPegawaiForNode
} from '../services/strukturOrganisasiService';

interface Props {
  allPegawai: Pegawai[];
  selectedNodeId?: string;
  onSelectNode?: (node: PopulatedOrganisasiNode) => void;
  onViewPegawaiDetail?: (pegawai: Pegawai) => void;
  onSelectForPenilaian?: (pegawai: Pegawai) => void;
}

export const StrukturOrganisasiTree: React.FC<Props> = ({
  allPegawai,
  selectedNodeId,
  onSelectNode,
  onViewPegawaiDetail,
  onSelectForPenilaian
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => {
    // Default: buka Ditjen dan semua Direktorat (level 0 dan 1)
    return new Set([
      'ditjen-ki',
      'dit-paten',
      'dit-merek',
      'dit-hakcipta',
      'dit-kerjasama',
      'sekretariat-djki',
      'bagian-umum',
      'dit-ti',
      'dit-gakkum'
    ]);
  });

  const [activeDetailNode, setActiveDetailNode] = useState<PopulatedOrganisasiNode | null>(null);

  // Bangun struktur pohon lengkap terpopulasi data pegawai
  const rootNode = useMemo(() => {
    return buildPopulatedOrganisasiTree(allPegawai);
  }, [allPegawai]);

  const toggleExpand = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const collectAll = (n: PopulatedOrganisasiNode): string[] => {
      const ids = [n.id];
      if (n.children) {
        n.children.forEach(c => ids.push(...collectAll(c)));
      }
      return ids;
    };
    setExpandedNodeIds(new Set(collectAll(rootNode)));
  };

  const collapseAll = () => {
    setExpandedNodeIds(new Set(['ditjen-ki']));
  };

  const handleExportSOTKExcel = (targetNode?: PopulatedOrganisasiNode) => {
    const isTargeted = Boolean(targetNode && targetNode.id !== 'ditjen-ki');
    const startNode = targetNode || rootNode;

    const wb = XLSX.utils.book_new();

    const autoFitColumns = (ws: XLSX.WorkSheet, data: any[]) => {
      if (!data || data.length === 0) return;
      const keys = Object.keys(data[0]);
      ws['!cols'] = keys.map(k => {
        let maxLen = k.length;
        data.forEach(row => {
          const val = row[k] !== undefined && row[k] !== null ? String(row[k]) : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
      });
    };

    // 1. Flatten all hierarchy nodes under startNode
    const collectNodes = (n: PopulatedOrganisasiNode, parentNama = '-'): any[] => {
      const levelLabelMap: Record<string, string> = {
        ditjen: 'Eselon I (Ditjen)',
        direktorat: 'Eselon II (Direktorat / Setditjen)',
        subdit_bagian: 'Eselon III (Subdit / Bagian)',
        subbagian: 'Eselon IV (Subbagian TU / Seksi)'
      };

      const rows: any[] = [{
        node: n,
        levelLabel: levelLabelMap[n.level] || n.level,
        parentNama
      }];

      if (n.children && n.children.length > 0) {
        n.children.forEach(c => {
          rows.push(...collectNodes(c, n.nama));
        });
      }
      return rows;
    };

    const flatNodes = collectNodes(startNode, startNode.parentId ? 'Unit Terkait' : 'Kementerian Hukum RI');

    // Sheet 1: Struktur & Pimpinan SOTK
    const strukturRows = flatNodes.map((item, idx) => {
      const n: PopulatedOrganisasiNode = item.node;
      return {
        'No': idx + 1,
        'Tingkat / Eselon': item.levelLabel,
        'Nama Satuan Kerja SOTK': n.nama,
        'Singkatan': n.shortName || '-',
        'Unit Atasan Langsung': item.parentNama,
        'Status Pimpinan': n.pimpinan ? 'Terisi' : 'Plt / Menginduk',
        'Nama Pimpinan / Penilai': n.pimpinan ? n.pimpinan.nama : '(Plt / Belum Terpetakan)',
        'NIP Pimpinan': n.pimpinan ? n.pimpinan.nip : '-',
        'Gol/Ruang Pimpinan': n.pimpinan ? (n.pimpinan.golRuang || '-') : '-',
        'Jabatan Pimpinan': n.pimpinan ? n.pimpinan.jabatan : '-',
        'Staf Terpetakan Langsung (Orang)': n.directPegawai ? n.directPegawai.length : 0,
        'Total Pegawai Di Bawah Unit (Orang)': n.totalPegawai || 0
      };
    });

    const wsStruktur = safeJsonToSheet(strukturRows);
    autoFitColumns(wsStruktur, strukturRows);
    XLSX.utils.book_append_sheet(wb, wsStruktur, "Hierarki & Pimpinan SOTK");

    // Sheet 2: Daftar Seluruh Personil SOTK & Atasan Penilai
    const relevantPegawaiList = isTargeted ? getAllPegawaiForNode(startNode) : allPegawai;
    const pegawaiRows = relevantPegawaiList.map((p, idx) => {
      const atasanInfo = getAtasanLangsung(p, allPegawai);
      return {
        'No': idx + 1,
        'NIP': p.nip || '-',
        'Nama Pegawai': p.nama || '-',
        'Jenis Pegawai': p.jenisPegawai || 'PNS',
        'Pangkat': p.pangkat || '-',
        'Gol/Ruang': p.golRuang || '-',
        'Jabatan': p.jabatan || '-',
        'Unit Kerja SOTK': atasanInfo.unitNode.nama || p.unitKerja || '-',
        'Sub Unit SOTK': atasanInfo.unitNode.shortName || '-',
        'Tingkat Hierarki': atasanInfo.levelLabel || '-',
        'Pejabat Penilai Kinerja (Atasan)': atasanInfo.atasan ? atasanInfo.atasan.nama : 'Menteri Hukum RI',
        'NIP Penilai Kinerja': atasanInfo.atasan ? atasanInfo.atasan.nip : '-',
        'Jabatan Penilai Kinerja': atasanInfo.atasan ? atasanInfo.atasan.jabatan : 'Menteri Hukum RI',
        'Status Kepegawaian': p.status || 'Aktif'
      };
    });

    const wsPegawai = safeJsonToSheet(pegawaiRows);
    autoFitColumns(wsPegawai, pegawaiRows);
    XLSX.utils.book_append_sheet(wb, wsPegawai, isTargeted ? "Personil Unit Ini" : "Pemetaan Seluruh Pegawai");

    // Sheet 3: Ringkasan Rekapitulasi Level SOTK
    const levelCounts: Record<string, { label: string; unitCount: number; pegawaiCount: number }> = {
      ditjen: { label: 'Eselon I - Direktorat Jenderal', unitCount: 0, pegawaiCount: 0 },
      direktorat: { label: 'Eselon II - Direktorat / Sekretariat', unitCount: 0, pegawaiCount: 0 },
      subdit_bagian: { label: 'Eselon III - Subdirektorat / Bagian', unitCount: 0, pegawaiCount: 0 },
      subbagian: { label: 'Eselon IV - Subbagian TU / Seksi', unitCount: 0, pegawaiCount: 0 }
    };

    flatNodes.forEach(item => {
      const lvl = item.node.level;
      if (levelCounts[lvl]) {
        levelCounts[lvl].unitCount++;
        levelCounts[lvl].pegawaiCount += (item.node.directPegawai ? item.node.directPegawai.length : 0);
      }
    });

    const rekapRows = Object.values(levelCounts).map((val, idx) => ({
      'No': idx + 1,
      'Tingkat Level SOTK': val.label,
      'Jumlah Unit Organisasi': val.unitCount,
      'Jumlah Staf Terpetakan Langsung': val.pegawaiCount,
      'Persentase Pegawai': relevantPegawaiList.length > 0 ? `${((val.pegawaiCount / relevantPegawaiList.length) * 100).toFixed(1)}%` : '0%'
    }));

    const wsRekap = safeJsonToSheet(rekapRows);
    autoFitColumns(wsRekap, rekapRows);
    XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Level SOTK");

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = isTargeted
      ? `SOTK_DJKI_${(startNode.shortName || startNode.nama).replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.xlsx`
      : `Bagan_Struktur_Organisasi_SOTK_DJKI_${dateStr}.xlsx`;

    safeWriteExcel(wb, fileName);
  };

  const getNodeBadgeColor = (colorType: OrganisasiNodeDef['colorType']) => {
    switch (colorType) {
      case 'red':
        return {
          box: 'bg-rose-500 text-white shadow-rose-200',
          border: 'border-rose-500',
          pill: 'bg-rose-50 text-rose-700 border-rose-200',
          indicator: 'bg-rose-500'
        };
      case 'orange':
        return {
          box: 'bg-amber-500 text-white shadow-amber-200',
          border: 'border-amber-500',
          pill: 'bg-amber-50 text-amber-800 border-amber-200',
          indicator: 'bg-amber-500'
        };
      case 'green':
        return {
          box: 'bg-lime-600 text-white shadow-lime-200',
          border: 'border-lime-500',
          pill: 'bg-lime-50 text-lime-800 border-lime-200',
          indicator: 'bg-lime-500'
        };
      case 'blue':
        return {
          box: 'bg-blue-600 text-white shadow-blue-200',
          border: 'border-blue-500',
          pill: 'bg-blue-50 text-blue-800 border-blue-200',
          indicator: 'bg-blue-600'
        };
    }
  };

  // Render rekursif dari tiap node hierarki
  const renderTreeNode = (node: PopulatedOrganisasiNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodeIds.has(node.id);
    const isSelected = selectedNodeId === node.id || activeDetailNode?.id === node.id;
    const color = getNodeBadgeColor(node.colorType);

    const matchesSearch = searchKeyword.trim()
      ? node.nama.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (node.pimpinan && node.pimpinan.nama.toLowerCase().includes(searchKeyword.toLowerCase()))
      : true;

    return (
      <div key={node.id} className="relative">
        <div
          onClick={() => {
            setActiveDetailNode(node);
          }}
          className={`group flex items-center justify-between p-2.5 my-1 rounded-xl cursor-pointer transition-all border ${
            isSelected
              ? 'bg-blue-50/90 border-blue-400 shadow-sm ring-2 ring-blue-400/20'
              : matchesSearch && searchKeyword
              ? 'bg-amber-50/70 border-amber-300'
              : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {/* Expand / Collapse Button */}
            {hasChildren ? (
              <button
                type="button"
                onClick={e => toggleExpand(node.id, e)}
                className="w-5 h-5 flex items-center justify-center rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors shrink-0 shadow-xs"
                title={isExpanded ? 'Tutup' : 'Buka'}
              >
                <i className={`bi ${isExpanded ? 'bi-dash' : 'bi-plus'}`}></i>
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              </div>
            )}

            {/* Kotak Berwarna Sesuai Bagan (Merah, Jingga, Hijau, Biru) */}
            <div
              className={`w-3.5 h-3.5 rounded-sm shrink-0 shadow-xs ${color.box}`}
              title={`Level: ${node.level}`}
            ></div>

            {/* Nama Unit & Pimpinan Singkat */}
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-tight truncate ${isSelected ? 'text-blue-900 font-extrabold' : 'text-slate-800'}`}>
                  {node.nama}
                </span>
                {node.shortName && (
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {node.shortName}
                  </span>
                )}
              </div>

              {node.pimpinan ? (
                <span className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                  <i className="bi bi-person-badge text-blue-600 text-[10px]"></i>
                  <span className="font-semibold text-slate-700">{node.pimpinan.nama}</span>
                  <span className="text-slate-400">({node.pimpinan.jabatan})</span>
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 italic mt-0.5">
                  Pimpinan Plt / Menginduk ke Atasan
                </span>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Jumlah Pegawai & Tombol Aksi */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${color.pill}`}
              title={`${node.directPegawai.length} staf langsung, ${node.totalPegawai} total keseluruhan`}
            >
              <i className="bi bi-people-fill mr-1 opacity-70"></i>
              {node.totalPegawai}
            </span>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setActiveDetailNode(node);
                if (onSelectNode) onSelectNode(node);
              }}
              className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 bg-white shadow-xs flex items-center gap-1 cursor-pointer"
              title={`Filter tabel ke unit: ${node.nama}`}
            >
              <i className="bi bi-funnel"></i>
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Render Anak jika Expanded */}
        {hasChildren && isExpanded && (
          <div className="border-l border-dashed border-slate-200 ml-6 pl-1">
            {node.children!.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
      {/* Panel Kiri: Bagan Hierarki Organisasi SOTK */}
      <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
        {/* Header Bagan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-blue-500/30">
                <i className="bi bi-diagram-3-fill"></i>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                  Struktur Organisasi Per Direktorat (SOTK DJKI)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bagan hierarki unit kerja & pemetaan Pejabat Penilai Kinerja langsung
                </p>
              </div>
            </div>
          </div>

          {/* Kontrol Buka/Tutup & Export Excel */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportSOTKExcel()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Unduh seluruh struktur hierarki SOTK DJKI dan pemetaan pegawai ke file Excel"
            >
              <i className="bi bi-file-earmark-excel-fill text-xs"></i>
              <span>Unduh Excel SOTK</span>
            </button>
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <i className="bi bi-arrows-expand mr-1"></i> Buka Semua
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <i className="bi bi-arrows-collapse mr-1"></i> Tutup
            </button>
          </div>
        </div>

        {/* Legenda Warna Sesuai Bagan Gambar */}
        <div className="flex flex-wrap items-center gap-3 py-3 px-3.5 my-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
          <span className="font-bold text-slate-600 mr-1">Legenda SOTK:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
            <span className="text-slate-700 font-medium">Ditjen (Eselon I)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500"></span>
            <span className="text-slate-700 font-medium">Direktorat / Setditjen (Eselon II)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-lime-600"></span>
            <span className="text-slate-700 font-medium">Subdirektorat / Bagian (Eselon III)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-blue-600"></span>
            <span className="text-slate-700 font-medium">Subbagian TU / Seksi (Eselon IV)</span>
          </span>
        </div>

        {/* Input Pencarian Unit / Pimpinan */}
        <div className="relative mb-3">
          <i className="bi bi-search absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Cari direktorat, subdirektorat, atau nama pimpinan penilai..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <i className="bi bi-x-circle-fill text-xs"></i>
            </button>
          )}
        </div>

        {/* Pohon Tree View Container */}
        <div className="flex-1 overflow-y-auto max-h-[560px] pr-2 custom-scrollbar">
          {renderTreeNode(rootNode, 0)}
        </div>
      </div>

      {/* Panel Kanan: Detail Unit Kerja & Pejabat Penilai Kinerja Terpilih */}
      <div className="w-full lg:w-96 p-5 bg-slate-50/60 flex flex-col justify-between">
        {activeDetailNode ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 mb-1.5">
                  {activeDetailNode.level.toUpperCase().replace('_', ' ')}
                </span>
                <h4 className="text-sm font-black text-slate-900 leading-snug">
                  {activeDetailNode.nama}
                </h4>
              </div>
            </div>

            {/* Kartu Pejabat Penilai (Atasan Langsung) */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-700 uppercase tracking-wider">
                <i className="bi bi-shield-check"></i> Pejabat Penilai Kinerja Definitif
              </div>

              {activeDetailNode.pimpinan ? (
                <div className="flex items-start gap-3 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {activeDetailNode.pimpinan.foto ? (
                      <img
                        src={activeDetailNode.pimpinan.foto}
                        alt={activeDetailNode.pimpinan.nama}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <i className="bi bi-person-fill text-xl text-slate-400"></i>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {activeDetailNode.pimpinan.nama}
                    </p>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                      {activeDetailNode.pimpinan.jabatan}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      NIP {activeDetailNode.pimpinan.nip}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Belum ada pejabat definitif pada sub-unit ini. Penilaian dialihkan ke pimpinan unit di atasnya.
                </p>
              )}
            </div>

            {/* Rekapitulasi Personil */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Staf Unit Ini
                </span>
                <span className="text-lg font-black text-slate-900">
                  {activeDetailNode.directPegawai.length}
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Bawahan
                </span>
                <span className="text-lg font-black text-blue-600">
                  {activeDetailNode.totalPegawai}
                </span>
              </div>
            </div>

            {/* Cuplikan Daftar Pegawai di Unit Ini */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Daftar Personil ({activeDetailNode.directPegawai.length})</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                {activeDetailNode.directPegawai.length > 0 ? (
                  activeDetailNode.directPegawai.slice(0, 15).map((peg, idx) => {
                    const atasanInfo = getAtasanLangsung(peg, allPegawai);
                    return (
                      <div
                        key={`${peg.nip || peg.id || 'dir'}-${idx}`}
                        className="p-2 rounded-lg bg-white border border-slate-100 hover:border-blue-200 text-xs flex items-center justify-between group transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-800 truncate text-[11px]">{peg.nama}</p>
                          <p className="text-[10px] text-slate-500 truncate">{peg.jabatan}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[9px] text-blue-700 font-medium truncate">
                            <i className="bi bi-arrow-return-right"></i>
                            <span>Penilai: {atasanInfo.atasan?.nama || 'Menteri Hukum RI'}</span>
                          </div>
                        </div>

                        {onViewPegawaiDetail && (
                          <button
                            type="button"
                            onClick={() => onViewPegawaiDetail(peg)}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 shrink-0"
                          >
                            Detail
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    Tidak ada staf yang terpetakan langsung di induk unit ini (staf berada di sub-unit bawahnya).
                  </p>
                )}
                {activeDetailNode.directPegawai.length > 15 && (
                  <p className="text-[10px] text-center text-slate-400 pt-1">
                    +{activeDetailNode.directPegawai.length - 15} pegawai lainnya (gunakan filter tabel untuk melihat semua)
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl">
              <i className="bi bi-hand-index-thumb"></i>
            </div>
            <div>
              <p className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Pilih Satuan Kerja
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                Klik salah satu direktorat, subdirektorat, atau subbagian di samping untuk melihat pimpinan pejabat penilai & personilnya.
              </p>
            </div>
          </div>
        )}

        {/* Tombol Aksi Detail Satuan Kerja */}
        {activeDetailNode && (
          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={() => handleExportSOTKExcel(activeDetailNode)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              title={`Unduh data unit ${activeDetailNode.nama} dan seluruh personilnya ke file Excel`}
            >
              <i className="bi bi-file-earmark-excel-fill"></i> Unduh Excel Unit Ini ({activeDetailNode.totalPegawai} ASN)
            </button>
            {onSelectNode && (
              <button
                type="button"
                onClick={() => onSelectNode(activeDetailNode)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 transition-colors cursor-pointer active:scale-95"
              >
                <i className="bi bi-funnel-fill"></i> Tampilkan {activeDetailNode.totalPegawai} Pegawai di Tabel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
