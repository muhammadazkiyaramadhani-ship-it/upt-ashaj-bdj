import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStats,
  getCategories,
  filterAndSortBuildings,
  generateRegistrationNumber,
  validatePassword,
  generateOtpCode,
  verifyOtpCode,
  registerUserAccount,
  generateCaptchaCode,
  verifyCaptchaCode,
  checkMenuAccess,
  createInspectionReport,
  filterBmnDocuments,
  generateAuditReportsCsv,
  validateRoomData,
  filterRooms,
  validateElectricalPanel,
  filterElectricalPanels,
  validateGensetData,
  filterGensets,
  calculateElectricalSummary,
  validateLandParcel,
  filterLandParcels,
  calculateLandStats,
  validateWifiData,
  filterWifiNetworks,
  calculateWifiStats,
  formatDimensionValue,
  validateDimensionInput,
  calculateFootprintArea,
  calculateGeometricVolume,
  calculateObjectDimensions,
  parseInfoDutiesText,
  formatInfoDutiesText,
  validateInstitutionInfoData
} from '../src/utils/logic.js';

const mockBuildings = [
  {
    id: 1,
    nama: 'Gedung A',
    jenis: 'Gedung Penginapan',
    fungsi: 'Akomodasi Jamaah',
    panjang: 50,
    lebar: 20,
    luas: 1000,
    lantai: 2,
    kapasitas: 200,
    kondisi: 'Baik',
    keterangan: 'Kamar full AC'
  },
  {
    id: 2,
    nama: 'Masjid Utama',
    jenis: 'Tempat Ibadah',
    fungsi: 'Ibadah Shalat',
    panjang: 30,
    lebar: 30,
    luas: 900,
    lantai: 1,
    kapasitas: 800,
    kondisi: 'Baik',
    keterangan: 'Kubah hijau'
  },
  {
    id: 3,
    nama: 'Gedung B',
    jenis: 'Gedung Penginapan',
    fungsi: 'Akomodasi Cadangan',
    panjang: 40,
    lebar: 20,
    luas: 800,
    lantai: 3,
    kapasitas: 150,
    kondisi: 'Rusak Ringan',
    keterangan: 'Perlu cat ulang plafon'
  }
];

test('calculateStats calculates totals, floors, and categories correctly', () => {
  const stats = calculateStats(mockBuildings);
  assert.equal(stats.totalBangunan, 3);
  assert.equal(stats.totalLuas, 2700);
  assert.equal(stats.totalKapasitas, 1150);
  assert.equal(stats.bangunan1Lantai, 1);
  assert.equal(stats.bangunan2Lantai, 1);
  assert.equal(stats.bangunan3LantaiPlus, 1);
  assert.equal(stats.byJenis['Gedung Penginapan'], 2);
  assert.equal(stats.byJenis['Tempat Ibadah'], 1);
  assert.equal(stats.byKondisi['Baik'], 2);
  assert.equal(stats.byKondisi['Rusak Ringan'], 1);
});

test('getCategories extracts unique sorted categories', () => {
  const categories = getCategories(mockBuildings);
  assert.deepEqual(categories, ['Gedung Penginapan', 'Tempat Ibadah']);
});

test('filterAndSortBuildings filters by search query', () => {
  const res = filterAndSortBuildings(mockBuildings, { search: 'masjid' });
  assert.equal(res.length, 1);
  assert.equal(res[0].id, 2);
});

test('filterAndSortBuildings filters by jenis and kondisi', () => {
  const res = filterAndSortBuildings(mockBuildings, {
    jenis: 'Gedung Penginapan',
    kondisi: 'Rusak Ringan'
  });
  assert.equal(res.length, 1);
  assert.equal(res[0].id, 3);
});

test('filterAndSortBuildings sorts by luas descending', () => {
  const res = filterAndSortBuildings(mockBuildings, {
    sortBy: 'luas',
    sortOrder: 'desc'
  });
  assert.equal(res[0].luas, 1000);
  assert.equal(res[1].luas, 900);
  assert.equal(res[2].luas, 800);
});

test('generateRegistrationNumber formats BMN registry code with padding', () => {
  assert.equal(generateRegistrationNumber(1, 2026), 'BMN-AHB/GDG-001/2026');
  assert.equal(generateRegistrationNumber(17, 2026), 'BMN-AHB/GDG-017/2026');
  assert.equal(generateRegistrationNumber(105, 2026), 'BMN-AHB/GDG-105/2026');
});

test('validatePassword enforces 8 characters minimum', () => {
  const short = validatePassword('1234567');
  assert.equal(short.valid, false);
  assert.equal(short.hasMinLength, false);

  const exact8 = validatePassword('Password');
  assert.equal(exact8.valid, true);
  assert.equal(exact8.hasMinLength, true);

  const strong = validatePassword('Banjarmasin2026#Haji');
  assert.equal(strong.valid, true);
  assert.equal(strong.strength, 'strong');
});

test('generateOtpCode generates a 6-digit numeric string', () => {
  const otp = generateOtpCode();
  assert.equal(typeof otp, 'string');
  assert.equal(otp.length, 6);
  assert.match(otp, /^[0-9]{6}$/);
});

test('verifyOtpCode verifies matching OTP and rejects expired/invalid ones', () => {
  const now = Date.now();
  assert.equal(verifyOtpCode('123456', '123456', now + 60000), true);
  assert.equal(verifyOtpCode('123456', '654321', now + 60000), false);
  assert.equal(verifyOtpCode('123456', '123456', now - 1000), false); // Expired
});

test('registerUserAccount validates 8-character password and unique email', () => {
  const existingUsers = [{ id: 1, email: 'petugas@kemenag.go.id', nama: 'Petugas BMN' }];

  // Password < 8 fails
  const shortPwdRes = registerUserAccount({
    nama: 'Budi Santoso',
    email: 'budi@kemenag.go.id',
    password: 'short'
  }, existingUsers);
  assert.equal(shortPwdRes.success, false);
  assert.match(shortPwdRes.error, /8 karakter/i);

  // Duplicate email fails
  const dupRes = registerUserAccount({
    nama: 'Petugas Baru',
    email: 'petugas@kemenag.go.id',
    password: 'Password123'
  }, existingUsers);
  assert.equal(dupRes.success, false);
  assert.match(dupRes.error, /sudah terdaftar/i);

  // Valid registration succeeds with 2FA enabled
  const validRes = registerUserAccount({
    nama: 'Ahmad Fauzi',
    email: 'ahmad@kemenag.go.id',
    password: 'AmanBanget2026!',
    role: 'petugas',
    noHp: '081234567890'
  }, existingUsers);
  assert.equal(validRes.success, true);
  assert.equal(validRes.user.twoFactorEnabled, true);
  assert.equal(validRes.user.id, 2);
});

test('generateCaptchaCode generates 5-character string without ambiguous chars', () => {
  const code = generateCaptchaCode();
  assert.equal(typeof code, 'string');
  assert.equal(code.length, 5);
  // Ensure no 0, O, 1, I
  assert.equal(/[0O1I]/.test(code), false);
});

test('verifyCaptchaCode validates case-insensitively and rejects mismatch', () => {
  assert.equal(verifyCaptchaCode('AB78X', 'ab78x'), true);
  assert.equal(verifyCaptchaCode('  ab78x  ', 'AB78X'), true);
  assert.equal(verifyCaptchaCode('WRONG', 'AB78X'), false);
  assert.equal(verifyCaptchaCode('', 'AB78X'), false);
  assert.equal(verifyCaptchaCode('AB78X', ''), false);
});

test('checkMenuAccess blocks unauthenticated access to protected view', () => {
  // Public views allow anyone
  assert.equal(checkMenuAccess('dashboard', null).allowed, true);
  assert.equal(checkMenuAccess('katalog', null).allowed, true);

  // Protected view 'internal' blocks guests
  const guestCheck = checkMenuAccess('internal', null);
  assert.equal(guestCheck.allowed, false);
  assert.equal(guestCheck.requiresAuth, true);
  assert.equal(guestCheck.reason, 'login_required');

  // Protected view allows 2FA authenticated users
  const authUser = { id: 1, nama: 'Petugas BMN', twoFactorEnabled: true };
  const userCheck = checkMenuAccess('internal', authUser);
  assert.equal(userCheck.allowed, true);
  assert.equal(userCheck.reason, 'authenticated_2fa');
});

test('createInspectionReport validates input and formats official report', () => {
  const existing = [{ id: 1, reportNumber: 'INSP-AHB/2026/001' }];

  // Missing gedung fails
  const invalidRes = createInspectionReport({ deskripsi: 'Pengecekan atap' }, existing);
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error, /Gedung/i);

  // Short description fails
  const shortDescRes = createInspectionReport({
    gedungId: 2,
    namaGedung: 'Gedung Bir Ali',
    deskripsi: 'Rusak'
  }, existing);
  assert.equal(shortDescRes.success, false);
  assert.match(shortDescRes.error, /minimal 10 karakter/i);

  // Valid report succeeds
  const validRes = createInspectionReport({
    gedungId: 2,
    namaGedung: 'Gedung Bir Ali',
    deskripsi: 'Perbaikan plafon rembes air hujan pada koridor lantai 2.',
    prioritas: 'tinggi',
    pelapor: 'H. Ahmad Syarifi'
  }, existing);
  assert.equal(validRes.success, true);
  assert.equal(validRes.report.id, 2);
  assert.equal(validRes.report.reportNumber, `INSP-AHB/${new Date().getFullYear()}/002`);
  assert.equal(validRes.report.pelapor, 'H. Ahmad Syarifi');
  assert.equal(validRes.report.status, 'Menunggu Verifikasi');
});

test('filterBmnDocuments filters correctly by category and search keyword', () => {
  const docs = [
    { id: 1, title: 'Sertifikat Hak Pakai BPN', category: 'Sertifikat Tanah BPN', number: 'HP-001', issuer: 'BPN Banjarbaru', desc: 'Tanah 87.420 m2' },
    { id: 2, title: 'SK Penetapan BMN Kemenkeu', category: 'Keputusan Kemenkeu RI', number: 'KMK-412', issuer: 'DJKN Kemenkeu', desc: '17 gedung' },
    { id: 3, title: 'Persetujuan PBG & SLF', category: 'Izin Bangunan & SLF', number: 'PBG-889', issuer: 'Dinas PUPR', desc: 'Laik fungsi gedung' }
  ];

  // Filter by category
  const bpnOnly = filterBmnDocuments(docs, '', 'Sertifikat Tanah BPN');
  assert.equal(bpnOnly.length, 1);
  assert.equal(bpnOnly[0].id, 1);

  // Filter by search query
  const slfSearch = filterBmnDocuments(docs, 'PBG', 'all');
  assert.equal(slfSearch.length, 1);
  assert.equal(slfSearch[0].id, 3);

  // Filter by both
  const mismatch = filterBmnDocuments(docs, 'DJKN', 'Sertifikat Tanah BPN');
  assert.equal(mismatch.length, 0);

  // Empty query returns all
  const allDocs = filterBmnDocuments(docs, '', 'all');
  assert.equal(allDocs.length, 3);
});

test('generateAuditReportsCsv creates formatted CSV with headers and escaped fields', () => {
  const reports = [
    {
      reportNumber: 'INSP-AHB/2026/001',
      formattedDate: '15 Maret 2026',
      namaGedung: 'Gedung Jabal Rahmah',
      deskripsi: 'Pengecekan rutin filter AC, lift lansia.',
      prioritas: 'sedang',
      pelapor: 'Muhammad Ridho, S.Kom',
      status: 'Selesai'
    }
  ];

  const csv = generateAuditReportsCsv(reports);
  assert.match(csv, /No\. Laporan,Tanggal,Gedung \/ Sarana/);
  assert.match(csv, /"INSP-AHB\/2026\/001"/);
  assert.match(csv, /"Gedung Jabal Rahmah"/);
  assert.match(csv, /"SEDANG"/);
  assert.match(csv, /"Selesai"/);
});

test('validateRoomData validates required fields and positive dimensions', () => {
  const invalid = validateRoomData({ nama: '', namaGedung: '', panjang: -2, lebar: 0, tinggi: 3 });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);

  const valid = validateRoomData({
    nama: 'Kamar 101',
    namaGedung: 'Gedung Jabal Rahmah',
    panjang: 6,
    lebar: 4,
    tinggi: 3.2,
    jumlahTempatTidur: 4
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterRooms filters by query, gedung, tipe, and kondisi', () => {
  const rooms = [
    { id: 1, nama: 'Kamar Standar A', namaGedung: 'Gedung Jabal Rahmah', tipe: 'Standar', kondisi: 'Baik', fasilitas: ['AC', 'WiFi'] },
    { id: 2, nama: 'Kamar Superior VIP', namaGedung: 'Gedung Marwah', tipe: 'Superior', kondisi: 'Baik', fasilitas: ['Smart TV', 'Kulkas'] },
    { id: 3, nama: 'Kamar Standar B', namaGedung: 'Gedung Jabal Rahmah', tipe: 'Standar', kondisi: 'Perlu Servis', fasilitas: ['AC'] }
  ];

  const jabalOnly = filterRooms(rooms, { gedung: 'Gedung Jabal Rahmah' });
  assert.equal(jabalOnly.length, 2);

  const superiorOnly = filterRooms(rooms, { tipe: 'Superior' });
  assert.equal(superiorOnly.length, 1);
  assert.equal(superiorOnly[0].id, 2);

  const searchTv = filterRooms(rooms, { search: 'Smart TV' });
  assert.equal(searchTv.length, 1);
  assert.equal(searchTv[0].id, 2);
});

test('validateElectricalPanel requires panel name, building location, and strictly VA or kVA unit', () => {
  const invalid = validateElectricalPanel({ namaPanel: '', lokasiGedung: '', dayaNilai: 0, dayaSatuan: 'Watt' });
  assert.equal(invalid.valid, false);

  const valid = validateElectricalPanel({
    namaPanel: 'Sub-Panel Feeder Depan',
    lokasiGedung: 'Gardu Utama',
    dayaNilai: 350,
    dayaSatuan: 'kVA',
    penggunaanKwh: 12500
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterElectricalPanels and calculateElectricalSummary compute accurate electrical totals', () => {
  const panels = [
    { id: 1, namaPanel: 'Panel Depan', lokasiGedung: 'Depan', dayaNilai: 350, dayaSatuan: 'kVA', penggunaanKwh: 5000, statusOperasional: 'Aktif' },
    { id: 2, namaPanel: 'Panel Belakang', lokasiGedung: 'Belakang', dayaNilai: 500, dayaSatuan: 'kVA', penggunaanKwh: 7000, statusOperasional: 'Aktif' },
    { id: 3, namaPanel: 'Sub Panel Marwah', lokasiGedung: 'Gedung Marwah', dayaNilai: 50000, dayaSatuan: 'VA', penggunaanKwh: 1000, statusOperasional: 'Siaga' }
  ];

  const gensets = [
    { id: 1, nama: 'Genset Sentral 1', kapasitasKva: 1000, statusOperasional: 'Siap Siaga' }
  ];

  const summary = calculateElectricalSummary(panels, gensets);
  // 350 + 500 + 50 (from 50000 VA) = 900 kVA
  assert.equal(summary.totalDayaKva, 900);
  assert.equal(summary.totalKwh, 13000);
  assert.equal(summary.panelAktif, 3);
  assert.equal(summary.totalGensetKva, 1000);
  assert.equal(summary.gensetStandby, 1);
});

test('validateGensetData and filterGensets validate genset capacity and filter properties', () => {
  const invalid = validateGensetData({ nama: '', lokasiGedung: '', kapasitasKva: 0 });
  assert.equal(invalid.valid, false);

  const valid = validateGensetData({
    nama: 'Genset Sentral Cummins',
    lokasiGedung: 'Gedung Genset',
    kapasitasKva: 1000,
    hourMeter: 348
  });
  assert.equal(valid.valid, true);

  const gensets = [
    { id: 1, nama: 'Genset Sentral Cummins', merek: 'Cummins', statusOperasional: 'Siap Siaga', kondisi: 'Baik' },
    { id: 2, nama: 'Genset Portable Emergency', merek: 'Perkins', statusOperasional: 'Dalam Perbaikan', kondisi: 'Perlu Servis' }
  ];

  const filtered = filterGensets(gensets, { search: 'cummins', status: 'Siap Siaga' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});

test('validateLandParcel validates required name, positive area m2, and peruntukan', () => {
  const invalid1 = validateLandParcel({ nama: '', luasM2: 0, peruntukan: '' });
  assert.equal(invalid1.valid, false);
  assert.equal(invalid1.errors.length, 3);

  const invalid2 = validateLandParcel({ nama: 'Zona A', luasM2: -100, peruntukan: 'Fasad' });
  assert.equal(invalid2.valid, false);

  const valid = validateLandParcel({
    nama: 'Zona B: Sentra Spiritual',
    luasM2: 18500,
    peruntukan: 'Ibadah & Manasik Haji'
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterLandParcels filters by search query, zona, peruntukan, and tipeArea', () => {
  const parcels = [
    { id: 1, nama: 'Zona A: Gerbang Utama', zona: 'Zona A', peruntukan: 'Protokol & Fasad', tipeArea: 'sirkulasi', nib: '17.02.01' },
    { id: 2, nama: 'Zona B: Sentra Spiritual Ka\'bah', zona: 'Zona B', peruntukan: 'Ibadah & Manasik', tipeArea: 'sirkulasi', nib: '17.02.02' },
    { id: 3, nama: 'Zona C: Penginapan Jabal Rahmah', zona: 'Zona C', peruntukan: 'Akomodasi Penginapan', tipeArea: 'kdb', nib: '17.02.03' }
  ];

  const searchKaaba = filterLandParcels(parcels, { search: 'Ka\'bah' });
  assert.equal(searchKaaba.length, 1);
  assert.equal(searchKaaba[0].id, 2);

  const kdbOnly = filterLandParcels(parcels, { tipeArea: 'kdb' });
  assert.equal(kdbOnly.length, 1);
  assert.equal(kdbOnly[0].id, 3);

  const zonaAOnly = filterLandParcels(parcels, { zona: 'Zona A' });
  assert.equal(zonaAOnly.length, 1);
  assert.equal(zonaAOnly[0].id, 1);
});

test('calculateLandStats accurately tallies land area, hectares, KDB, and KDH', () => {
  const parcels = [
    { id: 1, luasM2: 15500, tipeArea: 'kdb' },
    { id: 2, luasM2: 19620, tipeArea: 'kdh' },
    { id: 3, luasM2: 46900, tipeArea: 'sirkulasi' },
    { id: 4, luasM2: 5400, tipeArea: 'cadangan' }
  ];

  const stats = calculateLandStats(parcels, 87420);
  assert.equal(stats.totalLuasM2, 87420);
  assert.equal(stats.totalHa, 8.742);
  assert.equal(stats.luasKdb, 15500);
  assert.equal(stats.luasKdh, 19620);
  assert.equal(stats.luasCadangan, 5400);
  assert.equal(stats.jumlahBidang, 4);
  assert.ok(stats.persentaseKdb > 17 && stats.persentaseKdb < 18);
  assert.ok(stats.persentaseKdh > 22 && stats.persentaseKdh < 23);
});

test('validateWifiData validates required SSID, length <= 32, positive bandwidth, and fields', () => {
  const invalid1 = validateWifiData({ ssid: '', bandwidthMbps: 0 });
  assert.equal(invalid1.valid, false);
  assert.ok(invalid1.errors.length >= 3);

  const longSsid = 'Siskohat-Jaringan-Embarkasi-Banjarmasin-Super-Long-SSID-Over32';
  const invalid2 = validateWifiData({ ssid: longSsid, bandwidthMbps: 100, tipe: 'Dedicated', frekuensi: '5 GHz', keamanan: 'WPA3', cakupan: 'Gedung' });
  assert.equal(invalid2.valid, false);
  assert.ok(invalid2.errors.some(e => e.includes('32 karakter')));

  const valid = validateWifiData({
    ssid: 'Siskohat-Kemenag-Dedicated',
    bandwidthMbps: 100,
    tipe: 'Dedicated Sistem Informasi',
    frekuensi: '5 GHz Wi-Fi 6',
    keamanan: 'WPA3-Enterprise',
    cakupan: 'Gedung Siskohat & Pos Protokol',
    jumlahAp: 6
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('filterWifiNetworks filters by query, tipe, frekuensi, and keamanan', () => {
  const sampleNetworks = [
    { id: 1, ssid: 'Siskohat-Kemenag-Dedicated', tipe: 'Dedicated', frekuensi: '5 GHz Wi-Fi 6', keamanan: 'WPA3-Enterprise', status: 'Aktif', cakupan: 'Gedung Siskohat' },
    { id: 2, ssid: 'AsramaHaji-Jamaah-Free', tipe: 'Publik / Jamaah', frekuensi: 'Dual Band 2.4 / 5 GHz', keamanan: 'Captive Portal', status: 'Aktif', cakupan: 'Gedung Penginapan' },
    { id: 3, ssid: 'Media-Aula-Mekkah-Live', tipe: 'Media', frekuensi: '5 GHz Ultra-Low Latency', keamanan: 'WPA3-Personal', status: 'Aktif', cakupan: 'Aula Mekkah' }
  ];

  const searchSiskohat = filterWifiNetworks(sampleNetworks, { search: 'siskohat' });
  assert.equal(searchSiskohat.length, 1);
  assert.equal(searchSiskohat[0].id, 1);

  const jamaahOnly = filterWifiNetworks(sampleNetworks, { tipe: 'Publik / Jamaah' });
  assert.equal(jamaahOnly.length, 1);
  assert.equal(jamaahOnly[0].id, 2);

  const wifi6Only = filterWifiNetworks(sampleNetworks, { frekuensi: 'Wi-Fi 6' });
  assert.equal(wifi6Only.length, 1);
  assert.equal(wifi6Only[0].id, 1);

  const captiveOnly = filterWifiNetworks(sampleNetworks, { keamanan: 'Captive Portal' });
  assert.equal(captiveOnly.length, 1);
  assert.equal(captiveOnly[0].id, 2);
});

test('calculateWifiStats accurately tallies total SSIDs, AP count, aggregated bandwidth, and categories', () => {
  const networks = [
    { id: 1, jumlahAp: 6, bandwidthMbps: 100, frekuensi: '5 GHz Wi-Fi 6', tipe: 'Dedicated', status: 'Aktif' },
    { id: 2, jumlahAp: 38, bandwidthMbps: 300, frekuensi: 'Dual Band 2.4/5 GHz', tipe: 'Publik / Jamaah', status: 'Aktif' },
    { id: 3, jumlahAp: 14, bandwidthMbps: 150, frekuensi: '5 GHz Wi-Fi 6', tipe: 'Operasional PPIH', status: 'Aktif' }
  ];

  const stats = calculateWifiStats(networks);
  assert.equal(stats.totalSsid, 3);
  assert.equal(stats.totalAp, 58);
  assert.equal(stats.totalBandwidthMbps, 550);
  assert.equal(stats.activeNetworks, 3);
  assert.equal(stats.wifi6Count, 2);
  assert.equal(stats.publicCount, 1);
  assert.equal(stats.dedicatedCount, 2);
});

test('formatDimensionValue formats valid numbers and returns Belum diisi for empty/missing values', () => {
  assert.equal(formatDimensionValue(30, 'm'), '30 m');
  assert.equal(formatDimensionValue('20.5', 'm'), '20.5 m');
  assert.equal(formatDimensionValue(150, 'cm'), '150 cm');
  assert.equal(formatDimensionValue(null, 'm'), 'Belum diisi');
  assert.equal(formatDimensionValue(undefined, 'm'), 'Belum diisi');
  assert.equal(formatDimensionValue('', 'm'), 'Belum diisi');
  assert.equal(formatDimensionValue('—', 'm'), 'Belum diisi');
});

test('validateDimensionInput enforces numeric, non-negative, and range boundaries', () => {
  const valid = validateDimensionInput('Panjang', 50, { required: true, min: 1 });
  assert.equal(valid.isValid, true);
  assert.equal(valid.parsedValue, 50);

  const negative = validateDimensionInput('Lebar', -10, { min: 0 });
  assert.equal(negative.isValid, false);
  assert.match(negative.error, /tidak boleh bernilai negatif/);

  const missingOptional = validateDimensionInput('Tinggi', '', { required: false });
  assert.equal(missingOptional.isValid, true);
  assert.equal(missingOptional.parsedValue, null);

  const missingRequired = validateDimensionInput('Panjang', '', { required: true });
  assert.equal(missingRequired.isValid, false);
  assert.match(missingRequired.error, /wajib diisi/);
});

test('calculateFootprintArea and calculateGeometricVolume compute correct formulas without creating fake values', () => {
  // Luas dasar = P × L (30 × 20 = 600 m²)
  const area = calculateFootprintArea(30, 20, 'm');
  assert.equal(area.value, 600);
  assert.equal(area.formatted, '600 m²');

  // Volume geometris = P × L × T (30 × 20 × 8 = 4.800 m³)
  const volume = calculateGeometricVolume(30, 20, 8, 'm');
  assert.equal(volume.value, 4800);
  assert.equal(volume.formatted, '4.800 m³');

  // Objek tanpa tinggi tidak menghasilkan volume palsu
  const volumeNoHeight = calculateGeometricVolume(30, 20, null, 'm');
  assert.equal(volumeNoHeight.value, null);
  assert.match(volumeNoHeight.formatted, /Belum diisi/);

  // Lahan terbuka menandai volume sebagai tidak relevan
  const volumeLand = calculateGeometricVolume(100, 50, null, 'm', true);
  assert.equal(volumeLand.value, null);
  assert.match(volumeLand.formatted, /Tidak relevan/);
});

test('calculateObjectDimensions differentiates footprint from multi-story total floor area', () => {
  const building3Floors = {
    nama: 'Gedung Jabal Rahmah',
    panjang: 52,
    lebar: 22,
    tinggi: 12,
    lantai: 3,
    satuan: 'm',
    luas: 1144, // Luas dasar footprint
    sumberPengukuran: 'As-Built Drawing & SIM-ASET BMN 2026',
    tanggalPengukuran: '2026-01-15'
  };

  const dim = calculateObjectDimensions(building3Floors);
  assert.equal(dim.panjang, 52);
  assert.equal(dim.lebar, 22);
  assert.equal(dim.tinggi, 12);
  assert.equal(dim.luasDasar, 1144);
  assert.equal(dim.luasDasarFormatted, '1.144 m²');
  assert.equal(dim.lantai, 3);
  assert.equal(dim.luasTotalLantai, 3432);
  assert.notEqual(dim.luasTotalLantai, dim.luasDasar);
  assert.equal(dim.volumeGeometris, 52 * 22 * 12); // 13728 m³
  assert.equal(dim.volumeFormatted, '13.728 m³');
  assert.equal(dim.sumberPengukuran, 'As-Built Drawing & SIM-ASET BMN 2026');
  assert.equal(dim.tanggalPengukuran, '2026-01-15');

  const land = calculateObjectDimensions({
    nama: 'Zona A',
    zona: 'Zona A',
    panjang: 142,
    lebar: 100,
    luasM2: 12800,
    tipeArea: 'sirkulasi'
  });
  assert.equal(land.isLand, true);
  assert.equal(land.tinggi, null);
  assert.match(land.tinggiFormatted, /Tidak relevan/);
  assert.match(land.volumeFormatted, /Tidak relevan/);
});

test('parseInfoDutiesText and formatInfoDutiesText roundtrip duties cleanly', () => {
  const input = 'Akomodasi Jamaah: Memberikan tempat istirahat.\nPelayanan OSS terpadu tanpa label';
  const parsed = parseInfoDutiesText(input);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], { label: 'Akomodasi Jamaah', desc: 'Memberikan tempat istirahat.' });
  assert.deepEqual(parsed[1], { label: '', desc: 'Pelayanan OSS terpadu tanpa label' });

  const formatted = formatInfoDutiesText(parsed);
  assert.equal(formatted, input);
});

test('validateInstitutionInfoData validates required info fields and email format', () => {
  const invalid = validateInstitutionInfoData({
    aboutTitle: '',
    aboutParagraphs: [],
    dutiesTitle: '',
    contactTitle: 'Kontak',
    contactInstansi: '',
    contactAlamat: '',
    contactEmail: 'bukan-email'
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 5);

  const valid = validateInstitutionInfoData({
    aboutTitle: 'Tentang UPT Asrama Haji',
    aboutParagraphs: ['Paragraf pertama penjelasan instansi.'],
    dutiesTitle: 'Tugas & Fungsi Pokok',
    contactTitle: 'Kontak & Lokasi Resmi',
    contactInstansi: 'UPT Asrama Haji Embarkasi Banjarmasin',
    contactAlamat: 'Jl. Ahmad Yani Km. 28 Banjarbaru',
    contactEmail: 'asramahaji.banjarmasin@kemenhaj.go.id'
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});


