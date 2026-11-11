import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  fetchPegawaiFromSheets, 
  fetchKGBFromSheets, 
  syncTableRemote, 
  uploadFileToDrive, 
  parseDateToYYYYMMDD 
} from '../spreadsheetService';
import { 
  Pegawai, 
  KGB, 
  KGBStatusAlur, 
  KGBMasterGajiPNS, 
  KGBMasterGajiPPPK, 
  KGBGolonganMapping, 
  KGBAuditLog 
} from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, normalizeUnitName, formatPegawaiName, UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  normalizeStatusPegawai, 
  normalizeGolongan, 
  konversiGolonganPPPK, 
  getGajiByEmployeeType, 
  getSalaryTableVersion, 
  getSalaryTableByStatus,
  getMasterGajiPNSList,
  saveMasterGajiPNSRow,
  getMasterGajiPPPKList,
  saveMasterGajiPPPKRow,
  getGolonganMappingList,
  saveGolonganMappingRow,
  deleteGolonganMappingRow,
  resetMasterToOfficial,
  getKGBAuditLogs,
  recordKGBAudit
} from '../services/kgbSalaryService';
import { 
  calculatePegawaiKGB, 
  KGBPeriodeCalculation, 
  KGBMonitoringStatus, 
  filterMonitoringList,
  safeFormatDate,
  parseMasaKerjaString
} from '../services/kgbCalculationService';

const terbilang = (n: number): string => {
  const words = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let result = "";
  if (n < 12) result = words[n];
  else if (n < 20) result = terbilang(n - 10) + " belas";
  else if (n < 100) result = terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
  else if (n < 200) result = "seratus " + terbilang(n - 100);
  else if (n < 1000) result = terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
  else if (n < 2000) result = "seribu " + terbilang(n - 1000);
  else if (n < 1000000) result = terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
  else if (n < 1000000000) result = terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
  return result.replace(/\s+/g, ' ').trim();
};

const KGBGeneratorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logActivity, canEdit, isSuperadmin } = useAuth();
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview' | 'monitoring' | 'master'>('list');
  const [masterTab, setMasterTab] = useState<'pns' | 'pppk' | 'mapping' | 'audit'>('pns');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [filterStatusPegawai, setFilterStatusPegawai] = useState('ALL');
  const [filterStatusKgb, setFilterStatusKgb] = useState('ALL');
  const [filterUnitKerja, setFilterUnitKerja] = useState('ALL');

  // Master Data State
  const [pnsMasterList, setPnsMasterList] = useState<KGBMasterGajiPNS[]>([]);
  const [pppkMasterList, setPppkMasterList] = useState<KGBMasterGajiPPPK[]>([]);
  const [mappingList, setMappingList] = useState<KGBGolonganMapping[]>([]);
  const [auditLogs, setAuditLogs] = useState<KGBAuditLog[]>([]);
  const [searchMasterQuery, setSearchMasterQuery] = useState('');

  // Modals & UI
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Data KGB berhasil disimpan');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KGB | null>(null);
  const [selectedCalcDetail, setSelectedCalcDetail] = useState<KGBPeriodeCalculation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Modal Master Add / Edit
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [masterModalType, setMasterModalType] = useState<'pns' | 'pppk' | 'mapping'>('pns');
  const [editingMasterItem, setEditingMasterItem] = useState<any>(null);

  const pdfRef = useRef<HTMLDivElement>(null);
  const initialNavHandled = useRef<string | null>(null);

  const [formData, setFormData] = useState<Partial<KGB>>({
    nomorSk: 'HKI.1-KP.04.04-',
    tglSurat: new Date().toISOString().split('T')[0],
    nip: '',
    namaPegawai: '',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    gajiLama: 0,
    gajiBaru: 0,
    tmtLama: '',
    tmtBaru: '',
    masaKerjaBaru: '',
    pangkatGol: '',
    jabatan: '',
    unitKerja: '',
    kantor: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    jenisPegawai: 'PNS',
    statusPegawai: 'PNS',
    status: 'Draft',
    skTerakhirPejabat: 'Kepala Biro Sumber Daya Manusia',
    skTerakhirTanggal: '',
    skTerakhirNomor: '',
    skTerakhirTmt: '',
    skTerakhirMasaKerja: '',
    masaPerjanjianKerja: '',
    perpanjanganPerjanjianKerja: '-',
    statusVerifikasiGolongan: 'Valid PNS',
    sumberTabelGaji: 'PP Nomor 5 Tahun 2024',
    versiMasterGaji: '2024.1',
    isManualSalary: false,
    catatanValidasi: ''
  });

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[10px] font-black text-gray-600 uppercase ml-3 tracking-widest block mb-1.5";

  const FormItem = ({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) => (
    <div className="space-y-1.5">
      <label className={labelClass}>
        {label}
        {note && <span className="ml-2 normal-case text-[9px] text-gray-400 font-semibold">{note}</span>}
      </label>
      {children}
    </div>
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle single navigation from other pages (e.g. /pegawai)
  useEffect(() => {
    const targetNip = location.state?.nip;
    if (targetNip && pegawaiList.length > 0 && initialNavHandled.current !== targetNip) {
      initialNavHandled.current = targetNip;
      handlePegawaiSelect(targetNip);
      setActiveView('editor');
    }
  }, [location.state?.nip, pegawaiList]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([fetchPegawaiFromSheets(), fetchKGBFromSheets()]);
      setPegawaiList(p || []);
      setKgbHistory(k || []);
      
      // Load master tables from service
      setPnsMasterList(getMasterGajiPNSList());
      setPppkMasterList(getMasterGajiPPPKList());
      setMappingList(getGolonganMappingList());
      setAuditLogs(getKGBAuditLogs());
    } catch (e) {
      console.error("Gagal memuat data awal KGB:", e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * MEMILIH PEGAWAI SECARA AKURAT DAN RIGOROUS
   */
  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (!p) return;

    // Hitung seluruh rincian KGB menggunakan calculation service terpadu
    const calc = calculatePegawaiKGB(p, kgbHistory);

    setFormData(prev => {
      const isPPPK = calc.statusPegawai === 'PPPK';
      const defaultPangkatGol = isPPPK 
        ? `${p.golRuang || '-'} / ${p.jabatan || '-'}`
        : `${p.pangkat || '-'} (${p.golRuang || '-'})`;

      return {
        ...prev,
        id: undefined, // Reset id to indicate new entry
        nip: p.nip,
        namaPegawai: p.nama,
        statusPegawai: calc.statusPegawai,
        jenisPegawai: isPPPK ? 'PPPK' : 'PNS',
        golonganAsli: calc.golonganAsli,
        golonganDipakai: calc.golonganDipakai,
        statusVerifikasiGolongan: calc.statusVerifikasiGolongan,
        pangkatGol: defaultPangkatGol,
        jabatan: p.jabatan || '-',
        unitKerja: p.unitKerja || '-',
        gajiLama: calc.gajiPokokLama,
        gajiBaru: calc.gajiPokokBaru,
        selisihGaji: calc.selisihGaji,
        mkgLama: calc.mkgLamaTahun,
        mkgBaru: calc.mkgBaruTahun,
        tmtLama: calc.tmtKgbTerakhir,
        tmtBaru: calc.estimasiKgbBerikutnya,
        masaKerjaBaru: `${calc.mkgBaruTahun} Tahun ${calc.mkgBaruBulan} Bulan`,
        skTerakhirNomor: calc.skTerakhirNomor || prev.skTerakhirNomor || '',
        skTerakhirTanggal: safeFormatDate(calc.skTerakhirTanggal || prev.skTerakhirTanggal || ''),
        skTerakhirPejabat: calc.skTerakhirPejabat || 'Kepala Biro Sumber Daya Manusia',
        skTerakhirTmt: safeFormatDate(calc.tmtKgbTerakhir),
        skTerakhirMasaKerja: `${calc.mkgLamaTahun} Tahun ${calc.mkgLamaBulan} Bulan`,
        masaPerjanjianKerja: isPPPK ? '5 Tahun' : '',
        perpanjanganPerjanjianKerja: isPPPK ? '-' : '-',
        sumberTabelGaji: calc.sumberTabelGaji,
        versiMasterGaji: calc.versiTabelGaji,
        status: 'Draft',
        isManualSalary: false,
        catatanValidasi: calc.catatanValidasi
      };
    });
  };

  const handleEditKgb = (k: KGB) => {
    setFormData({
      ...k,
      tmtLama: safeFormatDate(k.tmtLama),
      tmtBaru: safeFormatDate(k.tmtBaru),
      tglSk: safeFormatDate(k.tglSk),
      tglSurat: safeFormatDate(k.tglSurat),
      skTerakhirTanggal: safeFormatDate(k.skTerakhirTanggal),
      skTerakhirTmt: safeFormatDate(k.skTerakhirTmt)
    });
    setActiveView('editor');
  };

  /**
   * MENYIMPAN DATA KGB DENGAN AUDIT LOG & SNAPSHOT
   */
  const handleSave = async (overrideStatus?: KGBStatusAlur) => {
    if (!formData.nip || !formData.tmtBaru) {
      alert("Lengkapi data KGB, khususnya NIP dan TMT Baru.");
      return;
    }

    if (formData.statusVerifikasiGolongan === 'Belum Terverifikasi') {
      const proceed = confirm(
        "Peringatan: Golongan pegawai ini belum terverifikasi secara resmi.\n" +
        "Apakah Anda yakin ingin tetap menyimpan draf ini untuk diverifikasi administrator?"
      );
      if (!proceed) return;
    }

    setSyncing(true);
    try {
      const finalStatus: KGBStatusAlur = overrideStatus || (formData.status as KGBStatusAlur) || 'Draft';
      const isNew = !formData.id;
      const kgbId = formData.id || `KGB-${formData.nip}-${Date.now()}`;

      const payload: KGB = {
        ...formData,
        id: kgbId,
        nip: formData.nip,
        namaPegawai: formData.namaPegawai || '',
        tmtLama: formData.tmtLama || '',
        tmtBaru: formData.tmtBaru,
        gajiLama: Number(formData.gajiLama) || 0,
        gajiBaru: Number(formData.gajiBaru) || 0,
        nomorSk: formData.nomorSk || '',
        tglSk: formData.tglSk || formData.tglSurat || new Date().toISOString().split('T')[0],
        status: finalStatus,
        statusPegawai: formData.statusPegawai || 'PNS',
        jenisPegawai: formData.jenisPegawai || 'PNS',
        golonganAsli: formData.golonganAsli || formData.pangkatGol || '',
        golonganDipakai: formData.golonganDipakai || formData.pangkatGol || '',
        statusVerifikasiGolongan: formData.statusVerifikasiGolongan || 'Valid PNS',
        sumberTabelGaji: formData.sumberTabelGaji || getSalaryTableVersion(formData.statusPegawai),
        versiMasterGaji: formData.versiMasterGaji || '2024.1',
        isManualSalary: Boolean(formData.isManualSalary),
        selisihGaji: Math.max(0, (Number(formData.gajiBaru) || 0) - (Number(formData.gajiLama) || 0)),
        catatanValidasi: formData.catatanValidasi || '',
        createdAt: formData.createdAt || new Date().toISOString(),
        createdByNip: formData.createdByNip || user?.nip || 'SYSTEM',
        createdByName: formData.createdByName || user?.name || 'Administrator',
        updatedAt: new Date().toISOString(),
        updatedByNip: user?.nip || 'SYSTEM',
        updatedByName: user?.name || 'Administrator'
      };

      const ok = await syncTableRemote('KGB', 'SAVE', payload);
      if (ok) {
        // Record Audit Log
        recordKGBAudit({
          userNip: user?.nip || 'SYSTEM',
          userName: user?.name || 'Administrator',
          action: isNew ? 'CREATE' : 'UPDATE',
          kgbId: kgbId,
          details: `${isNew ? 'Pembuatan' : 'Pembaruan'} KGB Pegawai: ${payload.namaPegawai} (NIP. ${payload.nip}) Status: ${finalStatus}`,
          afterData: payload
        });

        logActivity(isNew ? 'CREATE' : 'UPDATE', 'KGB', `Simpan KGB: ${payload.namaPegawai} (${finalStatus})`);
        
        await loadInitialData();
        setFormData(payload);
        setSuccessMessage(`Data KGB ${payload.namaPegawai} berhasil disimpan dengan status: ${finalStatus}`);
        setShowSuccess(true);
        setActiveView('preview');
      } else {
        alert("Gagal menyimpan data ke sistem penyimpanan remote.");
      }
    } catch (e: any) {
      console.error("Gagal simpan KGB:", e);
      alert(`Terjadi kesalahan: ${e?.message || 'Gagal menyimpan data KGB'}`);
    } finally {
      setSyncing(false);
    }
  };

  /**
   * CETAK PDF KGB SECARA AMAN
   */
  const handleDownloadPdf = async () => {
    if (!pdfRef.current || syncing) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `KGB_${(formData.namaPegawai || 'Pegawai').replace(/\s+/g, '_')}_${formData.nip || 'ASN'}.pdf`;
      pdf.save(fileName);

      logActivity('DOWNLOAD', 'KGB', `Unduh PDF KGB: ${formData.namaPegawai}`);
    } catch (e) {
      console.error("Gagal unduh PDF:", e);
      alert("Gagal mencetak dokumen PDF. Silakan periksa koneksi browser.");
    } finally {
      setSyncing(false);
    }
  };

  /**
   * INTEGRASI E-DOSSIER DENGAN DEBOUNCE PROTECTION
   */
  const handleSaveToDossier = async () => {
    if (!pdfRef.current || !formData.nip || syncing) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      const pdfBase64 = pdf.output('datauristring');

      const fileName = `KGB_${(formData.namaPegawai || 'Pegawai').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const res = await uploadFileToDrive(fileName, 'application/pdf', pdfBase64);

      if (res.success && res.fileUrl) {
        const payload = {
          id: `DOS-${Date.now()}`,
          nip: formData.nip,
          namaPegawai: formData.namaPegawai,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: `Surat Kenaikan Gaji Berkala (KGB) TMT ${formData.tmtBaru}`,
          fileName: fileName,
          fileUrl: res.fileUrl,
          statusPegawai: formData.statusPegawai || 'PNS',
          golongan: formData.pangkatGol || '',
          nomorSk: formData.nomorSk || '',
          tanggalSk: formData.tglSurat || ''
        };

        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          recordKGBAudit({
            userNip: user?.nip || 'SYSTEM',
            userName: user?.name || 'Administrator',
            action: 'DOSSIER_UPLOAD',
            kgbId: formData.id,
            details: `Unggah PDF KGB ke E-Dossier Pegawai: ${formData.namaPegawai}`
          });
          logActivity('CREATE', 'DOSSIER', `Simpan KGB ke Dossier: ${formData.namaPegawai}`);
          alert("Surat Keputusan KGB berhasil disimpan ke E-Dossier Pegawai.");
        }
      } else {
        alert("Gagal mengunggah file ke Google Drive.");
      }
    } catch (e) {
      console.error("Gagal simpan ke Dossier:", e);
      alert("Gagal menyimpan ke E-Dossier.");
    } finally {
      setSyncing(false);
    }
  };

  /**
   * DATA MONITORING LENGKAP YANG DIHITUNG SECARA KONSISTEN
   */
  const allMonitoringCalculations = useMemo<KGBPeriodeCalculation[]>(() => {
    return pegawaiList.map(p => calculatePegawaiKGB(p, kgbHistory));
  }, [pegawaiList, kgbHistory]);

  const filteredMonitoring = useMemo(() => {
    let list = filterMonitoringList(
      allMonitoringCalculations,
      searchQuery,
      filterYear,
      filterMonth,
      filterStatusPegawai,
      filterStatusKgb
    );

    if (filterUnitKerja !== 'ALL') {
      list = list.filter(item => {
        const p = pegawaiList.find(x => x.nip === item.nip);
        return p?.unitKerja === filterUnitKerja;
      });
    }

    return list;
  }, [allMonitoringCalculations, searchQuery, filterYear, filterMonth, filterStatusPegawai, filterStatusKgb, filterUnitKerja, pegawaiList]);

  /**
   * EKSPOR DATA MONITORING KE EXCEL (.xlsx)
   */
  const handleExportMonitoringExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Portal SDM KI - Kemenkumham RI';
      wb.created = new Date();

      const ws = wb.addWorksheet('Monitoring KGB', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }]
      });

      const columns = [
        { header: 'No.', key: 'no', width: 6 },
        { header: 'NIP', key: 'nip', width: 24 },
        { header: 'Nama Pegawai', key: 'nama', width: 34 },
        { header: 'Status Pegawai', key: 'statusPegawai', width: 16 },
        { header: 'Golongan Asli', key: 'golAsli', width: 16 },
        { header: 'Golongan Dipakai', key: 'golDipakai', width: 22 },
        { header: 'Verifikasi Golongan', key: 'verifGol', width: 22 },
        { header: 'MKG Lama', key: 'mkgLama', width: 14 },
        { header: 'MKG Baru', key: 'mkgBaru', width: 14 },
        { header: 'Gaji Pokok Lama', key: 'gajiLama', width: 18 },
        { header: 'Gaji Pokok Baru', key: 'gajiBaru', width: 18 },
        { header: 'Selisih Gaji', key: 'selisih', width: 18 },
        { header: 'TMT Terakhir', key: 'tmtLama', width: 16 },
        { header: 'Dasar TMT', key: 'dasarTmt', width: 20 },
        { header: 'Estimasi KGB Berikutnya', key: 'tmtBaru', width: 24 },
        { header: 'Status KGB', key: 'statusKgb', width: 20 },
        { header: 'Sumber Tabel Regulasi', key: 'sumberTabel', width: 32 }
      ];

      ws.columns = columns;

      const headerRow = ws.getRow(1);
      headerRow.height = 28;
      headerRow.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E79' }
        };
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF15395B' } },
          bottom: { style: 'thin', color: { argb: 'FF15395B' } },
          left: { style: 'thin', color: { argb: 'FF15395B' } },
          right: { style: 'thin', color: { argb: 'FF15395B' } }
        };
      });

      filteredMonitoring.forEach((item, idx) => {
        const rowData = {
          no: idx + 1,
          nip: item.nip,
          nama: formatPegawaiName(item.nama),
          statusPegawai: item.statusPegawai,
          golAsli: item.golonganAsli,
          golDipakai: item.golonganDipakai,
          verifGol: item.statusVerifikasiGolongan,
          mkgLama: `${item.mkgLamaTahun} Thn`,
          mkgBaru: `${item.mkgBaruTahun} Thn`,
          gajiLama: item.gajiPokokLama ? `Rp ${item.gajiPokokLama.toLocaleString('id-ID')}` : '-',
          gajiBaru: item.gajiPokokBaru ? `Rp ${item.gajiPokokBaru.toLocaleString('id-ID')}` : '-',
          selisih: item.selisihGaji ? `Rp ${item.selisihGaji.toLocaleString('id-ID')}` : '-',
          tmtLama: item.tmtKgbTerakhir || '-',
          dasarTmt: item.dasarTmtTerakhir,
          tmtBaru: item.estimasiKgbBerikutnya || '-',
          statusKgb: item.statusKgb,
          sumberTabel: item.sumberTabelGaji
        };

        const r = ws.addRow(rowData);
        r.height = 21;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };
          if ([1, 2, 4, 5, 7, 8, 9, 13, 14, 15, 16].includes(colNum)) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if ([10, 11, 12].includes(colNum)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
          if (colNum === 2) cell.numFmt = '@';
        });
      });

      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Monitoring_KGB_DJKI_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e: any) {
      console.error("Gagal ekspor excel monitoring:", e);
      alert(`Gagal mengekspor file Excel: ${e?.message || 'Kesalahan sistem'}`);
    }
  };

  /**
   * BADGE TAMPILAN STATUS KGB
   */
  const renderStatusBadge = (status: KGBMonitoringStatus) => {
    switch (status) {
      case 'Jatuh Tempo':
        return <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-exclamation-circle-fill"></i> Jatuh Tempo</span>;
      case 'Mendekati KGB':
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-clock-history"></i> Mendekati KGB</span>;
      case 'Terlambat':
        return <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-300 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-shield-slash-fill"></i> Terlambat</span>;
      case 'Sudah Diproses':
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-check-circle-fill"></i> Sudah Diproses</span>;
      case 'Perlu Verifikasi':
        return <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-patch-question-fill"></i> Perlu Verifikasi</span>;
      case 'Data Belum Lengkap':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-dash-circle"></i> Data Belum Lengkap</span>;
      default:
        return <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5"><i className="bi bi-calendar-check"></i> Akan Datang</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={async () => {
          if (itemToDelete) {
            setSyncing(true);
            const ok = await syncTableRemote('KGB', 'DELETE', { 
              id: itemToDelete.id, 
              nip: itemToDelete.nip,
              nama: itemToDelete.namaPegawai 
            });
            if (ok) {
              recordKGBAudit({
                userNip: user?.nip || 'SYSTEM',
                userName: user?.name || 'Administrator',
                action: 'DELETE',
                kgbId: itemToDelete.id,
                details: `Menghapus riwayat KGB: ${itemToDelete.namaPegawai} (NIP. ${itemToDelete.nip})`
              });
              await loadInitialData();
              setIsConfirmOpen(false);
            } else {
              alert("Gagal menghapus data.");
            }
            setSyncing(false);
          }
        }} 
      />

      {/* HEADER NAVIGASI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} 
            className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black text-gray-900 uppercase">Kenaikan Gaji Berkala (KGB)</h3>
              <span className="px-3 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-200 uppercase">PP 5/2024 & Perpres 11/2024</span>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
              Otomatisasi & Validasi Penetapan KGB Aparatur Sipil Negara (PNS & PPPK) DJKI
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 gap-1">
          <button 
            onClick={() => setActiveView('list')} 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-blue-600'}`}
          >
            <i className="bi bi-archive-fill mr-1.5"></i> Arsip KGB ({kgbHistory.length})
          </button>
          <button 
            onClick={() => setActiveView('monitoring')} 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'monitoring' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-blue-600'}`}
          >
            <i className="bi bi-speedometer2 mr-1.5"></i> Monitoring KGB
          </button>
          <button 
            onClick={() => { 
              setFormData({
                nomorSk: 'HKI.1-KP.04.04-',
                tglSurat: new Date().toISOString().split('T')[0],
                nip: '',
                namaPegawai: '',
                gajiLama: 0,
                gajiBaru: 0,
                tmtLama: '',
                tmtBaru: '',
                status: 'Draft',
                isManualSalary: false
              }); 
              setActiveView('editor'); 
            }} 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-blue-600'}`}
          >
            <i className="bi bi-plus-circle-fill mr-1.5"></i> Buat KGB Baru
          </button>
          {canEdit && (
            <button 
              onClick={() => setActiveView('master')} 
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'master' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-600 hover:bg-indigo-50'}`}
              title="Kelola Master Gaji PNS (PP 5/2024), PPPK (Perpres 11/2024), dan Pemetaan Golongan"
            >
              <i className="bi bi-database-fill mr-1.5"></i> Master Gaji & Mapping
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ARSIP KGB */}
      {activeView === 'list' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="relative w-full md:w-96">
              <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                placeholder="Cari NIP, Nama, atau No. SK..." 
                className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-[11px] font-bold text-gray-500">
              Total Dokumen Terbit: <span className="font-black text-gray-900">{kgbHistory.length}</span> Berkas
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[450px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-600 border-b tracking-widest">
                <tr>
                  <th className="px-8 py-5">Pegawai & Identitas</th>
                  <th className="px-6 py-5">Jenis & Golongan</th>
                  <th className="px-6 py-5">SK & TMT Baru</th>
                  <th className="px-6 py-5 text-right">Gaji Baru</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kgbHistory
                  .filter(k => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      k.namaPegawai?.toLowerCase().includes(q) ||
                      k.nip?.includes(q) ||
                      k.nomorSk?.toLowerCase().includes(q)
                    );
                  })
                  .map(k => (
                    <tr key={k.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-8 py-5">
                        <p className="text-[12px] font-black text-gray-950 uppercase">{formatPegawaiName(k.namaPegawai)}</p>
                        <p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {k.nip}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase ${k.jenisPegawai === 'PPPK' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                            {k.jenisPegawai || 'PNS'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-700">{k.golonganDipakai || k.pangkatGol || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[10px] font-bold text-gray-600 uppercase">{k.nomorSk || '-'}</p>
                        <p className="text-[11px] font-black text-gray-950 uppercase">TMT: {k.tmtBaru || '-'}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] font-black border border-emerald-100 inline-block font-mono">
                          Rp {Number(k.gajiBaru).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase border ${
                          k.status === 'Selesai' || k.status === 'Disetujui' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : k.status === 'Draft' 
                            ? 'bg-gray-50 text-gray-700 border-gray-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {k.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-90 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => { setFormData(k); setActiveView('preview'); }} 
                            className="h-9 px-4 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-blue-600 transition-all"
                          >
                            <i className="bi bi-file-earmark-pdf mr-1"></i> Cetak
                          </button>
                          {canEdit && (
                            <>
                              <button 
                                onClick={() => handleEditKgb(k)} 
                                className="h-9 w-9 bg-white border border-gray-200 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-50 shadow-sm"
                                title="Edit Dokumen KGB"
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              {isSuperadmin && (
                                <button 
                                  onClick={() => { setItemToDelete(k); setIsConfirmOpen(true); }} 
                                  className="h-9 w-9 bg-white border border-gray-200 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-50 shadow-sm"
                                  title="Hapus Dokumen KGB"
                                >
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                {kgbHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-400 font-bold uppercase text-xs">
                      Belum ada riwayat penerbitan KGB tersimpan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MONITORING KGB (KONSISTEN & REAL-TIME) */}
      {activeView === 'monitoring' && (
        <div className="space-y-6">
          {/* FILTER BAR MONITORING */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  placeholder="CARI NAMA ATAU NIP PEGAWAI..." 
                  className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <select 
                  className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={filterStatusPegawai}
                  onChange={e => setFilterStatusPegawai(e.target.value)}
                >
                  <option value="ALL">SEMUA STATUS (PNS & PPPK)</option>
                  <option value="PNS">PEGAWAI NEGERI SIPIL (PNS)</option>
                  <option value="PPPK">PPPK (PENUH WAKTU)</option>
                </select>
              </div>

              <div>
                <select 
                  className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={filterStatusKgb}
                  onChange={e => setFilterStatusKgb(e.target.value)}
                >
                  <option value="ALL">SEMUA STATUS KGB</option>
                  <option value="Jatuh Tempo">JATUH TEMPO (BULAN INI)</option>
                  <option value="Mendekati KGB">MENDEKATI KGB (&lt; 6 BULAN)</option>
                  <option value="Terlambat">TERLAMBAT</option>
                  <option value="Akan Datang">AKAN DATANG</option>
                  <option value="Sudah Diproses">SUDAH DIPROSES</option>
                  <option value="Perlu Verifikasi">PERLU VERIFIKASI</option>
                  <option value="Data Belum Lengkap">DATA BELUM LENGKAP</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              <div>
                <select 
                  className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                >
                  <option value="ALL">SEMUA TAHUN ESTIMASI</option>
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                    <option key={y} value={y.toString()}>TAHUN {y}</option>
                  ))}
                </select>
              </div>

              <div>
                <select 
                  className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="ALL">SEMUA BULAN</option>
                  <option value="01">JANUARI</option>
                  <option value="02">FEBRUARI</option>
                  <option value="03">MARET</option>
                  <option value="04">APRIL</option>
                  <option value="05">MEI</option>
                  <option value="06">JUNI</option>
                  <option value="07">JULI</option>
                  <option value="08">AGUSTUS</option>
                  <option value="09">SEPTEMBER</option>
                  <option value="10">OKTOBER</option>
                  <option value="11">NOVEMBER</option>
                  <option value="12">DESEMBER</option>
                </select>
              </div>

              <div>
                <select 
                  className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20"
                  value={filterUnitKerja}
                  onChange={e => setFilterUnitKerja(e.target.value)}
                >
                  <option value="ALL">SEMUA UNIT KERJA</option>
                  {UNIT_KERJA.map(u => (
                    <option key={u} value={u}>{normalizeUnitName(u)}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleExportMonitoringExcel}
                  className="w-full py-3 px-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  title="Unduh Lembar Kerja Rekap Monitoring KGB (.xlsx)"
                >
                  <i className="bi bi-file-earmark-excel-fill text-sm"></i> Unduh Excel
                </button>
              </div>
            </div>
          </div>

          {/* TABEL HASIL MONITORING */}
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                Menampilkan <span className="text-blue-600 font-extrabold">{filteredMonitoring.length}</span> Pegawai
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                Data dihitung otomatis berdasarkan PP 5/2024 (PNS) & Perpres 11/2024 (PPPK)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-500 border-b tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Pegawai</th>
                    <th className="px-4 py-5">Status & Golongan</th>
                    <th className="px-4 py-5">MKG</th>
                    <th className="px-4 py-5 text-right">Gaji Pokok</th>
                    <th className="px-4 py-5 text-center">TMT Terakhir</th>
                    <th className="px-4 py-5 text-center">Estimasi KGB Berikutnya</th>
                    <th className="px-4 py-5 text-center">Status KGB</th>
                    <th className="px-8 py-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[11px]">
                  {filteredMonitoring.slice(0, 100).map(item => (
                    <tr key={item.nip} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-black text-gray-950 leading-tight">{formatPegawaiName(item.nama)}</p>
                        <p className="text-[9px] font-mono text-blue-600 font-bold mt-1">NIP. {item.nip}</p>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            item.statusPegawai === 'PPPK' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {item.statusPegawai}
                          </span>
                          <span className="font-bold text-gray-900">{item.golonganAsli}</span>
                        </div>
                        {item.statusVerifikasiGolongan === 'Belum Terverifikasi' && (
                          <p className="text-[8px] text-rose-600 font-bold uppercase tracking-tight">Belum Terverifikasi</p>
                        )}
                        {item.statusVerifikasiGolongan === 'Terverifikasi' && item.statusPegawai === 'PPPK' && (
                          <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-tight">{item.golonganDipakai}</p>
                        )}
                      </td>
                      <td className="px-4 py-5">
                        <p className="font-black text-gray-900">{item.mkgLamaTahun} Thn</p>
                        <p className="text-[8px] text-gray-400 font-semibold mt-0.5">Baru: {item.mkgBaruTahun} Thn</p>
                      </td>
                      <td className="px-4 py-5 text-right font-mono">
                        <p className="font-bold text-gray-900">
                          {item.gajiPokokLama ? `Rp ${item.gajiPokokLama.toLocaleString('id-ID')}` : '-'}
                        </p>
                        {item.gajiPokokBaru > 0 && (
                          <p className="text-[9px] text-emerald-600 font-bold">
                            Estimasi: Rp {item.gajiPokokBaru.toLocaleString('id-ID')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <p className="font-bold text-gray-900">{item.tmtKgbTerakhir || '-'}</p>
                        <span className="text-[7px] text-gray-400 uppercase tracking-tight font-black block mt-0.5">
                          {item.dasarTmtTerakhir.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        {item.estimasiKgbBerikutnya ? (
                          <span className="font-mono font-black text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
                            {item.estimasiKgbBerikutnya}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {renderStatusBadge(item.statusKgb)}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => {
                            handlePegawaiSelect(item.nip);
                            setActiveView('editor');
                          }}
                          className="h-8 px-4 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-sm hover:bg-blue-700 transition-all"
                        >
                          Proses KGB
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMonitoring.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-gray-400 font-bold uppercase text-xs">
                        Tidak ada data pegawai yang sesuai dengan kriteria filter monitoring
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: EDITOR / FORM KGB TERVALIDASI */}
      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto bg-white p-8 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 animate-modalEnter">
          {/* SEARCH DAN PEMILIHAN PEGAWAI */}
          <div className="space-y-3">
            <SearchableSelect 
              label="PILIH PEGAWAI (PNS / PPPK)" 
              options={pegawaiList.map(p => ({
                value: p.nip, 
                label: p.nama, 
                subLabel: `NIP. ${p.nip} - ${p.golRuang || '-'} (${p.statusPegawai || p.jenisPegawai || 'PNS'}) - ${p.unitKerja || ''}`
              }))} 
              value={formData.nip || ''} 
              onChange={handlePegawaiSelect} 
            />

            {/* STATUS BADGES & IDENTIFIKASI ATURAN */}
            {formData.nip && (
              <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${
                    formData.statusPegawai === 'PPPK' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-sky-100 text-sky-900 border border-sky-300'
                  }`}>
                    {formData.statusPegawai} (Status Pegawai Terdeteksi)
                  </span>
                  
                  <span className="px-3 py-1 bg-white text-gray-800 rounded-xl text-[10px] font-bold border border-gray-200 uppercase">
                    Tabel: {formData.sumberTabelGaji}
                  </span>

                  {formData.statusVerifikasiGolongan === 'Terverifikasi' && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-[10px] font-black uppercase border border-emerald-300 inline-flex items-center gap-1">
                      <i className="bi bi-patch-check-fill"></i> Golongan Terverifikasi: {formData.golonganDipakai}
                    </span>
                  )}

                  {formData.statusVerifikasiGolongan === 'Belum Terverifikasi' && (
                    <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-xl text-[10px] font-black uppercase border border-rose-300 inline-flex items-center gap-1">
                      <i className="bi bi-exclamation-triangle-fill"></i> GOLONGAN BELUM TERVERIFIKASI
                    </span>
                  )}

                  {formData.isManualSalary && (
                    <span className="px-3 py-1 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase shadow-sm">
                      INPUT MANUAL - BELUM TERVERIFIKASI
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-gray-500">Status Alur:</span>
                  <select 
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-600"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as KGBStatusAlur })}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                    <option value="Dalam Proses">Dalam Proses</option>
                    <option value="Menunggu Persetujuan">Menunggu Persetujuan</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>
            )}

            {formData.catatanValidasi && (
              <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-[11px] font-semibold flex items-center gap-3">
                <i className="bi bi-info-circle-fill text-lg text-amber-600"></i>
                <div>
                  <span className="font-black uppercase block text-[9px] text-amber-900 tracking-wider">Catatan Validasi Sistem:</span>
                  {formData.catatanValidasi}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* SEKSI 1: ATRIBUT SURAT & IDENTITAS */}
            <div className="space-y-5 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              <h5 className="text-[11px] font-black text-blue-700 uppercase border-b pb-2 tracking-widest flex items-center gap-2">
                <i className="bi bi-file-text"></i> 1. Atribut Surat Dinas
              </h5>
              
              <FormItem label="Nomor Surat Keputusan">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.nomorSk} 
                  onChange={e => setFormData({ ...formData, nomorSk: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Tanggal Surat Terbit">
                <input 
                  type="date" 
                  className={inputClass} 
                  value={formData.tglSurat} 
                  onChange={e => setFormData({ ...formData, tglSurat: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Nama Lengkap Pegawai">
                <input 
                  type="text" 
                  className={`${inputClass} font-bold`} 
                  value={formData.namaPegawai} 
                  onChange={e => setFormData({ ...formData, namaPegawai: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Pangkat / Golongan Ruang">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.pangkatGol} 
                  onChange={e => setFormData({ ...formData, pangkatGol: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Jabatan">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.jabatan} 
                  onChange={e => setFormData({ ...formData, jabatan: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Unit Kerja">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.unitKerja} 
                  onChange={e => setFormData({ ...formData, unitKerja: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Jenis Pegawai">
                <select 
                  className={inputClass} 
                  value={formData.jenisPegawai} 
                  onChange={e => {
                    const jp = e.target.value as 'PNS' | 'PPPK';
                    setFormData({ 
                      ...formData, 
                      jenisPegawai: jp,
                      statusPegawai: jp,
                      sumberTabelGaji: getSalaryTableVersion(jp)
                    });
                  }}
                >
                  <option value="PNS">Pegawai Negeri Sipil (PNS)</option>
                  <option value="PPPK">Pegawai Pemerintah Perjanjian Kerja (PPPK)</option>
                </select>
              </FormItem>

              {formData.jenisPegawai === 'PPPK' && (
                <>
                  <FormItem label="Masa Perjanjian Kerja">
                    <input 
                      type="text" 
                      className={inputClass} 
                      value={formData.masaPerjanjianKerja} 
                      onChange={e => setFormData({ ...formData, masaPerjanjianKerja: e.target.value })} 
                      placeholder="Contoh: 5 Tahun"
                    />
                  </FormItem>
                  <FormItem label="Perpanjangan Perjanjian">
                    <input 
                      type="text" 
                      className={inputClass} 
                      value={formData.perpanjanganPerjanjianKerja} 
                      onChange={e => setFormData({ ...formData, perpanjanganPerjanjianKerja: e.target.value })} 
                    />
                  </FormItem>
                </>
              )}
            </div>

            {/* SEKSI 2: SK TERAKHIR (BASIS PERHITUNGAN) */}
            <div className="space-y-5 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              <h5 className="text-[11px] font-black text-emerald-700 uppercase border-b pb-2 tracking-widest flex items-center gap-2">
                <i className="bi bi-clock-history"></i> 2. SK Terakhir (Dasar KGB)
              </h5>

              <FormItem label="Ditetapkan Oleh Pejabat">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.skTerakhirPejabat} 
                  onChange={e => setFormData({ ...formData, skTerakhirPejabat: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Nomor SK Terakhir">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.skTerakhirNomor} 
                  onChange={e => setFormData({ ...formData, skTerakhirNomor: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Tanggal SK Terakhir">
                <input 
                  type="date" 
                  className={inputClass} 
                  value={formData.skTerakhirTanggal} 
                  onChange={e => setFormData({ ...formData, skTerakhirTanggal: e.target.value })} 
                />
              </FormItem>

              <FormItem label="TMT Berlakunya Gaji Terakhir">
                <input 
                  type="date" 
                  className={inputClass} 
                  value={formData.skTerakhirTmt} 
                  onChange={e => setFormData({ ...formData, skTerakhirTmt: e.target.value, tmtLama: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Masa Kerja Golongan SK Terakhir">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.skTerakhirMasaKerja} 
                  onChange={e => setFormData({ ...formData, skTerakhirMasaKerja: e.target.value })} 
                  placeholder="Contoh: 12 Tahun 0 Bulan" 
                />
              </FormItem>

              <FormItem label="Gaji Pokok Terakhir (Lama)">
                <input 
                  type="number" 
                  className={`${inputClass} font-mono`} 
                  value={formData.gajiLama} 
                  onChange={e => setFormData({ ...formData, gajiLama: Number(e.target.value) })} 
                />
              </FormItem>
            </div>

            {/* SEKSI 3: RINCIAN KGB BARU & PENANDATANGAN */}
            <div className="space-y-5 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              <h5 className="text-[11px] font-black text-amber-700 uppercase border-b pb-2 tracking-widest flex items-center gap-2">
                <i className="bi bi-cash-stack"></i> 3. Rincian KGB Baru
              </h5>

              <FormItem label="Gaji Pokok Baru (Resmi)" note={formData.isManualSalary ? "Manual" : "Otomatis"}>
                <input 
                  type="number" 
                  className={`${inputClass} font-mono font-black ${formData.isManualSalary ? 'text-amber-700 bg-amber-50/30 border-amber-300' : 'text-emerald-700'}`} 
                  value={formData.gajiBaru} 
                  onChange={e => {
                    setFormData({ 
                      ...formData, 
                      gajiBaru: Number(e.target.value),
                      isManualSalary: true 
                    });
                  }} 
                />
              </FormItem>

              <FormItem label="TMT KGB Baru (Berlaku)">
                <input 
                  type="date" 
                  className={`${inputClass} font-bold text-blue-700`} 
                  value={formData.tmtBaru} 
                  onChange={e => setFormData({ ...formData, tmtBaru: e.target.value })} 
                />
              </FormItem>

              <FormItem label="Masa Kerja Golongan Baru">
                <input 
                  type="text" 
                  className={inputClass} 
                  value={formData.masaKerjaBaru} 
                  onChange={e => setFormData({ ...formData, masaKerjaBaru: e.target.value })} 
                  placeholder="Contoh: 14 Tahun 0 Bulan" 
                />
              </FormItem>

              <h5 className="text-[11px] font-black text-indigo-700 uppercase border-b pb-2 tracking-widest pt-4 flex items-center gap-2">
                <i className="bi bi-pen"></i> 4. Pejabat Penandatangan
              </h5>

              <SearchableSelect 
                label="Pejabat Penandatangan" 
                options={pegawaiList.map(p => ({
                  value: p.nip, 
                  label: p.nama,
                  subLabel: `${p.jabatan} - NIP. ${p.nip}`
                }))} 
                value={formData.pjbNip || ''} 
                onChange={v => {
                  const p = pegawaiList.find(x => x.nip === v);
                  if (p) {
                    setFormData({
                      ...formData,
                      pjbNip: v,
                      pjbNama: p.nama,
                      pjbJabatan: p.jabatan
                    });
                  }
                }} 
              />
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-wrap justify-between items-center gap-4">
            <button 
              onClick={() => setActiveView('preview')}
              className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all"
            >
              Pratinjau Surat
            </button>

            <div className="flex gap-3">
              <button 
                onClick={() => handleSave('Draft')} 
                disabled={syncing}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-800 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              >
                Simpan Draf
              </button>
              <button 
                onClick={() => handleSave('Selesai')} 
                disabled={syncing} 
                className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
              >
                {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-check-circle-fill"></i>}
                Simpan & Terbitkan KGB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PREVIEW SURAT & PDF DOWNLOAD */}
      {activeView === 'preview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* ACTION TOOLBAR */}
          <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm no-print">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveView('editor')} 
                className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200"
              >
                <i className="bi bi-pencil-fill mr-1.5"></i> Edit Form
              </button>
              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                formData.status === 'Selesai' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                Status Dokumen: {formData.status || 'Draft'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <button 
                  onClick={handleSaveToDossier} 
                  disabled={syncing} 
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-blue-700 flex items-center gap-2 active:scale-95 transition-all"
                >
                  {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-folder-fill"></i>} 
                  Simpan ke E-Dossier
                </button>
              )}

              <button 
                onClick={handleDownloadPdf} 
                disabled={syncing}
                className="px-8 py-3 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase shadow-md hover:bg-blue-600 flex items-center gap-2 active:scale-95 transition-all"
              >
                <i className="bi bi-file-earmark-pdf-fill"></i> Unduh PDF (F4)
              </button>
            </div>
          </div>

          {/* LEMBAR NASKAH DINAS SURAT KEPUTUSAN KGB (F4 STANDAR DJKI) */}
          <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar">
            <div 
              ref={pdfRef} 
              className="bg-white shadow-2xl font-arial p-[2cm_2cm_2.5cm_3cm] leading-tight text-black" 
              style={{ width: '210mm', minHeight: '297mm', color: '#000000', fontSize: '11pt' }}
            >
              {/* KOP SURAT RESMI */}
              <div className="flex items-start gap-4 border-b-[0.5pt] border-black pb-2 mb-6 text-black">
                <img 
                  src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" 
                  style={{ width: '20.04mm', height: '22.90mm' }} 
                  crossOrigin="anonymous" 
                  alt="Logo Garuda / Pengayoman"
                />
                <div className="flex-1 text-center">
                  <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                  <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                  <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                  <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Call Center: 152</p>
                  <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Laman: www.dgip.go.id. Pos-el: halodjki@dgip.go.id</p>
                </div>
              </div>

              {/* ATRIBUT SURAT */}
              <div className="flex justify-between mb-6 text-[11pt]">
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[80px_10px_1fr]"><span>Nomor</span><span>:</span><span>{formData.nomorSk || '-'}</span></div>
                  <div className="grid grid-cols-[80px_10px_1fr]"><span>Sifat</span><span>:</span><span>Biasa</span></div>
                  <div className="grid grid-cols-[80px_10px_1fr]"><span>Lampiran</span><span>:</span><span>-</span></div>
                  <div className="grid grid-cols-[80px_10px_1fr]"><span>Hal</span><span>:</span><span className="font-bold">Kenaikan Gaji Berkala {formData.jenisPegawai === 'PPPK' ? 'Pegawai Pemerintah dengan Perjanjian Kerja' : ''}</span></div>
                  <div className="ml-[90px] font-bold uppercase">{formatPegawaiName(formData.namaPegawai || '')}</div>
                </div>
                <div className="text-right">
                  <p>{formData.tglSurat ? new Date(formData.tglSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p>
                </div>
              </div>

              <div className="text-[11pt] mb-6">
                <p>Yth. Kepala Kantor Pelayanan Perbendaharaan Negara Jakarta V.</p>
                <p>di Jakarta</p>
              </div>

              <div className="text-[11pt] text-justify leading-relaxed mb-6">
                {formData.jenisPegawai === 'PNS' ? (
                  <p>Sehubungan dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:</p>
                ) : (
                  <p>Berdasarkan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 7 Tahun 2023 tentang Kenaikan Gaji Berkala dan Kenaikan Gaji Istimewa bagi Pegawai Pemerintah dengan Perjanjian Kerja, dengan ini diberitahukan bahwa berhubung dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:</p>
                )}
              </div>

              {/* DATA PEGAWAI */}
              <div className="text-[11pt] space-y-1 mb-6">
                <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>1.</span><span>Nama</span><span>:</span><span className="font-bold">{formatPegawaiName(formData.namaPegawai || '')}</span></div>
                <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>2.</span><span>NIP</span><span>:</span><span>{formData.nip}</span></div>
                <div className="grid grid-cols-[30px_180px_10px_1fr]">
                  <span>3.</span>
                  <span>{formData.jenisPegawai === 'PNS' ? 'Pangkat / Golongan ruang' : 'Golongan/Jabatan'}</span>
                  <span>:</span>
                  <span className="uppercase">{formData.pangkatGol}</span>
                </div>
                {formData.jenisPegawai === 'PNS' ? (
                  <>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>4.</span><span>Jabatan</span><span>:</span><span className="uppercase">{formData.jabatan}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>5.</span><span>Kantor / Tempat</span><span>:</span><span className="uppercase">{formData.kantor}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]">
                      <span>6.</span>
                      <span>Gaji Pokok Lama</span>
                      <span>:</span>
                      <span>Rp. {Number(formData.gajiLama).toLocaleString('id-ID')} ({terbilang(Number(formData.gajiLama) || 0)} rupiah)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>4.</span><span>Masa Perjanjian Kerja</span><span>:</span><span>{formData.masaPerjanjianKerja || '5 Tahun'}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>5.</span><span>Perpanjangan Perjanjian Kerja</span><span>:</span><span>{formData.perpanjanganPerjanjianKerja || '-'}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>6.</span><span>Kantor/Unit Kerja</span><span>:</span><span className="uppercase">{formData.kantor}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]">
                      <span>7.</span>
                      <span>Gaji Pokok Lama</span>
                      <span>:</span>
                      <span>Rp. {Number(formData.gajiLama).toLocaleString('id-ID')} ({terbilang(Number(formData.gajiLama) || 0)} rupiah)</span>
                    </div>
                  </>
                )}
              </div>

              {/* DASAR SK TERAKHIR */}
              <div className="text-[11pt] mb-6">
                <p>atas dasar Surat Keputusan terakhir tentang gaji / {formData.jenisPegawai === 'PNS' ? 'pangkat' : 'golongan'} yang ditetapkan:</p>
                <div className="ml-8 space-y-1 mt-2">
                  <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>a.</span><span>Oleh pejabat</span><span>:</span><span>{formData.skTerakhirPejabat || '-'}</span></div>
                  <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>b.</span><span>Tanggal</span><span>:</span><span>{formData.skTerakhirTanggal ? new Date(formData.skTerakhirTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span></div>
                  <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>c.</span><span>Nomor</span><span>:</span><span>{formData.skTerakhirNomor || '-'}</span></div>
                  <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>d.</span><span>Tanggal mulai berlakunya gaji tersebut</span><span>:</span><span>{formData.skTerakhirTmt ? new Date(formData.skTerakhirTmt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span></div>
                  <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>e.</span><span>Masa kerja golongan pada tanggal tersebut</span><span>:</span><span>{formData.skTerakhirMasaKerja || '-'}</span></div>
                </div>
              </div>

              {/* RINCIAN KGB BARU */}
              <div className="text-[11pt] mb-6">
                <p>Diberikan kenaikan gaji berkala hingga memperoleh:</p>
                <div className="space-y-1 mt-2">
                  <div className="grid grid-cols-[30px_180px_10px_1fr]">
                    <span>{formData.jenisPegawai === 'PNS' ? '7.' : '8.'}</span>
                    <span>Gaji Pokok Baru</span>
                    <span>:</span>
                    <span className="font-bold">Rp. {Number(formData.gajiBaru).toLocaleString('id-ID')} ({terbilang(Number(formData.gajiBaru) || 0)} rupiah)</span>
                  </div>
                  <div className="grid grid-cols-[30px_180px_10px_1fr]">
                    <span>{formData.jenisPegawai === 'PNS' ? '8.' : '9.'}</span>
                    <span>Berdasarkan masa kerja</span>
                    <span>:</span>
                    <span className="font-bold">{formData.masaKerjaBaru || '-'}</span>
                  </div>
                  {formData.jenisPegawai === 'PNS' && (
                    <div className="grid grid-cols-[30px_180px_10px_1fr]">
                      <span>9.</span>
                      <span>Dalam golongan ruang</span>
                      <span>:</span>
                      <span className="uppercase font-bold">{formData.pangkatGol}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[30px_180px_10px_1fr]">
                    <span>10.</span>
                    <span>Terhitung mulai tanggal</span>
                    <span>:</span>
                    <span className="font-bold">{formData.tmtBaru ? new Date(formData.tmtBaru).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* KETENTUAN REGULASI */}
              <div className="text-[11pt] text-justify leading-relaxed mb-10">
                {formData.jenisPegawai === 'PNS' ? (
                  <p>Diharapkan agar sesuai dengan Peraturan Pemerintah RI Nomor 5 Tahun 2024 kepada pegawai tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokok baru.</p>
                ) : (
                  <p>Sesuai dengan Peraturan Presiden RI Nomor 11 Tahun 2024, kepada pegawai Pemerintah dengan Perjanjian Kerja tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokok baru.</p>
                )}
              </div>

              {/* SIGNATURE */}
              <div className="ml-[50%] text-center text-[11pt] leading-tight text-black">
                <p>Sekretaris Direktorat Jenderal</p>
                <p>Kekayaan Intelektual,</p>
                <p className="mb-24 uppercase font-bold"></p>
                <p className="font-bold underline leading-none">{formatPegawaiName(formData.pjbNama || 'ANDRIEANSJAH')}</p>
                <p className="text-[10pt] mt-1 font-mono">NIP. {formData.pjbNip || '197410061998031002'}</p>
              </div>

              {/* TEMBUSAN */}
              <div className="mt-10 text-[9pt]">
                <p className="font-bold">Tembusan:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Kepala BKN, u.p. Deputi Bidang Informasi Kepegawaian;</li>
                  <li>Kepala Biro SDM Kementerian Hukum RI;</li>
                  <li>Pembuat Daftar Gaji Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum RI;</li>
                  <li>Pegawai yang bersangkutan.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: PENGELOLAAN MASTER TABEL GAJI & PEMETAAN GOLONGAN (ADMINISTRATOR) */}
      {activeView === 'master' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-wrap justify-between items-center gap-4">
            <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
              <button 
                onClick={() => setMasterTab('pns')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${masterTab === 'pns' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}
              >
                Master Gaji PNS (PP 5/2024)
              </button>
              <button 
                onClick={() => setMasterTab('pppk')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${masterTab === 'pppk' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-500'}`}
              >
                Master Gaji PPPK (Perpres 11/2024)
              </button>
              <button 
                onClick={() => setMasterTab('mapping')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${masterTab === 'mapping' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
              >
                Pemetaan Golongan PPPK
              </button>
              <button 
                onClick={() => setMasterTab('audit')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${masterTab === 'audit' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
              >
                Audit Log KGB
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  const c = confirm("Apakah Anda yakin ingin mereset seluruh tabel master gaji ke data resmi PP 5/2024 & Perpres 11/2024?");
                  if (c) {
                    resetMasterToOfficial();
                    loadInitialData();
                    alert("Tabel master gaji berhasil direset ke dokumen resmi.");
                  }
                }}
                className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase hover:bg-rose-100"
              >
                <i className="bi bi-arrow-counterclockwise mr-1"></i> Reset Regulasi Resmi
              </button>
            </div>
          </div>

          {/* TAB 1: MASTER GAJI PNS */}
          {masterTab === 'pns' && (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase">Tabel Gaji Pokok PNS (PP Nomor 5 Tahun 2024)</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Memuat 272 Baris Resmi Golongan I/a s.d. IV/e</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Cari Golongan atau MKG..." 
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold uppercase outline-none"
                  value={searchMasterQuery}
                  onChange={e => setSearchMasterQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-500 border-b sticky top-0">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-4 py-4">Golongan</th>
                      <th className="px-4 py-4">Ruang</th>
                      <th className="px-4 py-4 text-center">MKG (Tahun)</th>
                      <th className="px-6 py-4 text-right">Gaji Pokok Resmi</th>
                      <th className="px-6 py-4">Sumber Regulasi</th>
                      <th className="px-4 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pnsMasterList
                      .filter(x => {
                        if (!searchMasterQuery) return true;
                        const q = searchMasterQuery.toUpperCase();
                        return (
                          x.golongan.includes(q) || 
                          x.ruang.toUpperCase().includes(q) || 
                          String(x.mkg) === q ||
                          `${x.golongan}/${x.ruang}`.includes(q)
                        );
                      })
                      .map(x => (
                        <tr key={x.id} className="hover:bg-blue-50/5">
                          <td className="px-6 py-3 font-mono text-[10px] text-gray-400">{x.id}</td>
                          <td className="px-4 py-3 font-black text-gray-900">{x.golongan}</td>
                          <td className="px-4 py-3 font-bold uppercase text-gray-700">{x.ruang}</td>
                          <td className="px-4 py-3 text-center font-bold">{x.mkg} Tahun</td>
                          <td className="px-6 py-3 text-right font-mono font-black text-gray-950">Rp {x.gajiPokok.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-3 text-[10px] text-gray-500">{x.sumberRegulasi}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black border border-emerald-200">
                              {x.statusData}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: MASTER GAJI PPPK */}
          {masterTab === 'pppk' && (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase">Tabel Gaji Pokok PPPK (Perpres Nomor 11 Tahun 2024)</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Memuat 272 Baris Resmi Golongan I s.d. XVII</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Cari Golongan Romawi..." 
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[11px] font-bold uppercase outline-none"
                  value={searchMasterQuery}
                  onChange={e => setSearchMasterQuery(e.target.value)}
                />
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-500 border-b sticky top-0">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-4 py-4">Golongan PPPK</th>
                      <th className="px-4 py-4 text-center">MKG (Tahun)</th>
                      <th className="px-6 py-4 text-right">Gaji Pokok Resmi</th>
                      <th className="px-6 py-4">Sumber Regulasi</th>
                      <th className="px-4 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pppkMasterList
                      .filter(x => {
                        if (!searchMasterQuery) return true;
                        const q = searchMasterQuery.toUpperCase();
                        return x.golongan.includes(q) || String(x.mkg) === q;
                      })
                      .map(x => (
                        <tr key={x.id} className="hover:bg-amber-50/5">
                          <td className="px-6 py-3 font-mono text-[10px] text-gray-400">{x.id}</td>
                          <td className="px-4 py-3 font-black text-amber-900">Golongan {x.golongan}</td>
                          <td className="px-4 py-3 text-center font-bold">{x.mkg} Tahun</td>
                          <td className="px-6 py-3 text-right font-mono font-black text-gray-950">Rp {x.gajiPokok.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-3 text-[10px] text-gray-500">{x.sumberRegulasi}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black border border-emerald-200">
                              {x.statusData}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PEMETAAN GOLONGAN PPPK */}
          {masterTab === 'mapping' && (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/50">
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase">Pemetaan Golongan PPPK Terverifikasi</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                    Dasar: PermenPANRB Nomor 72 Tahun 2020 & Perpres Nomor 11 Tahun 2024
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setEditingMasterItem({
                      id: `MAP-${Date.now()}`,
                      golonganAsli: '',
                      statusPegawai: 'PPPK',
                      golonganHasilPemetaan: 'IX',
                      sumberPemetaan: 'PermenPANRB No. 72 Tahun 2020',
                      statusVerifikasi: 'Terverifikasi',
                      keterangan: ''
                    });
                    setIsMasterModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 shadow-sm"
                >
                  <i className="bi bi-plus-circle mr-1"></i> Tambah Pemetaan
                </button>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-6 py-4">Golongan Asli (Database)</th>
                    <th className="px-6 py-4">Golongan PPPK Hasil Pemetaan</th>
                    <th className="px-6 py-4">Sumber / Dasar Regulasi</th>
                    <th className="px-6 py-4">Keterangan Penyetaraan</th>
                    <th className="px-4 py-4 text-center">Status Verifikasi</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {mappingList.map(m => (
                    <tr key={m.id} className="hover:bg-indigo-50/5">
                      <td className="px-6 py-4 font-black text-gray-900">{m.golonganAsli}</td>
                      <td className="px-6 py-4 font-black text-indigo-700">Golongan {m.golonganHasilPemetaan}</td>
                      <td className="px-6 py-4 text-[10px] text-gray-600">{m.sumberPemetaan}</td>
                      <td className="px-6 py-4 text-[10px] text-gray-500">{m.keterangan || '-'}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase border ${
                          m.statusVerifikasi === 'Terverifikasi' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {m.statusVerifikasi}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={async () => {
                            const newVerif = m.statusVerifikasi === 'Terverifikasi' ? 'Belum Terverifikasi' : 'Terverifikasi';
                            await saveGolonganMappingRow({ ...m, statusVerifikasi: newVerif });
                            loadInitialData();
                          }}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[9px] font-black uppercase mr-2"
                        >
                          Ubah Verifikasi
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Hapus pemetaan golongan ${m.golonganAsli}?`)) {
                              await deleteGolonganMappingRow(m.id);
                              loadInitialData();
                            }
                          }}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px]"
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {masterTab === 'audit' && (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden p-6">
              <h4 className="text-sm font-black text-gray-900 uppercase mb-4">Catatan Audit Log Modul KGB</h4>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start justify-between text-[11px]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono font-bold rounded text-[9px]">
                          {log.action}
                        </span>
                        <span className="font-black text-gray-900">{log.userName}</span>
                        <span className="text-gray-400 font-mono text-[9px]">(NIP. {log.userNip})</span>
                      </div>
                      <p className="text-gray-700">{log.details}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center py-10 text-gray-400 font-bold uppercase text-xs">
                    Belum ada aktivitas audit log tercatat
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL TAMBAH PEMETAAN GOLONGAN */}
      {isMasterModalOpen && editingMasterItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full space-y-6 shadow-2xl animate-modalEnter">
            <h4 className="text-sm font-black text-gray-900 uppercase border-b pb-3">Tambah / Edit Pemetaan Golongan PPPK</h4>
            
            <FormItem label="Golongan Asli di Database Pegawai">
              <input 
                type="text" 
                className={inputClass} 
                value={editingMasterItem.golonganAsli} 
                onChange={e => setEditingMasterItem({ ...editingMasterItem, golonganAsli: e.target.value })} 
                placeholder="Contoh: III/a, III/b, IX" 
              />
            </FormItem>

            <FormItem label="Golongan PPPK Hasil Pemetaan (I - XVII)">
              <select 
                className={inputClass}
                value={editingMasterItem.golonganHasilPemetaan}
                onChange={e => setEditingMasterItem({ ...editingMasterItem, golonganHasilPemetaan: e.target.value })}
              >
                {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'].map(r => (
                  <option key={r} value={r}>Golongan {r}</option>
                ))}
              </select>
            </FormItem>

            <FormItem label="Dasar / Sumber Pemetaan">
              <input 
                type="text" 
                className={inputClass} 
                value={editingMasterItem.sumberPemetaan} 
                onChange={e => setEditingMasterItem({ ...editingMasterItem, sumberPemetaan: e.target.value })} 
                placeholder="Contoh: PermenPANRB No. 72 Tahun 2020" 
              />
            </FormItem>

            <FormItem label="Status Verifikasi">
              <select 
                className={inputClass}
                value={editingMasterItem.statusVerifikasi}
                onChange={e => setEditingMasterItem({ ...editingMasterItem, statusVerifikasi: e.target.value as any })}
              >
                <option value="Terverifikasi">Terverifikasi (Dapat Dihitung Otomatis)</option>
                <option value="Belum Terverifikasi">Belum Terverifikasi</option>
              </select>
            </FormItem>

            <FormItem label="Keterangan / Catatan Administrator">
              <input 
                type="text" 
                className={inputClass} 
                value={editingMasterItem.keterangan || ''} 
                onChange={e => setEditingMasterItem({ ...editingMasterItem, keterangan: e.target.value })} 
                placeholder="Catatan kualifikasi atau jabatan" 
              />
            </FormItem>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                onClick={() => setIsMasterModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase"
              >
                Batal
              </button>
              <button 
                onClick={async () => {
                  if (!editingMasterItem.golonganAsli) {
                    alert("Golongan asli wajib diisi");
                    return;
                  }
                  await saveGolonganMappingRow(editingMasterItem);
                  loadInitialData();
                  setIsMasterModalOpen(false);
                }}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 shadow-md"
              >
                Simpan Pemetaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KGBGeneratorPage;