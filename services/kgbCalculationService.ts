import { Pegawai, KGB, KGBStatusAlur } from '../types';
import { 
  normalizeStatusPegawai, 
  normalizeGolongan, 
  konversiGolonganPPPK, 
  getGajiByEmployeeType,
  getSalaryTableVersion
} from './kgbSalaryService';
import { parseDateToYYYYMMDD } from '../spreadsheetService';

export type KGBMonitoringStatus = 
  | 'Akan Datang'
  | 'Mendekati KGB'
  | 'Jatuh Tempo'
  | 'Terlambat'
  | 'Sudah Diproses'
  | 'Data Belum Lengkap'
  | 'Perlu Verifikasi';

export interface KGBPeriodeCalculation {
  nip: string;
  nama: string;
  statusPegawai: 'PNS' | 'PPPK' | 'OTHER';
  golonganAsli: string;
  golonganDipakai: string;
  statusVerifikasiGolongan: 'Terverifikasi' | 'Belum Terverifikasi' | 'Valid PNS';
  mkgLamaTahun: number;
  mkgLamaBulan: number;
  mkgBaruTahun: number;
  mkgBaruBulan: number;
  gajiPokokLama: number;
  gajiPokokBaru: number;
  selisihGaji: number;
  tmtKgbTerakhir: string;
  dasarTmtTerakhir: 'RIWAYAT_KGB' | 'RIWAYAT_GAJI' | 'TMT_PANGKAT' | 'TMT_CPNS' | 'TIDAK_TERSEDIA';
  estimasiKgbBerikutnya: string;
  statusKgb: KGBMonitoringStatus;
  statusValidasi: 'Valid' | 'Perlu Verifikasi' | 'Tidak Memenuhi Syarat';
  catatanValidasi: string;
  sumberTabelGaji: string;
  versiTabelGaji: string;
  skTerakhirNomor?: string;
  skTerakhirTanggal?: string;
  skTerakhirPejabat?: string;
  isKgbProcessed: boolean;
  activeKgbRecord?: KGB;
}

/**
 * Parsing masa kerja string seperti "12 Tahun 4 Bulan" atau "12" menjadi angka tahun dan bulan
 */
export const parseMasaKerjaString = (mkStr?: string | number): { tahun: number; bulan: number } => {
  if (mkStr === undefined || mkStr === null || mkStr === '') {
    return { tahun: 0, bulan: 0 };
  }

  if (typeof mkStr === 'number') {
    return { tahun: Math.floor(mkStr), bulan: 0 };
  }

  const str = String(mkStr).trim();
  const match = str.match(/(\d+)\s*(?:Tahun|Thn|Th)?\s*(?:(\d+)\s*(?:Bulan|Bln))?/i);
  if (match) {
    const tahun = parseInt(match[1]) || 0;
    const bulan = parseInt(match[2]) || 0;
    return { tahun, bulan };
  }

  const digits = parseInt(str.replace(/\D/g, ''));
  return { tahun: isNaN(digits) ? 0 : digits, bulan: 0 };
};

/**
 * Format tanggal YYYY-MM-DD secara aman tanpa time-shift zona waktu
 */
export const safeFormatDate = (raw?: string): string => {
  if (!raw) return '';
  return parseDateToYYYYMMDD(raw);
};

/**
 * Menghitung kelayakan dan estimasi KGB berikutnya bagi seorang pegawai
 * Mengutamakan Riwayat KGB dan Riwayat Gaji resmi daripada asumsi
 */
export const calculatePegawaiKGB = (
  pegawai: Pegawai,
  kgbHistory: KGB[] = [],
  referenceDate: Date = new Date()
): KGBPeriodeCalculation => {
  const normStatus = normalizeStatusPegawai(pegawai.statusPegawai || pegawai.jenisPegawai);
  const golAsli = pegawai.golRuang || '-';
  const sumberTabel = getSalaryTableVersion(pegawai.statusPegawai || pegawai.jenisPegawai);

  // 1. Validasi Golongan dan Verifikasi untuk PPPK
  let statusVerifikasiGol: 'Terverifikasi' | 'Belum Terverifikasi' | 'Valid PNS' = 'Valid PNS';
  let golDipakai = golAsli;

  if (normStatus === 'PNS') {
    const pnsNorm = normalizeGolongan(golAsli);
    if (!pnsNorm.isPnsFormat) {
      statusVerifikasiGol = 'Belum Terverifikasi';
    } else {
      statusVerifikasiGol = 'Valid PNS';
      golDipakai = pnsNorm.clean;
    }
  } else if (normStatus === 'PPPK') {
    const mapping = konversiGolonganPPPK(golAsli);
    if (mapping.verified) {
      statusVerifikasiGol = 'Terverifikasi';
      golDipakai = `Golongan ${mapping.value}`;
    } else {
      statusVerifikasiGol = 'Belum Terverifikasi';
      golDipakai = golAsli;
    }
  } else {
    statusVerifikasiGol = 'Belum Terverifikasi';
  }

  // 2. Temukan Riwayat KGB yang sudah pernah diterbitkan di sistem
  const employeeKgbList = kgbHistory
    .filter(k => k.nip === pegawai.nip)
    .sort((a, b) => {
      const dateA = a.tmtBaru || a.tglSk || '';
      const dateB = b.tmtBaru || b.tglSk || '';
      return dateB.localeCompare(dateA);
    });

  const latestKgb = employeeKgbList[0];

  // 3. Temukan Riwayat Gaji terakhir dari database pegawai (misal dari SIMPEG)
  let latestRiwayatGaji = null;
  if (pegawai.riwayatGaji && pegawai.riwayatGaji.length > 0) {
    latestRiwayatGaji = [...pegawai.riwayatGaji].sort((a, b) => {
      const dateA = a.tmtSk || a.tanggalSk || '';
      const dateB = b.tmtSk || b.tanggalSk || '';
      return dateB.localeCompare(dateA);
    })[0];
  }

  // 4. Temukan Riwayat Pangkat terakhir
  let latestRiwayatPangkat = null;
  if (pegawai.riwayatPangkat && pegawai.riwayatPangkat.length > 0) {
    latestRiwayatPangkat = [...pegawai.riwayatPangkat].sort((a, b) => {
      const dateA = a.tmtPangkat || a.tanggalSk || '';
      const dateB = b.tmtPangkat || b.tanggalSk || '';
      return dateB.localeCompare(dateA);
    })[0];
  }

  // 5. Menentukan Dasar TMT Terakhir
  let tmtTerakhirRaw = '';
  let dasarTmt: 'RIWAYAT_KGB' | 'RIWAYAT_GAJI' | 'TMT_PANGKAT' | 'TMT_CPNS' | 'TIDAK_TERSEDIA' = 'TIDAK_TERSEDIA';
  let skNomor = '';
  let skTanggal = '';
  let skPejabat = '';

  if (latestKgb && latestKgb.tmtBaru) {
    tmtTerakhirRaw = latestKgb.tmtBaru;
    dasarTmt = 'RIWAYAT_KGB';
    skNomor = latestKgb.nomorSk || '';
    skTanggal = latestKgb.tglSk || latestKgb.tglSurat || '';
    skPejabat = latestKgb.pjbJabatan || 'Sekretaris Direktorat Jenderal';
  } else if (latestRiwayatGaji && (latestRiwayatGaji.tmtSk || latestRiwayatGaji.tanggalSk)) {
    tmtTerakhirRaw = latestRiwayatGaji.tmtSk || latestRiwayatGaji.tanggalSk;
    dasarTmt = 'RIWAYAT_GAJI';
    skNomor = latestRiwayatGaji.nomorSk || '';
    skTanggal = latestRiwayatGaji.tanggalSk || '';
    skPejabat = latestRiwayatGaji.pejabatPenetap || 'Kepala Biro Sumber Daya Manusia';
  } else if (pegawai.tmtPangkat) {
    tmtTerakhirRaw = pegawai.tmtPangkat;
    dasarTmt = 'TMT_PANGKAT';
    skNomor = latestRiwayatPangkat?.nomorSk || '';
    skTanggal = latestRiwayatPangkat?.tanggalSk || '';
    skPejabat = latestRiwayatPangkat?.pejabatPenetap || 'Kepala Biro Sumber Daya Manusia';
  } else if (pegawai.tmtCpns) {
    tmtTerakhirRaw = pegawai.tmtCpns;
    dasarTmt = 'TMT_CPNS';
    skPejabat = 'Menteri Hukum dan HAM RI';
  }

  const tmtKgbTerakhirFormatted = safeFormatDate(tmtTerakhirRaw);

  // 6. Masa Kerja Golongan (MKG)
  const mkFromPegawai = parseMasaKerjaString(pegawai.masaKerjaGolongan || pegawai.masaKerja);
  let mkgLamaTahun = mkFromPegawai.tahun;
  let mkgLamaBulan = mkFromPegawai.bulan;

  if (latestKgb && latestKgb.masaKerjaBaru) {
    const parsedKgbMk = parseMasaKerjaString(latestKgb.masaKerjaBaru);
    mkgLamaTahun = parsedKgbMk.tahun;
    mkgLamaBulan = parsedKgbMk.bulan;
  } else if (latestRiwayatGaji?.masaKerjaTahun !== undefined) {
    mkgLamaTahun = Number(latestRiwayatGaji.masaKerjaTahun) || mkgLamaTahun;
    mkgLamaBulan = Number(latestRiwayatGaji.masaKerjaBulan) || mkgLamaBulan;
  }

  const mkgBaruTahun = mkgLamaTahun + 2;
  const mkgBaruBulan = mkgLamaBulan;

  // 7. Hitung Gaji Pokok Lama dan Baru dari Master Resmi
  let gajiPokokLama = 0;
  if (latestKgb?.gajiBaru) {
    gajiPokokLama = Number(latestKgb.gajiBaru);
  } else if (latestRiwayatGaji?.gajiPokok) {
    gajiPokokLama = typeof latestRiwayatGaji.gajiPokok === 'number' 
      ? latestRiwayatGaji.gajiPokok 
      : parseInt(String(latestRiwayatGaji.gajiPokok).replace(/\D/g, '')) || 0;
  } else if (pegawai.gajiPokok) {
    gajiPokokLama = typeof pegawai.gajiPokok === 'number'
      ? pegawai.gajiPokok
      : parseInt(String(pegawai.gajiPokok).replace(/\D/g, '')) || 0;
  }

  // Jika gaji pokok lama belum ada di riwayat, cari dari tabel resmi berdasarkan mkgLama
  if (!gajiPokokLama && statusVerifikasiGol !== 'Belum Terverifikasi') {
    const qLama = getGajiByEmployeeType(pegawai, mkgLamaTahun);
    if (qLama.success) {
      gajiPokokLama = qLama.gajiPokok;
    }
  }

  let gajiPokokBaru = 0;
  let statusValidasi: 'Valid' | 'Perlu Verifikasi' | 'Tidak Memenuhi Syarat' = 'Valid';
  let catatanValidasi = '';

  if (statusVerifikasiGol === 'Belum Terverifikasi') {
    statusValidasi = 'Perlu Verifikasi';
    catatanValidasi = normStatus === 'PPPK' 
      ? `Golongan '${golAsli}' belum memiliki pemetaan terverifikasi ke Golongan PPPK (I - XVII).`
      : `Format Golongan '${golAsli}' tidak valid untuk PNS.`;
  } else {
    const qBaru = getGajiByEmployeeType(pegawai, mkgBaruTahun);
    if (qBaru.success) {
      gajiPokokBaru = qBaru.gajiPokok;
    } else {
      statusValidasi = 'Perlu Verifikasi';
      catatanValidasi = qBaru.message || 'Nominal gaji baru tidak ditemukan pada tabel regulasi.';
    }
  }

  const selisihGaji = Math.max(0, gajiPokokBaru - gajiPokokLama);

  // 8. Menghitung Estimasi Tanggal KGB Berikutnya (+2 Tahun dari TMT Terakhir)
  let estimasiKgbBerikutnya = '';
  let statusKgb: KGBMonitoringStatus = 'Data Belum Lengkap';

  if (!tmtKgbTerakhirFormatted) {
    statusKgb = 'Data Belum Lengkap';
    statusValidasi = 'Perlu Verifikasi';
    catatanValidasi = 'Data TMT dasar KGB belum tersedia pada riwayat pegawai.';
  } else {
    const tmtParts = tmtKgbTerakhirFormatted.split('-');
    const tYear = parseInt(tmtParts[0]);
    const tMonth = parseInt(tmtParts[1]);
    const tDay = parseInt(tmtParts[2]);

    if (!isNaN(tYear) && !isNaN(tMonth) && !isNaN(tDay)) {
      const nextYear = tYear + 2;
      estimasiKgbBerikutnya = `${nextYear}-${String(tMonth).padStart(2, '0')}-${String(tDay).padStart(2, '0')}`;

      // Cek apakah KGB siklus ini sudah diproses
      const isProcessed = employeeKgbList.some(k => {
        const kDate = safeFormatDate(k.tmtBaru);
        return kDate && kDate.startsWith(String(nextYear));
      });

      if (isProcessed) {
        statusKgb = 'Sudah Diproses';
      } else if (statusVerifikasiGol === 'Belum Terverifikasi') {
        statusKgb = 'Perlu Verifikasi';
      } else if (dasarTmt === 'TMT_PANGKAT' || dasarTmt === 'TMT_CPNS') {
        // Karena bukan berasal dari riwayat KGB resmi, harus ditandai untuk verifikasi
        statusKgb = 'Perlu Verifikasi';
        catatanValidasi = `Dasar perhitungan menggunakan ${dasarTmt} (Belum ada riwayat KGB tercatat). Perlu verifikasi administrator.`;
      } else {
        const nextDateObj = new Date(nextYear, tMonth - 1, tDay);
        const refYear = referenceDate.getFullYear();
        const refMonth = referenceDate.getMonth();
        const refDateObj = new Date(refYear, refMonth, referenceDate.getDate());

        const diffTime = nextDateObj.getTime() - refDateObj.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          statusKgb = 'Terlambat';
        } else if (diffDays <= 31 && nextDateObj.getMonth() === refMonth && nextDateObj.getFullYear() === refYear) {
          statusKgb = 'Jatuh Tempo';
        } else if (diffDays <= 180) {
          statusKgb = 'Mendekati KGB';
        } else {
          statusKgb = 'Akan Datang';
        }
      }
    }
  }

  return {
    nip: pegawai.nip,
    nama: pegawai.nama,
    statusPegawai: normStatus,
    golonganAsli: golAsli,
    golonganDipakai: golDipakai,
    statusVerifikasiGolongan: statusVerifikasiGol,
    mkgLamaTahun,
    mkgLamaBulan,
    mkgBaruTahun,
    mkgBaruBulan,
    gajiPokokLama,
    gajiPokokBaru,
    selisihGaji,
    tmtKgbTerakhir: tmtKgbTerakhirFormatted,
    dasarTmtTerakhir: dasarTmt,
    estimasiKgbBerikutnya,
    statusKgb,
    statusValidasi,
    catatanValidasi,
    sumberTabelGaji: sumberTabel,
    versiTabelGaji: '2024.1',
    skTerakhirNomor: skNomor,
    skTerakhirTanggal: skTanggal,
    skTerakhirPejabat: skPejabat,
    isKgbProcessed: statusKgb === 'Sudah Diproses',
    activeKgbRecord: latestKgb
  };
};

/**
 * Filter dan sortir monitoring KGB
 */
export const filterMonitoringList = (
  list: KGBPeriodeCalculation[],
  query: string,
  filterYear: string,
  filterMonth: string,
  filterStatusPegawai: string,
  filterStatusKgb: string
): KGBPeriodeCalculation[] => {
  return list.filter(item => {
    // Search query
    if (query) {
      const q = query.toLowerCase();
      const matchName = item.nama.toLowerCase().includes(q);
      const matchNip = item.nip.includes(q);
      if (!matchName && !matchNip) return false;
    }

    // Filter status pegawai (PNS / PPPK)
    if (filterStatusPegawai && filterStatusPegawai !== 'ALL') {
      if (item.statusPegawai !== filterStatusPegawai) return false;
    }

    // Filter status KGB
    if (filterStatusKgb && filterStatusKgb !== 'ALL') {
      if (item.statusKgb !== filterStatusKgb) return false;
    }

    // Filter tahun & bulan berdasarkan estimasiKgbBerikutnya
    if (item.estimasiKgbBerikutnya) {
      const parts = item.estimasiKgbBerikutnya.split('-');
      const y = parts[0];
      const m = parts[1];

      if (filterYear && filterYear !== 'ALL' && y !== filterYear) return false;
      if (filterMonth && filterMonth !== 'ALL' && m !== filterMonth) return false;
    } else if (filterYear && filterYear !== 'ALL') {
      return false;
    }

    return true;
  });
};
