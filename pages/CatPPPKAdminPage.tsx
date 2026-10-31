import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  Award,
  Users,
  Search,
  Download,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import {
  HasilCatPPPK,
  getHasilCatPPPKList,
  getBankSoalPPPK,
  simpanHasilCatPPPK
} from '../services/catPPPKService';
import { Pegawai } from '../types';
import { safeJsonToSheet, safeWriteExcel } from '../lib/excelSanitizer';

export const CatPPPKAdminPage: React.FC = () => {
  const [results, setResults] = useState<HasilCatPPPK[]>([]);
  const [allPPPK, setAllPPPK] = useState<Pegawai[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRekomendasi, setFilterRekomendasi] = useState('Semua');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const navigate = useNavigate();

  const loadData = () => {
    const list = getHasilCatPPPKList();
    setResults(list);

    const cached = localStorage.getItem('portal_pegawai_db');
    if (cached) {
      try {
        const parsed: Pegawai[] = JSON.parse(cached);
        const pppks = parsed.filter(p => {
          const jen = (p.jenisPegawai || '').toUpperCase();
          const stat = (p.status || '').toUpperCase();
          return jen.includes('PPPK') && stat === 'AKTIF';
        });
        setAllPPPK(pppks);
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    allPPPK.forEach(p => {
      if (p.unitKerja) set.add(p.unitKerja);
    });
    results.forEach(r => {
      if (r.unitKerja) set.add(r.unitKerja);
    });
    return Array.from(set).sort();
  }, [allPPPK, results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchSearch = searchTerm
        ? (r.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.nip || '').includes(searchTerm)
        : true;

      const matchRekomendasi = filterRekomendasi === 'Semua'
        ? true
        : r.rekomendasi.includes(filterRekomendasi);

      const matchUnit = filterUnit === 'Semua Unit'
        ? true
        : r.unitKerja === filterUnit;

      return matchSearch && matchRekomendasi && matchUnit;
    });
  }, [results, searchTerm, filterRekomendasi, filterUnit]);

  // Statistics
  const totalPPPKCount = allPPPK.length > 0 ? allPPPK.length : Math.max(results.length, 10);
  const sudahUjianCount = results.length;
  const belumUjianCount = Math.max(0, totalPPPKCount - sudahUjianCount);
  const avgScore = results.length > 0
    ? (results.reduce((acc, curr) => acc + curr.nilaiSkala100, 0) / results.length).toFixed(1)
    : '0';

  const handleExportExcel = () => {
    if (results.length === 0) {
      alert('Belum ada data hasil ujian CAT PPPK yang tersimpan.');
      return;
    }

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
        return { wch: Math.min(Math.max(maxLen + 3, 10), 55) };
      });
    };

    const exportRows = results.map((r, idx) => ({
      'No': idx + 1,
      'NIP PPPK': r.nip,
      'Nama Pegawai': r.nama,
      'Jabatan': r.jabatan,
      'Unit Kerja': r.unitKerja,
      'Tanggal CAT': r.tanggalUjian,
      'Durasi (Menit)': r.durasiPengerjaanMenit,
      'Skor Manajerial': r.skorManajerial,
      'Skor Sosio Kultural': r.skorSosioKultural,
      'Skor Teknis DJKI': r.skorTeknis,
      'Skor BerAKHLAK': r.skorBerakhlak,
      'Nilai Akhir (Skala 100)': r.nilaiSkala100,
      'Rekomendasi Kontrak': r.rekomendasi,
      'Keterangan Rekomendasi': r.keterangan
    }));

    const ws = safeJsonToSheet(exportRows);
    autoFitColumns(ws, exportRows);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Hasil CAT PPPK");

    const dateStr = new Date().toISOString().split('T')[0];
    safeWriteExcel(wb, `Rekap_Hasil_CAT_Evaluasi_PPPK_DJKI_${dateStr}.xlsx`);
  };

  const handleResetSimulasi = () => {
    if (window.confirm('Hapus seluruh riwayat hasil ujian CAT PPPK untuk mengulang pengujian dari awal?')) {
      localStorage.removeItem('cat_pppk_results');
      sessionStorage.removeItem('cat_pppk_last_result');
      setResults([]);
    }
  };

  const handleSeedDummySample = () => {
    const samplePPPK = allPPPK.length > 0 ? allPPPK.slice(0, 5) : [
      { nip: '199204152023211002', nama: 'Ahmad Fauzi, S.Kom.', unitKerja: 'Direktorat Teknologi Informasi KI', jabatan: 'Ahli Pertama - Pranata Komputer' },
      { nip: '199507112023212005', nama: 'Siti Nurhaliza, S.H.', unitKerja: 'Direktorat Hak Cipta dan Desain Industri', jabatan: 'Ahli Pertama - Analis Hukum' },
      { nip: '199101202023211008', nama: 'Budi Santoso, S.Sos.', unitKerja: 'Sekretariat Direktorat Jenderal KI', jabatan: 'Ahli Pertama - Pengelola Pengadaan Barang/Jasa' }
    ];

    samplePPPK.forEach((p, idx) => {
      const dummyScores = [86, 78, 92, 74, 68];
      const score = dummyScores[idx % dummyScores.length];
      const hasil: HasilCatPPPK = {
        id: 'CAT-SAMPLE-' + (idx + 1),
        nip: p.nip || '19950101202321100' + idx,
        nama: p.nama || 'Pegawai PPPK ' + idx,
        unitKerja: p.unitKerja || 'Direktorat Paten',
        jabatan: p.jabatan || 'PPPK Teknis',
        tanggalUjian: new Date().toISOString().split('T')[0],
        waktuMulai: '09:00',
        waktuSelesai: '09:25',
        durasiPengerjaanMenit: 25,
        skorManajerial: 15,
        skorSosioKultural: 10,
        skorTeknis: 15,
        skorBerakhlak: 10,
        skorTotal: score / 2,
        nilaiSkala100: score,
        rekomendasi: score >= 85 ? 'SANGAT DIREKOMENDASIKAN' : score >= 70 ? 'DIREKOMENDASIKAN' : 'DIPERPANJANG DENGAN PEMBINAAN',
        keterangan: 'Hasil evaluasi uji kompetensi dan simulasi kinerja berkala tahunan.',
        jawabanDetail: {}
      };
      simpanHasilCatPPPK(hasil);
    });

    loadData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8 selection:bg-emerald-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-2.5 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">
                  Monitoring CAT Evaluasi PPPK
                </h1>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                  ADMIN SDM
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pusat Kendali Live Score & Rekapitulasi Uji Kompetensi Perpanjangan Kontrak
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/cat-pppk/login')}
              className="text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ke Ruang Peserta</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Rekap Excel</span>
            </button>
          </div>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Formasi PPPK</p>
              <h3 className="text-2xl font-black text-white mt-0.5">{totalPPPKCount}</h3>
              <p className="text-[9px] text-slate-500">Pegawai Aktif Terdata</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sudah Mengikuti CAT</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-0.5">{sudahUjianCount}</h3>
              <p className="text-[9px] text-slate-500">{((sudahUjianCount / totalPPPKCount) * 100).toFixed(0)}% Partisipasi</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Belum Mengikuti CAT</p>
              <h3 className="text-2xl font-black text-amber-400 mt-0.5">{belumUjianCount}</h3>
              <p className="text-[9px] text-slate-500">Perlu Notifikasi</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rata-rata Skor CAT</p>
              <h3 className="text-2xl font-black text-teal-300 mt-0.5">{avgScore}</h3>
              <p className="text-[9px] text-slate-500">Skala 100 Poin</p>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NIP PPPK..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={filterRekomendasi}
                onChange={e => setFilterRekomendasi(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none"
              >
                <option value="Semua">Semua Rekomendasi</option>
                <option value="SANGAT">Sangat Direkomendasikan</option>
                <option value="DIREKOMENDASIKAN">Direkomendasikan</option>
                <option value="PEMBINAAN">Dengan Pembinaan</option>
                <option value="TIDAK">Tidak Direkomendasikan</option>
              </select>

              <select
                value={filterUnit}
                onChange={e => setFilterUnit(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 outline-none max-w-[220px]"
              >
                <option value="Semua Unit">Semua Unit Kerja</option>
                {uniqueUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              {results.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedDummySample}
                  className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Generate data contoh untuk demonstrasi"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Isi Data Sampel</span>
                </button>
              )}

              {results.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetSimulasi}
                  className="p-2 bg-slate-950 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Reset Data Ujian"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table of Results */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Pegawai PPPK</th>
                  <th className="py-3.5 px-4">Unit Kerja</th>
                  <th className="py-3.5 px-4 text-center">Manajerial</th>
                  <th className="py-3.5 px-4 text-center">Sosio-Kul</th>
                  <th className="py-3.5 px-4 text-center">Teknis</th>
                  <th className="py-3.5 px-4 text-center">BerAKHLAK</th>
                  <th className="py-3.5 px-4 text-center">Nilai 100</th>
                  <th className="py-3.5 px-4 text-center">Status Rekomendasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Belum ada data peserta yang memenuhi kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{r.nama}</div>
                        <div className="text-[10px] font-mono text-slate-400">NIP: {r.nip}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{r.unitKerja}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-xs">{r.jabatan}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{r.skorManajerial}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{r.skorSosioKultural}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{r.skorTeknis}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-300">{r.skorBerakhlak}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black font-mono text-sm text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          {r.nilaiSkala100}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          r.rekomendasi.includes('SANGAT')
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : r.rekomendasi.includes('DIREKOMENDASIKAN') && !r.rekomendasi.includes('PEMBINAAN')
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : r.rekomendasi.includes('PEMBINAAN')
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {r.rekomendasi}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CatPPPKAdminPage;
