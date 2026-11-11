import { 
  KGBMasterGajiPNS, 
  KGBMasterGajiPPPK, 
  KGBGolonganMapping, 
  KGBAuditLog, 
  Pegawai 
} from '../types';
import { 
  OFFICIAL_PNS_SALARY_DATA, 
  OFFICIAL_PPPK_SALARY_DATA, 
  DEFAULT_PPPK_MAPPINGS 
} from './kgbSalaryData';

const STORAGE_KEYS = {
  MASTER_PNS: 'kgb_master_pns_custom',
  MASTER_PPPK: 'kgb_master_pppk_custom',
  MAPPING_GOLONGAN: 'kgb_mapping_golongan_custom',
  AUDIT_LOGS: 'kgb_audit_logs_local'
};

export interface SalaryQueryResult {
  success: boolean;
  gajiPokok: number;
  sumber: string;
  versi: string;
  message?: string;
  golonganDipakai?: string;
  statusVerifikasi?: 'Terverifikasi' | 'Belum Terverifikasi' | 'Valid PNS';
  statusPegawaiNormalized?: 'PNS' | 'PPPK' | 'OTHER';
}

/**
 * 1. NORMALISASI STATUS PEGAWAI
 * Menentukan klasifikasi resmi: PNS, PPPK, atau OTHER (Paruh Waktu/Kontrak/Tidak Didukung)
 */
export const normalizeStatusPegawai = (statusRaw?: string): 'PNS' | 'PPPK' | 'OTHER' => {
  if (!statusRaw) return 'PNS'; // Default instansi
  const s = statusRaw.trim().toUpperCase();

  // Deteksi khusus jika terdapat indikator Paruh Waktu
  if (s.includes('PARUH WAKTU') || s.includes('PW') || s.includes('PART TIME')) {
    return 'OTHER';
  }

  if (s.includes('PPPK') || s.includes('P3K') || s.includes('PERJANJIAN KERJA')) {
    return 'PPPK';
  }

  if (s.includes('PNS') || s.includes('NEGERI SIPIL') || s.includes('CPNS') || s.includes('ASN')) {
    return 'PNS';
  }

  return 'OTHER';
};

/**
 * 2. NORMALISASI GOLONGAN
 * Membedah string golongan menjadi komponen golongan angka romawi dan ruang huruf kecil
 */
export const normalizeGolongan = (golRuangRaw?: string): {
  golongan: string;
  ruang: string;
  clean: string;
  isPnsFormat: boolean;
  isPppkFormat: boolean;
} => {
  if (!golRuangRaw) {
    return { golongan: '', ruang: '', clean: '', isPnsFormat: false, isPppkFormat: false };
  }

  const trimmed = golRuangRaw.trim().toUpperCase();

  // Format PNS seperti "III/A", "III/a", "IV/E", "I/D"
  const pnsMatch = trimmed.match(/^([I|V|X]+)\s*[\/\-]\s*([A-E])$/i);
  if (pnsMatch) {
    return {
      golongan: pnsMatch[1].toUpperCase(),
      ruang: pnsMatch[2].toLowerCase(),
      clean: `${pnsMatch[1].toUpperCase()}/${pnsMatch[2].toLowerCase()}`,
      isPnsFormat: true,
      isPppkFormat: false
    };
  }

  // Format PPPK seperti "GOLONGAN IX", "GOL. IX", "IX", "XVII"
  const pppkMatch = trimmed.replace(/GOLONGAN|GOL\.?|\s+/g, '').trim();
  const validPppkRomans = [
    'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 
    'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'
  ];

  if (validPppkRomans.includes(pppkMatch)) {
    return {
      golongan: pppkMatch,
      ruang: '',
      clean: pppkMatch,
      isPnsFormat: false,
      isPppkFormat: true
    };
  }

  return {
    golongan: trimmed,
    ruang: '',
    clean: trimmed,
    isPnsFormat: false,
    isPppkFormat: false
  };
};

/**
 * 3. PEMETAAN DAN VERIFIKASI GOLONGAN PPPK
 * Memastikan golongan PPPK yang masih berformat PNS terpetakan ke golongan PPPK resmi (I - XVII)
 * sesuai dasar regulasi resmi. Jika tidak terverifikasi, tandai sebagai 'GOLONGAN BELUM TERVERIFIKASI'.
 */
export const konversiGolonganPPPK = (
  golRuang?: string,
  customMappings?: KGBGolonganMapping[]
): {
  verified: boolean;
  value: string;
  original: string;
  reason?: string;
  sumber?: string;
  keterangan?: string;
} => {
  const norm = normalizeGolongan(golRuang);
  const original = golRuang || '-';

  if (!norm.clean) {
    return {
      verified: false,
      value: '',
      original,
      reason: 'Data Golongan Kosong / Tidak Valid'
    };
  }

  // Jika formatnya sudah golongan resmi PPPK (Romawi I - XVII tanpa ruang)
  if (norm.isPppkFormat) {
    return {
      verified: true,
      value: norm.clean,
      original,
      sumber: 'Perpres Nomor 11 Tahun 2024',
      keterangan: 'Format resmi golongan PPPK terverifikasi'
    };
  }

  // Jika berformat PNS (misal III/a, III/b, II/c)
  const activeMappings = customMappings && customMappings.length > 0 
    ? customMappings 
    : getGolonganMappingList();

  const matched = activeMappings.find(m => {
    const mNorm = normalizeGolongan(m.golonganAsli);
    return mNorm.clean === norm.clean || m.golonganAsli.toUpperCase() === norm.clean.toUpperCase();
  });

  if (matched && matched.statusVerifikasi === 'Terverifikasi') {
    return {
      verified: true,
      value: matched.golonganHasilPemetaan.toUpperCase(),
      original,
      sumber: matched.sumberPemetaan || 'PermenPANRB No. 72 Tahun 2020',
      keterangan: matched.keterangan || 'Pemetaan kualifikasi ke Golongan PPPK'
    };
  }

  if (matched && matched.statusVerifikasi !== 'Terverifikasi') {
    return {
      verified: false,
      value: '',
      original,
      reason: 'GOLONGAN BELUM TERVERIFIKASI (Pemetaan Belum Disahkan Administrator)'
    };
  }

  return {
    verified: false,
    value: '',
    original,
    reason: `GOLONGAN BELUM TERVERIFIKASI (Belum ada pemetaan untuk golongan '${original}')`
  };
};

/**
 * 4. PENGAMBILAN TABEL DAN VERSI REGULASI
 */
export const getSalaryTableByStatus = (statusPegawai?: string): 'PNS' | 'PPPK' | 'UNSUPPORTED' => {
  const norm = normalizeStatusPegawai(statusPegawai);
  if (norm === 'PNS') return 'PNS';
  if (norm === 'PPPK') return 'PPPK';
  return 'UNSUPPORTED';
};

export const getSalaryTableVersion = (statusPegawai?: string): string => {
  const t = getSalaryTableByStatus(statusPegawai);
  if (t === 'PNS') return 'PP Nomor 5 Tahun 2024 (Lampiran Gaji Pokok PNS)';
  if (t === 'PPPK') return 'Perpres Nomor 11 Tahun 2024 (Lampiran Gaji Pokok PPPK)';
  return 'Tidak Didukung';
};

/**
 * 5. PENCARIAN GAJI POKOK PNS (PP Nomor 5 Tahun 2024)
 * Tidak melakukan interpolasi atau asumsi. Hanya mengembalikan angka dari tabel resmi.
 */
export const getGajiPNS = (
  golongan: string,
  ruang: string,
  mkg: number
): { success: boolean; gajiPokok: number; sumber: string; versi: string; message?: string } => {
  const normGol = golongan.trim().toUpperCase();
  const normRuang = ruang.trim().toLowerCase();
  const mkgNum = Math.floor(Math.max(0, mkg));

  const list = getMasterGajiPNSList();
  const matched = list.find(x => 
    x.statusData === 'Aktif' &&
    x.golongan.toUpperCase() === normGol &&
    x.ruang.toLowerCase() === normRuang &&
    x.mkg === mkgNum
  );

  if (matched) {
    return {
      success: true,
      gajiPokok: matched.gajiPokok,
      sumber: matched.sumberRegulasi || 'PP Nomor 5 Tahun 2024',
      versi: matched.versiData || '2024.1'
    };
  }

  // Jika MKG tidak ditemukan persis (misal pegawai memiliki MKG ganjil pada Golongan III yang hanya memiliki baris genap)
  // Periksa apakah ada MKG terdekat di bawahnya untuk konfirmasi verifikasi admin
  return {
    success: false,
    gajiPokok: 0,
    sumber: 'PP Nomor 5 Tahun 2024',
    versi: '2024.1',
    message: `Nominal tidak ditemukan pada Master Gaji PNS (PP 5/2024) untuk Golongan ${normGol}/${normRuang} dengan MKG ${mkgNum} Tahun.`
  };
};

/**
 * 6. PENCARIAN GAJI POKOK PPPK (Perpres Nomor 11 Tahun 2024)
 * Tidak melakukan interpolasi atau perkiraan. Hanya mengembalikan angka dari tabel resmi.
 */
export const getGajiPPPK = (
  golongan: string,
  mkg: number
): { success: boolean; gajiPokok: number; sumber: string; versi: string; message?: string } => {
  const normGol = golongan.trim().toUpperCase();
  const mkgNum = Math.floor(Math.max(0, mkg));

  const list = getMasterGajiPPPKList();
  const matched = list.find(x => 
    x.statusData === 'Aktif' &&
    x.golongan.toUpperCase() === normGol &&
    x.mkg === mkgNum
  );

  if (matched) {
    return {
      success: true,
      gajiPokok: matched.gajiPokok,
      sumber: matched.sumberRegulasi || 'Perpres Nomor 11 Tahun 2024',
      versi: matched.versiData || '2024.1'
    };
  }

  return {
    success: false,
    gajiPokok: 0,
    sumber: 'Perpres Nomor 11 Tahun 2024',
    versi: '2024.1',
    message: `Nominal tidak ditemukan pada Master Gaji PPPK (Perpres 11/2024) untuk Golongan ${normGol} dengan MKG ${mkgNum} Tahun.`
  };
};

/**
 * 7. SERVICE UTAMA PERHITUNGAN GAJI BERDASARKAN JENIS PEGAWAI
 * Membaca statusPegawai, memetakan golongan PPPK bila perlu, dan mengambil gaji resmi.
 */
export const getGajiByEmployeeType = (
  pegawai: Pegawai,
  mkg: number,
  customGolongan?: string
): SalaryQueryResult => {
  const rawStatus = pegawai.statusPegawai || pegawai.jenisPegawai;
  const statusType = normalizeStatusPegawai(rawStatus);

  if (statusType === 'PNS') {
    const golToUse = customGolongan || pegawai.golRuang;
    const norm = normalizeGolongan(golToUse);
    if (!norm.isPnsFormat) {
      return {
        success: false,
        gajiPokok: 0,
        sumber: 'PP Nomor 5 Tahun 2024',
        versi: '2024.1',
        message: `Format golongan PNS '${golToUse}' tidak valid. Harus menyertakan golongan dan ruang (contoh: III/a, IV/b).`,
        statusVerifikasi: 'Belum Terverifikasi',
        statusPegawaiNormalized: 'PNS'
      };
    }

    const res = getGajiPNS(norm.golongan, norm.ruang, mkg);
    return {
      ...res,
      golonganDipakai: norm.clean,
      statusVerifikasi: 'Valid PNS',
      statusPegawaiNormalized: 'PNS'
    };
  }

  if (statusType === 'PPPK') {
    const golToUse = customGolongan || pegawai.golRuang;
    const mapping = konversiGolonganPPPK(golToUse);

    if (!mapping.verified) {
      return {
        success: false,
        gajiPokok: 0,
        sumber: 'Perpres Nomor 11 Tahun 2024',
        versi: '2024.1',
        message: mapping.reason || 'GOLONGAN BELUM TERVERIFIKASI',
        golonganDipakai: golToUse,
        statusVerifikasi: 'Belum Terverifikasi',
        statusPegawaiNormalized: 'PPPK'
      };
    }

    const res = getGajiPPPK(mapping.value, mkg);
    return {
      ...res,
      golonganDipakai: `Golongan ${mapping.value} (Hasil Pemetaan dari ${mapping.original})`,
      statusVerifikasi: 'Terverifikasi',
      statusPegawaiNormalized: 'PPPK'
    };
  }

  return {
    success: false,
    gajiPokok: 0,
    sumber: 'Tidak Didukung',
    versi: '-',
    message: `Status pegawai '${rawStatus || 'Kosong'}' bukan PNS atau PPPK penuh waktu yang memenuhi kriteria KGB otomatis.`,
    statusVerifikasi: 'Belum Terverifikasi',
    statusPegawaiNormalized: 'OTHER'
  };
};

/**
 * 8. VALIDASI REFERENSI GAJI
 */
export const validateSalaryReference = (
  pegawai: Pegawai,
  mkg: number
): { valid: boolean; reason?: string } => {
  const res = getGajiByEmployeeType(pegawai, mkg);
  if (!res.success) {
    return { valid: false, reason: res.message };
  }
  return { valid: true };
};

/**
 * 9. PENGELOLAAN DATA MASTER GAJI (ADMINISTRATOR)
 */

export const getMasterGajiPNSList = (): KGBMasterGajiPNS[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_PNS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Gagal membaca master gaji PNS lokal:", e);
  }
  return OFFICIAL_PNS_SALARY_DATA;
};

export const saveMasterGajiPNSRow = async (item: KGBMasterGajiPNS): Promise<boolean> => {
  try {
    const list = [...getMasterGajiPNSList()];
    const idx = list.findIndex(x => x.id === item.id || (x.golongan === item.golongan && x.ruang === item.ruang && x.mkg === item.mkg));
    if (idx >= 0) {
      list[idx] = { ...item, tanggalPembaruan: new Date().toISOString() };
    } else {
      list.push({ ...item, id: item.id || `PNS-${item.golongan}-${item.ruang}-${item.mkg}`, tanggalPembaruan: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.MASTER_PNS, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan master gaji PNS:", e);
    return false;
  }
};

export const getMasterGajiPPPKList = (): KGBMasterGajiPPPK[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MASTER_PPPK);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Gagal membaca master gaji PPPK lokal:", e);
  }
  return OFFICIAL_PPPK_SALARY_DATA;
};

export const saveMasterGajiPPPKRow = async (item: KGBMasterGajiPPPK): Promise<boolean> => {
  try {
    const list = [...getMasterGajiPPPKList()];
    const idx = list.findIndex(x => x.id === item.id || (x.golongan === item.golongan && x.mkg === item.mkg));
    if (idx >= 0) {
      list[idx] = { ...item, tanggalPembaruan: new Date().toISOString() };
    } else {
      list.push({ ...item, id: item.id || `PPPK-${item.golongan}-${item.mkg}`, tanggalPembaruan: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.MASTER_PPPK, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan master gaji PPPK:", e);
    return false;
  }
};

export const getGolonganMappingList = (): KGBGolonganMapping[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MAPPING_GOLONGAN);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Gagal membaca mapping golongan lokal:", e);
  }
  return DEFAULT_PPPK_MAPPINGS;
};

export const saveGolonganMappingRow = async (item: KGBGolonganMapping): Promise<boolean> => {
  try {
    const list = [...getGolonganMappingList()];
    const idx = list.findIndex(x => x.id === item.id || x.golonganAsli.toUpperCase() === item.golonganAsli.toUpperCase());
    if (idx >= 0) {
      list[idx] = { ...item, updatedAt: new Date().toISOString().split('T')[0] };
    } else {
      list.push({ ...item, id: item.id || `MAP-${Date.now()}`, updatedAt: new Date().toISOString().split('T')[0] });
    }
    localStorage.setItem(STORAGE_KEYS.MAPPING_GOLONGAN, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan mapping golongan:", e);
    return false;
  }
};

export const deleteGolonganMappingRow = async (id: string): Promise<boolean> => {
  try {
    const list = getGolonganMappingList().filter(x => x.id !== id);
    localStorage.setItem(STORAGE_KEYS.MAPPING_GOLONGAN, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error("Gagal menghapus mapping:", e);
    return false;
  }
};

export const resetMasterToOfficial = (): void => {
  localStorage.removeItem(STORAGE_KEYS.MASTER_PNS);
  localStorage.removeItem(STORAGE_KEYS.MASTER_PPPK);
  localStorage.removeItem(STORAGE_KEYS.MAPPING_GOLONGAN);
};

export const getKGBAuditLogs = (): KGBAuditLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const recordKGBAudit = (log: Omit<KGBAuditLog, 'id' | 'timestamp'>): void => {
  try {
    const logs = getKGBAuditLogs();
    const entry: KGBAuditLog = {
      ...log,
      id: `KGB-AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
  } catch (e) {
    console.error("Gagal mencatat audit log KGB:", e);
  }
};
