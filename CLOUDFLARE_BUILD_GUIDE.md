# Panduan Lengkap Pengaturan Deployment Cloudflare (Workers & Pages)

Dokumen ini adalah panduan resmi pengaturan agar proyek **Portal SDM DJKI** dapat di-deploy secara sukses dan berjalan lancar di **Cloudflare Workers & Pages** tanpa kendala build error (seperti kegagalan 10–16 detik).

---

## 🔍 Analisis Penyebab Error 10s–16s Sebelumnya

Berdasarkan tangkapan layar dashboard Cloudflare Anda:
1. **Jenis Proyek Terdeteksi sebagai Worker with Static Assets**:
   Pada dashboard Anda, proyek `portalsdm` terdaftar di bawah menu **Workers** dengan domain `portalsdm.robie-doank86.workers.dev` dan `portalsdm.caqiestudio.my.id`. Ketika sebuah proyek di-deploy sebagai Cloudflare Worker dari Git, Cloudflare **mewajibkan** adanya file konfigurasi `wrangler.toml`. Tanpa file ini, build langsung gagal dalam 10–16 detik.
2. **Adanya File `bun.lock`**:
   Cloudflare Build Runner mendeteksi `bun.lock` lalu mencoba mengeksekusi `bun install`, namun runner Cloudflare standar belum memiliki Bun sehingga proses berhenti seketika (*command not found*).
3. **Versi Node.js Default Cloudflare**:
   Vite 6 dan React 19 memerlukan Node.js versi 18 atau 20. Jika versi Node diatur ke default lama (Node 12/16), kompilasi langsung gagal.

Semua masalah di atas **telah diperbaiki di dalam kode repository**:
- ✅ `wrangler.toml` telah ditambahkan khusus untuk Worker Static Assets dengan routing SPA (`not_found_handling = "single-page-application"`).
- ✅ File `bun.lock` telah dihapus sehingga Cloudflare menggunakan `npm` standar dan `package-lock.json`.
- ✅ File `.node-version` (20), `.nvmrc` (20), `.npmrc` (`legacy-peer-deps=true`), dan `"engines"` di `package.json` telah dipasang.
- ✅ File `public/_redirects` dan `public/_headers` telah ditambahkan untuk menangani routing SPA dan caching.

---

## ⚙️ Pengaturan di Dashboard Cloudflare (Wajib Diperiksa)

Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > pilih akun Anda > masuk ke **Workers & Pages** > klik proyek **`portalsdm`**.

### 1. Tab "Settings" > "Builds & deployments" (atau "Build")

Pastikan parameter berikut terisi dengan benar:

| Pengaturan (Field) | Nilai yang Harus Diisi | Keterangan |
|---|---|---|
| **Framework preset** | `Vite` *(atau `None`)* | Jangan pilih Create React App |
| **Build command** | `npm run build` | Perintah build produksi |
| **Build output directory** | `dist` | Folder tempat hasil kompilasi Vite |
| **Root directory** | `/` *(biarkan kosong)* | Root repository |

---

### 2. Tab "Settings" > "Variables and Secrets" / "Environment variables"

Tambahkan 2 variabel lingkungan berikut untuk lingkungan **Production** (dan **Preview** jika ada):

| Variable Name | Value | Kegunaan |
|---|---|---|
| `NODE_VERSION` | `20` | Memaksa Cloudflare menggunakan Node.js 20 LTS (mensyaratkan Vite 6 & React 19) |
| `NPM_FLAGS` | `--include=dev` | Menjamin Vite dan plugin terinstal lengkap saat build |

> **Catatan Opsional**: Jika Anda menggunakan Google Sheets / Apps Script khusus via environment variable di client, Anda dapat menambahkan variabel seperti:
> - `VITE_SPREADSHEET_ID` = `ID_SPREADSHEET_ANDA`
> - `VITE_APPS_SCRIPT_URL` = `URL_EXEC_APPS_SCRIPT_ANDA`

---

## 🚀 Cara Menjalankan Ulang Build (Trigger Rebuild)

Setelah pengaturan di atas dipastikan:
1. Masuk ke tab **Deployments** pada proyek `portalsdm`.
2. Klik tombol **`Manage deployment`** (atau ikon titik tiga di sebelah kanan deployment terakhir yang berstatus *Failed*).
3. Pilih **`Retry deployment`** (atau tekan **`Create deployment`**).
4. Klik tautan **`Build ↗`** untuk melihat proses build secara langsung.
5. Proses build normal membutuhkan waktu sekitar **45–75 detik** dan akan berakhir dengan status **Success** (Centang Hijau).

---

## 🌐 Verifikasi Setelah Deploy Sukses

Setelah status deployment berubah menjadi **Active / Success**:
1. Buka domain Anda: `https://portalsdm.caqiestudio.my.id` atau `https://portalsdm.robie-doank86.workers.dev`.
2. Uji navigasi rute langsung (seperti `/pegawai`, `/dashboard`, `/kgb`). Lakukan refresh (F5) pada halaman tersebut; berkat konfigurasi `not_found_handling = "single-page-application"` dan `_redirects`, halaman tidak akan 404 melainkan langsung memuat antarmuka aplikasi.
