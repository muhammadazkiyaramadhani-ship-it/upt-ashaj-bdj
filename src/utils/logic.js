/**
 * Logika perhitungan statistik, filter, dan sorting
 * Dapat dijalankan di browser maupun di Node.js untuk unit testing.
 */

export function calculateStats(buildings = []) {
  if (!Array.isArray(buildings) || buildings.length === 0) {
    return {
      totalBangunan: 0,
      totalLuas: 0,
      totalKapasitas: 0,
      bangunan1Lantai: 0,
      bangunan2Lantai: 0,
      bangunan3LantaiPlus: 0,
      byJenis: {},
      byKondisi: {}
    };
  }

  let totalLuas = 0;
  let totalKapasitas = 0;
  let bangunan1Lantai = 0;
  let bangunan2Lantai = 0;
  let bangunan3LantaiPlus = 0;
  const byJenis = {};
  const byKondisi = {};

  for (const b of buildings) {
    const luas = Number(b.luas) || (Number(b.panjang) * Number(b.lebar)) || 0;
    totalLuas += luas;
    totalKapasitas += Number(b.kapasitas) || 0;

    const lantai = Number(b.lantai) || 1;
    if (lantai === 1) {
      bangunan1Lantai++;
    } else if (lantai === 2) {
      bangunan2Lantai++;
    } else {
      bangunan3LantaiPlus++;
    }

    const jenis = b.jenis || 'Lainnya';
    byJenis[jenis] = (byJenis[jenis] || 0) + 1;

    const kondisi = b.kondisi || 'Tidak Diketahui';
    byKondisi[kondisi] = (byKondisi[kondisi] || 0) + 1;
  }

  return {
    totalBangunan: buildings.length,
    totalLuas,
    totalKapasitas,
    bangunan1Lantai,
    bangunan2Lantai,
    bangunan3LantaiPlus,
    byJenis,
    byKondisi
  };
}

export function getCategories(buildings = []) {
  const set = new Set();
  buildings.forEach(b => {
    if (b.jenis) set.add(b.jenis);
  });
  return Array.from(set).sort();
}

export function filterAndSortBuildings(buildings = [], {
  search = '',
  jenis = '',
  kondisi = '',
  sortBy = 'nama',
  sortOrder = 'asc'
} = {}) {
  const q = search.trim().toLowerCase();

  const filtered = buildings.filter(b => {
    // Search filter
    if (q) {
      const matchNama = b.nama && b.nama.toLowerCase().includes(q);
      const matchJenis = b.jenis && b.jenis.toLowerCase().includes(q);
      const matchFungsi = b.fungsi && b.fungsi.toLowerCase().includes(q);
      const matchKet = b.keterangan && b.keterangan.toLowerCase().includes(q);
      if (!matchNama && !matchJenis && !matchFungsi && !matchKet) {
        return false;
      }
    }

    // Jenis filter
    if (jenis && b.jenis !== jenis) {
      return false;
    }

    // Kondisi filter
    if (kondisi && b.kondisi !== kondisi) {
      return false;
    }

    return true;
  });

  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'luas') {
      valA = Number(valA) || (Number(a.panjang) * Number(a.lebar)) || 0;
      valB = Number(valB) || (Number(b.panjang) * Number(b.lebar)) || 0;
    } else if (sortBy === 'kapasitas' || sortBy === 'lantai' || sortBy === 'panjang' || sortBy === 'lebar') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return filtered;
}

/**
 * Menghasilkan nomor registrasi resmi BMN untuk cetak lembar fisik bangunan
 * @param {number|string} id - ID Bangunan
 * @param {number|string} year - Tahun anggaran / inventaris
 * @returns {string} Nomor registrasi resmi (contoh: BMN-AHB/GDG-001/2026)
 */
export function generateRegistrationNumber(id, year = 2026) {
  const paddedId = String(id || '0').padStart(3, '0');
  return `BMN-AHB/GDG-${paddedId}/${year}`;
}

/**
 * Validasi kata sandi dengan syarat minimal 8 karakter demi keamanan akun
 * @param {string} password - Kata sandi yang akan divalidasi
 * @returns {object} Hasil validasi { valid, length, hasMinLength, strength, message }
 */
export function validatePassword(password = '') {
  const pwd = String(password || '');
  const length = pwd.length;
  const hasMinLength = length >= 8;

  if (!hasMinLength) {
    return {
      valid: false,
      length,
      hasMinLength: false,
      strength: 'weak',
      message: 'Kata sandi wajib memiliki minimal 8 karakter demi keamanan akun.'
    };
  }

  // Cek kompleksitas untuk indikator kekuatan kata sandi
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

  let score = 0;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let strength = 'medium';
  if (score >= 3 && length >= 10) {
    strength = 'strong';
  } else if (score < 2) {
    strength = 'weak';
  }

  return {
    valid: true,
    length,
    hasMinLength: true,
    strength,
    message: strength === 'strong' ? 'Kata sandi sangat aman dan kuat.' : 'Kata sandi memenuhi syarat keamanan (min. 8 karakter).'
  };
}

/**
 * Menghasilkan kode OTP 6-digit untuk verifikasi 2 langkah
 * @returns {string} 6-digit token numerik
 */
export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Verifikasi kode OTP 2FA dengan batas kedaluwarsa waktu
 * @param {string} enteredCode - Kode yang diinput user
 * @param {string} expectedCode - Kode yang dikirim sistem
 * @param {number} expiryTimestamp - Waktu kedaluwarsa dalam milidetik
 * @returns {boolean} Status keberhasilan verifikasi
 */
export function verifyOtpCode(enteredCode, expectedCode, expiryTimestamp) {
  if (!enteredCode || !expectedCode) return false;
  const cleanEntered = String(enteredCode).trim();
  const cleanExpected = String(expectedCode).trim();

  if (expiryTimestamp && Date.now() > expiryTimestamp) {
    return false; // OTP kedaluwarsa
  }

  return cleanEntered === cleanExpected;
}

/**
 * Pendaftaran akun baru dengan verifikasi syarat password 8 karakter
 * @param {object} userData - { nama, email, password, role, noHp }
 * @param {Array} userList - Daftar user yang ada
 * @returns {object} { success, user, error }
 */
export function registerUserAccount(userData = {}, userList = []) {
  const { nama, email, password, role = 'petugas', noHp = '' } = userData;

  if (!nama || !nama.trim()) {
    return { success: false, error: 'Nama lengkap wajib diisi.' };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Format email tidak valid.' };
  }

  const existing = userList.find(u => (u.email || '').toLowerCase() === cleanEmail);
  if (existing) {
    return { success: false, error: 'Email sudah terdaftar. Silakan gunakan menu Masuk.' };
  }

  const pwdCheck = validatePassword(password);
  if (!pwdCheck.valid) {
    return { success: false, error: pwdCheck.message };
  }

  const maxId = userList.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0);
  const newUser = {
    id: maxId + 1,
    nama: nama.trim(),
    email: cleanEmail,
    password: String(password),
    role,
    noHp: (noHp || '').trim(),
    twoFactorEnabled: true,
    registeredAt: new Date().toISOString()
  };

  return {
    success: true,
    user: newUser
  };
}

/**
 * Menghasilkan string kode CAPTCHA alfanumerik (menghindari karakter ambigu seperti 0/O, 1/I/l)
 * @param {number} length - Panjang karakter captcha (default 5)
 * @returns {string} Kode CAPTCHA
 */
export function generateCaptchaCode(length = 5) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Verifikasi kode CAPTCHA yang diinput user (case-insensitive & trim)
 * @param {string} inputCode - Kode yang dimasukkan user
 * @param {string} actualCode - Kode CAPTCHA yang digenerate sistem
 * @returns {boolean} True jika cocok
 */
export function verifyCaptchaCode(inputCode = '', actualCode = '') {
  if (!inputCode || !actualCode) return false;
  return inputCode.trim().toUpperCase() === actualCode.trim().toUpperCase();
}

/**
 * Memeriksa hak akses untuk menu atau halaman yang memerlukan autentikasi akun
 * @param {string} viewName - Nama view yang ingin dibuka
 * @param {object|null} currentUser - Data user yang sedang login (null jika belum login)
 * @returns {object} { allowed: boolean, requiresAuth: boolean, reason: string }
 */
export function checkMenuAccess(viewName, currentUser) {
  const protectedViews = ['internal', 'dokumen-rahasia'];
  const requiresAuth = protectedViews.includes(viewName);

  if (!requiresAuth) {
    return { allowed: true, requiresAuth: false, reason: 'public' };
  }

  if (currentUser && currentUser.twoFactorEnabled) {
    return { allowed: true, requiresAuth: true, reason: 'authenticated_2fa' };
  }

  return { allowed: false, requiresAuth: true, reason: 'login_required' };
}

/**
 * Membuat data laporan inspeksi / audit fisik bangunan BMN
 * @param {object} reportData - { gedungId, namaGedung, deskripsi, prioritas, pelapor }
 * @param {Array} existingReports - Daftar laporan yang sudah ada
 * @returns {object} { success: boolean, report: object, error: string }
 */
export function createInspectionReport(reportData = {}, existingReports = []) {
  const { gedungId, namaGedung, deskripsi, prioritas = 'sedang', pelapor = 'Petugas' } = reportData;

  if (!gedungId || !namaGedung) {
    return { success: false, error: 'Gedung/Fasilitas wajib dipilih.' };
  }

  if (!deskripsi || deskripsi.trim().length < 10) {
    return { success: false, error: 'Deskripsi hasil inspeksi minimal 10 karakter.' };
  }

  const maxId = existingReports.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const now = new Date();
  const reportNumber = `INSP-AHB/${now.getFullYear()}/${String(maxId + 1).padStart(3, '0')}`;

  const newReport = {
    id: maxId + 1,
    reportNumber,
    gedungId,
    namaGedung,
    deskripsi: deskripsi.trim(),
    prioritas,
    pelapor,
    status: 'Menunggu Verifikasi',
    createdAt: now.toISOString(),
    formattedDate: now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  };

  return { success: true, report: newReport };
}

/**
 * Memfilter dokumen legalitas BMN berdasarkan query teks dan kategori
 * @param {Array} docs - Daftar dokumen BMN
 * @param {string} searchQuery - Kata kunci pencarian
 * @param {string} filterCategory - Kategori terpilih ('all' atau nama kategori)
 * @returns {Array} Daftar dokumen yang cocok
 */
export function filterBmnDocuments(docs = [], searchQuery = '', filterCategory = 'all') {
  if (!Array.isArray(docs)) return [];
  const query = (searchQuery || '').trim().toLowerCase();

  return docs.filter(doc => {
    const matchCat = filterCategory === 'all' || !filterCategory || doc.category === filterCategory;
    const matchQuery = !query ||
      (doc.title && doc.title.toLowerCase().includes(query)) ||
      (doc.number && doc.number.toLowerCase().includes(query)) ||
      (doc.issuer && doc.issuer.toLowerCase().includes(query)) ||
      (doc.desc && doc.desc.toLowerCase().includes(query));
    return matchCat && matchQuery;
  });
}

/**
 * Menghasilkan konten CSV dari daftar laporan audit BMN
 * @param {Array} reports - Daftar laporan inspeksi/audit
 * @returns {string} String CSV siap unduh
 */
export function generateAuditReportsCsv(reports = []) {
  const headers = ['No. Laporan', 'Tanggal', 'Gedung / Sarana', 'Uraian Temuan', 'Prioritas', 'Petugas Pelapor', 'Status'];
  const rows = (Array.isArray(reports) ? reports : []).map(r => {
    return [
      `"${String(r.reportNumber || '').replace(/"/g, '""')}"`,
      `"${String(r.formattedDate || '').replace(/"/g, '""')}"`,
      `"${String(r.namaGedung || '').replace(/"/g, '""')}"`,
      `"${String(r.deskripsi || '').replace(/"/g, '""')}"`,
      `"${String(r.prioritas || '').toUpperCase()}"`,
      `"${String(r.pelapor || '').replace(/"/g, '""')}"`,
      `"${String(r.status || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Validasi data kamar penginapan
 * @param {object} room - Data kamar yang akan divalidasi
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateRoomData(room = {}) {
  const errors = [];
  if (!room.nama || !room.nama.trim()) {
    errors.push('Nama tipe / nama kamar wajib diisi.');
  }
  if (!room.namaGedung || !room.namaGedung.trim()) {
    errors.push('Lokasi gedung kamar wajib dipilih atau diisi.');
  }
  const panjang = Number(room.panjang);
  const lebar = Number(room.lebar);
  const tinggi = Number(room.tinggi);

  if (isNaN(panjang) || panjang <= 0) {
    errors.push('Panjang kamar harus berupa angka lebih besar dari 0.');
  }
  if (isNaN(lebar) || lebar <= 0) {
    errors.push('Lebar kamar harus berupa angka lebih besar dari 0.');
  }
  if (isNaN(tinggi) || tinggi <= 0) {
    errors.push('Tinggi kamar harus berupa angka lebih besar dari 0.');
  }

  const beds = Number(room.jumlahTempatTidur);
  if (room.jumlahTempatTidur !== undefined && room.jumlahTempatTidur !== '' && (isNaN(beds) || beds < 0)) {
    errors.push('Jumlah tempat tidur harus berupa angka 0 atau lebih.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter dan pencarian data kamar
 * @param {Array} rooms - Daftar kamar
 * @param {object} filters - { search, gedung, tipe, kondisi }
 * @returns {Array} Daftar kamar yang cocok
 */
export function filterRooms(rooms = [], {
  search = '',
  gedung = '',
  tipe = '',
  kondisi = ''
} = {}) {
  if (!Array.isArray(rooms)) return [];
  const q = search.trim().toLowerCase();

  return rooms.filter(r => {
    if (q) {
      const matchName = r.nama && r.nama.toLowerCase().includes(q);
      const matchGedung = r.namaGedung && r.namaGedung.toLowerCase().includes(q);
      const matchNo = r.nomorKamar && String(r.nomorKamar).toLowerCase().includes(q);
      const matchDesc = r.deskripsi && r.deskripsi.toLowerCase().includes(q);
      const matchFas = Array.isArray(r.fasilitas) && r.fasilitas.some(f => String(f).toLowerCase().includes(q));
      if (!matchName && !matchGedung && !matchNo && !matchDesc && !matchFas) {
        return false;
      }
    }

    if (gedung && r.namaGedung !== gedung) {
      return false;
    }

    if (tipe && r.tipe !== tipe) {
      return false;
    }

    if (kondisi && r.kondisi !== kondisi) {
      return false;
    }

    return true;
  });
}

/**
 * Validasi data panel / instalasi kelistrikan
 * @param {object} panel - Data panel listrik
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateElectricalPanel(panel = {}) {
  const errors = [];
  if (!panel.namaPanel || !panel.namaPanel.trim()) {
    errors.push('Nama panel / sumber listrik wajib diisi.');
  }
  if (!panel.lokasiGedung || !panel.lokasiGedung.trim()) {
    errors.push('Lokasi gedung / gardu kelistrikan wajib diisi.');
  }

  const daya = Number(panel.dayaNilai);
  if (isNaN(daya) || daya <= 0) {
    errors.push('Nilai kapasitas daya harus berupa angka lebih besar dari 0.');
  }

  const satuan = (panel.dayaSatuan || '').trim().toUpperCase();
  if (satuan !== 'KVA' && satuan !== 'VA') {
    errors.push('Satuan daya listrik harus tegas dinyatakan dalam "kVA" atau "VA".');
  }

  if (panel.penggunaanKwh !== undefined && panel.penggunaanKwh !== '') {
    const kwh = Number(panel.penggunaanKwh);
    if (isNaN(kwh) || kwh < 0) {
      errors.push('Penggunaan listrik kWh harus berupa angka positif.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter data panel kelistrikan
 * @param {Array} panels - Daftar panel kelistrikan
 * @param {object} filters - { search, status, kondisi }
 * @returns {Array}
 */
export function filterElectricalPanels(panels = [], {
  search = '',
  status = '',
  kondisi = ''
} = {}) {
  if (!Array.isArray(panels)) return [];
  const q = search.trim().toLowerCase();

  return panels.filter(p => {
    if (q) {
      const matchName = p.namaPanel && p.namaPanel.toLowerCase().includes(q);
      const matchLoc = p.lokasiGedung && p.lokasiGedung.toLowerCase().includes(q);
      const matchSource = p.sumberListrik && p.sumberListrik.toLowerCase().includes(q);
      const matchCakup = p.cakupan && p.cakupan.toLowerCase().includes(q);
      const matchDevices = p.jenisPerangkat && p.jenisPerangkat.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchSource && !matchCakup && !matchDevices) {
        return false;
      }
    }

    if (status && p.statusOperasional !== status) {
      return false;
    }

    if (kondisi && p.kondisiInstalasi !== kondisi) {
      return false;
    }

    return true;
  });
}

/**
 * Validasi data genset kawasan
 * @param {object} genset - Data unit genset
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateGensetData(genset = {}) {
  const errors = [];
  if (!genset.nama || !genset.nama.trim()) {
    errors.push('Nama unit genset wajib diisi.');
  }
  if (!genset.lokasiGedung || !genset.lokasiGedung.trim()) {
    errors.push('Lokasi ruang / gedung genset wajib diisi.');
  }

  const kva = Number(genset.kapasitasKva);
  if (isNaN(kva) || kva <= 0) {
    errors.push('Kapasitas genset dalam kVA harus berupa angka lebih besar dari 0.');
  }

  if (genset.hourMeter !== undefined && genset.hourMeter !== '') {
    const hours = Number(genset.hourMeter);
    if (isNaN(hours) || hours < 0) {
      errors.push('Hour meter (jam kerja operasional) harus berupa angka positif.');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter data genset kawasan
 * @param {Array} gensets - Daftar genset
 * @param {object} filters - { search, status, kondisi }
 * @returns {Array}
 */
export function filterGensets(gensets = [], {
  search = '',
  status = '',
  kondisi = ''
} = {}) {
  if (!Array.isArray(gensets)) return [];
  const q = search.trim().toLowerCase();

  return gensets.filter(g => {
    if (q) {
      const matchName = g.nama && g.nama.toLowerCase().includes(q);
      const matchLoc = g.lokasiGedung && g.lokasiGedung.toLowerCase().includes(q);
      const matchBrand = g.merek && g.merek.toLowerCase().includes(q);
      const matchId = g.nomorIdentifikasi && g.nomorIdentifikasi.toLowerCase().includes(q);
      const matchFuel = g.bahanBakar && g.bahanBakar.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchBrand && !matchId && !matchFuel) {
        return false;
      }
    }

    if (status && g.statusOperasional !== status) {
      return false;
    }

    if (kondisi && g.kondisi !== kondisi) {
      return false;
    }

    return true;
  });
}

/**
 * Hitung ringkasan total daya kelistrikan kawasan
 * @param {Array} panels - Daftar panel listrik
 * @param {Array} gensets - Daftar genset
 * @returns {object} Ringkasan statistik daya
 */
export function calculateElectricalSummary(panels = [], gensets = []) {
  let totalDayaKva = 0;
  let totalKwh = 0;
  let panelAktif = 0;

  (Array.isArray(panels) ? panels : []).forEach(p => {
    const daya = Number(p.dayaNilai) || 0;
    const satuan = (p.dayaSatuan || 'kVA').toUpperCase();
    if (satuan === 'VA') {
      totalDayaKva += daya / 1000;
    } else {
      totalDayaKva += daya;
    }

    if (p.penggunaanKwh) {
      totalKwh += Number(p.penggunaanKwh) || 0;
    }

    if (!p.statusOperasional || p.statusOperasional.toLowerCase().includes('aktif') || p.statusOperasional.toLowerCase().includes('siaga')) {
      panelAktif++;
    }
  });

  let totalGensetKva = 0;
  let gensetStandby = 0;

  (Array.isArray(gensets) ? gensets : []).forEach(g => {
    totalGensetKva += Number(g.kapasitasKva) || 0;
    if (!g.statusOperasional || g.statusOperasional.toLowerCase().includes('standby') || g.statusOperasional.toLowerCase().includes('siap') || g.statusOperasional.toLowerCase().includes('operasi')) {
      gensetStandby++;
    }
  });

  return {
    totalDayaKva: Math.round(totalDayaKva * 10) / 10,
    totalKwh: Math.round(totalKwh),
    panelAktif,
    totalPanel: panels.length,
    totalGensetKva: Math.round(totalGensetKva),
    gensetStandby,
    totalGenset: gensets.length
  };
}

/**
 * Validasi data bidang/zona tanah kawasan
 * @param {object} parcel - Data bidang tanah
 * @returns {object} { valid: boolean, errors: Array<string> }
 */
export function validateLandParcel(parcel = {}) {
  const errors = [];
  const nama = parcel.nama || parcel.namaBidang;
  if (!nama || !String(nama).trim()) {
    errors.push('Nama bidang / zona tanah wajib diisi.');
  }

  const luas = Number(parcel.luasM2);
  if (isNaN(luas) || luas <= 0) {
    errors.push('Luas tanah (m²) harus berupa angka positif lebih dari 0.');
  }

  if (!parcel.peruntukan || !String(parcel.peruntukan).trim()) {
    errors.push('Peruntukan atau fungsi tata ruang bidang tanah wajib diisi.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter data bidang tanah kawasan
 * @param {Array} parcels - Daftar bidang tanah
 * @param {object} filters - { search, zona, peruntukan, tipeArea }
 * @returns {Array} Daftar bidang tanah hasil filter
 */
export function filterLandParcels(parcels = [], {
  search = '',
  zona = '',
  peruntukan = '',
  tipeArea = ''
} = {}) {
  if (!Array.isArray(parcels)) return [];
  const q = search.trim().toLowerCase();

  return parcels.filter(p => {
    if (q) {
      const matchName = p.nama && p.nama.toLowerCase().includes(q);
      const matchZona = p.zona && p.zona.toLowerCase().includes(q);
      const matchPeruntukan = p.peruntukan && p.peruntukan.toLowerCase().includes(q);
      const matchNib = p.nib && p.nib.toLowerCase().includes(q);
      const matchKet = p.keterangan && p.keterangan.toLowerCase().includes(q);
      const matchLegal = p.statusLegal && p.statusLegal.toLowerCase().includes(q);
      const matchBatas = (p.batasUtara && p.batasUtara.toLowerCase().includes(q)) ||
                         (p.batasSelatan && p.batasSelatan.toLowerCase().includes(q)) ||
                         (p.batasTimur && p.batasTimur.toLowerCase().includes(q)) ||
                         (p.batasBarat && p.batasBarat.toLowerCase().includes(q));

      if (!matchName && !matchZona && !matchPeruntukan && !matchNib && !matchKet && !matchLegal && !matchBatas) {
        return false;
      }
    }

    if (zona && p.zona !== zona) {
      return false;
    }

    if (peruntukan && p.peruntukan !== peruntukan) {
      return false;
    }

    if (tipeArea && p.tipeArea !== tipeArea) {
      return false;
    }

    return true;
  });
}

/**
 * Menghitung rekapitulasi statistik luas kawasan tanah
 * @param {Array} parcels - Daftar bidang tanah
 * @param {number} totalResmiM2 - Total luas resmi bersertifikat (default 87420 m²)
 * @returns {object} Ringkasan luas, persentase tata ruang, dan Ha
 */
export function calculateLandStats(parcels = [], totalResmiM2 = 87420) {
  const list = Array.isArray(parcels) ? parcels : [];
  let totalLuasM2 = 0;
  let luasKdb = 0;       // Tapak Bangunan
  let luasKdh = 0;       // Ruang Terbuka Hijau
  let luasSirkulasi = 0; // Jalan, Parkir, Pelataran
  let luasCadangan = 0;  // Lahan Cadangan

  list.forEach(p => {
    const luas = Number(p.luasM2) || 0;
    totalLuasM2 += luas;
    const tipe = (p.tipeArea || '').toLowerCase();
    if (tipe === 'kdb' || tipe === 'bangunan') {
      luasKdb += luas;
    } else if (tipe === 'kdh' || tipe === 'hijau' || tipe === 'taman') {
      luasKdh += luas;
    } else if (tipe === 'cadangan') {
      luasCadangan += luas;
    } else {
      luasSirkulasi += luas;
    }
  });

  const baseTotal = totalLuasM2 > 0 ? totalLuasM2 : totalResmiM2;
  const totalHa = Math.round((totalLuasM2 / 10000) * 1000) / 1000;
  const persentaseKdb = Math.round((luasKdb / baseTotal) * 1000) / 10;
  const persentaseKdh = Math.round((luasKdh / baseTotal) * 1000) / 10;
  const persentaseSirkulasi = Math.round((luasSirkulasi / baseTotal) * 1000) / 10;
  const persentaseCadangan = Math.round((luasCadangan / baseTotal) * 1000) / 10;

  return {
    totalLuasM2,
    totalHa,
    totalResmiM2,
    totalResmiHa: Math.round((totalResmiM2 / 10000) * 1000) / 1000,
    jumlahBidang: list.length,
    luasKdb,
    persentaseKdb,
    luasKdh,
    persentaseKdh,
    luasSirkulasi,
    persentaseSirkulasi,
    luasCadangan,
    persentaseCadangan
  };
}

/**
 * Validasi integritas data konfigurasi jaringan Wi-Fi
 * @param {object} wifi - Data objek jaringan Wi-Fi
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateWifiData(wifi = {}) {
  const errors = [];
  const ssid = (wifi.ssid || '').trim();

  if (!ssid) {
    errors.push('Nama SSID jaringan Wi-Fi wajib diisi');
  } else if (ssid.length > 32) {
    errors.push('Panjang nama SSID maksimal 32 karakter sesuai standar IEEE 802.11');
  }

  const bandwidth = Number(wifi.bandwidthMbps);
  if (isNaN(bandwidth) || bandwidth <= 0) {
    errors.push('Bandwidth harus berupa nilai angka positif (Mbps)');
  }

  if (!wifi.tipe || !wifi.tipe.trim()) {
    errors.push('Kategori / Tipe jaringan Wi-Fi wajib dipilih');
  }

  if (!wifi.frekuensi || !wifi.frekuensi.trim()) {
    errors.push('Frekuensi Wi-Fi (2.4 GHz, 5 GHz, atau Dual Band) wajib ditentukan');
  }

  if (!wifi.keamanan || !wifi.keamanan.trim()) {
    errors.push('Protokol keamanan Wi-Fi wajib ditentukan');
  }

  const cakupan = (wifi.cakupan || wifi.lokasiCakupan || '').trim();
  if (!cakupan) {
    errors.push('Lokasi cakupan gedung / wilayah Wi-Fi wajib diisi');
  }

  const apCount = wifi.jumlahAp !== undefined ? Number(wifi.jumlahAp) : (wifi.apCount !== undefined ? Number(wifi.apCount) : 1);
  if (isNaN(apCount) || apCount <= 0) {
    errors.push('Jumlah Access Point (AP) harus berupa angka positif minimal 1 unit');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Filter katalog jaringan Wi-Fi berdasarkan kata kunci dan atribut teknis
 * @param {Array} networks - Daftar jaringan Wi-Fi
 * @param {object} options - Opsi filter (search, tipe, frekuensi, status, keamanan)
 * @returns {Array} Jaringan Wi-Fi yang lolos filter
 */
export function filterWifiNetworks(networks = [], {
  search = '',
  tipe = '',
  frekuensi = '',
  status = '',
  keamanan = ''
} = {}) {
  if (!Array.isArray(networks)) return [];
  const q = search.trim().toLowerCase();

  return networks.filter(w => {
    if (q) {
      const matchSsid = w.ssid && w.ssid.toLowerCase().includes(q);
      const matchTipe = w.tipe && w.tipe.toLowerCase().includes(q);
      const matchCakupan = (w.cakupan || w.lokasiCakupan || '').toLowerCase().includes(q);
      const matchVendor = (w.vendor || w.isp || '').toLowerCase().includes(q);
      const matchVlan = (w.vlan || '').toLowerCase().includes(q);
      const matchIp = (w.ipRange || w.ipSubnet || '').toLowerCase().includes(q);
      const matchKet = (w.keterangan || '').toLowerCase().includes(q);
      if (!matchSsid && !matchTipe && !matchCakupan && !matchVendor && !matchVlan && !matchIp && !matchKet) {
        return false;
      }
    }

    if (tipe && w.tipe !== tipe) {
      return false;
    }

    if (frekuensi && w.frekuensi && !w.frekuensi.toLowerCase().includes(frekuensi.toLowerCase())) {
      return false;
    }

    if (status && w.status !== status) {
      return false;
    }

    if (keamanan && w.keamanan && !w.keamanan.toLowerCase().includes(keamanan.toLowerCase())) {
      return false;
    }

    return true;
  });
}

/**
 * Hitung ringkasan statistik jaringan Wi-Fi kawasan
 * @param {Array} networks - Daftar jaringan Wi-Fi kawasan
 * @returns {object} Metrik agregat Wi-Fi
 */
export function calculateWifiStats(networks = []) {
  const list = Array.isArray(networks) ? networks : [];
  let totalAp = 0;
  let totalBandwidthMbps = 0;
  let activeNetworks = 0;
  let wifi6Count = 0;
  let publicCount = 0;
  let dedicatedCount = 0;

  list.forEach(w => {
    const ap = Number(w.jumlahAp || w.apCount) || 1;
    totalAp += ap;

    const bw = Number(w.bandwidthMbps) || 0;
    totalBandwidthMbps += bw;

    const status = (w.status || '').toLowerCase();
    if (status === 'aktif' || status === 'online' || status === 'siap siaga' || !status) {
      activeNetworks++;
    }

    const freq = (w.frekuensi || '').toLowerCase();
    if (freq.includes('wi-fi 6') || freq.includes('802.11ax') || freq.includes('wifi 6')) {
      wifi6Count++;
    }

    const tipe = (w.tipe || '').toLowerCase();
    if (tipe.includes('publik') || tipe.includes('jamaah') || tipe.includes('tamu')) {
      publicCount++;
    } else {
      dedicatedCount++;
    }
  });

  return {
    totalSsid: list.length,
    totalAp,
    totalBandwidthMbps,
    activeNetworks,
    wifi6Count,
    publicCount,
    dedicatedCount
  };
}
/**
 * ============================================================================
 * STANDARISASI PENGELOLAAN DATA UKURAN (P × L × T), SATUAN & VOLUME GEOMETRIS
 * ============================================================================
 */

/**
 * Format nilai dimensi dengan penanganan nilai kosong ("Belum diisi")
 * Jangan pernah mengarang angka atau menganggap data kosong sebagai nol!
 * @param {number|string|null|undefined} val - Nilai dimensi
 * @param {string} unit - Satuan ('m', 'cm', 'mm')
 * @param {number} decimals - Jumlah angka desimal
 * @returns {string} String terformat atau 'Belum diisi' / '—'
 */
export function formatDimensionValue(val, unit = 'm', decimals = 2) {
  if (val === null || val === undefined || val === '' || val === '—' || val === '-') {
    return 'Belum diisi';
  }
  const num = Number(val);
  if (isNaN(num)) return 'Belum diisi';
  if (num <= 0) return '0 ' + unit;

  // Format angka dengan presisi yang rapi
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(decimals).replace(/\.?0+$/, '');
  return `${formatted} ${unit}`;
}

/**
 * Validasi input nilai dimensi
 * Nilai tidak boleh negatif, format angka harus valid
 * @param {string} fieldName - Nama bidang
 * @param {any} value - Nilai yang diinput
 * @param {object} options - { required: boolean, min: number, max: number }
 * @returns {object} { isValid: boolean, error?: string, parsedValue?: number }
 */
export function validateDimensionInput(fieldName, value, options = {}) {
  const { required = false, min = 0, max = 100000 } = options;

  if (value === null || value === undefined || value === '') {
    if (required) {
      return { isValid: false, error: `${fieldName} wajib diisi.` };
    }
    return { isValid: true, parsedValue: null };
  }

  const num = Number(value);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} harus berupa angka yang valid.` };
  }

  if (num < min) {
    return { isValid: false, error: `${fieldName} tidak boleh bernilai negatif (minimal ${min}).` };
  }

  if (num > max) {
    return { isValid: false, error: `${fieldName} melebihi batas wajar (maksimal ${max}).` };
  }

  return { isValid: true, parsedValue: num };
}

/**
 * Hitung Luas Dasar (Footprint) = Panjang × Lebar
 * @param {number} panjang
 * @param {number} lebar
 * @param {string} unit - Satuan ('m', 'cm', 'mm')
 * @returns {object} { value: number|null, formatted: string, unitSymbol: string }
 */
export function calculateFootprintArea(panjang, lebar, unit = 'm') {
  const p = Number(panjang);
  const l = Number(lebar);

  if (isNaN(p) || isNaN(l) || p <= 0 || l <= 0) {
    return {
      value: null,
      formatted: 'Belum diisi',
      unitSymbol: unit === 'm' ? 'm²' : (unit === 'cm' ? 'cm²' : 'mm²')
    };
  }

  const area = p * l;
  const unitSymbol = unit === 'm' ? 'm²' : (unit === 'cm' ? 'cm²' : 'mm²');
  const formattedNum = area % 1 === 0 ? area.toLocaleString('id-ID') : area.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return {
    value: area,
    formatted: `${formattedNum} ${unitSymbol}`,
    unitSymbol
  };
}

/**
 * Hitung Volume Geometris Balok Dasar = Panjang × Lebar × Tinggi
 * Untuk objek yang tidak memiliki tinggi (seperti lahan terbuka), kembalikan status "Tidak relevan"
 * Jangan menganggap data kosong sebagai nol!
 * @param {number} panjang
 * @param {number} lebar
 * @param {number} tinggi
 * @param {string} unit - Satuan ('m', 'cm', 'mm')
 * @param {boolean} isLand - Apakah objek merupakan lahan terbuka
 * @returns {object} { value: number|null, formatted: string, unitSymbol: string }
 */
export function calculateGeometricVolume(panjang, lebar, tinggi, unit = 'm', isLand = false) {
  if (isLand) {
    return {
      value: null,
      formatted: '— (Tidak relevan)',
      unitSymbol: ''
    };
  }

  const p = Number(panjang);
  const l = Number(lebar);

  if (isNaN(p) || isNaN(l) || p <= 0 || l <= 0) {
    return {
      value: null,
      formatted: 'Belum diisi',
      unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³')
    };
  }

  if (tinggi === null || tinggi === undefined || tinggi === '' || tinggi === '—' || tinggi === '-') {
    return {
      value: null,
      formatted: 'Belum diisi (Tinggi belum ada)',
      unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³')
    };
  }

  const t = Number(tinggi);
  if (isNaN(t) || t <= 0) {
    return {
      value: null,
      formatted: 'Belum diisi',
      unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³')
    };
  }

  const volume = p * l * t;
  const unitSymbol = unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³');
  const formattedNum = volume % 1 === 0 ? volume.toLocaleString('id-ID') : volume.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return {
    value: volume,
    formatted: `${formattedNum} ${unitSymbol}`,
    unitSymbol
  };
}

/**
 * Hitung dan format detail dimensi lengkap objek bangunan, ruangan, sarana, atau lahan
 * Ketentuan penting:
 * - Tidak menyamakan luas lantai keseluruhan bangunan bertingkat dengan luas dasar bangunan
 * - Menyediakan rincian jumlah lantai dan estimasi luas masing-masing lantai
 * - Menyimpan sumber pengukuran dan tanggal pembaruan
 * @param {object} item
 * @returns {object} Ringkasan dimensi lengkap & terstruktur
 */
export function calculateObjectDimensions(item = {}) {
  if (!item || typeof item !== 'object') {
    return {
      panjang: null,
      lebar: null,
      tinggi: null,
      satuan: 'm',
      panjangFormatted: 'Belum diisi',
      lebarFormatted: 'Belum diisi',
      tinggiFormatted: 'Belum diisi',
      luasDasar: null,
      luasDasarFormatted: 'Belum diisi',
      lantai: 1,
      luasTotalLantai: null,
      luasTotalLantaiFormatted: 'Belum diisi',
      volumeGeometris: null,
      volumeFormatted: 'Belum diisi',
      sumberPengukuran: 'Belum diisi',
      tanggalPengukuran: 'Belum diisi'
    };
  }

  const satuan = item.satuan || 'm';
  const isLand = !!(item.tipeArea || item.nib || (item.zona && item.luasM2));
  const lantai = Math.max(1, Number(item.lantai) || 1);

  // Nilai numerik
  const p = item.panjang !== undefined && item.panjang !== null && item.panjang !== '' ? Number(item.panjang) : null;
  const l = item.lebar !== undefined && item.lebar !== null && item.lebar !== '' ? Number(item.lebar) : null;
  const t = item.tinggi !== undefined && item.tinggi !== null && item.tinggi !== '' && item.tinggi !== '—' ? Number(item.tinggi) : null;

  // Luas dasar (P × L)
  const footprint = (p !== null && l !== null && !isNaN(p) && !isNaN(l) && p > 0 && l > 0)
    ? calculateFootprintArea(p, l, satuan)
    : { value: null, formatted: 'Belum diisi', unitSymbol: satuan === 'm' ? 'm²' : 'satuan²' };

  // Luas Total Lantai (distinct dari Luas Dasar untuk bangunan bertingkat)
  let luasTotalLantai = null;
  let luasTotalLantaiFormatted = 'Belum diisi';
  const explicitLuas = Number(item.luas);

  if (item.luasTotalLantai) {
    luasTotalLantai = Number(item.luasTotalLantai);
    luasTotalLantaiFormatted = `${luasTotalLantai.toLocaleString('id-ID')} ${footprint.unitSymbol}`;
  } else if (lantai > 1 && footprint.value !== null) {
    // Jika luas pada data historis sama dengan footprint 1 lantai, total luas seluruh lantai = footprint × jumlah lantai
    luasTotalLantai = (!isNaN(explicitLuas) && explicitLuas > footprint.value)
      ? explicitLuas
      : footprint.value * lantai;
    luasTotalLantaiFormatted = `${luasTotalLantai.toLocaleString('id-ID')} ${footprint.unitSymbol}`;
  } else if (item.luas && !isNaN(explicitLuas) && explicitLuas > 0) {
    luasTotalLantai = explicitLuas;
    luasTotalLantaiFormatted = `${luasTotalLantai.toLocaleString('id-ID')} ${footprint.unitSymbol}`;
  } else if (footprint.value !== null) {
    luasTotalLantai = footprint.value * lantai;
    luasTotalLantaiFormatted = `${luasTotalLantai.toLocaleString('id-ID')} ${footprint.unitSymbol}`;
  }

  // Volume Geometris (P × L × T)
  const volume = calculateGeometricVolume(p, l, t, satuan, isLand);

  // Sumber & tanggal pengukuran
  const sumberPengukuran = item.sumberPengukuran || (isLand ? 'Sertifikat Hak Pakai BPN' : 'As-Built Drawing & SIM-ASET BMN');
  const tanggalPengukuran = item.tanggalPengukuran || item.tanggalUkur || '';

  return {
    panjang: p,
    lebar: l,
    tinggi: isLand ? null : t,
    satuan,
    isLand,
    panjangFormatted: p !== null && !isNaN(p) ? `${p} ${satuan}` : 'Belum diisi',
    lebarFormatted: l !== null && !isNaN(l) ? `${l} ${satuan}` : 'Belum diisi',
    tinggiFormatted: isLand ? '— (Tidak relevan)' : (t !== null && !isNaN(t) ? `${t} ${satuan}` : 'Belum diisi'),
    luasDasar: footprint.value,
    luasDasarFormatted: footprint.formatted,
    luasPerLantai: footprint.value,
    luasPerLantaiFormatted: footprint.formatted,
    lantai,
    luasTotalLantai,
    luasTotalLantaiFormatted,
    volumeGeometris: volume.value,
    volumeFormatted: volume.formatted,
    sumberPengukuran,
    tanggalPengukuran: tanggalPengukuran || 'Belum dicatat'
  };
}

/**
 * Parse teks multiline daftar Tugas & Fungsi (format "Label: Deskripsi" atau teks biasa)
 * @param {string} rawText
 * @returns {Array<{label: string, desc: string}>}
 */
export function parseInfoDutiesText(rawText = '') {
  return String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 60) {
        return {
          label: line.slice(0, colonIdx).trim(),
          desc: line.slice(colonIdx + 1).trim()
        };
      }
      return { label: '', desc: line };
    });
}

/**
 * Format daftar Tugas & Fungsi ke teks multiline untuk editor
 * @param {Array<{label?: string, desc?: string}>} items
 * @returns {string}
 */
export function formatInfoDutiesText(items = []) {
  if (!Array.isArray(items)) return '';
  return items
    .map(item => {
      if (!item || typeof item !== 'object') return String(item || '').trim();
      const lbl = String(item.label || '').trim();
      const desc = String(item.desc || '').trim();
      if (lbl && desc) return `${lbl}: ${desc}`;
      return lbl || desc;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Validasi data konten menu Informasi Resmi Lembaga
 * @param {object} info
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
export function validateInstitutionInfoData(info = {}) {
  const errors = [];

  if (!info.aboutTitle || !String(info.aboutTitle).trim()) {
    errors.push('Judul bagian Tentang Lembaga wajib diisi.');
  }

  const paragraphs = Array.isArray(info.aboutParagraphs)
    ? info.aboutParagraphs.map(p => String(p).trim()).filter(Boolean)
    : String(info.aboutParagraphs || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) {
    errors.push('Isi deskripsi Tentang Lembaga minimal memiliki 1 paragraf.');
  }

  if (!info.dutiesTitle || !String(info.dutiesTitle).trim()) {
    errors.push('Judul bagian Tugas & Fungsi Pokok wajib diisi.');
  }

  if (!info.contactTitle || !String(info.contactTitle).trim()) {
    errors.push('Judul bagian Kontak & Lokasi wajib diisi.');
  }

  if (!info.contactInstansi || !String(info.contactInstansi).trim()) {
    errors.push('Nama instansi pada bagian Kontak & Lokasi wajib diisi.');
  }

  if (!info.contactAlamat || !String(info.contactAlamat).trim()) {
    errors.push('Alamat resmi instansi wajib diisi.');
  }

  const email = String(info.contactEmail || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Format alamat email resmi tidak valid.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

