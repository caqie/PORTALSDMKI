import { Pegawai } from '../types';

export interface SoalCatPPPK {
  id: string;
  nomor: number;
  kategori: 'MANAJERIAL' | 'SOSIO_KULTURAL' | 'TEKNIS_DJKI' | 'BERAKHLAK';
  kategoriLabel: string;
  pertanyaan: string;
  pilihan: {
    key: 'A' | 'B' | 'C' | 'D' | 'E';
    teks: string;
    skor: number; // 1 - 5 for SJT/situational judgement, or 5 for correct in technical
  }[];
  kunciJawaban: string;
  pembahasan: string;
}

export interface HasilCatPPPK {
  id: string;
  nip: string;
  nama: string;
  unitKerja: string;
  jabatan: string;
  tanggalUjian: string;
  waktuMulai: string;
  waktuSelesai: string;
  durasiPengerjaanMenit: number;
  skorManajerial: number;
  skorSosioKultural: number;
  skorTeknis: number;
  skorBerakhlak: number;
  skorTotal: number;
  nilaiSkala100: number;
  rekomendasi: 'SANGAT DIREKOMENDASIKAN' | 'DIREKOMENDASIKAN' | 'DIPERPANJANG DENGAN PEMBINAAN' | 'TIDAK DIREKOMENDASIKAN';
  keterangan: string;
  jawabanDetail: Record<string, string>;
}

export const BANK_SOAL_PPPK_DEFAULT: SoalCatPPPK[] = [
  // 1. MANAJERIAL
  {
    id: 'pppk-mgt-01',
    nomor: 1,
    kategori: 'MANAJERIAL',
    kategoriLabel: 'Kompetensi Manajerial - Integritas',
    pertanyaan: 'Seorang pemohon permohonan pendaftaran kekayaan intelektual mendatangi meja kerja Anda dan menawarkan imbalan uang agar berkas permohonannya diproses lebih cepat melampaui antrean standar operasional prosedur (SOP). Tindakan yang paling tepat Anda lakukan adalah:',
    pilihan: [
      { key: 'A', teks: 'Menerima imbalan tersebut karena menurut Anda itu bentuk sukarela tanda terima kasih pemohon.', skor: 1 },
      { key: 'B', teks: 'Menolak secara tegas dan santun, menjelaskan bahwa seluruh proses permohonan wajib mematuhi antrean SOP resmi tanpa biaya tambahan di luar PNBP, serta melaporkannya ke Unit Pengendalian Gratifikasi (UPG).', skor: 5 },
      { key: 'C', teks: 'Meminta pemohon menyembunyikan uang tersebut agar rekan kerja lain tidak melihat.', skor: 1 },
      { key: 'D', teks: 'Menolak dan mendiamkan kejadian tersebut tanpa memberikan edukasi prosedur kepada pemohon.', skor: 3 },
      { key: 'E', teks: 'Mengalihkan berkas ke rekan kerja lain agar terhindar dari benturan kepentingan pribadi.', skor: 2 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Nilai Integritas menuntut penolakan tegas terhadap gratifikasi, komitmen pada SOP pelayanan publik, dan kepatuhan pelaporan pada UPG.'
  },
  {
    id: 'pppk-mgt-02',
    nomor: 2,
    kategori: 'MANAJERIAL',
    kategoriLabel: 'Kompetensi Manajerial - Kerjasama Tim',
    pertanyaan: 'Dalam tim kerja di lingkungan DJKI, terjadi keterlambatan penyelesaian target verifikasi dokumen karena dua orang rekan tim Anda berselisih paham mengenai pembagian tugas. Sebagai bagian dari tim, sikap terbaik Anda adalah:',
    pilihan: [
      { key: 'A', teks: 'Membiarkan perselisihan tersebut karena bukan menjadi tanggung jawab langsung pekerjaan Anda.', skor: 1 },
      { key: 'B', teks: 'Mengambil inisiatif mengajak berdialog secara konstruktif bersama ketua tim, memetakan kembali beban kerja secara adil dan berfokus pada tercapainya target bersama.', skor: 5 },
      { key: 'C', teks: 'Menyalahkan kedua rekan tersebut di hadapan pimpinan unit agar mereka ditegur.', skor: 2 },
      { key: 'D', teks: 'Mengerjakan seluruh sisa berkas sendirian tanpa berkoordinasi dengan rekan lain.', skor: 3 },
      { key: 'E', teks: 'Meminta pimpinan untuk memindahkan salah satu rekan kerja yang berselisih ke unit lain.', skor: 2 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Kerjasama tim menuntut kemampuan memfasilitasi solusi, mengutamakan pencapaian target organisasi, dan menjaga harmoni kerja.'
  },
  {
    id: 'pppk-mgt-03',
    nomor: 3,
    kategori: 'MANAJERIAL',
    kategoriLabel: 'Kompetensi Manajerial - Orientasi Hasil',
    pertanyaan: 'Menjelang akhir tahun anggaran, target penyelesaian layanan permohonan sertifikat KI di unit Anda masih menyisakan 20% berkas yang belum terselesaikan karena kendala teknis jaringan beberapa hari sebelumnya. Langkah Anda adalah:',
    pilihan: [
      { key: 'A', teks: 'Pasrah dan menerima jika capaian target tahun ini di bawah standar karena faktor jaringan.', skor: 1 },
      { key: 'B', teks: 'Menyusun rencana kerja percepatan (crash program), mengoptimalkan jam kerja efektif, dan berkolaborasi intensif dengan tim IT agar seluruh tunggakan tuntas sebelum cuti bersama.', skor: 5 },
      { key: 'C', teks: 'Meminta penambahan pegawai baru untuk menuntaskan sisa berkas dalam waktu singkat.', skor: 2 },
      { key: 'D', teks: 'Meminta perpanjangan waktu penyelesaian target ke tahun anggaran berikutnya tanpa upaya percepatan.', skor: 2 },
      { key: 'E', teks: 'Menyelesaikan berkas semampunya pada hari kerja normal tanpa ada penyesuaian strategi.', skor: 3 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Orientasi pada hasil mendorong inovasi kerja, persistensi dalam mengatasi hambatan, dan komitmen tinggi terhadap target organisasi.'
  },

  // 2. SOSIO-KULTURAL
  {
    id: 'pppk-sos-01',
    nomor: 4,
    kategori: 'SOSIO_KULTURAL',
    kategoriLabel: 'Kompetensi Sosio Kultural - Perekat Bangsa',
    pertanyaan: 'DJKI menerima penempatan pegawai baru yang berasal dari berbagai suku bangsa dan latar belakang budaya yang sangat beragam. Terkadang muncul perbedaan gaya komunikasi dan kebiasaan kerja sehari-hari. Sikap profesional Anda adalah:',
    pilihan: [
      { key: 'A', teks: 'Meminta pegawai dari daerah lain menyesuaikan diri sepenuhnya dengan kebiasaan mayoritas tanpa kompromi.', skor: 2 },
      { key: 'B', teks: 'Menghargai keberagaman budaya, bersikap inklusif, membangun komunikasi yang santun dan menjunjung tinggi nilai persatuan sebagai sesama aparatur sipil negara.', skor: 5 },
      { key: 'C', teks: 'Hanya bergaul akrab dengan rekan yang memiliki kesamaan daerah asal atau latar belakang yang sama.', skor: 1 },
      { key: 'D', teks: 'Mengkritik gaya komunikasi rekan kerja lain secara terbuka di grup kerja.', skor: 1 },
      { key: 'E', teks: 'Bersikap acuh tak acuh selama tidak mengganggu tugas pribadi Anda.', skor: 3 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Kompetensi Sosio Kultural mengharuskan ASN menjadi perekat bangsa yang toleran, inklusif, dan mampu bekerja sinergis dalam kebinekaan.'
  },
  {
    id: 'pppk-sos-02',
    nomor: 5,
    kategori: 'SOSIO_KULTURAL',
    kategoriLabel: 'Kompetensi Sosio Kultural - Pelayanan Inklusif',
    pertanyaan: 'Saat bertugas di loket pelayanan terpadu DJKI, Anda melayani seorang pemohon disabilitas atau lanjut usia dari daerah terpencil yang belum terbiasa dengan aplikasi pendaftaran online mandiri. Tindakan Anda adalah:',
    pilihan: [
      { key: 'A', teks: 'Menyuruh pemohon tersebut meminta bantuan pihak luar atau calo di luar kantor.', skor: 1 },
      { key: 'B', teks: 'Memberikan pendampingan asistensi ramah disabilitas secara sabar dan tuntas hingga pendaftaran permohonan berhasil terverifikasi pada sistem portal resmi.', skor: 5 },
      { key: 'C', teks: 'Memberikan brosur panduan teknis dan menyuruhnya membaca sendiri.', skor: 2 },
      { key: 'D', teks: 'Menolak melayani karena sistem dirancang untuk dioperasikan secara mandiri oleh pemohon.', skor: 1 },
      { key: 'E', teks: 'Menyuruh pemohon menunggu sampai ada pegawai lain yang bersedia membantu.', skor: 2 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Pelayanan inklusif dan kepekaan sosial merupakan wujud nyata integritas sosial ASN dalam memberikan perlakuan adil bagi kelompok rentan.'
  },

  // 3. TEKNIS KEKAYAAN INTELEKTUAL (DJKI)
  {
    id: 'pppk-tek-01',
    nomor: 6,
    kategori: 'TEKNIS_DJKI',
    kategoriLabel: 'Kompetensi Teknis - Pengetahuan Regulasi KI',
    pertanyaan: 'Berikut ini merupakan rezim Kekayaan Intelektual yang termasuk dalam kategori Kekayaan Intelektual Komunal (KIK) yang dilindungi oleh negara untuk kemaslahatan masyarakat adat/lokal adalah:',
    pilihan: [
      { key: 'A', teks: 'Paten Sederhana dan Rahasia Dagang Perusahaan', skor: 1 },
      { key: 'B', teks: 'Ekspresi Budaya Tradisional (EBT) dan Pengetahuan Tradisional (PT)', skor: 5 },
      { key: 'C', teks: 'Merek Dagang dan Desain Tata Letak Sirkuit Terpadu Komersial', skor: 1 },
      { key: 'D', teks: 'Hak Cipta Perangkat Lunak Komersial', skor: 1 },
      { key: 'E', teks: 'Waralaba Makanan Cepat Saji Asing', skor: 1 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'KIK (Kekayaan Intelektual Komunal) mencakup Ekspresi Budaya Tradisional, Pengetahuan Tradisional, Sumber Daya Genetik, dan Potensi Indikasi Geografis.'
  },
  {
    id: 'pppk-tek-02',
    nomor: 7,
    kategori: 'TEKNIS_DJKI',
    kategoriLabel: 'Kompetensi Teknis - Perlindungan Hak Cipta',
    pertanyaan: 'Berdasarkan Undang-Undang No. 28 Tahun 2014 tentang Hak Cipta, prinsip dasar perlindungan hak cipta menganut sistem:',
    pilihan: [
      { key: 'A', teks: 'Sistem Konstitutif (First to File) mutlak tanpa kecuali', skor: 1 },
      { key: 'B', teks: 'Sistem Deklaratif, yaitu perlindungan lahir secara otomatis sejak suatu ciptaan diwujudkan dalam bentuk nyata', skor: 5 },
      { key: 'C', teks: 'Sistem Lelang Publik Tertutup', skor: 1 },
      { key: 'D', teks: 'Sistem Pendaftaran Wajib, jika tidak didaftarkan tidak ada hak moral', skor: 2 },
      { key: 'E', teks: 'Sistem Pemeriksaan Substantif Khusus Hak Cipta', skor: 1 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Hak Cipta menganut sistem deklaratif di mana hak eksklusif otomatis timbul seketika ciptaan lahir dalam wujud nyata.'
  },
  {
    id: 'pppk-tek-03',
    nomor: 8,
    kategori: 'TEKNIS_DJKI',
    kategoriLabel: 'Kompetensi Teknis - Pelayanan Digital DJKI',
    pertanyaan: 'Salah satu terobosan transformasi digital DJKI dalam mempercepat pelindungan hak cipta dan merek adalah implementasi layanan Persetujuan Otomatisasi (POP). Apa kepanjangan dari POP Hak Cipta?',
    pilihan: [
      { key: 'A', teks: 'Persetujuan Operasional Pelanggaran', skor: 1 },
      { key: 'B', teks: 'Persetujuan Otomatis Pencatatan Hak Cipta', skor: 5 },
      { key: 'C', teks: 'Program Otorisasi Paten Cipta', skor: 1 },
      { key: 'D', teks: 'Pusat Operasi Pelayanan Cipta', skor: 1 },
      { key: 'E', teks: 'Pengawasan Online Penerbitan Cipta', skor: 1 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'POP Hak Cipta (Persetujuan Otomatis Pencatatan Hak Cipta) memungkinkan pencatatan hak cipta selesai dalam hitungan menit secara online.'
  },

  // 4. BERAKHLAK
  {
    id: 'pppk-bhk-01',
    nomor: 9,
    kategori: 'BERAKHLAK',
    kategoriLabel: 'Core Values ASN - Berorientasi Pelayanan & Akuntabel',
    pertanyaan: 'Ketika Anda menemukan adanya kesalahan administrasi data pemohon yang diinput pada hari sebelumnya, apa yang harus Anda lakukan sesuai dengan nilai Akuntabel?',
    pilihan: [
      { key: 'A', teks: 'Menutup-nutupi kesalahan tersebut agar tidak mengurangi nilai SKP Anda.', skor: 1 },
      { key: 'B', teks: 'Secara bertanggung jawab melaporkan kekeliruan kepada atasan langsung, melakukan perbaikan sesuai tata cara koreksi resmi, dan menghubungi pemohon untuk konfirmasi.', skor: 5 },
      { key: 'C', teks: 'Menyalahkan staf lain yang bertugas memasukkan berkas pertama kali.', skor: 1 },
      { key: 'D', teks: 'Menunggu sampai pemohon mengajukan komplain resmi baru diperbaiki.', skor: 2 },
      { key: 'E', teks: 'Menghapus data tersebut dari riwayat aplikasi tanpa jejak audit log.', skor: 1 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Akuntabilitas menuntut keberanian mengakui dan memperbaiki kesalahan secara transparan dan bertanggung jawab sesuai koridor regulasi.'
  },
  {
    id: 'pppk-bhk-02',
    nomor: 10,
    kategori: 'BERAKHLAK',
    kategoriLabel: 'Core Values ASN - Adaptif & Kolaboratif',
    pertanyaan: 'Kementerian Hukum memberlakukan pembaruan sistem aplikasi kepegawaian dan kearsipan berbasis AI dan cloud. Sebagian rekan merasa enggan mempelajari sistem baru. Sikap Anda yang mencerminkan nilai Adaptif adalah:',
    pilihan: [
      { key: 'A', teks: 'Menolak menggunakan aplikasi baru dan bersikeras memakai cara manual.', skor: 1 },
      { key: 'B', teks: 'Antusias mempelajari modul baru, aktif mengikuti sosialisasi/bimtek, serta bersedia berbagi pengetahuan kepada rekan tim kerja demi kemajuan layanan.', skor: 5 },
      { key: 'C', teks: 'Menunggu orang lain mahir terlebih dahulu baru Anda ikut belajar.', skor: 3 },
      { key: 'D', teks: 'Mengkritik aplikasi baru tanpa memberikan masukan perbaikan yang konstruktif.', skor: 2 },
      { key: 'E', teks: 'Hanya menggunakan fitur yang paling mudah dan mengabaikan fitur utama lainnya.', skor: 2 }
    ],
    kunciJawaban: 'B',
    pembahasan: 'Adaptif menuntut ASN cepat menyesuaikan diri menghadapi perubahan, terus berinovasi, dan proaktif memanfaatkan teknologi terkini.'
  }
];

export const getBankSoalPPPK = (): SoalCatPPPK[] => {
  const cached = localStorage.getItem('cat_pppk_bank_soal');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return BANK_SOAL_PPPK_DEFAULT;
};

export const saveBankSoalPPPK = (soalList: SoalCatPPPK[]) => {
  localStorage.setItem('cat_pppk_bank_soal', JSON.stringify(soalList));
};

export const getHasilCatPPPKList = (): HasilCatPPPK[] => {
  const cached = localStorage.getItem('cat_pppk_results');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
};

export const simpanHasilCatPPPK = (hasil: HasilCatPPPK) => {
  const current = getHasilCatPPPKList();
  const existingIdx = current.findIndex(h => h.nip === hasil.nip);
  let updated: HasilCatPPPK[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = hasil;
  } else {
    updated = [hasil, ...current];
  }
  localStorage.setItem('cat_pppk_results', JSON.stringify(updated));
  return updated;
};

export const hitungRekomendasiPerpanjanganKontrak = (nilai100: number): {
  rekomendasi: 'SANGAT DIREKOMENDASIKAN' | 'DIREKOMENDASIKAN' | 'DIPERPANJANG DENGAN PEMBINAAN' | 'TIDAK DIREKOMENDASIKAN';
  keterangan: string;
  badgeColor: string;
} => {
  if (nilai100 >= 85) {
    return {
      rekomendasi: 'SANGAT DIREKOMENDASIKAN',
      keterangan: 'Kompetensi manajerial, sosio kultural, teknis, dan perilaku BerAKHLAK berada pada level optimal. Memenuhi syarat penuh perpanjangan kontrak kerja PPPK hingga periode berikutnya.',
      badgeColor: 'bg-emerald-500 text-white'
    };
  } else if (nilai100 >= 70) {
    return {
      rekomendasi: 'DIREKOMENDASIKAN',
      keterangan: 'Memenuhi standar kompetensi jabatan dan target kinerja yang dipersyaratkan. Layak dan direkomendasikan untuk perpanjangan kontrak kerja PPPK.',
      badgeColor: 'bg-blue-600 text-white'
    };
  } else if (nilai100 >= 60) {
    return {
      rekomendasi: 'DIPERPANJANG DENGAN PEMBINAAN',
      keterangan: 'Memenuhi batas ambang minimal namun memerlukan peningkatan pada aspek teknis atau manajerial tertentu. Direkomendasikan diperpanjang dengan catatan wajib mengikuti coaching/mentoring.',
      badgeColor: 'bg-amber-500 text-white'
    };
  } else {
    return {
      rekomendasi: 'TIDAK DIREKOMENDASIKAN',
      keterangan: 'Nilai kompetensi dan evaluasi kinerja berada di bawah standar minimal perpanjangan perjanjian kerja. Menjadi bahan pertimbangan pimpinan untuk tidak memperpanjang masa kontrak.',
      badgeColor: 'bg-rose-600 text-white'
    };
  }
};
