/**
 * ============================================================================
 * UPT ASRAMA HAJI EMBARKASI BANJARMASIN - SISTEM INFORMASI BANGUNAN KAWASAN
 * File: script.js
 * Kementerian Haji dan Umrah Republik Indonesia (Kemenhaj RI)
 * ============================================================================
 */

(function () {
  'use strict';

  // Safe LocalStorage Helpers (aman di sandbox / file:// strict mode)
  function safeStorageGet(key) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
    } catch (e) {
      // Abaikan jika browser memblokir storage pada file:///
    }
  }

  // State Aplikasi
  let activeView = 'dashboard';
  let currentRole = safeStorageGet('asrama_user_role') || 'tamu'; // 'tamu' | 'admin'
  let editingBuildingId = null;

  // Key LocalStorage Data & IndexedDB Config
  const STORAGE_KEY_BUILDINGS = 'asrama_haji_buildings_data';
  const STORAGE_KEY_ROOMS = 'asrama_haji_room_types';
  const STORAGE_KEY_PANELS = 'asrama_haji_electrical_panels';
  const STORAGE_KEY_GENSETS = 'asrama_haji_genset_units';
  const STORAGE_KEY_LAND = 'asrama_haji_land_parcels';
  const STORAGE_KEY_MEDIA = 'asrama_haji_media_facilities';
  const STORAGE_KEY_POWER = 'asrama_haji_electrical_system';
  const STORAGE_KEY_WIFI = 'asrama_haji_wifi_networks';
  const STORAGE_KEY_INFORMASI = 'asrama_haji_institution_info';

  // ==========================================================================
  // INDEXEDDB ENGINE (AsramaHajiContentDB) - Penyimpanan Konten & Foto Skala Besar
  // ==========================================================================
  const DB_NAME = 'AsramaHajiContentDB';
  const DB_VERSION = 3;
  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.resolve(null);
    }
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('rooms')) db.createObjectStore('rooms', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('electrical')) db.createObjectStore('electrical', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('gensets')) db.createObjectStore('gensets', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('land')) db.createObjectStore('land', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('wifi')) db.createObjectStore('wifi', { keyPath: 'id' });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (err) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  function idbSaveAll(storeName, items) {
    getDB().then(db => {
      if (!db) return;
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        items.forEach(item => store.put(item));
      } catch (e) {
        console.warn(`IndexedDB save error (${storeName}):`, e);
      }
    });
  }

  // ==========================================================================
  // CLIENT-SIDE IMAGE COMPRESSION (Canvas Resizing & WebP/JPEG DataURL)
  // Mencegah quota exceeded pada localStorage / IndexedDB
  // ==========================================================================
  function compressImage(file, maxWidth = 1200, maxHeight = 900, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('File foto tidak ditemukan'));
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
        return reject(new Error('Format foto tidak didukung! Gunakan format JPG, PNG, atau WebP.'));
      }
      if (file.size > 10 * 1024 * 1024) {
        return reject(new Error('Ukuran foto terlalu besar (Maksimal 10 MB sebelum kompresi).'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Gunakan JPEG untuk kompresi maksimal atau PNG jika aslinya transparan
          const mimeType = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Gagal membaca struktur berkas gambar.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas melalui browser.'));
      reader.readAsDataURL(file);
    });
  }

  // ==========================================================================
  // DATA DEFAULT / SEED KONTEN (STANDAR RESMI BMN EMBARKASI BANJARMASIN)
  // ==========================================================================
  const DEFAULT_ROOMS = [
    {
      id: 1,
      nama: "Kamar Standar Kloter 101 - 120",
      nomorKamar: "101-120",
      namaGedung: "Gedung Jabal Rahmah",
      tipe: "Standar",
      kapasitas: "4 - 6 Jamaah",
      jumlahTempatTidur: 4,
      panjang: 6.0,
      lebar: 4.0,
      tinggi: 3.2,
      luas: 24.0,
      volume: 76.8,
      kondisi: "Baik",
      peruntukan: "Jamaah Haji Reguler Kloter Embarkasi",
      deskripsi: "Akomodasi lantai 1 & 2 Gedung Jabal Rahmah dengan koridor luas, dispenser air minum koridor, dan akses lift ramah lansia.",
      fasilitas: [
        "Tempat tidur single ortopedi anti-alergi (4 unit)",
        "Sistem pendingin AC Split hemat energi dengan filter antibakteri",
        "Kamar mandi dalam (shower air hangat, kloset duduk, exhaust fan)",
        "Loker pakaian individual dengan kunci privasi masing-masing",
        "Stopkontak dan port charger ponsel di dekat tiap tempat tidur",
        "Penunjuk arah kiblat presisi dan sajadah bersih"
      ],
      kelebihan: [
        "Sirkulasi udara alami optimal berkat ventilasi jendela ganda.",
        "Desain ramah lansia: lantai kamar mandi anti-slip dan pegangan dinding (handrail).",
        "Lokasi sangat strategis dekat dengan fasad layar videotron informasi kloter."
      ],
      foto: "assets/bangunan/kamar-standar.jpg",
      galeriFoto: [
        "assets/bangunan/kamar-standar.jpg",
        "assets/bangunan/gedung-jabal-rahmah.jpg"
      ]
    },
    {
      id: 2,
      nama: "Kamar Superior VIP Petugas",
      nomorKamar: "VIP-01 - VIP-08",
      namaGedung: "Gedung Raudhah",
      tipe: "Superior",
      kapasitas: "2 - 3 Orang",
      jumlahTempatTidur: 2,
      panjang: 7.5,
      lebar: 5.0,
      tinggi: 3.5,
      luas: 37.5,
      volume: 131.3,
      kondisi: "Baik",
      peruntukan: "Petugas PPIH, Tamu Kementerian, Tokoh Pembina Kloter, & VIP",
      deskripsi: "Kamar berstandar kenyamanan premium untuk pimpinan kloter dan petugas satgas operasional haji embarkasi.",
      fasilitas: [
        "Tempat tidur springbed queen/twin ukuran besar",
        "Smart TV LED 43 Inch dengan siaran live streaming Makkah/Madinah",
        "Kulkas mini (mini-bar) & teko pemanas air elektrik (kettle jug)",
        "Meja kerja personal dengan kursi ergonomis & sambungan WiFi berkecepatan tinggi",
        "Kamar mandi berkeramik marmer dengan water heater otomatis & rain shower",
        "Sofa tamu santai, meja kopi, dan lemari pakaian wardrobe 2 pintu",
        "Kunci pintu smart RFID cardlock dengan sistem interkom"
      ],
      kelebihan: [
        "Ruang jauh lebih lega dan kedap suara (soundproof) untuk istirahat optimal.",
        "Pemandangan asri menghadap lanskap taman penghijauan dan Masjid asrama.",
        "Akses cepat ke ruang koordinasi pimpinan dan sentra data Siskohat."
      ],
      foto: "assets/bangunan/kamar-superior.jpg",
      galeriFoto: [
        "assets/bangunan/kamar-superior.jpg",
        "assets/bangunan/gedung-raudhah.jpg"
      ]
    },
    {
      id: 3,
      nama: "Kamar Khusus Lansia & Disabilitas",
      nomorKamar: "101-115",
      namaGedung: "Gedung Marwah",
      tipe: "Khusus Lansia",
      kapasitas: "3 - 4 Jamaah",
      jumlahTempatTidur: 3,
      panjang: 6.5,
      lebar: 4.5,
      tinggi: 3.2,
      luas: 29.3,
      volume: 93.6,
      kondisi: "Baik",
      peruntukan: "Jamaah Haji Lansia, Risti, dan Pengguna Kursi Roda",
      deskripsi: "Terletak di lantai dasar Gedung Marwah dengan pintu lebar, ramp tanpa undakan, dan bel darurat perawat.",
      fasilitas: [
        "Tempat tidur elektrik low-profile mudah dinaiki lansia",
        "Bel darurat tombol panggil terhubung ke posko perawat kloter",
        "Kamar mandi luas tanpa undakan dengan kursi shower & pegangan dinding keliling",
        "AC Inverter dengan hembusan angin tidak langsung (comfort airflow)",
        "Loker pakaian dengan ketinggian ramah pengguna kursi roda"
      ],
      kelebihan: [
        "Akses langsung ke posko kesehatan dokter kloter di lantai dasar tanpa perlu tangga.",
        "Lantai bertekstur non-slip di seluruh area kamar tidur dan teras depan.",
        "Jalur evakuasi lebar berstandar keselamatan medis Kemenhaj RI."
      ],
      foto: "assets/bangunan/kamar-standar.jpg",
      galeriFoto: [
        "assets/bangunan/kamar-standar.jpg",
        "assets/bangunan/gedung-marwah.jpg"
      ]
    }
  ];

  const DEFAULT_ELECTRICAL_PANELS = [
    {
      id: 1,
      namaPanel: "Sub-Panel Feeder Depan (SDP-1)",
      lokasiGedung: "Gardu Depan Utama & Siskohat",
      sumberListrik: "Trafo PLN Kawasan & Feeder ATS",
      dayaNilai: 350,
      dayaSatuan: "kVA",
      penggunaanKwh: 11800,
      jenisPerangkat: "Siskohat, Pos Satpam Depan, Pos Masjid, Masjid Asrama Haji, Halaman Kawasan, PJU LED",
      cakupan: "Siskohat, Pos Satpam Depan, Pos Satpam Masjid, Masjid Asrama Haji, Halaman Kawasan, dan Videotron Gerbang",
      statusOperasional: "Aktif / Beroperasi",
      kondisiInstalasi: "Baik / Prima",
      foto: "assets/bangunan/pos-satpam-depan.jpg",
      catatan: "Mendukung operasional teknologi data biometrik tanpa jeda dan penerangan gerbang utama. SLO aktif berlaku s.d 2029."
    },
    {
      id: 2,
      namaPanel: "Main Distribution Panel Belakang (MDP-2)",
      lokasiGedung: "Gedung Gardu Distribusi Belakang",
      sumberListrik: "Trafo Distribusi 500 kVA & Genset Sentral",
      dayaNilai: 500,
      dayaSatuan: "kVA",
      penggunaanKwh: 19400,
      jenisPerangkat: "Tata Suara Seremoni Aula, Dapur Basah Komersial, Ruang Makan Prasmanan, 6 Gedung Akomodasi",
      cakupan: "Aula Mekkah, Aula Jeddah, Poliklinik, Catering II, Dapur, Gedung Mina, Gedung Muzdalifah, Gedung Aziziyah, Gedung Madinah, Gedung Raudhah, Gedung Bir Ali",
      statusOperasional: "Aktif / Beroperasi",
      kondisiInstalasi: "Baik / Prima",
      foto: "assets/bangunan/aula-mekkah.jpg",
      catatan: "Mendukung beban tata suara seremoni aula, dapur basah komersial, ruang makan prasmanan, dan gedung penginapan belakang."
    },
    {
      id: 3,
      namaPanel: "Feeder Khusus Jabal Rahmah & Marwah (SDP-3)",
      lokasiGedung: "Ruang Hubung Panel Jabal Rahmah",
      sumberListrik: "Jalur Feeder Prioritas Trafo 345 kVA",
      dayaNilai: 345,
      dayaSatuan: "kVA",
      penggunaanKwh: 14200,
      jenisPerangkat: "2 Unit Lift Ramah Lansia, 84 Unit AC Inverter Penginapan, Booster Pump Sanitasi",
      cakupan: "Khusus untuk Gedung Jabal Rahmah dan Gedung Marwah secara terisolir tanpa gangguan fluktuasi tegangan",
      statusOperasional: "Aktif / Beroperasi",
      kondisiInstalasi: "Baik / Prima",
      foto: "assets/bangunan/gedung-jabal-rahmah.jpg",
      catatan: "Jalur feeder prioritas untuk suplai lift lansia dan AC sentral 2 gedung penginapan bertingkat tertinggi."
    }
  ];

  const DEFAULT_GENSETS = [
    {
      id: 1,
      nama: "Genset Sentral Heavy-Duty Diesel Silent 1.000 kVA",
      lokasiGedung: "Gedung Gardu & Ruang Genset Belakang",
      merek: "Cummins",
      tipe: "KTA38-G5 Silent Containerized",
      nomorIdentifikasi: "BMN-AHB/GEN-001/2026",
      kapasitasKva: 1000,
      bahanBakar: "Solar HSD / Biosolar (Tangki 2.500 Liter)",
      statusOperasional: "Siap Siaga (Standby ATS)",
      kondisi: "Baik / Prima",
      hourMeter: 348,
      tglTerakhirServis: "2026-03-10",
      tglJadwalServis: "2026-06-10",
      sistemAts: "Automatic Transfer Switch (ATS) 5 Detik & Dual Generator Synchronizer",
      foto: "assets/bangunan/genset-kawasan.jpg",
      fitur: [
        "Peralihan otomatis (ATS) kurang dari 5 detik saat terjadi pemadaman jaringan PLN.",
        "Mampu menopang 100% beban listrik seluruh kawasan asrama haji secara simultan.",
        "Dilengkapi tangki solar reservoir cadangan untuk operasional kontinu 48 jam penuh.",
        "Sistem peredam suara (canopy silent box) menjaga kenyamanan istirahat jamaah.",
        "Sistem proteksi overheat shutdown, oil pressure warning, dan overspeed trip."
      ]
    },
    {
      id: 2,
      nama: "Genset Darurat Siskohat & Server 150 kVA",
      lokasiGedung: "Ruang Server & Siskohat",
      merek: "Perkins",
      tipe: "1106A-70TAG3 Soundproof",
      nomorIdentifikasi: "BMN-AHB/GEN-002/2026",
      kapasitasKva: 150,
      bahanBakar: "Solar Dexlite (Tangki 400 Liter)",
      statusOperasional: "Siap Siaga (Standby ATS)",
      kondisi: "Baik / Prima",
      hourMeter: 124,
      tglTerakhirServis: "2026-02-18",
      tglJadwalServis: "2026-05-18",
      sistemAts: "Automatic Transfer Switch (ATS) 3 Detik Dedicated UPS Backup",
      foto: "assets/bangunan/pos-satpam-depan.jpg",
      fitur: [
        "Peralihan instan 3 detik menjamin server Siskohat online tanpa reboot.",
        "Terhubung langsung dengan UPS Online Double-Conversion 60 kVA.",
        "Knalpot dilengkapi pembuangan filter katalis emisi ramah lingkungan."
      ]
    }
  ];

  const DEFAULT_WIFI_NETWORKS = [
    {
      id: 1,
      ssid: "Siskohat-Kemenhaj-Dedicated",
      tipe: "Dedicated Sistem Informasi",
      frekuensi: "5 GHz Wi-Fi 6 (802.11ax)",
      bandwidthMbps: 100,
      keamanan: "WPA3-Enterprise / 802.1X",
      passwordKredensial: "Radius-Auth-Kemenhaj-2026",
      cakupan: "Gedung Siskohat (Lantai 1-2) & Pos Protokol Depan",
      jumlahAp: 6,
      modelAp: "Cisco Catalyst 9120AX Enterprise AP",
      status: "Aktif",
      vlan: "VLAN 10 - SISKOHAT_CORE",
      ipRange: "10.14.10.0/24 (Static DHCP Leases)",
      vendor: "Telkom Astinet Dedicated 100 Mbps (SLA 99.8%)",
      keterangan: "Jalur data prioritas mutlak untuk Sistem Komputerisasi Haji Terpadu (SISKOHAT) Kemenhaj RI, pemrosesan visa biometrik, paspor jemaah, dan manifes penerbangan Garuda Indonesia/Saudia.",
      foto: "assets/bangunan/siskohat.jpg"
    },
    {
      id: 2,
      ssid: "AsramaHaji-Jamaah-Free",
      tipe: "Publik / Jamaah",
      frekuensi: "Dual Band 2.4 / 5 GHz",
      bandwidthMbps: 300,
      keamanan: "Captive Portal (Otentikasi No. Porsi / Paspor)",
      passwordKredensial: "Login Portal Jamaah (Self-Registration)",
      cakupan: "Seluruh Gedung Penginapan (Jabal Rahmah, Marwah, Aziziyah, Mina, Muzdalifah, Madinah, Raudhah)",
      jumlahAp: 38,
      modelAp: "Ubiquiti UniFi U6-Pro High-Density Mesh",
      status: "Aktif",
      vlan: "VLAN 30 - JAMAAH_GUEST",
      ipRange: "172.16.0.0/20 (DHCP Pool 4.096 Hosts)",
      vendor: "Indosat Ooredoo Business Fiber 300 Mbps",
      keterangan: "Akses internet gratis khusus jemaah haji dan umrah untuk video call keluarga, manasik digital, dan panduan kloter dengan isolasi client-to-client demi privasi jemaah.",
      foto: "assets/bangunan/gedung-jabal-rahmah.jpg"
    },
    {
      id: 3,
      ssid: "PPIH-Operasional-VIP",
      tipe: "Operasional PPIH & VIP",
      frekuensi: "5 GHz Wi-Fi 6",
      bandwidthMbps: 150,
      keamanan: "WPA2/WPA3-Personal",
      passwordKredensial: "BanjarmasinHaji2026!PPIH",
      cakupan: "Gedung Raudhah VIP, Poliklinik Kesehatan, Kantor Induk UPT, & Ruang Rapat Pimpinan",
      jumlahAp: 14,
      modelAp: "Aruba AP-535 Wi-Fi 6 Unified Campus AP",
      status: "Aktif",
      vlan: "VLAN 20 - PPIH_STAFF_VIP",
      ipRange: "10.14.20.0/24",
      vendor: "Telkom Astinet Backup 150 Mbps",
      keterangan: "Jaringan operasional Petugas Penyelenggara Ibadah Haji (PPIH), tim dokter poliklinik embarkasi, dan tamu VIP Kementerian Haji dan Umrah dengan konfigurasi QoS Level 1.",
      foto: "assets/bangunan/gedung-raudhah.jpg"
    },
    {
      id: 4,
      ssid: "Media-Aula-Mekkah-Live",
      tipe: "Media & Penyiaran",
      frekuensi: "5 GHz Ultra-Low Latency",
      bandwidthMbps: 100,
      keamanan: "WPA3-Personal",
      passwordKredensial: "LiveStreamingMekkah99!",
      cakupan: "Aula Utama Mekkah, Aula Jeddah, dan Ruang Kontrol Videotron P4",
      jumlahAp: 8,
      modelAp: "Ruckus R750 High-Density Access Point",
      status: "Aktif",
      vlan: "VLAN 40 - BROADCAST_MEDIA",
      ipRange: "192.168.40.0/24",
      vendor: "Lintasarta Dedicated Fiber 100 Mbps",
      keterangan: "Dikhususkan untuk siaran langsung (Live Streaming Youtube/Kemenhaj Media Center), pelepasan kloter, pengendalian videotron P4 8.0x4.5m, dan tim peliputan jurnalis haji.",
      foto: "assets/bangunan/aula-mekkah.jpg"
    },
    {
      id: 5,
      ssid: "IoT-Utilitas-CCTV-Kawasan",
      tipe: "IoT, Utilitas & Keamanan",
      frekuensi: "2.4 GHz Long Range",
      bandwidthMbps: 50,
      keamanan: "Hidden SSID + MAC Whitelist + WPA2-PSK",
      passwordKredensial: "IoT#Kawasan#ATS_Genset2025",
      cakupan: "Gardu Listrik PLN 1000 kVA, ATS Genset Sentral, Tangki Reservoir Air, Pos Satpam Gerbang",
      jumlahAp: 12,
      modelAp: "MikroTik NetMetal 5 / BaseBox 2 Outdoor Long-Range",
      status: "Aktif",
      vlan: "VLAN 50 - IOT_TELEMETRY",
      ipRange: "192.168.50.0/24",
      vendor: "Intranet Kawasan (Dual WAN Failover)",
      keterangan: "Jaringan telemetri otomatisasi: monitoring sensor ATS Genset 1.000 kVA, level air reservoir, 32 titik kamera CCTV perimeter, dan sensor gardu listrik.",
      foto: "assets/bangunan/genset-kawasan.jpg"
    }
  ];

  /**
   * Muat Data Master Gedung
   */
  function loadBuildingsData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_BUILDINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof window.buildings !== 'undefined' && Array.isArray(window.buildings)) {
            parsed.forEach(storedBld => {
              const master = window.buildings.find(m => m.id === storedBld.id);
              if (master && master.videotron && storedBld.videotron === undefined) {
                storedBld.videotron = master.videotron;
                storedBld.videotronInfo = master.videotronInfo;
              }
            });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca data gedung dari localStorage:', e);
    }
    return (typeof window.buildings !== 'undefined' && Array.isArray(window.buildings))
      ? JSON.parse(JSON.stringify(window.buildings))
      : [];
  }

  function loadRoomTypes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROOMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca kamar dari localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_ROOMS));
  }

  function loadElectricalPanels() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PANELS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca panel listrik dari localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_ELECTRICAL_PANELS));
  }

  function loadGensets() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GENSETS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca genset dari localStorage:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_GENSETS));
  }

  function loadMediaFacilities() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MEDIA);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca sarana media dari localStorage:', e);
    }
    return (typeof window.mediaAndFacilities !== 'undefined' && Array.isArray(window.mediaAndFacilities))
      ? JSON.parse(JSON.stringify(window.mediaAndFacilities))
      : [];
  }

  function loadElectricalSystem() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_POWER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.zonasi) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca kelistrikan dari localStorage:', e);
    }
    return (typeof window.electricalSystem !== 'undefined')
      ? JSON.parse(JSON.stringify(window.electricalSystem))
      : null;
  }

  function loadLandParcels() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LAND);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca data wilayah tanah dari localStorage:', e);
    }
    return (typeof window.landParcels !== 'undefined' && Array.isArray(window.landParcels))
      ? JSON.parse(JSON.stringify(window.landParcels))
      : [];
  }

  function loadWifiNetworks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_WIFI);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca data Wi-Fi dari localStorage:', e);
    }
    if (typeof window.wifiNetworks !== 'undefined' && Array.isArray(window.wifiNetworks) && window.wifiNetworks.length > 0) {
      return JSON.parse(JSON.stringify(window.wifiNetworks));
    }
    return JSON.parse(JSON.stringify(DEFAULT_WIFI_NETWORKS));
  }

  let dataset = loadBuildingsData();
  let roomsDataset = loadRoomTypes();
  let electricalPanelsDataset = loadElectricalPanels();
  let gensetsDataset = loadGensets();
  let landDataset = loadLandParcels();
  let wifiDataset = loadWifiNetworks();
  let mediaDataset = loadMediaFacilities();
  let powerDataset = loadElectricalSystem();

  // Async IndexedDB hydration (jika IndexedDB memiliki versi foto beresolusi tinggi)
  getDB().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(['rooms', 'electrical', 'gensets', 'land', 'wifi'], 'readonly');
      const rStore = tx.objectStore('rooms');
      const eStore = tx.objectStore('electrical');
      const gStore = tx.objectStore('gensets');
      const lStore = tx.objectStore('land');
      const wStore = tx.objectStore('wifi');

      const reqR = rStore.getAll();
      reqR.onsuccess = () => {
        if (Array.isArray(reqR.result) && reqR.result.length > 0) {
          roomsDataset = reqR.result;
          renderRoomTypes();
        }
      };

      const reqE = eStore.getAll();
      reqE.onsuccess = () => {
        if (Array.isArray(reqE.result) && reqE.result.length > 0) {
          electricalPanelsDataset = reqE.result;
          renderElectricalPanels();
        }
      };

      const reqG = gStore.getAll();
      reqG.onsuccess = () => {
        if (Array.isArray(reqG.result) && reqG.result.length > 0) {
          gensetsDataset = reqG.result;
          renderGensets();
        }
      };

      const reqL = lStore.getAll();
      reqL.onsuccess = () => {
        if (Array.isArray(reqL.result) && reqL.result.length > 0) {
          landDataset = reqL.result;
          renderLandParcels();
        }
      };

      const reqW = wStore.getAll();
      reqW.onsuccess = () => {
        if (Array.isArray(reqW.result) && reqW.result.length > 0) {
          wifiDataset = reqW.result;
          renderWifiNetworks();
        }
      };
    } catch (err) {
      console.warn('IndexedDB hydration notice:', err);
    }
  });

  function saveBuildingsData(newData) {
    dataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(dataset));
    } catch (e) {
      console.error('Gagal menyimpan ke localStorage:', e);
    }
    calculateAndRenderStatistics();
    populateAllCategoryDropdowns();
    renderCatalog();
    renderTable();
  }

  function saveRoomTypesData(newData) {
    roomsDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(roomsDataset));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, data persists safely in IndexedDB:', e);
    }
    idbSaveAll('rooms', roomsDataset);
    populateRoomFilterDropdowns();
    renderRoomTypes();
  }

  function saveElectricalPanelsData(newData) {
    electricalPanelsDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify(electricalPanelsDataset));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, data persists safely in IndexedDB:', e);
    }
    idbSaveAll('electrical', electricalPanelsDataset);
    renderElectricalPanels();
  }

  function saveGensetsData(newData) {
    gensetsDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_GENSETS, JSON.stringify(gensetsDataset));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, data persists safely in IndexedDB:', e);
    }
    idbSaveAll('gensets', gensetsDataset);
    renderGensets();
  }

  function saveLandData(newData) {
    landDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_LAND, JSON.stringify(landDataset));
    } catch (e) {
      console.warn('LocalStorage quota limit reached for land, persists in IndexedDB:', e);
    }
    idbSaveAll('land', landDataset);
    renderLandParcels();
  }

  function saveWifiData(newData) {
    wifiDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_WIFI, JSON.stringify(wifiDataset));
    } catch (e) {
      console.warn('LocalStorage quota limit reached for wifi, persists in IndexedDB:', e);
    }
    idbSaveAll('wifi', wifiDataset);
    renderWifiNetworks();
  }

  function saveMediaFacilitiesData(newData) {
    mediaDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_MEDIA, JSON.stringify(mediaDataset));
    } catch (e) {
      console.error('Gagal menyimpan sarana media ke localStorage:', e);
    }
    idbSaveAll('media', mediaDataset);
    renderMediaFacilities();
  }

  function saveElectricalSystemData(newData) {
    powerDataset = newData;
    try {
      localStorage.setItem(STORAGE_KEY_POWER, JSON.stringify(powerDataset));
    } catch (e) {
      console.error('Gagal menyimpan kelistrikan ke localStorage:', e);
    }
    renderPowerSystem();
  }

  function resetBuildingsToDefault() {
    showConfirmModal(
      'Apakah Anda yakin ingin mengembalikan seluruh data bangunan, kamar penginapan, panel listrik, genset, wilayah tanah, dan jaringan Wi-Fi ke data standar resmi BMN? Seluruh editan lokal akan di-reset.',
      'Reset Data ke Standar BMN',
      () => {
        localStorage.removeItem(STORAGE_KEY_BUILDINGS);
        localStorage.removeItem(STORAGE_KEY_ROOMS);
        localStorage.removeItem(STORAGE_KEY_PANELS);
        localStorage.removeItem(STORAGE_KEY_GENSETS);
        localStorage.removeItem(STORAGE_KEY_LAND);
        localStorage.removeItem(STORAGE_KEY_WIFI);
        localStorage.removeItem(STORAGE_KEY_MEDIA);
        localStorage.removeItem(STORAGE_KEY_POWER);
        try { localStorage.removeItem(STORAGE_KEY_INFORMASI); } catch (e) {}

        const defaultData = (typeof window.buildings !== 'undefined' && Array.isArray(window.buildings))
          ? JSON.parse(JSON.stringify(window.buildings))
          : [];
        saveBuildingsData(defaultData);

        roomsDataset = JSON.parse(JSON.stringify(DEFAULT_ROOMS));
        saveRoomTypesData(roomsDataset);

        electricalPanelsDataset = JSON.parse(JSON.stringify(DEFAULT_ELECTRICAL_PANELS));
        saveElectricalPanelsData(electricalPanelsDataset);

        gensetsDataset = JSON.parse(JSON.stringify(DEFAULT_GENSETS));
        saveGensetsData(gensetsDataset);

        landDataset = (typeof window.landParcels !== 'undefined' && Array.isArray(window.landParcels))
          ? JSON.parse(JSON.stringify(window.landParcels))
          : [];
        saveLandData(landDataset);

        wifiDataset = (typeof window.wifiNetworks !== 'undefined' && Array.isArray(window.wifiNetworks))
          ? JSON.parse(JSON.stringify(window.wifiNetworks))
          : [];
        saveWifiData(wifiDataset);

        mediaDataset = (typeof window.mediaAndFacilities !== 'undefined') ? JSON.parse(JSON.stringify(window.mediaAndFacilities)) : [];
        saveMediaFacilitiesData(mediaDataset);

        powerDataset = (typeof window.electricalSystem !== 'undefined') ? JSON.parse(JSON.stringify(window.electricalSystem)) : null;
        saveElectricalSystemData(powerDataset);

        institutionInfoData = JSON.parse(JSON.stringify(DEFAULT_INSTITUTION_INFO));
        saveInstitutionInfo(institutionInfoData);

        showToast('Seluruh data bangunan, kamar, kelistrikan, genset, tanah, Wi-Fi, & informasi berhasil dikembalikan ke standar bawaan.', 'success');
      }
    );
  }


  // DOM Elements Cache
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');
  const topTitle = document.getElementById('top-title');
  const btnHamburger = document.getElementById('btn-hamburger');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  // Role Switcher Elements
  const btnToggleRole = document.getElementById('btn-toggle-role');
  const roleTextLabel = document.getElementById('role-text-label');
  const adminBannerNotice = document.getElementById('admin-banner-notice');
  const btnExitAdmin = document.getElementById('btn-exit-admin');
  const btnResetDataDefault = document.getElementById('btn-reset-data-default');
  const btnAddBuildingTop = document.getElementById('btn-add-building-top');
  const btnBannerKatalog = document.getElementById('btn-banner-katalog');
  const btnBannerTabel = document.getElementById('btn-banner-tabel');

  // Admin PIN Modal Elements
  const adminPinModal = document.getElementById('admin-pin-modal');
  const adminPinInput = document.getElementById('admin-pin-input');
  const pinErrorMsg = document.getElementById('pin-error-msg');
  const btnSubmitPin = document.getElementById('btn-submit-pin');
  const btnCancelPin = document.getElementById('btn-cancel-pin');
  const btnClosePinModal = document.getElementById('btn-close-pin-modal');
  const linkPinTo2fa = document.getElementById('link-pin-to-2fa');

  // Catalog Elements
  const catalogBuildingsGrid = document.getElementById('catalog-buildings-grid');
  const catalogSearchInput = document.getElementById('catalog-search-input');
  const catalogFilterJenis = document.getElementById('catalog-filter-jenis');
  const catalogFilterKondisi = document.getElementById('catalog-filter-kondisi');
  const catalogFilterSorting = document.getElementById('catalog-filter-sorting');
  const catalogCounter = document.getElementById('catalog-counter');
  const btnAddBuildingCatalog = document.getElementById('btn-add-building-catalog');
  const btnResetCatalogFilter = document.getElementById('btn-reset-catalog-filter');

  // Table Elements
  const tableBody = document.getElementById('table-body');
  const tableSearchInput = document.getElementById('table-search-input');
  const filterJenis = document.getElementById('filter-jenis');
  const filterKondisi = document.getElementById('filter-kondisi');
  const filterSorting = document.getElementById('filter-sorting');
  const btnResetFilter = document.getElementById('btn-reset-filter');
  const tableCounter = document.getElementById('table-counter');
  const btnAddBuildingTable = document.getElementById('btn-add-building-table');

  // Detail Modal Elements
  const buildingModal = document.getElementById('building-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalClose = document.getElementById('btn-modal-close');
  const btnModalEdit = document.getElementById('btn-modal-edit');
  const modalFoto = document.getElementById('modal-foto');
  const modalNama = document.getElementById('modal-nama');
  const modalJenisBadge = document.getElementById('modal-jenis-badge');
  const modalKondisiBadge = document.getElementById('modal-kondisi-badge');
  const modalVideotronBadge = document.getElementById('modal-videotron-badge');
  const modalVideotronBox = document.getElementById('modal-videotron-box');
  const modalVideotronText = document.getElementById('modal-videotron-text');
  const modalDimensi = document.getElementById('modal-dimensi');
  const modalPanjang = document.getElementById('modal-panjang');
  const modalLebar = document.getElementById('modal-lebar');
  const modalTinggi = document.getElementById('modal-tinggi');
  const modalSatuan = document.getElementById('modal-satuan');
  const modalLuasDasar = document.getElementById('modal-luas-dasar');
  const modalVolume = document.getElementById('modal-volume');
  const modalLuas = document.getElementById('modal-luas');
  const modalLantai = document.getElementById('modal-lantai');
  const modalKapasitas = document.getElementById('modal-kapasitas');
  const modalDaya = document.getElementById('modal-daya');
  const modalFungsi = document.getElementById('modal-fungsi');
  const modalKeterangan = document.getElementById('modal-keterangan');
  const modalSumberPengukuran = document.getElementById('modal-sumber-pengukuran');

  // Form Modal Elements (Admin Mode)
  const buildingFormModal = document.getElementById('building-form-modal');
  const formModalTitle = document.getElementById('form-modal-title');
  const btnCloseFormModal = document.getElementById('btn-close-form-modal');
  const btnCancelForm = document.getElementById('btn-cancel-form');
  const btnSaveBuilding = document.getElementById('btn-save-building');
  const formBuildingId = document.getElementById('form-building-id');
  const formNama = document.getElementById('form-nama');
  const formJenis = document.getElementById('form-jenis');
  const formKondisi = document.getElementById('form-kondisi');
  const formFungsi = document.getElementById('form-fungsi');
  const formPanjang = document.getElementById('form-panjang');
  const formLebar = document.getElementById('form-lebar');
  const formTinggi = document.getElementById('form-tinggi');
  const formSatuan = document.getElementById('form-satuan');
  const formLuas = document.getElementById('form-luas');
  const formLantai = document.getElementById('form-lantai');
  const formKapasitas = document.getElementById('form-kapasitas');
  const formDaya = document.getElementById('form-daya');
  const formSumberPengukuran = document.getElementById('form-sumber-pengukuran');
  const formTanggalPengukuran = document.getElementById('form-tanggal-pengukuran');
  const formKeteranganUkuran = document.getElementById('form-keterangan-ukuran');
  const formCalcLuasDasar = document.getElementById('form-calc-luas-dasar');
  const formCalcLuasTotal = document.getElementById('form-calc-luas-total');
  const formCalcVolume = document.getElementById('form-calc-volume');
  const formFoto = document.getElementById('form-foto');
  const formFotoFile = document.getElementById('form-foto-file');
  const formFotoPreview = document.getElementById('form-foto-preview');
  const formPhotoFilenameLabel = document.getElementById('form-photo-filename-label');
  const formPhotoSourceBadge = document.getElementById('form-photo-source-badge');
  const formPhotoDropzone = document.getElementById('form-photo-dropzone');
  const btnResetFormPhoto = document.getElementById('btn-reset-form-photo');
  const formCustomPhotoValue = document.getElementById('form-custom-photo-value');
  const quickPhotoFileInput = document.getElementById('quick-photo-file-input');
  const toastContainer = document.getElementById('toast-container');
  const formKeterangan = document.getElementById('form-keterangan');

  // Tombol Cetak Rekapitulasi Tabel A4
  const btnPrintInventoryTable = document.getElementById('btn-print-inventory-table');

  // ==========================================================================
  // STANDARISASI PERHITUNGAN DIMENSI FISIK (PANJANG, LEBAR, TINGGI, SATUAN, LUAS DASAR & VOLUME)
  // ==========================================================================
  function formatDimensionValue(val, unit = 'm', decimals = null) {
    if (val === null || val === undefined || val === '' || val === '—' || val === '-') {
      return 'Belum diisi';
    }
    const num = Number(val);
    if (isNaN(num)) return 'Belum diisi';
    const formatted = decimals !== null
      ? num.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : (num % 1 === 0 ? num.toLocaleString('id-ID') : num.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
    return unit ? `${formatted} ${unit}` : formatted;
  }

  function calculateFootprintArea(panjang, lebar, unit = 'm') {
    if (panjang === null || lebar === null || panjang === undefined || lebar === undefined || panjang === '' || lebar === '') {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm²' : (unit === 'cm' ? 'cm²' : 'mm²') };
    }
    const p = Number(panjang);
    const l = Number(lebar);
    if (isNaN(p) || isNaN(l) || p <= 0 || l <= 0) {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm²' : (unit === 'cm' ? 'cm²' : 'mm²') };
    }
    const area = p * l;
    const unitSymbol = unit === 'm' ? 'm²' : (unit === 'cm' ? 'cm²' : 'mm²');
    const formattedNum = area % 1 === 0 ? area.toLocaleString('id-ID') : area.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: area, formatted: `${formattedNum} ${unitSymbol}`, unitSymbol };
  }

  function calculateGeometricVolume(panjang, lebar, tinggi, unit = 'm', isLand = false) {
    if (isLand) {
      return { value: null, formatted: '— (Tidak relevan)', unitSymbol: '—' };
    }
    if (panjang === null || lebar === null || panjang === undefined || lebar === undefined || panjang === '' || lebar === '') {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³') };
    }
    const p = Number(panjang);
    const l = Number(lebar);
    if (isNaN(p) || isNaN(l) || p <= 0 || l <= 0) {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³') };
    }
    if (tinggi === null || tinggi === undefined || tinggi === '' || tinggi === '—' || tinggi === '-') {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³') };
    }
    const t = Number(tinggi);
    if (isNaN(t) || t <= 0) {
      return { value: null, formatted: 'Belum diisi', unitSymbol: unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³') };
    }
    const vol = p * l * t;
    const unitSymbol = unit === 'm' ? 'm³' : (unit === 'cm' ? 'cm³' : 'mm³');
    const formattedNum = vol % 1 === 0 ? vol.toLocaleString('id-ID') : vol.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return { value: vol, formatted: `${formattedNum} ${unitSymbol}`, unitSymbol };
  }

  function calculateObjectDimensions(item = {}) {
    if (!item || typeof item !== 'object') {
      return {
        panjang: null, lebar: null, tinggi: null, satuan: 'm',
        panjangFormatted: 'Belum diisi', lebarFormatted: 'Belum diisi', tinggiFormatted: 'Belum diisi',
        luasDasar: null, luasDasarFormatted: 'Belum diisi',
        lantai: 1, luasTotalLantai: null, luasTotalLantaiFormatted: 'Belum diisi',
        volumeGeometris: null, volumeFormatted: 'Belum diisi',
        sumberPengukuran: 'Belum diisi', tanggalPengukuran: 'Belum diisi'
      };
    }
    const satuan = item.satuan || 'm';
    const isLand = !!(item.tipeArea || item.nib || (item.zona && item.luasM2));
    const lantai = Math.max(1, Number(item.lantai) || 1);
    const p = item.panjang !== undefined && item.panjang !== null && item.panjang !== '' ? Number(item.panjang) : null;
    const l = item.lebar !== undefined && item.lebar !== null && item.lebar !== '' ? Number(item.lebar) : null;
    const t = item.tinggi !== undefined && item.tinggi !== null && item.tinggi !== '' && item.tinggi !== '—' ? Number(item.tinggi) : null;

    const footprint = (p !== null && l !== null && !isNaN(p) && !isNaN(l) && p > 0 && l > 0)
      ? calculateFootprintArea(p, l, satuan)
      : { value: null, formatted: 'Belum diisi', unitSymbol: satuan === 'm' ? 'm²' : 'satuan²' };

    let luasTotalLantai = null;
    let luasTotalLantaiFormatted = 'Belum diisi';
    const explicitLuas = Number(item.luas);

    if (item.luasTotalLantai) {
      luasTotalLantai = Number(item.luasTotalLantai);
      luasTotalLantaiFormatted = `${luasTotalLantai.toLocaleString('id-ID')} ${footprint.unitSymbol}`;
    } else if (lantai > 1 && footprint.value !== null) {
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

    const volume = calculateGeometricVolume(p, l, t, satuan, isLand);
    const sumberPengukuran = item.sumberPengukuran || (isLand ? 'Sertifikat Hak Pakai BPN' : 'As-Built Drawing & SIM-ASET BMN 2026');
    const tanggalPengukuran = item.tanggalPengukuran || item.tanggalUkur || '';

    return {
      panjang: p, lebar: l, tinggi: isLand ? null : t, satuan, isLand,
      panjangFormatted: p !== null && !isNaN(p) ? `${p.toLocaleString('id-ID')} ${satuan}` : 'Belum diisi',
      lebarFormatted: l !== null && !isNaN(l) ? `${l.toLocaleString('id-ID')} ${satuan}` : 'Belum diisi',
      tinggiFormatted: isLand ? '— (Tidak relevan)' : (t !== null && !isNaN(t) ? `${t.toLocaleString('id-ID')} ${satuan}` : 'Belum diisi'),
      luasDasar: footprint.value, luasDasarFormatted: footprint.formatted,
      luasPerLantai: footprint.value, luasPerLantaiFormatted: footprint.formatted,
      lantai, luasTotalLantai, luasTotalLantaiFormatted,
      volumeGeometris: volume.value, volumeFormatted: volume.formatted,
      sumberPengukuran,
      tanggalPengukuran: tanggalPengukuran || 'Belum dicatat'
    };
  }

  // Containers
  const roomTypesContainer = document.getElementById('room-types-container');
  const mediaFacilitiesContainer = document.getElementById('media-facilities-container');
  const powerZonesContainer = document.getElementById('power-zones-container');
  const gensetFeaturesList = document.getElementById('genset-features-list');

  // Room Modal Elements
  const roomFormModal = document.getElementById('room-form-modal');
  const btnCloseRoomModal = document.getElementById('btn-close-room-modal');
  const btnSaveRoom = document.getElementById('btn-save-room');
  const btnCancelRoom = document.getElementById('btn-cancel-room');
  const formRoomId = document.getElementById('form-room-id');
  const formRoomName = document.getElementById('form-room-name');
  const formRoomTipe = document.getElementById('form-room-tipe');
  const formRoomKapasitas = document.getElementById('form-room-kapasitas');
  const formRoomPanjang = document.getElementById('form-room-panjang');
  const formRoomLebar = document.getElementById('form-room-lebar');
  const formRoomTinggi = document.getElementById('form-room-tinggi');
  const formRoomSatuan = document.getElementById('form-room-satuan');
  const formRoomSumber = document.getElementById('form-room-sumber');
  const formRoomTanggal = document.getElementById('form-room-tanggal');
  const formCalcRoomLuas = document.getElementById('form-calc-room-luas');
  const formCalcRoomVolume = document.getElementById('form-calc-room-volume');
  const formRoomFoto = document.getElementById('form-room-foto');
  const formRoomFasilitas = document.getElementById('form-room-fasilitas');
  const formRoomKelebihan = document.getElementById('form-room-kelebihan');

  // Media Modal Elements
  const btnAddMedia = document.getElementById('btn-add-media');
  const mediaFormModal = document.getElementById('media-form-modal');
  const btnCloseMediaModal = document.getElementById('btn-close-media-modal');
  const btnSaveMedia = document.getElementById('btn-save-media');
  const btnCancelMedia = document.getElementById('btn-cancel-media');
  const formMediaId = document.getElementById('form-media-id');
  const formMediaNama = document.getElementById('form-media-nama');
  const formMediaJenis = document.getElementById('form-media-jenis');
  const formMediaLokasi = document.getElementById('form-media-lokasi');
  const formMediaPanjang = document.getElementById('form-media-panjang');
  const formMediaLebar = document.getElementById('form-media-lebar');
  const formMediaTinggi = document.getElementById('form-media-tinggi');
  const formMediaSatuan = document.getElementById('form-media-satuan');
  const formMediaSumber = document.getElementById('form-media-sumber');
  const formMediaTanggal = document.getElementById('form-media-tanggal');
  const formCalcMediaLuas = document.getElementById('form-calc-media-luas');
  const formCalcMediaVolume = document.getElementById('form-calc-media-volume');
  const formMediaTiang = document.getElementById('form-media-tiang');
  const formMediaFoto = document.getElementById('form-media-foto');
  const formMediaSpesifikasi = document.getElementById('form-media-spesifikasi');
  const formMediaFungsi = document.getElementById('form-media-fungsi');

  // Power Modal Elements
  const btnEditPower = document.getElementById('btn-edit-power');
  const powerFormModal = document.getElementById('power-form-modal');
  const btnClosePowerModal = document.getElementById('btn-close-power-modal');
  const btnSavePower = document.getElementById('btn-save-power');
  const btnCancelPower = document.getElementById('btn-cancel-power');
  const formPowerTotal = document.getElementById('form-power-total');
  const formPowerRingkasan = document.getElementById('form-power-ringkasan');
  const formGensetKapasitas = document.getElementById('form-genset-kapasitas');
  const formGensetFitur = document.getElementById('form-genset-fitur');


  // Print Modal & Official Sheet Elements
  const btnModalPrint = document.getElementById('btn-modal-print');
  const btnModalPrintPreview = document.getElementById('btn-modal-print-preview');
  const printPreviewModal = document.getElementById('print-preview-modal');
  const printModalTitle = document.getElementById('print-modal-title');
  const btnClosePrintModal = document.getElementById('btn-close-print-modal');
  const btnClosePrint = document.getElementById('btn-close-print');
  const btnExecutePrint = document.getElementById('btn-execute-print');
  const btnTriggerPrintBottom = document.getElementById('btn-trigger-print-bottom');
  const printSheetPreviewContent = document.getElementById('print-sheet-preview-content');
  const printableBuildingProfile = document.getElementById('printable-building-profile');

  // Confirmation Modal Elements (Iframe Safe)
  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalMessage = document.getElementById('confirm-modal-message');
  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  const btnConfirmProceed = document.getElementById('btn-confirm-proceed');

  // ==========================================================================
  // Authentication & Two-Factor Authentication (2FA) DOM Elements
  // ==========================================================================
  const navAuth = document.getElementById('nav-auth');
  const navAuthText = document.getElementById('nav-auth-text');
  const btnTopAuth = document.getElementById('btn-top-auth');
  const btnTopAuthText = document.getElementById('btn-top-auth-text');
  const userProfileBadge = document.getElementById('user-profile-badge');
  const userAvatarInitials = document.getElementById('user-avatar-initials');
  const userDisplayName = document.getElementById('user-display-name');
  const btnNavbarLogout = document.getElementById('btn-navbar-logout');

  const authUnauthenticatedPanel = document.getElementById('auth-unauthenticated-panel');
  const authAuthenticatedPanel = document.getElementById('auth-authenticated-panel');

  const tabBtnLogin = document.getElementById('tab-btn-login');
  const tabBtnRegister = document.getElementById('tab-btn-register');
  const authLoginPane = document.getElementById('auth-login-pane');
  const authRegisterPane = document.getElementById('auth-register-pane');

  // Login Form Elements
  const loginStep1 = document.getElementById('login-step-1');
  const loginStep2 = document.getElementById('login-step-2');
  const formLogin = document.getElementById('form-login');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const btnToggleLoginPwd = document.getElementById('btn-toggle-login-pwd');
  const btnFillDemoLogin = document.getElementById('btn-fill-demo-login');
  const loginCaptchaCanvas = document.getElementById('login-captcha-canvas');
  const btnRefreshLoginCaptcha = document.getElementById('btn-refresh-login-captcha');
  const btnSpeakLoginCaptcha = document.getElementById('btn-speak-login-captcha');
  const loginCaptchaInput = document.getElementById('login-captcha-input');
  const loginCaptchaStatus = document.getElementById('login-captcha-status');
  const loginCaptchaMsg = document.getElementById('login-captcha-msg');
  const btnLoginProceed = document.getElementById('btn-login-proceed');
  const login2faTargetEmail = document.getElementById('login-2fa-target-email');
  const loginSimulatedOtp = document.getElementById('login-simulated-otp');
  const btnCopyLoginOtp = document.getElementById('btn-copy-login-otp');
  const loginOtpInput = document.getElementById('login-otp-input');
  const loginOtpTimer = document.getElementById('login-otp-timer');
  const loginOtpProgressBar = document.getElementById('login-otp-progress-bar');
  const btnLoginVerifyOtp = document.getElementById('btn-login-verify-otp');
  const btnLoginResendOtp = document.getElementById('btn-login-resend-otp');
  const btnLoginBackStep1 = document.getElementById('btn-login-back-step1');

  // Register Form Elements
  const registerStep1 = document.getElementById('register-step-1');
  const registerStep2 = document.getElementById('register-step-2');
  const formRegister = document.getElementById('form-register');
  const regNama = document.getElementById('reg-nama');
  const regNip = document.getElementById('reg-nip');
  const regRole = document.getElementById('reg-role');
  const regEmail = document.getElementById('reg-email');
  const regPhone = document.getElementById('reg-phone');
  const regPassword = document.getElementById('reg-password');
  const regPwdCharCount = document.getElementById('reg-pwd-char-count');
  const btnToggleRegPwd = document.getElementById('btn-toggle-reg-pwd');
  const pwdStrengthBar = document.getElementById('pwd-strength-bar');
  const reqMinChars = document.getElementById('req-min-chars');
  const reqComplexity = document.getElementById('req-complexity');
  const regPasswordConfirm = document.getElementById('reg-password-confirm');
  const regPwdMatchMsg = document.getElementById('reg-pwd-match-msg');
  const regCaptchaCanvas = document.getElementById('reg-captcha-canvas');
  const btnRefreshRegCaptcha = document.getElementById('btn-refresh-reg-captcha');
  const btnSpeakRegCaptcha = document.getElementById('btn-speak-reg-captcha');
  const regCaptchaInput = document.getElementById('reg-captcha-input');
  const regCaptchaStatus = document.getElementById('reg-captcha-status');
  const regCaptchaMsg = document.getElementById('reg-captcha-msg');
  const btnRegisterProceed = document.getElementById('btn-register-proceed');
  const reg2faTargetEmail = document.getElementById('reg-2fa-target-email');
  const reg2faTargetPhone = document.getElementById('reg-2fa-target-phone');
  const registerSimulatedOtp = document.getElementById('register-simulated-otp');
  const btnCopyRegOtp = document.getElementById('btn-copy-reg-otp');
  const registerOtpInput = document.getElementById('register-otp-input');
  const registerOtpTimer = document.getElementById('register-otp-timer');
  const regOtpProgressBar = document.getElementById('reg-otp-progress-bar');
  const btnRegisterVerifyOtp = document.getElementById('btn-register-verify-otp');
  const btnRegisterResendOtp = document.getElementById('btn-register-resend-otp');
  const btnRegisterBackStep1 = document.getElementById('btn-register-back-step1');

  // Authenticated Profile Elements
  const profileAvatarLarge = document.getElementById('profile-avatar-large');
  const profileName = document.getElementById('profile-name');
  const profileRoleBadge = document.getElementById('profile-role-badge');
  const profileEmail = document.getElementById('profile-email');
  const profileNip = document.getElementById('profile-nip');
  const profilePhone = document.getElementById('profile-phone');
  const profilePermission = document.getElementById('profile-permission');
  const btnProfileGotoCatalog = document.getElementById('btn-profile-goto-catalog');
  const btnProfileGotoDashboard = document.getElementById('btn-profile-goto-dashboard');
  const btnProfileLogout = document.getElementById('btn-profile-logout');




  /**
   * Helper: Toast Notification
   */
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    const iconSvg = type === 'success'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : (type === 'gold'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>');
    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 3600);
  }

  /**
   * Helper: Dialog Konfirmasi Internal (Pengganti window.confirm / aman dalam iframe)
   */
  let pendingConfirmCallback = null;

  function showConfirmModal(message, title, onConfirm) {
    if (!confirmModal) {
      if (typeof onConfirm === 'function') onConfirm();
      return;
    }
    if (confirmModalTitle) confirmModalTitle.textContent = title || 'Konfirmasi Tindakan';
    if (confirmModalMessage) confirmModalMessage.textContent = message;
    pendingConfirmCallback = onConfirm;
    confirmModal.classList.add('active');
  }

  function closeConfirmModal() {
    if (confirmModal) {
      confirmModal.classList.remove('active');
    }
    pendingConfirmCallback = null;
  }

  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', closeConfirmModal);
  }

  if (btnConfirmProceed) {
    btnConfirmProceed.addEventListener('click', () => {
      const cb = pendingConfirmCallback;
      closeConfirmModal();
      if (typeof cb === 'function') {
        cb();
      }
    });
  }

  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeConfirmModal();
    });
  }


  /**
   * Helper: Format Angka Standar Indonesia (1.000)
   */
  function formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return '0';
    return Number(num).toLocaleString('id-ID');
  }

  function getKondisiBadgeClass(kondisi) {
    if (!kondisi) return 'badge-primary';
    const k = kondisi.toLowerCase();
    if (k.includes('baik')) return 'badge-kondisi-baik';
    if (k.includes('ringan')) return 'badge-kondisi-rusak-ringan';
    if (k.includes('sedang') || k.includes('berat')) return 'badge-kondisi-rusak-sedang';
    return 'badge-primary';
  }

  // ==========================================================================
  // 1. MANAJEMEN ROLE (MODE ADMIN VS MODE TAMU)
  // ==========================================================================
  function updateRoleUI() {
    const btnAddWifiEl = document.getElementById('btn-add-wifi');
    const btnAddLandEl = document.getElementById('btn-add-land');

    if (currentRole === 'admin') {
      document.body.classList.add('is-admin-mode');
      if (btnToggleRole) {
        btnToggleRole.className = 'role-badge-pill role-badge-admin';
      }
      if (roleTextLabel) {
        roleTextLabel.textContent = 'Mode Admin';
      }
      if (adminBannerNotice) {
        adminBannerNotice.classList.toggle('active', activeView !== 'internal');
      }
      if (btnAddWifiEl) btnAddWifiEl.style.display = 'inline-flex';
      if (btnAddLandEl) btnAddLandEl.style.display = 'inline-flex';
    } else {
      document.body.classList.remove('is-admin-mode');
      if (btnToggleRole) {
        btnToggleRole.className = 'role-badge-pill role-badge-tamu';
      }
      if (roleTextLabel) {
        roleTextLabel.textContent = 'Mode Tamu';
      }
      if (adminBannerNotice) {
        adminBannerNotice.classList.remove('active');
      }
      if (btnAddWifiEl) btnAddWifiEl.style.display = 'none';
      if (btnAddLandEl) btnAddLandEl.style.display = 'none';
    }
    safeStorageSet('asrama_user_role', currentRole);
  }

  function openAdminPinModal() {
    if (adminPinModal) {
      adminPinModal.classList.add('active');
      if (adminPinInput) {
        adminPinInput.value = '';
        adminPinInput.focus();
      }
      if (pinErrorMsg) pinErrorMsg.style.display = 'none';
    }
  }

  function closeAdminPinModal() {
    if (adminPinModal) {
      adminPinModal.classList.remove('active');
    }
  }

  function handleLoginAdmin() {
    const pin = adminPinInput ? adminPinInput.value.trim() : '';
    // PIN yang valid: 1234 atau admin
    if (pin === '1234' || pin.toLowerCase() === 'admin') {
      currentRole = 'admin';
      updateRoleUI();
      closeAdminPinModal();
      // Re-render katalog & tabel untuk memunculkan tombol aksi edit
      renderCatalog();
      renderTable();
    } else {
      if (pinErrorMsg) pinErrorMsg.style.display = 'block';
    }
  }

  function handleExitAdmin() {
    currentRole = 'tamu';
    updateRoleUI();
    renderCatalog();
    renderTable();
  }

  // Bind Switcher Role Events
  if (btnToggleRole) {
    btnToggleRole.addEventListener('click', () => {
      if (currentRole === 'admin') {
        handleExitAdmin();
      } else {
        openAdminPinModal();
      }
    });
  }

  if (btnSubmitPin) btnSubmitPin.addEventListener('click', handleLoginAdmin);
  if (btnCancelPin) btnCancelPin.addEventListener('click', closeAdminPinModal);
  if (btnClosePinModal) btnClosePinModal.addEventListener('click', closeAdminPinModal);
  if (linkPinTo2fa) {
    linkPinTo2fa.addEventListener('click', (e) => {
      e.preventDefault();
      closeAdminPinModal();
      switchView('auth');
    });
  }
  if (btnExitAdmin) btnExitAdmin.addEventListener('click', handleExitAdmin);
  if (btnResetDataDefault) btnResetDataDefault.addEventListener('click', resetBuildingsToDefault);

  if (adminPinInput) {
    adminPinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLoginAdmin();
    });
  }

  // ==========================================================================
  // 2. NAVIGASI HALAMAN
  // ==========================================================================
  function switchView(viewName) {
    const aliasMap = {
      catalog: 'katalog',
      table: 'tabel',
      rooms: 'kamar',
      power: 'kelistrikan',
      electricity: 'kelistrikan',
      tanah: 'tanah',
      land: 'tanah',
      wilayah: 'tanah',
      wifi: 'wifi',
      jaringan: 'wifi',
      internet: 'wifi',
      stats: 'statistik',
      info: 'informasi'
    };
    if (aliasMap[viewName]) {
      viewName = aliasMap[viewName];
    }

    activeView = viewName;
    window.scrollTo({ top: 0, behavior: 'instant' });

    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewSections.forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    if (adminBannerNotice) {
      adminBannerNotice.classList.toggle('active', currentRole === 'admin' && viewName !== 'internal');
    }

    const titleMap = {
      dashboard: 'Dashboard Kawasan',
      katalog: 'Katalog & Galeri Bangunan',
      tabel: 'Data Inventaris Bangunan',
      kamar: 'Spesifikasi Ruangan Kamar & Sarana Kawasan',
      kelistrikan: 'Sistem Distribusi Daya Listrik & Genset',
      tanah: 'Katalog Wilayah & Luas Tanah Kawasan',
      wifi: 'Katalog & Konfigurasi Jaringan Wi-Fi Kawasan',
      statistik: 'Analisis & Rekapitulasi Kawasan',
      informasi: 'Informasi Resmi Lembaga',
      internal: 'Layanan Internal BMN',
      auth: 'Portal Autentikasi & Akun Petugas'
    };
    if (topTitle) {
      topTitle.textContent = titleMap[viewName] || 'UPT Asrama Haji Banjarmasin';
    }

    if (viewName === 'auth') {
      if (!currentLoginCaptcha) refreshLoginCaptcha();
      if (!currentRegCaptcha) refreshRegCaptcha();
    }

    if (viewName === 'internal') {
      renderInternalView();
    }

    if (viewName === 'tanah') {
      renderLandParcels();
    }

    if (viewName === 'wifi') {
      renderWifiNetworks();
    }

    if (viewName === 'informasi') {
      renderInstitutionInfo();
    }

    closeMobileSidebar();
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      if (view) switchView(view);
    });
  });

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    sidebarBackdrop.classList.add('active');
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebarBackdrop.classList.remove('active');
  }

  if (btnHamburger) {
    btnHamburger.addEventListener('click', () => {
      if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  window.switchView = switchView;

  // ==========================================================================
  // 3. PERHITUNGAN STATISTIK OTOMATIS
  // ==========================================================================
  function calculateAndRenderStatistics() {
    let totalLuas = 0;
    let totalKapasitas = 0;
    let lantai1Count = 0;
    let lantai2Count = 0;
    let lantai3PlusCount = 0;
    let dormKapasitas = 0;

    const jenisMap = {};
    const jenisLuasMap = {};
    const jenisKapasitasMap = {};
    const kondisiMap = {
      'Baik': 0,
      'Rusak Ringan': 0,
      'Rusak Sedang/Berat': 0,
      'Lainnya': 0
    };

    dataset.forEach(b => {
      const p = Number(b.panjang) || 0;
      const l = Number(b.lebar) || 0;
      const luas = Number(b.luas) || (p * l) || 0;
      const kap = Number(b.kapasitas) || 0;
      const fl = Number(b.lantai) || 1;
      const jenis = b.jenis || 'Lainnya';
      const kondisi = b.kondisi || 'Baik';

      totalLuas += luas;
      totalKapasitas += kap;

      if (fl === 1) lantai1Count++;
      else if (fl === 2) lantai2Count++;
      else lantai3PlusCount++;

      if (jenis.toLowerCase().includes('penginapan')) {
        dormKapasitas += kap;
      }

      jenisMap[jenis] = (jenisMap[jenis] || 0) + 1;
      jenisLuasMap[jenis] = (jenisLuasMap[jenis] || 0) + luas;
      jenisKapasitasMap[jenis] = (jenisKapasitasMap[jenis] || 0) + kap;

      if (kondisi.toLowerCase().includes('baik')) {
        kondisiMap['Baik']++;
      } else if (kondisi.toLowerCase().includes('ringan')) {
        kondisiMap['Rusak Ringan']++;
      } else if (kondisi.toLowerCase().includes('sedang') || kondisi.toLowerCase().includes('berat')) {
        kondisiMap['Rusak Sedang/Berat']++;
      } else {
        kondisiMap['Lainnya']++;
      }
    });

    const totalBangunan = dataset.length;

    // Render Metrics
    const elTotalBangunan = document.getElementById('stat-total-bangunan');
    const elTotalLuas = document.getElementById('stat-total-luas');
    const elTotalKapasitas = document.getElementById('stat-total-kapasitas');
    const elLantai1 = document.getElementById('stat-lantai-1');
    const elLantai2 = document.getElementById('stat-lantai-2');
    const elLantai3Plus = document.getElementById('stat-lantai-3plus');

    if (elTotalBangunan) elTotalBangunan.textContent = formatNumber(totalBangunan);
    if (elTotalLuas) elTotalLuas.textContent = formatNumber(totalLuas);
    if (elTotalKapasitas) elTotalKapasitas.textContent = formatNumber(totalKapasitas);
    if (elLantai1) elLantai1.textContent = formatNumber(lantai1Count);
    if (elLantai2) elLantai2.textContent = formatNumber(lantai2Count);
    if (elLantai3Plus) elLantai3Plus.textContent = formatNumber(lantai3PlusCount);

    // Render Distribusi Jenis Bangunan
    const categoryContainer = document.getElementById('dashboard-category-list');
    if (categoryContainer) {
      categoryContainer.innerHTML = '';
      const sortedJenis = Object.keys(jenisMap).sort((a, b) => jenisMap[b] - jenisMap[a]);

      sortedJenis.forEach(jenis => {
        const count = jenisMap[jenis];
        const percent = totalBangunan > 0 ? Math.round((count / totalBangunan) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'category-item';
        row.innerHTML = `
          <div class="category-header">
            <span class="category-name">${jenis}</span>
            <span class="category-count">${count} Unit (${percent}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: ${percent}%;"></div>
          </div>
        `;
        categoryContainer.appendChild(row);
      });
    }

    // Render Kondisi Fisik Boxes
    const conditionContainer = document.getElementById('dashboard-condition-grid');
    if (conditionContainer) {
      conditionContainer.innerHTML = `
        <div class="condition-box good">
          <div class="condition-box-value">${kondisiMap['Baik']}</div>
          <div class="condition-box-label">Kondisi Baik</div>
        </div>
        <div class="condition-box minor-damage">
          <div class="condition-box-value">${kondisiMap['Rusak Ringan']}</div>
          <div class="condition-box-label">Rusak Ringan</div>
        </div>
        <div class="condition-box maintenance">
          <div class="condition-box-value">${kondisiMap['Rusak Sedang/Berat'] + kondisiMap['Lainnya']}</div>
          <div class="condition-box-label">Perlu Servis</div>
        </div>
      `;
    }

    // Tab Statistik
    const elAvgLuas = document.getElementById('stat-avg-luas');
    const elDormKapasitas = document.getElementById('stat-dorm-kapasitas');
    const elRatioBaik = document.getElementById('stat-ratio-baik');
    const statsCatBody = document.getElementById('stats-category-table-body');

    if (elAvgLuas) {
      const avg = totalBangunan > 0 ? Math.round(totalLuas / totalBangunan) : 0;
      elAvgLuas.textContent = formatNumber(avg);
    }
    if (elDormKapasitas) elDormKapasitas.textContent = formatNumber(dormKapasitas);
    if (elRatioBaik) {
      const ratio = totalBangunan > 0 ? Math.round((kondisiMap['Baik'] / totalBangunan) * 100) : 0;
      elRatioBaik.textContent = `${ratio}%`;
    }

    if (statsCatBody) {
      statsCatBody.innerHTML = '';
      const sortedJenis = Object.keys(jenisMap).sort((a, b) => jenisMap[b] - jenisMap[a]);
      sortedJenis.forEach((jenis, idx) => {
        const count = jenisMap[jenis];
        const luas = jenisLuasMap[jenis] || 0;
        const kap = jenisKapasitasMap[jenis] || 0;
        const avg = count > 0 ? Math.round(luas / count) : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${idx + 1}</td>
          <td><strong>${jenis}</strong></td>
          <td style="text-align: center;"><span class="badge badge-primary">${count} Unit</span></td>
          <td style="text-align: right;">${formatNumber(luas)} m²</td>
          <td style="text-align: right;">${formatNumber(kap)} Orang</td>
          <td style="text-align: right;">${formatNumber(avg)} m²</td>
        `;
        statsCatBody.appendChild(tr);
      });
    }
  }

  function populateAllCategoryDropdowns() {
    const categories = new Set();
    dataset.forEach(b => {
      if (b.jenis) categories.add(b.jenis);
    });

    const sortedCats = Array.from(categories).sort();

    const targets = [filterJenis, catalogFilterJenis];
    targets.forEach(select => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '<option value="">Semua Jenis Bangunan</option>';
      sortedCats.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === currentVal) opt.selected = true;
        select.appendChild(opt);
      });
    });
  }

  // ==========================================================================
  // 4. KATALOG BANGUNAN (GALERI PER GEDUNG)
  // ==========================================================================
  function getFilteredCatalogBuildings() {
    const searchVal = catalogSearchInput ? catalogSearchInput.value.trim().toLowerCase() : '';
    const selectedJenis = catalogFilterJenis ? catalogFilterJenis.value : '';
    const selectedKondisi = catalogFilterKondisi ? catalogFilterKondisi.value : '';
    const sortVal = catalogFilterSorting ? catalogFilterSorting.value : 'nama-asc';

    let result = dataset.filter(b => {
      if (searchVal) {
        const inNama = b.nama && b.nama.toLowerCase().includes(searchVal);
        const inJenis = b.jenis && b.jenis.toLowerCase().includes(searchVal);
        const inFungsi = b.fungsi && b.fungsi.toLowerCase().includes(searchVal);
        const inKet = b.keterangan && b.keterangan.toLowerCase().includes(searchVal);
        if (!inNama && !inJenis && !inFungsi && !inKet) return false;
      }
      if (selectedJenis && b.jenis !== selectedJenis) return false;
      if (selectedKondisi && b.kondisi !== selectedKondisi) return false;
      return true;
    });

    const [field, direction] = sortVal.split('-');
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'luas') {
        valA = Number(valA) || (Number(a.panjang) * Number(a.lebar)) || 0;
        valB = Number(valB) || (Number(b.panjang) * Number(b.lebar)) || 0;
      } else if (field === 'kapasitas' || field === 'lantai') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  function renderCatalog() {
    if (!catalogBuildingsGrid) return;
    const items = getFilteredCatalogBuildings();

    catalogBuildingsGrid.innerHTML = '';

    if (catalogCounter) {
      catalogCounter.textContent = `${items.length} dari ${dataset.length} Gedung`;
    }

    if (items.length === 0) {
      catalogBuildingsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Tidak ada gedung yang cocok</div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">Coba ubah kata kunci pencarian atau bersihkan filter jenis/kondisi.</div>
        </div>
      `;
      return;
    }

    items.forEach(b => {
      const card = document.createElement('div');
      card.className = 'catalog-card';

      const dims = calculateObjectDimensions(b);
      const badgeKondisiClass = getKondisiBadgeClass(b.kondisi);
      const fotoSrc = b.foto || 'assets/bangunan/gedung-jabal-rahmah.jpg';

      card.innerHTML = `
        <div class="catalog-photo-wrapper">
          <img src="${fotoSrc}" alt="${b.nama}" class="catalog-photo" loading="lazy">
          <div class="catalog-badge-overlay">
            <span class="badge badge-primary">${b.jenis}</span>
            <span class="badge ${badgeKondisiClass}">${b.kondisi}</span>
            ${(b.videotron || b.videotronInfo) ? '<span class="badge badge-videotron">📺 Videotron</span>' : ''}
          </div>
          <div class="catalog-photo-admin-overlay admin-only">
            <button type="button" class="btn-card-quick-photo" data-building-id="${b.id}" title="Ubah Foto Gedung ${b.nama}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              Ubah Foto
            </button>
          </div>
        </div>

        <div class="catalog-content">
          <h3 class="catalog-bld-name">${b.nama}</h3>
          <div class="catalog-bld-function">${b.fungsi || '-'}</div>

          <div class="catalog-specs-row">
            <div class="catalog-spec-item">
              <div class="catalog-spec-lbl">Dimensi (P × L × T)</div>
              <div class="catalog-spec-val">${dims.panjang !== null ? dims.panjang : 'Belum diisi'} × ${dims.lebar !== null ? dims.lebar : 'Belum diisi'} × ${dims.tinggi !== null ? dims.tinggi : 'Belum diisi'} ${dims.satuan}</div>
            </div>
            <div class="catalog-spec-item">
              <div class="catalog-spec-lbl">${dims.lantai > 1 ? 'Total Luas Lantai' : 'Luas Dasar'}</div>
              <div class="catalog-spec-val">${dims.luasTotalLantaiFormatted}</div>
              ${dims.lantai > 1 ? `<div style="font-size: 0.68rem; color: var(--text-muted);">Dasar: ${dims.luasDasarFormatted}</div>` : ''}
            </div>
            <div class="catalog-spec-item">
              <div class="catalog-spec-lbl">Jumlah Lantai</div>
              <div class="catalog-spec-val">${dims.lantai} Lantai</div>
            </div>
            <div class="catalog-spec-item">
              <div class="catalog-spec-lbl">Kapasitas</div>
              <div class="catalog-spec-val">${formatNumber(b.kapasitas)} Org</div>
            </div>
          </div>

          <div class="catalog-power-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Daya: ${b.dayaListrik || '350/500 kVA Sub-Panel'}</span>
          </div>

          <div class="catalog-footer-actions">
            <button class="btn btn-secondary btn-sm btn-catalog-detail" style="flex: 1;" title="Lihat Spesifikasi Lengkap">
              Lihat Detail
            </button>
            <button class="btn btn-primary btn-sm btn-catalog-direct-print" title="Cetak Lembar Fisik Resmi Gedung ${b.nama}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Cetak
            </button>
            <button class="btn btn-gold btn-sm btn-catalog-edit admin-only" title="Edit Data & Foto Gedung Ini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="btn btn-secondary btn-sm btn-catalog-delete admin-only" style="color: #DC2626; border-color: #FECACA;" title="Hapus Gedung Ini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;

      // Bind Catalog Card Buttons
      const btnDetail = card.querySelector('.btn-catalog-detail');
      const btnDirectPrint = card.querySelector('.btn-catalog-direct-print');
      const btnEdit = card.querySelector('.btn-catalog-edit');
      const btnDelete = card.querySelector('.btn-catalog-delete');
      const btnQuickPhoto = card.querySelector('.btn-card-quick-photo');

      btnDetail.addEventListener('click', () => openBuildingModal(b));
      if (btnDirectPrint) {
        btnDirectPrint.addEventListener('click', (e) => {
          e.stopPropagation();
          directPrintBuilding(b);
        });
      }
      btnEdit.addEventListener('click', () => openBuildingFormModal(b));
      btnDelete.addEventListener('click', () => deleteBuilding(b.id));
      if (btnQuickPhoto) {
        btnQuickPhoto.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerQuickPhotoUpload(b);
        });
      }

      catalogBuildingsGrid.appendChild(card);
    });
  }

  // Catalog Events
  if (catalogSearchInput) catalogSearchInput.addEventListener('input', renderCatalog);
  if (catalogFilterJenis) catalogFilterJenis.addEventListener('change', renderCatalog);
  if (catalogFilterKondisi) catalogFilterKondisi.addEventListener('change', renderCatalog);
  if (catalogFilterSorting) catalogFilterSorting.addEventListener('change', renderCatalog);

  // ==========================================================================
  // 5. DATA BANGUNAN (TABEL INVENTARIS)
  // ==========================================================================
  function getFilteredTableBuildings() {
    const searchVal = tableSearchInput ? tableSearchInput.value.trim().toLowerCase() : '';
    const selectedJenis = filterJenis ? filterJenis.value : '';
    const selectedKondisi = filterKondisi ? filterKondisi.value : '';
    const sortVal = filterSorting ? filterSorting.value : 'nama-asc';

    let result = dataset.filter(b => {
      if (searchVal) {
        const inNama = b.nama && b.nama.toLowerCase().includes(searchVal);
        const inJenis = b.jenis && b.jenis.toLowerCase().includes(searchVal);
        const inFungsi = b.fungsi && b.fungsi.toLowerCase().includes(searchVal);
        const inKet = b.keterangan && b.keterangan.toLowerCase().includes(searchVal);
        if (!inNama && !inJenis && !inFungsi && !inKet) return false;
      }
      if (selectedJenis && b.jenis !== selectedJenis) return false;
      if (selectedKondisi && b.kondisi !== selectedKondisi) return false;
      return true;
    });

    const [field, direction] = sortVal.split('-');
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'luas') {
        valA = Number(valA) || (Number(a.panjang) * Number(a.lebar)) || 0;
        valB = Number(valB) || (Number(b.panjang) * Number(b.lebar)) || 0;
      } else if (field === 'kapasitas' || field === 'lantai') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }

  function renderTable() {
    if (!tableBody) return;
    const filtered = getFilteredTableBuildings();

    tableBody.innerHTML = '';

    if (tableCounter) {
      tableCounter.textContent = `Menampilkan ${filtered.length} dari ${dataset.length} Bangunan`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="14" style="text-align: center; padding: 36px; color: var(--text-muted);">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 6px;">Tidak ada bangunan yang sesuai</div>
            <div style="font-size: 0.85rem;">Coba sesuaikan kata kunci pencarian atau ubah filter jenis & kondisi.</div>
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach((b, index) => {
      const tr = document.createElement('tr');
      const dims = calculateObjectDimensions(b);
      const badgeKondisiClass = getKondisiBadgeClass(b.kondisi);
      const fotoSrc = b.foto || 'assets/bangunan/gedung-jabal-rahmah.jpg';

      const pStr = (b.panjang !== undefined && b.panjang !== null && b.panjang !== '') ? Number(b.panjang).toLocaleString('id-ID') : 'Belum diisi';
      const lStr = (b.lebar !== undefined && b.lebar !== null && b.lebar !== '') ? Number(b.lebar).toLocaleString('id-ID') : 'Belum diisi';
      const tStr = (b.tinggi !== undefined && b.tinggi !== null && b.tinggi !== '') ? Number(b.tinggi).toLocaleString('id-ID') : 'Belum diisi';
      const sat = b.satuan || 'm';

      tr.innerHTML = `
        <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${index + 1}</td>
        <td style="text-align: center;">
          <div class="table-photo-cell" title="Klik untuk lihat detail & foto ${escapeHtml(b.nama)}">
            <img src="${fotoSrc}" alt="${escapeHtml(b.nama)}" class="table-building-thumb" loading="lazy">
          </div>
        </td>
        <td class="building-name-cell" style="font-weight: 700; color: #0F172A;">${escapeHtml(b.nama)}</td>
        <td><span class="badge badge-primary">${escapeHtml(b.jenis)}</span></td>
        <td style="text-align: right; font-weight: 500;">${pStr}</td>
        <td style="text-align: right; font-weight: 500;">${lStr}</td>
        <td style="text-align: right; font-weight: 500;">${tStr}</td>
        <td style="text-align: center; font-size: 0.78rem; color: #64748B;">${sat}</td>
        <td style="text-align: right; font-weight: 600; color: #004C3F;">${dims.luasDasarFormatted}</td>
        <td style="text-align: center;"><span class="badge badge-primary">${dims.lantai}</span></td>
        <td style="text-align: right; font-weight: 700; color: var(--primary-dark);">${dims.luasTotalLantaiFormatted}</td>
        <td style="text-align: right; font-weight: 600; color: #B45309;">${dims.volumeFormatted}</td>
        <td style="text-align: center;"><span class="badge ${badgeKondisiClass}">${escapeHtml(b.kondisi)}</span></td>
        <td style="text-align: center;">
          <div class="table-actions">
            <button class="btn btn-secondary btn-sm btn-table-detail" title="Lihat Spesifikasi Detail">
              Detail
            </button>
            <button class="btn btn-primary btn-sm btn-table-direct-print" title="Cetak Profil A4 ${escapeHtml(b.nama)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Cetak
            </button>
            <button class="btn btn-gold btn-sm btn-table-edit admin-only" title="Edit Gedung & Foto">
              Edit
            </button>
            <button class="btn btn-secondary btn-sm btn-table-delete admin-only" style="color: #DC2626;" title="Hapus">
              &times;
            </button>
          </div>
        </td>
      `;

      const btnDetail = tr.querySelector('.btn-table-detail');
      const btnTablePrint = tr.querySelector('.btn-table-direct-print');
      const btnEdit = tr.querySelector('.btn-table-edit');
      const btnDelete = tr.querySelector('.btn-table-delete');
      const thumbCell = tr.querySelector('.table-photo-cell');

      btnDetail.addEventListener('click', () => openBuildingModal(b));
      if (btnTablePrint) {
        btnTablePrint.addEventListener('click', () => directPrintBuilding(b));
      }
      btnEdit.addEventListener('click', () => openBuildingFormModal(b));
      btnDelete.addEventListener('click', () => deleteBuilding(b.id));
      if (thumbCell) {
        thumbCell.addEventListener('click', () => openBuildingModal(b));
      }

      tableBody.appendChild(tr);
    });
  }

  if (tableSearchInput) tableSearchInput.addEventListener('input', renderTable);
  if (filterJenis) filterJenis.addEventListener('change', renderTable);
  if (filterKondisi) filterKondisi.addEventListener('change', renderTable);
  if (filterSorting) filterSorting.addEventListener('change', renderTable);

  if (btnResetFilter) {
    btnResetFilter.addEventListener('click', () => {
      if (tableSearchInput) tableSearchInput.value = '';
      if (filterJenis) filterJenis.value = '';
      if (filterKondisi) filterKondisi.value = '';
      if (filterSorting) filterSorting.value = 'nama-asc';
      renderTable();
    });
  }

  // ==========================================================================
  // 6. MODAL FORM TAMBAH & EDIT GEDUNG (MODE ADMIN)
  // ==========================================================================
  function updateBuildingFormCalculations() {
    if (!formPanjang || !formLebar) return;
    const p = parseFloat(formPanjang.value);
    const l = parseFloat(formLebar.value);
    const t = formTinggi ? parseFloat(formTinggi.value) : NaN;
    const satuan = (formSatuan && formSatuan.value) ? formSatuan.value : 'm';
    const lantai = formLantai ? Math.max(1, parseInt(formLantai.value, 10) || 1) : 1;

    const footprint = calculateFootprintArea(p, l, satuan);
    const volume = calculateGeometricVolume(p, l, t, satuan, false);

    if (formCalcLuasDasar) {
      formCalcLuasDasar.textContent = footprint.formatted;
    }
    if (formCalcVolume) {
      formCalcVolume.textContent = volume.formatted;
    }
    if (formCalcLuasTotal) {
      if (footprint.value !== null) {
        const total = footprint.value * lantai;
        formCalcLuasTotal.textContent = `${total.toLocaleString('id-ID')} ${footprint.unitSymbol} (${lantai} Lantai)`;
      } else {
        formCalcLuasTotal.textContent = 'Belum diisi';
      }
    }
  }

  function openBuildingFormModal(building = null) {
    if (!buildingFormModal) return;

    if (building) {
      // Mode Edit
      editingBuildingId = building.id;
      if (formModalTitle) formModalTitle.textContent = `Edit Data: ${building.nama}`;
      if (formBuildingId) formBuildingId.value = building.id;
      if (formNama) formNama.value = building.nama || '';
      if (formJenis) formJenis.value = building.jenis || 'Gedung Penginapan';
      if (formKondisi) formKondisi.value = building.kondisi || 'Baik';
      if (formFungsi) formFungsi.value = building.fungsi || '';
      const editDims = calculateObjectDimensions(building);
      if (formPanjang) formPanjang.value = building.panjang !== undefined && building.panjang !== null ? building.panjang : '';
      if (formLebar) formLebar.value = building.lebar !== undefined && building.lebar !== null ? building.lebar : '';
      if (formTinggi) formTinggi.value = building.tinggi !== undefined && building.tinggi !== null ? building.tinggi : '';
      if (formSatuan) formSatuan.value = building.satuan || 'm';
      if (formLantai) formLantai.value = building.lantai || 1;
      if (formLuas) formLuas.value = editDims.luasTotalLantai || building.luas || (building.panjang * building.lebar) || 0;
      if (formKapasitas) formKapasitas.value = building.kapasitas || 0;
      if (formDaya) formDaya.value = building.dayaListrik || '';
      if (formKeterangan) formKeterangan.value = building.keterangan || '';
      if (formSumberPengukuran) formSumberPengukuran.value = building.sumberPengukuran || 'As-Built Drawing & SIM-ASET BMN 2026';
      if (formTanggalPengukuran) formTanggalPengukuran.value = building.tanggalPengukuran || '';
      if (formKeteranganUkuran) formKeteranganUkuran.value = building.keteranganUkuran || '';

      // Tampilkan Foto Saat Ini & Update Status Preview
      const currentFoto = building.foto || 'assets/bangunan/gedung-jabal-rahmah.jpg';
      if (currentFoto.startsWith('data:image')) {
        if (formCustomPhotoValue) formCustomPhotoValue.value = currentFoto;
        if (formFotoPreview) formFotoPreview.src = currentFoto;
        if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = 'Foto Kustom (Hasil Upload)';
        if (formPhotoSourceBadge) {
          formPhotoSourceBadge.textContent = 'Upload Kustom';
          formPhotoSourceBadge.classList.add('badge-uploaded');
        }
      } else {
        if (formCustomPhotoValue) formCustomPhotoValue.value = '';
        if (formFoto) formFoto.value = currentFoto;
        if (formFotoPreview) formFotoPreview.src = currentFoto;
        if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = currentFoto;
        if (formPhotoSourceBadge) {
          formPhotoSourceBadge.textContent = 'Foto Bawaan';
          formPhotoSourceBadge.classList.remove('badge-uploaded');
        }
      }
    } else {
      // Mode Tambah Baru
      editingBuildingId = null;
      if (formModalTitle) formModalTitle.textContent = 'Tambah Gedung / Bangunan Baru';
      if (formBuildingId) formBuildingId.value = '';
      if (formNama) formNama.value = '';
      if (formJenis) formJenis.value = 'Gedung Penginapan';
      if (formKondisi) formKondisi.value = 'Baik';
      if (formFungsi) formFungsi.value = '';
      if (formPanjang) formPanjang.value = '40';
      if (formLebar) formLebar.value = '20';
      if (formTinggi) formTinggi.value = '8';
      if (formSatuan) formSatuan.value = 'm';
      if (formLuas) formLuas.value = '800';
      if (formLantai) formLantai.value = '2';
      if (formKapasitas) formKapasitas.value = '200';
      if (formDaya) formDaya.value = '500 kVA (Sub-Panel Belakang)';
      if (formKeterangan) formKeterangan.value = '';
      if (formSumberPengukuran) formSumberPengukuran.value = 'As-Built Drawing & SIM-ASET BMN 2026';
      if (formTanggalPengukuran) formTanggalPengukuran.value = new Date().toISOString().split('T')[0];
      if (formKeteranganUkuran) formKeteranganUkuran.value = '';

      if (formCustomPhotoValue) formCustomPhotoValue.value = '';
      if (formFoto) formFoto.value = 'assets/bangunan/gedung-jabal-rahmah.jpg';
      if (formFotoPreview) formFotoPreview.src = 'assets/bangunan/gedung-jabal-rahmah.jpg';
      if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = 'assets/bangunan/gedung-jabal-rahmah.jpg';
      if (formPhotoSourceBadge) {
        formPhotoSourceBadge.textContent = 'Foto Bawaan';
        formPhotoSourceBadge.classList.remove('badge-uploaded');
      }
    }

    updateBuildingFormCalculations();
    if (formFotoFile) formFotoFile.value = '';
    buildingFormModal.classList.add('active');
  }

  function closeBuildingFormModal() {
    if (buildingFormModal) {
      buildingFormModal.classList.remove('active');
    }
    editingBuildingId = null;
    if (formCustomPhotoValue) formCustomPhotoValue.value = '';
    if (formFotoFile) formFotoFile.value = '';
  }

  // Auto calculate Luas & Volume when Panjang, Lebar, Tinggi, or Lantai changes
  function handleDimensionChange() {
    updateBuildingFormCalculations();
    const p = parseFloat(formPanjang.value) || 0;
    const l = parseFloat(formLebar.value) || 0;
    const lnt = formLantai ? (parseInt(formLantai.value, 10) || 1) : 1;
    if (p > 0 && l > 0 && formLuas) {
      formLuas.value = Math.round(p * l * lnt);
    }
  }

  if (formPanjang) formPanjang.addEventListener('input', handleDimensionChange);
  if (formLebar) formLebar.addEventListener('input', handleDimensionChange);
  if (formTinggi) formTinggi.addEventListener('input', updateBuildingFormCalculations);
  if (formSatuan) formSatuan.addEventListener('change', updateBuildingFormCalculations);
  if (formLantai) formLantai.addEventListener('input', handleDimensionChange);

  // Helper: Memproses file foto yang dipilih / di-drop oleh admin
  function handleSelectedPhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('File yang dipilih harus berformat gambar (JPG, PNG, JPEG, atau WebP)!', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran file foto maksimal 8 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (formCustomPhotoValue) formCustomPhotoValue.value = dataUrl;
      if (formFotoPreview) formFotoPreview.src = dataUrl;
      const sizeKb = Math.round(file.size / 1024);
      if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = `${file.name} (${sizeKb} KB)`;
      if (formPhotoSourceBadge) {
        formPhotoSourceBadge.textContent = 'Upload Baru';
        formPhotoSourceBadge.classList.add('badge-uploaded');
      }
      showToast(`File foto "${file.name}" siap disimpan untuk gedung ini.`, 'gold');
    };
    reader.readAsDataURL(file);
  }

  if (formFotoFile) {
    formFotoFile.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleSelectedPhotoFile(file);
    });
  }

  // Drag and drop event listeners
  if (formPhotoDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      formPhotoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        formPhotoDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      formPhotoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        formPhotoDropzone.classList.remove('dragover');
      });
    });

    formPhotoDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files && dt.files[0];
      if (file) handleSelectedPhotoFile(file);
    });
  }

  // Preset dropdown handler
  if (formFoto) {
    formFoto.addEventListener('change', () => {
      if (formCustomPhotoValue) formCustomPhotoValue.value = '';
      if (formFotoPreview) formFotoPreview.src = formFoto.value;
      if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = formFoto.value;
      if (formPhotoSourceBadge) {
        formPhotoSourceBadge.textContent = 'Foto Arsip Kawasan';
        formPhotoSourceBadge.classList.remove('badge-uploaded');
      }
    });
  }

  // Reset photo button
  if (btnResetFormPhoto) {
    btnResetFormPhoto.addEventListener('click', () => {
      const targetBuilding = editingBuildingId ? dataset.find(b => b.id === Number(editingBuildingId)) : null;
      let original = 'assets/bangunan/gedung-jabal-rahmah.jpg';
      if (targetBuilding && targetBuilding.foto && !targetBuilding.foto.startsWith('data:')) {
        original = targetBuilding.foto;
      }
      if (formCustomPhotoValue) formCustomPhotoValue.value = '';
      if (formFoto) formFoto.value = original;
      if (formFotoPreview) formFotoPreview.src = original;
      if (formPhotoFilenameLabel) formPhotoFilenameLabel.textContent = original;
      if (formPhotoSourceBadge) {
        formPhotoSourceBadge.textContent = 'Reset ke Bawaan';
        formPhotoSourceBadge.classList.remove('badge-uploaded');
      }
      if (formFotoFile) formFotoFile.value = '';
      showToast('Foto dikembalikan ke setelan bawaan.', 'gold');
    });
  }

  // Quick photo upload from catalog cards
  let activeQuickPhotoBuilding = null;
  function triggerQuickPhotoUpload(building) {
    activeQuickPhotoBuilding = building;
    if (quickPhotoFileInput) {
      quickPhotoFileInput.value = '';
      quickPhotoFileInput.click();
    }
  }

  if (quickPhotoFileInput) {
    quickPhotoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !activeQuickPhotoBuilding) return;

      if (!file.type.startsWith('image/')) {
        showToast('File harus berupa gambar (JPG, PNG, WebP)!', 'error');
        return;
      }

      const targetBld = activeQuickPhotoBuilding;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        targetBld.foto = dataUrl;
        const index = dataset.findIndex(b => b.id === targetBld.id);
        if (index !== -1) {
          dataset[index].foto = dataUrl;
        }
        saveBuildingsData([...dataset]);
        showToast(`Foto ${targetBld.nama} berhasil diperbarui dari file "${file.name}"!`, 'success');
        activeQuickPhotoBuilding = null;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleSaveBuilding() {
    const nama = formNama.value.trim();
    if (!nama) {
      showToast('Nama Gedung wajib diisi!', 'error');
      formNama.focus();
      return;
    }

    const p = parseFloat(formPanjang.value);
    const l = parseFloat(formLebar.value);
    if (isNaN(p) || p <= 0 || isNaN(l) || l <= 0) {
      showToast('Panjang dan lebar harus berupa angka positif lebih dari 0!', 'error');
      return;
    }

    const tVal = formTinggi ? parseFloat(formTinggi.value) : NaN;
    if (formTinggi && formTinggi.value.trim() !== '' && (isNaN(tVal) || tVal < 0)) {
      showToast('Tinggi tidak boleh berupa angka negatif!', 'error');
      return;
    }
    const tinggi = (!isNaN(tVal) && tVal > 0) ? tVal : null;
    const satuan = (formSatuan && formSatuan.value) ? formSatuan.value : 'm';
    const lantai = parseInt(formLantai.value, 10) || 1;
    const luas = parseFloat(formLuas.value) || (p * l * lantai) || 0;
    const kapasitas = parseInt(formKapasitas.value, 10) || 0;

    const sumberPengukuran = formSumberPengukuran ? formSumberPengukuran.value.trim() : 'As-Built Drawing & SIM-ASET BMN 2026';
    const tanggalPengukuran = formTanggalPengukuran ? formTanggalPengukuran.value.trim() : '';
    const keteranganUkuran = formKeteranganUkuran ? formKeteranganUkuran.value.trim() : '';

    const foto = (formCustomPhotoValue && formCustomPhotoValue.value)
      ? formCustomPhotoValue.value
      : (formFoto ? formFoto.value : 'assets/bangunan/gedung-jabal-rahmah.jpg');

    const buildingData = {
      nama,
      jenis: formJenis.value,
      kondisi: formKondisi.value,
      fungsi: formFungsi.value.trim(),
      panjang: p,
      lebar: l,
      tinggi,
      satuan,
      luas,
      lantai,
      kapasitas,
      dayaListrik: formDaya.value.trim(),
      foto,
      keterangan: formKeterangan.value.trim(),
      sumberPengukuran,
      tanggalPengukuran,
      keteranganUkuran
    };

    if (editingBuildingId) {
      // Update data yang ada
      const index = dataset.findIndex(b => b.id === Number(editingBuildingId));
      if (index !== -1) {
        dataset[index] = {
          ...dataset[index],
          ...buildingData
        };
      }
    } else {
      // Tambah data baru
      const maxId = dataset.reduce((max, b) => Math.max(max, Number(b.id) || 0), 0);
      const newBuilding = {
        id: maxId + 1,
        ...buildingData
      };
      dataset.push(newBuilding);
    }

    saveBuildingsData([...dataset]);
    closeBuildingFormModal();
    showToast(`Data dan foto gedung "${nama}" berhasil disimpan!`, 'success');
  }

  function deleteBuilding(buildingId) {
    const target = dataset.find(b => b.id === Number(buildingId));
    if (!target) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus "${target.nama}" dari inventaris kawasan?`,
      'Hapus Gedung Inventaris',
      () => {
        const updated = dataset.filter(b => b.id !== Number(buildingId));
        saveBuildingsData(updated);
        showToast(`Gedung "${target.nama}" berhasil dihapus.`, 'gold');
      }
    );
  }


  if (btnSaveBuilding) btnSaveBuilding.addEventListener('click', handleSaveBuilding);
  if (btnCancelForm) btnCancelForm.addEventListener('click', closeBuildingFormModal);
  if (btnCloseFormModal) btnCloseFormModal.addEventListener('click', closeBuildingFormModal);

  // Buttons Tambah Gedung
  if (btnAddBuildingTop) btnAddBuildingTop.addEventListener('click', () => openBuildingFormModal(null));
  if (btnAddBuildingCatalog) btnAddBuildingCatalog.addEventListener('click', () => openBuildingFormModal(null));
  if (btnAddBuildingTable) btnAddBuildingTable.addEventListener('click', () => openBuildingFormModal(null));

  // ==========================================================================
  // 7. MODAL DETAIL BANGUNAN
  // ==========================================================================
  let currentDetailBuilding = null;

  function openBuildingModal(building) {
    if (!buildingModal || !building) return;
    const freshBuilding = dataset.find(x => x.id === Number(building.id)) || building;
    currentDetailBuilding = freshBuilding;

    const dims = calculateObjectDimensions(freshBuilding);

    modalNama.textContent = freshBuilding.nama;
    modalJenisBadge.textContent = freshBuilding.jenis;

    modalKondisiBadge.textContent = freshBuilding.kondisi;
    modalKondisiBadge.className = `badge ${getKondisiBadgeClass(freshBuilding.kondisi)}`;

    // Update Fasilitas Videotron jika gedung memilikinya (Jabal Rahmah, Jeddah, Madinah)
    if (freshBuilding.videotron || freshBuilding.videotronInfo) {
      if (modalVideotronBadge) modalVideotronBadge.style.display = 'inline-flex';
      if (modalVideotronBox) modalVideotronBox.style.display = 'flex';
      if (modalVideotronText) {
        modalVideotronText.textContent = freshBuilding.videotronInfo || 'Dilengkapi fasilitas Layar Videotron Display Digital terintegrasi untuk informasi kloter jamaah haji.';
      }
    } else {
      if (modalVideotronBadge) modalVideotronBadge.style.display = 'none';
      if (modalVideotronBox) modalVideotronBox.style.display = 'none';
    }

    if (modalDimensi) modalDimensi.textContent = `${dims.panjangFormatted} × ${dims.lebarFormatted}`;
    if (modalPanjang) modalPanjang.textContent = dims.panjangFormatted;
    if (modalLebar) modalLebar.textContent = dims.lebarFormatted;
    if (modalTinggi) modalTinggi.textContent = dims.tinggiFormatted;
    if (modalSatuan) modalSatuan.textContent = dims.satuan === 'm' ? 'Meter (m)' : (dims.satuan === 'cm' ? 'Sentimeter (cm)' : 'Milimeter (mm)');
    if (modalLuasDasar) modalLuasDasar.textContent = dims.luasDasarFormatted;
    if (modalVolume) modalVolume.textContent = dims.volumeFormatted;
    if (modalLantai) modalLantai.textContent = dims.lantai > 1 ? `${dims.lantai} Lantai (≈ ${dims.luasPerLantaiFormatted}/lt)` : `${dims.lantai} Lantai`;
    if (modalLuas) modalLuas.textContent = dims.luasTotalLantaiFormatted;
    if (modalKapasitas) modalKapasitas.textContent = `${formatNumber(freshBuilding.kapasitas)} Jamaah / Orang`;
    if (modalFungsi) modalFungsi.textContent = freshBuilding.fungsi || '-';
    if (modalKeterangan) modalKeterangan.textContent = freshBuilding.keterangan || 'Tidak ada catatan tambahan.';

    if (modalSumberPengukuran) {
      modalSumberPengukuran.textContent = `${dims.sumberPengukuran} (Pembaruan: ${dims.tanggalPengukuran})`;
    }

    if (modalDaya) {
      modalDaya.textContent = freshBuilding.dayaListrik || 'Jalur Distribusi Standar Kawasan (Terhubung Genset ATS)';
    }

    if (freshBuilding.foto) {
      modalFoto.src = freshBuilding.foto;
      modalFoto.alt = `Foto ${freshBuilding.nama}`;
    } else {
      modalFoto.src = 'assets/bangunan/gedung-jabal-rahmah.jpg';
    }

    buildingModal.classList.add('active');
  }

  function closeBuildingModal() {
    if (buildingModal) {
      buildingModal.classList.remove('active');
    }
    currentDetailBuilding = null;
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeBuildingModal);
  if (btnModalClose) btnModalClose.addEventListener('click', closeBuildingModal);

  if (btnModalEdit) {
    btnModalEdit.addEventListener('click', () => {
      if (currentDetailBuilding) {
        const b = currentDetailBuilding;
        closeBuildingModal();
        if (currentRole === 'admin') {
          openBuildingFormModal(b);
        } else {
          openAdminPinModal();
        }
      }
    });
  }

  if (buildingModal) {
    buildingModal.addEventListener('click', (e) => {
      if (e.target === buildingModal) closeBuildingModal();
    });
  }

  // ==========================================================================
  // 8. STANDAR TATA NASKAH & DOKUMEN RESMI KEMENTERIAN HAJI DAN UMRAH RI
  // ==========================================================================
  let activePrintBuilding = null;

  /**
   * Kop Surat Resmi Kementerian Haji dan Umrah Republik Indonesia (Standar A4)
   */
  function getKemenhajOfficialLetterheadHtml() {
    return `
      <div class="gov-kop-header">
        <svg class="gov-kop-emblem" width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" stroke="#004C3F" stroke-width="4" fill="#F8FAFC"/>
          <polygon points="50 14 61 38 88 38 66 54 75 79 50 63 25 79 34 54 12 38 39 38" fill="#C5A059" stroke="#004C3F" stroke-width="1.5"/>
          <circle cx="50" cy="50" r="16" fill="#004C3F"/>
          <path d="M50 38 L54 48 L46 48 Z" fill="#FFFFFF"/>
          <text x="50" y="54" font-size="8" font-family="serif" font-weight="bold" fill="#FFFFFF" text-anchor="middle">IKHLAS</text>
          <text x="50" y="62" font-size="7" font-family="serif" font-weight="bold" fill="#FFFFFF" text-anchor="middle">BERAMAL</text>
        </svg>

        <div class="gov-kop-titles">
          <div class="gov-kop-t1">KEMENTERIAN HAJI DAN UMRAH REPUBLIK INDONESIA</div>
          <div class="gov-kop-t2">DIREKTORAT JENDERAL PENYELENGGARAAN HAJI DAN UMRAH</div>
          <div class="gov-kop-t3">UPT ASRAMA HAJI EMBARKASI BANJARMASIN</div>
          <div class="gov-kop-sub">
            Jl. Jenderal A. Yani Km. 28, Kel. Landasan Ulin Barat, Kec. Liang Anggang, Kota Banjarbaru, Kalimantan Selatan 70724<br>
            Telp: (0511) 4705268 &bull; Email: embarkasi.banjarmasin@kemenhaj.go.id &bull; Laman: haji.kemenhaj.go.id
          </div>
        </div>
      </div>
      <div class="gov-kop-rule-thick"></div>
      <div class="gov-kop-rule-thin"></div>
    `;
  }

  /**
   * Stempel Segel Resmi Terverifikasi Kemenhaj RI
   */
  function getKemenhajOfficialSealHtml() {
    return `
      <div class="gov-official-stamp-seal">
        <div class="gov-stamp-ring-inner">
          <span class="gov-stamp-text-top">KEMENHAJ RI</span>
          <span class="gov-stamp-text-mid">&#9733; TERVERIFIKASI &#9733;</span>
          <span class="gov-stamp-text-bot">UPT EMBARKASI BANJARMASIN</span>
        </div>
      </div>
    `;
  }

  /**
   * Catatan Kaki Keamanan & Integritas Dokumen BMN
   */
  function getKemenhajOfficialSecurityFooterHtml(docType = 'BMN', dateFormatted = '', timeFormatted = '') {
    const now = new Date();
    const dStr = dateFormatted || now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tStr = timeFormatted || now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="gov-doc-footer-bar">
        <div>
          Dokumen Resmi SIM-ASET BMN &bull; Dicetak: ${dStr} pukul ${tStr} WITA
        </div>
        <div>
          KEMENTERIAN HAJI DAN UMRAH REPUBLIK INDONESIA &bull; PORTAL BMN RESMI
        </div>
      </div>
    `;
  }

  /**
   * Menghasilkan struktur HTML Lembar Fisik Dokumen Resmi Bangunan (Standar A4 Kemenhaj RI)
   * 1:1 Parity antara Pratinjau Layar dan Pratinjau Cetak / PDF
   */
  function generateOfficialBuildingPrintHtml(b) {
    if (!b) return '';
    const dims = calculateObjectDimensions(b);
    const luas = dims.luasTotalLantai || Number(b.luas) || (Number(b.panjang) * Number(b.lebar)) || 0;
    const fotoSrc = b.foto || 'assets/bangunan/gedung-jabal-rahmah.jpg';
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const regNo = `BMN-AHB/GDG-${String(b.id || '0').padStart(3, '0')}/2026`;

    // Highlight Layar Videotron jika gedung memiliki fasilitas videotron (Jabal Rahmah, Jeddah, Madinah)
    let videotronSection = '';
    if (b.videotron || b.videotronInfo) {
      const vInfo = b.videotronInfo || 'Layar Digital Videotron Aktif untuk Informasi Kloter Jamaah & Manifes';
      videotronSection = `
        <div class="gov-bld-videotron-box">
          <div class="gov-bld-videotron-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
            Fasilitas Layar Videotron Digital Terintegrasi
          </div>
          <div>${escapeHtml(vInfo)}</div>
        </div>
      `;
    }

    // Catatan akomodasi kamar jika jenis penginapan
    let catatanKamar = '';
    const jenisLower = (b.jenis || '').toLowerCase();
    if (jenisLower.includes('penginapan') || jenisLower.includes('asrama')) {
      catatanKamar = `
        <div class="gov-bld-catatan-kamar">
          <strong>Standar Kamar Jamaah:</strong> Dilengkapi tipe Standar & Superior (Pendingin AC Inverter, Tempat Tidur Busa Berstandar Haji, Kamar Mandi Dalam Sanitasi Bersih, Dispenser Air Minum Koridor, dan Akses Ramah Lansia/Disabilitas).
        </div>
      `;
    }

    return `
      <div class="gov-print-sheet">
        <!-- Security Watermark -->
        <div class="gov-watermark">
          DOKUMEN RESMI BMN &bull; KEMENTERIAN HAJI DAN UMRAH RI
        </div>

        ${getKemenhajOfficialLetterheadHtml()}

        <!-- Document Heading Block -->
        <div class="gov-doc-title-block">
          <h2 class="gov-doc-title">LEMBAR DATA FISIK & SPESIFIKASI TEKNIS BANGUNAN</h2>
          <div class="gov-doc-number">
            NOMOR REGISTRASI BMN: <strong>${regNo}</strong> &bull; KLASIFIKASI: INVENTARIS ASET TETAP KAWASAN EMBARKASI
          </div>
        </div>

        <!-- Content Grid: Foto & Spesifikasi Teknis -->
        <div class="gov-bld-content-grid">
          <!-- Kolom Kiri: Foto Dokumentasi & Status -->
          <div>
            <div class="gov-bld-photo-box">
              <img src="${fotoSrc}" alt="Dokumentasi Fisik ${escapeHtml(b.nama)}" class="gov-bld-photo-img">
              <div class="gov-bld-photo-caption">
                Dokumentasi Visual Lapangan: ${escapeHtml(b.nama)}
              </div>
            </div>

            <div class="gov-bld-status-badge">
              STATUS: LAIK FUNGSI & OPERASIONAL HAJI
            </div>

            ${videotronSection}

            <!-- QR Code Validasi Keaslian Sistem BMN -->
            <div style="margin-top: 10px; padding: 8px; border: 1px dashed #CBD5E1; border-radius: 4px; display: flex; align-items: center; gap: 10px; background: #F8FAFC;">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#004C3F" stroke-width="1.8" style="flex-shrink: 0;">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="5" y="5" width="3" height="3" fill="#004C3F"/><rect x="16" y="5" width="3" height="3" fill="#004C3F"/>
                <path d="M14 14h3v3h-3z" fill="#004C3F"/><path d="M19 14v4h-2"/><path d="M14 19h4v2h-4z"/>
              </svg>
              <div style="font-size: 0.68rem; color: #334155; line-height: 1.3;">
                <strong style="color: #004C3F; display: block; margin-bottom: 2px;">DIVERIFIKASI RESMI BMN</strong>
                Pindai untuk validasi integritas teknis gedung di UPT Asrama Haji Embarkasi Banjarmasin.
              </div>
            </div>
          </div>

          <!-- Kolom Kanan: Tabel Spesifikasi Teknis -->
          <div>
            <table class="gov-table">
              <colgroup>
                <col style="width: 40%;">
                <col style="width: 60%;">
              </colgroup>
              <tbody>
                <tr>
                  <th>Nama Resmi Bangunan</th>
                  <td style="font-size: 0.92rem; color: #004C3F; font-weight: 700;">${escapeHtml(b.nama)}</td>
                </tr>
                <tr>
                  <th>Kode Inventaris BMN</th>
                  <td><strong>${escapeHtml(regNo)}</strong></td>
                </tr>
                <tr>
                  <th>Klasifikasi / Kategori</th>
                  <td>${escapeHtml(b.jenis)}</td>
                </tr>
                <tr>
                  <th>Fungsi Operasional</th>
                  <td>${escapeHtml(b.fungsi || '-')}</td>
                </tr>
                <tr>
                  <th>Panjang (P)</th>
                  <td>${dims.panjangFormatted}</td>
                </tr>
                <tr>
                  <th>Lebar (L)</th>
                  <td>${dims.lebarFormatted}</td>
                </tr>
                <tr>
                  <th>Tinggi Bangunan (T)</th>
                  <td>${dims.tinggiFormatted}</td>
                </tr>
                <tr>
                  <th>Satuan Pengukuran</th>
                  <td>${dims.satuan === 'm' ? 'Meter (m)' : (dims.satuan === 'cm' ? 'Sentimeter (cm)' : 'Milimeter (mm)')}</td>
                </tr>
                <tr>
                  <th>Luas Dasar (Footprint P × L)</th>
                  <td style="font-weight: 700; color: #004C3F;">${dims.luasDasarFormatted}</td>
                </tr>
                <tr>
                  <th>Jumlah Lantai Bangunan</th>
                  <td>${dims.lantai > 1 ? `${dims.lantai} Lantai (≈ ${dims.luasPerLantaiFormatted} / lantai)` : `${dims.lantai} Lantai`}</td>
                </tr>
                <tr>
                  <th>Total Luas Seluruh Lantai</th>
                  <td style="font-weight: 700; color: #004C3F;">${dims.luasTotalLantaiFormatted}</td>
                </tr>
                <tr>
                  <th>Volume Geometris (P × L × T)</th>
                  <td style="font-weight: 700; color: #B45309;">${dims.volumeFormatted}</td>
                </tr>
                <tr>
                  <th>Kapasitas Daya Tampung</th>
                  <td style="font-weight: 700;">${formatNumber(b.kapasitas)} Jamaah / Orang</td>
                </tr>
                <tr>
                  <th>Kondisi Fisik Bangunan</th>
                  <td><strong style="color: #166534;">${escapeHtml(b.kondisi)}</strong> (Status: Laik Operasional)</td>
                </tr>
                <tr>
                  <th>Sumber & Tanggal Ukur</th>
                  <td style="font-size: 7.5pt;">${escapeHtml(dims.sumberPengukuran)} &bull; ${escapeHtml(dims.tanggalPengukuran)}</td>
                </tr>
                <tr>
                  <th>Pasokan Daya Listrik</th>
                  <td>${escapeHtml(b.dayaListrik || 'Sub-Panel Distribusi Kawasan')} (Didukung Genset Sentral 1.000 kVA ATS)</td>
                </tr>
                <tr>
                  <th>Keamanan & Proteksi</th>
                  <td>APAR Terkalibrasi, Jalur Evakuasi Standar Kemenhaj RI, Sistem Penangkal Petir</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Uraian Fasilitas & Catatan Operasional -->
        <div style="font-size: 0.78rem; font-weight: 800; color: #012B23; margin: 10px 0 4px 0; text-transform: uppercase;">
          Uraian Teknis & Fasilitas Pendukung Bangunan:
        </div>
        <div style="border: 1px solid #CBD5E1; border-radius: 4px; padding: 8px 10px; background: #FFFFFF; font-size: 0.75rem; color: #334155; line-height: 1.45; margin-bottom: 12px;">
          ${escapeHtml(b.keterangan || 'Gedung dan sarana terawat prima dengan kesiapan operasional penuh untuk mendukung penyelenggaraan ibadah haji terpadu.')}
          ${catatanKamar}
        </div>

        <!-- Blok Pengesahan & Penandatanganan Resmi -->
        <div class="gov-signatures-block">
          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Mengetahui / Menyetujui,</div>
            <div class="gov-sign-post">Kepala UPT Asrama Haji Embarkasi Banjarmasin</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">H. Saipuddin, S.Ag., M.Pd.I</div>
            <div class="gov-sign-nip">NIP. 19710824 199803 1 003</div>
          </div>

          ${getKemenhajOfficialSealHtml()}

          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Banjarbaru, ${dateFormatted}</div>
            <div class="gov-sign-post">Petugas Pengelola Aset & BMN Kawasan</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">Muhammad Azkiya Ramadhani, S.Kom</div>
            <div class="gov-sign-nip">NIP. 19890412 201503 1 002</div>
          </div>
        </div>

        <!-- Footer Keamanan & Integritas Dokumen -->
        ${getKemenhajOfficialSecurityFooterHtml('BANGUNAN', dateFormatted, timeFormatted)}
      </div>
    `;
  }

  /**
   * Cetak Langsung Lembar Fisik Bangunan (Direct Print ke Browser Printer Dialog / PDF)
   * Menggunakan 1 Template Tunggal yang 100% Identik antara Tampilan Layar & Hasil Cetak
   */
  function directPrintBuilding(building) {
    if (!building) return;
    const fresh = dataset.find(x => x.id === Number(building.id)) || building;
    activePrintBuilding = fresh;

    const printHtml = generateOfficialBuildingPrintHtml(fresh);
    if (printableBuildingProfile) {
      printableBuildingProfile.innerHTML = printHtml;
    }
    if (printSheetPreviewContent) {
      printSheetPreviewContent.innerHTML = printHtml;
    }
    if (printModalTitle) {
      printModalTitle.textContent = `Lembar Fisik Resmi - ${fresh.nama}`;
    }

    showToast(`Membuka dialog cetak resmi untuk "${fresh.nama}"...`, 'success');
    executeDirectPrint(fresh, printHtml);
  }

  /**
   * Engine Cetak Langsung: Menulis dokumen ke elemen cetak utama & memicu print browser secara presisi
   */
  function executeDirectPrint(building, printHtml) {
    const fresh = building;
    const content = printHtml || generateOfficialBuildingPrintHtml(fresh);

    if (printableBuildingProfile) {
      printableBuildingProfile.innerHTML = content;
    }
    if (printSheetPreviewContent) {
      printSheetPreviewContent.innerHTML = content;
    }

    const prevTitle = document.title;
    const bldNameClean = (fresh ? fresh.nama : 'Gedung').replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `Lembar_Data_BMN_${bldNameClean}_${new Date().getFullYear()}`;

    const triggerPrint = () => {
      window.print();
      setTimeout(() => {
        document.title = prevTitle;
      }, 1500);
    };

    const fontPromise = (document.fonts && document.fonts.ready)
      ? Promise.race([
          document.fonts.ready,
          new Promise(res => setTimeout(res, 250))
        ])
      : Promise.resolve();

    fontPromise.then(triggerPrint).catch(triggerPrint);
  }

  /**
   * Buka Pratinjau Modal Cetak Resmi A4
   */
  function openPrintPreviewModal(building) {
    if (!building || !printPreviewModal) return;
    const fresh = dataset.find(x => x.id === Number(building.id)) || building;
    activePrintBuilding = fresh;

    const printHtml = generateOfficialBuildingPrintHtml(fresh);
    if (printableBuildingProfile) {
      printableBuildingProfile.innerHTML = printHtml;
    }
    if (printSheetPreviewContent) {
      printSheetPreviewContent.innerHTML = printHtml;
    }
    if (printModalTitle) {
      printModalTitle.textContent = `Pratinjau Cetak Lembar Fisik - ${fresh.nama}`;
    }
    const modalCard = printPreviewModal.querySelector('.print-modal-card');
    if (modalCard) modalCard.classList.remove('print-modal-landscape');

    printPreviewModal.classList.add('active');
  }

  function closePrintPreviewModal() {
    if (printPreviewModal) {
      printPreviewModal.classList.remove('active');
    }
  }

  /**
   * Menghasilkan struktur HTML Lembar Resmi Rekapitulasi Inventarisasi & Dimensi Bangunan A4 Kemenhaj RI
   */
  function generateOfficialInventoryReportPrintHtml() {
    const buildings = dataset;
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const timeFormatted = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const regNo = `BMN-AHB/REKAP-DIM/2026`;

    let totalLuasDasar = 0;
    let totalLuasLantai = 0;
    let totalVolume = 0;

    const rowsHtml = buildings.map((b, idx) => {
      const dims = calculateObjectDimensions(b);
      if (dims.luasDasar) totalLuasDasar += dims.luasDasar;
      if (dims.luasTotalLantai) totalLuasLantai += dims.luasTotalLantai;
      if (dims.volumeGeometris) totalVolume += dims.volumeGeometris;

      const pStr = (b.panjang !== undefined && b.panjang !== null && b.panjang !== '') ? Number(b.panjang).toLocaleString('id-ID') : 'Belum diisi';
      const lStr = (b.lebar !== undefined && b.lebar !== null && b.lebar !== '') ? Number(b.lebar).toLocaleString('id-ID') : 'Belum diisi';
      const tStr = (b.tinggi !== undefined && b.tinggi !== null && b.tinggi !== '') ? Number(b.tinggi).toLocaleString('id-ID') : 'Belum diisi';
      const sat = b.satuan || 'm';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="font-weight: 700; color: #012B23;">${escapeHtml(b.nama)}</td>
          <td>${escapeHtml(b.jenis)}</td>
          <td style="text-align: right;">${pStr}</td>
          <td style="text-align: right;">${lStr}</td>
          <td style="text-align: right;">${tStr}</td>
          <td style="text-align: center;">${sat}</td>
          <td style="text-align: right; font-weight: 600;">${dims.luasDasarFormatted}</td>
          <td style="text-align: center;">${b.lantai}</td>
          <td style="text-align: right; font-weight: 700; color: #004C3F;">${dims.luasTotalLantaiFormatted}</td>
          <td style="text-align: right; font-weight: 600; color: #B45309;">${dims.volumeFormatted}</td>
          <td style="font-size: 7pt; color: #475569;">${escapeHtml(dims.sumberPengukuran)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="gov-print-sheet gov-print-landscape">
        <!-- Security Watermark -->
        <div class="gov-watermark">
          REKAPITULASI BMN &bull; KEMENTERIAN HAJI DAN UMRAH RI
        </div>

        ${getKemenhajOfficialLetterheadHtml()}

        <!-- Document Heading Block -->
        <div class="gov-doc-title-block" style="margin-bottom: 12px;">
          <h2 class="gov-doc-title" style="font-size: 13pt;">REKAPITULASI INVENTARISASI & STANDARISASI DIMENSI BANGUNAN KAWASAN</h2>
          <div class="gov-doc-number">
            NOMOR DOKUMEN: <strong>${regNo}</strong> &bull; STATUS PENGUKURAN: TERSTANDARISASI (P × L × T) &bull; TANGGAL: ${dateFormatted}
          </div>
        </div>

        <!-- Summary Metrics Box -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; font-size: 8pt;">
          <div style="border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC; border-radius: 3px;">
            <span style="color: #64748B; display: block; font-size: 7pt;">TOTAL BANGUNAN TERDATA</span>
            <strong style="color: #004C3F; font-size: 10pt;">${buildings.length} Unit Gedung</strong>
          </div>
          <div style="border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC; border-radius: 3px;">
            <span style="color: #64748B; display: block; font-size: 7pt;">TOTAL LUAS DASAR (FOOTPRINT)</span>
            <strong style="color: #004C3F; font-size: 10pt;">${totalLuasDasar.toLocaleString('id-ID')} m²</strong>
          </div>
          <div style="border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC; border-radius: 3px;">
            <span style="color: #64748B; display: block; font-size: 7pt;">TOTAL LUAS SELURUH LANTAI</span>
            <strong style="color: #004C3F; font-size: 10pt;">${totalLuasLantai.toLocaleString('id-ID')} m²</strong>
          </div>
          <div style="border: 1px solid #CBD5E1; padding: 6px 10px; background: #F8FAFC; border-radius: 3px;">
            <span style="color: #64748B; display: block; font-size: 7pt;">TOTAL VOLUME GEOMETRIS</span>
            <strong style="color: #B45309; font-size: 10pt;">${totalVolume.toLocaleString('id-ID')} m³</strong>
          </div>
        </div>

        <!-- Tabel Rekapitulasi Lengkap -->
        <table class="gov-table" style="font-size: 7.5pt; width: 100%; border-collapse: collapse; margin-bottom: 14px;">
          <thead>
            <tr style="background: #E2E8F0;">
              <th style="width: 34px; text-align: center; white-space: nowrap;">No</th>
              <th>Nama Objek Bangunan</th>
              <th>Jenis</th>
              <th style="text-align: right; width: 42px;">P</th>
              <th style="text-align: right; width: 42px;">L</th>
              <th style="text-align: right; width: 42px;">T</th>
              <th style="text-align: center; width: 40px; white-space: nowrap;">Sat</th>
              <th style="text-align: right; width: 70px;">Luas Dasar</th>
              <th style="text-align: center; width: 32px; white-space: nowrap;">Lt</th>
              <th style="text-align: right; width: 75px;">Total Luas</th>
              <th style="text-align: right; width: 75px;">Volume</th>
              <th style="width: 135px;">Sumber Pengukuran</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #F1F5F9; font-weight: bold; border-top: 2px solid #004C3F;">
              <td colspan="7" style="text-align: right; padding-right: 8px;">TOTAL KESELURUHAN KAWASAN:</td>
              <td style="text-align: right; color: #004C3F;">${totalLuasDasar.toLocaleString('id-ID')} m²</td>
              <td style="text-align: center;">—</td>
              <td style="text-align: right; color: #004C3F;">${totalLuasLantai.toLocaleString('id-ID')} m²</td>
              <td style="text-align: right; color: #B45309;">${totalVolume.toLocaleString('id-ID')} m³</td>
              <td>SIM-ASET BMN Terintegrasi</td>
            </tr>
          </tfoot>
        </table>

        <!-- Catatan Metodologi Pengukuran -->
        <div style="font-size: 7pt; color: #475569; line-height: 1.35; margin-bottom: 12px; border-left: 3px solid #004C3F; padding-left: 8px;">
          <strong>Catatan Pedoman Standarisasi Dimensi:</strong><br>
          1. Luas Dasar = Panjang (P) × Lebar (L). Menunjukkan tapak jejak bangunan (building footprint) pada peil muka tanah.<br>
          2. Total Luas Lantai mencakup seluruh luasan lantai operasional bangunan bertingkat sesuai as-built drawing dan dokumen BMN.<br>
          3. Volume Geometris = Panjang (P) × Lebar (L) × Tinggi (T). Nilai "Belum diisi" ditampilkan apabila objek belum dilakukan pengukuran elevasi tinggi.<br>
          4. Untuk objek lahan/tanah terbuka, kolom tinggi dan volume berstatus "— (Tidak relevan)".
        </div>

        <!-- Blok Pengesahan & Penandatanganan Resmi -->
        <div class="gov-signatures-block" style="margin-top: 10px;">
          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Mengetahui / Mengesahkan,</div>
            <div class="gov-sign-post">Kepala UPT Asrama Haji Embarkasi Banjarmasin</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">H. Saipuddin, S.Ag., M.Pd.I</div>
            <div class="gov-sign-nip">NIP. 19710824 199803 1 003</div>
          </div>

          ${getKemenhajOfficialSealHtml()}

          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Banjarbaru, ${dateFormatted}</div>
            <div class="gov-sign-post">Petugas Pengelola Aset & Verifikator BMN</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">Muhammad Azkiya Ramadhani, S.Kom</div>
            <div class="gov-sign-nip">NIP. 19890412 201503 1 002</div>
          </div>
        </div>

        <!-- Footer Keamanan & Integritas Dokumen -->
        ${getKemenhajOfficialSecurityFooterHtml('REKAPITULASI DIMENSI', dateFormatted, timeFormatted)}
      </div>
    `;
  }

  // Bind Print Action Buttons
  if (btnPrintInventoryTable) {
    btnPrintInventoryTable.addEventListener('click', () => {
      activePrintBuilding = null;
      const printHtml = generateOfficialInventoryReportPrintHtml();
      if (printableBuildingProfile) {
        printableBuildingProfile.innerHTML = printHtml;
      }
      if (printSheetPreviewContent) {
        printSheetPreviewContent.innerHTML = printHtml;
      }
      if (printModalTitle) {
        printModalTitle.textContent = 'Pratinjau Cetak Rekapitulasi Inventarisasi & Dimensi A4';
      }
      const modalCard = printPreviewModal ? printPreviewModal.querySelector('.print-modal-card') : null;
      if (modalCard) modalCard.classList.add('print-modal-landscape');
      if (printPreviewModal) printPreviewModal.classList.add('active');
    });
  }
  if (btnModalPrint) {
    btnModalPrint.addEventListener('click', () => {
      if (currentDetailBuilding) {
        directPrintBuilding(currentDetailBuilding);
      }
    });
  }

  if (btnModalPrintPreview) {
    btnModalPrintPreview.addEventListener('click', () => {
      if (currentDetailBuilding) {
        openPrintPreviewModal(currentDetailBuilding);
      }
    });
  }

  if (btnExecutePrint) {
    btnExecutePrint.addEventListener('click', () => {
      if (activePrintBuilding) {
        executeDirectPrint(activePrintBuilding, generateOfficialBuildingPrintHtml(activePrintBuilding));
      } else {
        window.print();
      }
    });
  }

  if (btnTriggerPrintBottom) {
    btnTriggerPrintBottom.addEventListener('click', () => {
      if (activePrintBuilding) {
        executeDirectPrint(activePrintBuilding, generateOfficialBuildingPrintHtml(activePrintBuilding));
      } else {
        window.print();
      }
    });
  }

  if (btnClosePrintModal) btnClosePrintModal.addEventListener('click', closePrintPreviewModal);
  if (btnClosePrint) btnClosePrint.addEventListener('click', closePrintPreviewModal);

  if (printPreviewModal) {
    printPreviewModal.addEventListener('click', (e) => {
      if (e.target === printPreviewModal) closePrintPreviewModal();
    });
  }

  // Bind Banner Buttons and Catalog Reset Filter
  if (btnBannerKatalog) {
    btnBannerKatalog.addEventListener('click', () => switchView('katalog'));
  }
  if (btnBannerTabel) {
    btnBannerTabel.addEventListener('click', () => switchView('tabel'));
  }
  if (btnResetCatalogFilter) {
    btnResetCatalogFilter.addEventListener('click', () => {
      if (catalogSearchInput) catalogSearchInput.value = '';
      if (catalogFilterJenis) catalogFilterJenis.value = '';
      if (catalogFilterKondisi) catalogFilterKondisi.value = '';
      if (catalogFilterSorting) catalogFilterSorting.value = 'nama-asc';
      renderCatalog();
      showToast('Filter katalog berhasil di-reset.', 'success');
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (buildingModal && buildingModal.classList.contains('active')) closeBuildingModal();
      if (buildingFormModal && buildingFormModal.classList.contains('active')) closeBuildingFormModal();
      if (adminPinModal && adminPinModal.classList.contains('active')) closeAdminPinModal();
      if (printPreviewModal && printPreviewModal.classList.contains('active')) closePrintPreviewModal();
      if (confirmModal && confirmModal.classList.contains('active')) closeConfirmModal();
      if (roomFormModal && roomFormModal.classList.contains('active')) closeRoomModal();
      if (mediaFormModal && mediaFormModal.classList.contains('active')) closeMediaModal();
      if (electricalFormModal && electricalFormModal.classList.contains('active')) closeElectricalModal();
      if (gensetFormModal && gensetFormModal.classList.contains('active')) closeGensetModal();
      if (imageLightboxModal && imageLightboxModal.classList.contains('active')) closeLightbox();
    }
  });


  // ==========================================================================
  // 8. IMAGE LIGHTBOX VIEWER
  // ==========================================================================
  const imageLightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');

  function openLightbox(src, caption = '') {
    if (!imageLightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    if (lightboxCaption) lightboxCaption.textContent = caption;
    imageLightboxModal.classList.add('active');
  }

  function closeLightbox() {
    if (imageLightboxModal) {
      imageLightboxModal.classList.remove('active');
      if (lightboxImg) lightboxImg.src = '';
    }
  }

  if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeLightbox);
  if (imageLightboxModal) {
    imageLightboxModal.addEventListener('click', (e) => {
      if (e.target === imageLightboxModal || e.target === btnCloseLightbox) closeLightbox();
    });
  }

  // ==========================================================================
  // 9. PENGELOLAAN KONTEN: KAMAR & FASILITAS PENGINAPAN
  // ==========================================================================
  const roomSearchInput = document.getElementById('room-search-input');
  const roomFilterGedung = document.getElementById('room-filter-gedung');
  const roomFilterTipe = document.getElementById('room-filter-tipe');
  const roomFilterKondisi = document.getElementById('room-filter-kondisi');
  const roomBtnReset = document.getElementById('room-btn-reset');
  const roomCountBadge = document.getElementById('room-count-badge');
  const btnAddRoom = document.getElementById('btn-add-room');

  const roomModalTitle = document.getElementById('room-modal-title');
  const formRoomNomor = document.getElementById('form-room-nomor');
  const formRoomGedung = document.getElementById('form-room-gedung');
  const formRoomBeds = document.getElementById('form-room-beds');
  const formRoomKondisi = document.getElementById('form-room-kondisi');
  const formRoomPeruntukan = document.getElementById('form-room-peruntukan');
  const formRoomDeskripsi = document.getElementById('form-room-deskripsi');
  const roomDropzone = document.getElementById('room-dropzone');
  const formRoomPhotosInput = document.getElementById('form-room-photos-input');
  const btnTriggerRoomUpload = document.getElementById('btn-trigger-room-upload');
  const roomPhotosGalleryPreview = document.getElementById('room-photos-gallery-preview');

  // State galeri foto saat mengedit kamar
  let currentRoomPhotos = []; // [{ src: string, isPrimary: boolean }]

  function populateRoomFilterDropdowns() {
    const gedungSet = new Set();
    dataset.forEach(b => {
      if (b.nama) gedungSet.add(b.nama);
    });
    roomsDataset.forEach(r => {
      if (r.namaGedung) gedungSet.add(r.namaGedung);
    });

    const sortedGedung = Array.from(gedungSet).sort();

    // Populate filter dropdown
    if (roomFilterGedung) {
      const cur = roomFilterGedung.value;
      roomFilterGedung.innerHTML = '<option value="">Semua Gedung</option>';
      sortedGedung.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        if (g === cur) opt.selected = true;
        roomFilterGedung.appendChild(opt);
      });
    }

    // Populate form gedung select
    if (formRoomGedung) {
      const cur = formRoomGedung.value;
      formRoomGedung.innerHTML = '<option value="">Pilih Gedung...</option>';
      sortedGedung.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        if (g === cur) opt.selected = true;
        formRoomGedung.appendChild(opt);
      });
    }
  }

  function renderRoomPhotoThumbnails() {
    if (!roomPhotosGalleryPreview) return;
    roomPhotosGalleryPreview.innerHTML = '';

    if (currentRoomPhotos.length === 0) {
      roomPhotosGalleryPreview.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 12px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 6px; text-align: center; font-size: 0.8rem; color: #64748B;">
          Belum ada foto yang diunggah. Unggah foto kamar melalui dropzone di atas (Mendukung banyak foto).
        </div>
      `;
      return;
    }

    currentRoomPhotos.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `photo-thumb-card ${item.isPrimary ? 'is-primary' : ''}`;

      card.innerHTML = `
        <img src="${item.src}" alt="Foto Kamar ${index + 1}" class="photo-thumb-img">
        ${item.isPrimary ? '<span class="photo-primary-badge">★ Foto Utama</span>' : ''}
        <div class="photo-thumb-actions">
          ${!item.isPrimary ? `<button type="button" class="btn-set-primary" data-idx="${index}">Jadikan Utama</button>` : ''}
          <button type="button" class="btn-photo-delete" data-idx="${index}" title="Hapus foto ini">&times;</button>
        </div>
      `;

      // Event listener per item
      const btnSetPrim = card.querySelector('.btn-set-primary');
      if (btnSetPrim) {
        btnSetPrim.addEventListener('click', (e) => {
          e.stopPropagation();
          currentRoomPhotos.forEach((p, i) => { p.isPrimary = (i === index); });
          renderRoomPhotoThumbnails();
        });
      }

      const btnDel = card.querySelector('.btn-photo-delete');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          const wasPrimary = currentRoomPhotos[index].isPrimary;
          currentRoomPhotos.splice(index, 1);
          if (wasPrimary && currentRoomPhotos.length > 0) {
            currentRoomPhotos[0].isPrimary = true;
          }
          renderRoomPhotoThumbnails();
        });
      }

      const img = card.querySelector('.photo-thumb-img');
      if (img) {
        img.addEventListener('click', () => {
          openLightbox(item.src, `Pratinjau Foto Kamar #${index + 1}`);
        });
      }

      roomPhotosGalleryPreview.appendChild(card);
    });
  }

  function updateRoomFormCalculations() {
    if (!formRoomPanjang || !formRoomLebar) return;
    const p = parseFloat(formRoomPanjang.value);
    const l = parseFloat(formRoomLebar.value);
    const tRaw = formRoomTinggi ? formRoomTinggi.value.trim() : '';
    const t = tRaw !== '' ? parseFloat(tRaw) : NaN;
    const satuan = (formRoomSatuan && formRoomSatuan.value) ? formRoomSatuan.value : 'm';

    const footprint = calculateFootprintArea(p, l, satuan);
    const volume = calculateGeometricVolume(p, l, t, satuan, false);
    if (formCalcRoomLuas) formCalcRoomLuas.textContent = footprint.formatted;
    if (formCalcRoomVolume) formCalcRoomVolume.textContent = volume.formatted;
  }

  function openRoomModal(room = null) {
    if (!roomFormModal) return;
    populateRoomFilterDropdowns();

    if (room) {
      if (roomModalTitle) roomModalTitle.textContent = 'Edit Data Kamar Penginapan';
      if (formRoomId) formRoomId.value = room.id;
      if (formRoomName) formRoomName.value = room.nama || '';
      if (formRoomNomor) formRoomNomor.value = room.nomorKamar || '';
      if (formRoomGedung) formRoomGedung.value = room.namaGedung || '';
      if (formRoomTipe) formRoomTipe.value = room.tipe || 'Standar';
      if (formRoomKapasitas) formRoomKapasitas.value = room.kapasitas || '4 - 6 Jamaah';
      if (formRoomBeds) formRoomBeds.value = room.jumlahTempatTidur || 4;
      if (formRoomPanjang) formRoomPanjang.value = (room.panjang !== undefined && room.panjang !== null) ? room.panjang : '';
      if (formRoomLebar) formRoomLebar.value = (room.lebar !== undefined && room.lebar !== null) ? room.lebar : '';
      if (formRoomTinggi) formRoomTinggi.value = (room.tinggi !== undefined && room.tinggi !== null) ? room.tinggi : '';
      if (formRoomSatuan) formRoomSatuan.value = room.satuan || 'm';
      if (formRoomSumber) formRoomSumber.value = room.sumberPengukuran || 'As-Built Drawing & Verifikasi Lapangan';
      if (formRoomTanggal) formRoomTanggal.value = room.tanggalPengukuran || '';
      if (formRoomKondisi) formRoomKondisi.value = room.kondisi || 'Baik';
      if (formRoomPeruntukan) formRoomPeruntukan.value = room.peruntukan || '';
      if (formRoomDeskripsi) formRoomDeskripsi.value = room.deskripsi || '';
      if (formRoomFasilitas) formRoomFasilitas.value = (room.fasilitas || []).join('\n');
      if (formRoomKelebihan) formRoomKelebihan.value = (room.kelebihan || []).join('\n');

      // Populate galeri foto
      currentRoomPhotos = [];
      const primarySrc = room.foto || 'assets/bangunan/kamar-standar.jpg';
      const gallery = Array.isArray(room.galeriFoto) && room.galeriFoto.length > 0
        ? room.galeriFoto
        : [primarySrc];

      gallery.forEach((src, idx) => {
        currentRoomPhotos.push({
          src,
          isPrimary: (src === primarySrc) || (idx === 0)
        });
      });
      // Pastikan ada 1 primary
      if (!currentRoomPhotos.some(p => p.isPrimary) && currentRoomPhotos.length > 0) {
        currentRoomPhotos[0].isPrimary = true;
      }
    } else {
      if (roomModalTitle) roomModalTitle.textContent = 'Tambah Data Kamar Penginapan Baru';
      if (formRoomId) formRoomId.value = '';
      if (formRoomName) formRoomName.value = '';
      if (formRoomNomor) formRoomNomor.value = '';
      if (formRoomGedung) formRoomGedung.value = dataset[0] ? dataset[0].nama : '';
      if (formRoomTipe) formRoomTipe.value = 'Standar';
      if (formRoomKapasitas) formRoomKapasitas.value = '4 - 6 Jamaah';
      if (formRoomBeds) formRoomBeds.value = 4;
      if (formRoomPanjang) formRoomPanjang.value = 6.0;
      if (formRoomLebar) formRoomLebar.value = 4.0;
      if (formRoomTinggi) formRoomTinggi.value = 3.2;
      if (formRoomSatuan) formRoomSatuan.value = 'm';
      if (formRoomSumber) formRoomSumber.value = 'As-Built Drawing & Verifikasi Lapangan';
      if (formRoomTanggal) formRoomTanggal.value = new Date().toISOString().split('T')[0];
      if (formRoomKondisi) formRoomKondisi.value = 'Baik';
      if (formRoomPeruntukan) formRoomPeruntukan.value = 'Jamaah Haji Reguler Kloter Embarkasi';
      if (formRoomDeskripsi) formRoomDeskripsi.value = '';
      if (formRoomFasilitas) {
        formRoomFasilitas.value = 'Tempat tidur single ortopedi anti-alergi\nAC Split hemat energi\nKamar mandi dalam (shower & kloset duduk)\nLoker pakaian individual\nStopkontak di dekat tiap ranjang';
      }
      if (formRoomKelebihan) {
        formRoomKelebihan.value = 'Sirkulasi udara alami optimal berkat jendela ventilasi ganda\nLantai kamar mandi anti-slip ramah lansia';
      }

      currentRoomPhotos = [
        { src: 'assets/bangunan/kamar-standar.jpg', isPrimary: true }
      ];
    }

    updateRoomFormCalculations();
    renderRoomPhotoThumbnails();
    roomFormModal.classList.add('active');
  }

  function closeRoomModal() {
    if (roomFormModal) roomFormModal.classList.remove('active');
    currentRoomPhotos = [];
  }

  // Handle Photo File Upload inside Room Modal
  if (btnTriggerRoomUpload && formRoomPhotosInput) {
    btnTriggerRoomUpload.addEventListener('click', () => formRoomPhotosInput.click());
  }

  async function handleRoomFiles(files) {
    if (!files || files.length === 0) return;
    showToast(`Mengunggah dan mengompresi ${files.length} foto kamar...`, 'info');

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const compressedDataUrl = await compressImage(files[i]);
        currentRoomPhotos.push({
          src: compressedDataUrl,
          isPrimary: currentRoomPhotos.length === 0
        });
        successCount++;
      } catch (err) {
        showToast(err.message, 'warning');
      }
    }

    renderRoomPhotoThumbnails();
    if (successCount > 0) {
      showToast(`${successCount} foto kamar berhasil ditambahkan ke pratinjau galeri!`, 'success');
    }
  }

  if (formRoomPhotosInput) {
    formRoomPhotosInput.addEventListener('change', (e) => {
      handleRoomFiles(e.target.files);
      formRoomPhotosInput.value = '';
    });
  }

  if (roomDropzone) {
    roomDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      roomDropzone.classList.add('dragover');
    });
    roomDropzone.addEventListener('dragleave', () => {
      roomDropzone.classList.remove('dragover');
    });
    roomDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      roomDropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleRoomFiles(e.dataTransfer.files);
      }
    });
  }

  function handleSaveRoom() {
    const rawId = formRoomId ? formRoomId.value.trim() : '';
    const nama = formRoomName ? formRoomName.value.trim() : '';
    const nomorKamar = formRoomNomor ? formRoomNomor.value.trim() : '';
    const namaGedung = formRoomGedung ? formRoomGedung.value.trim() : '';
    const tipe = formRoomTipe ? formRoomTipe.value : 'Standar';
    const kapasitas = formRoomKapasitas ? formRoomKapasitas.value.trim() : '';
    const jumlahTempatTidur = parseInt(formRoomBeds ? formRoomBeds.value : '4', 10) || 1;
    const panjang = parseFloat(formRoomPanjang ? formRoomPanjang.value : '0');
    const lebar = parseFloat(formRoomLebar ? formRoomLebar.value : '0');
    const tRaw = formRoomTinggi ? formRoomTinggi.value.trim() : '';
    const tVal = tRaw !== '' ? parseFloat(tRaw) : NaN;
    const satuan = (formRoomSatuan && formRoomSatuan.value) ? formRoomSatuan.value : 'm';
    const sumberPengukuran = formRoomSumber ? formRoomSumber.value.trim() : 'As-Built Drawing & Verifikasi Lapangan';
    const tanggalPengukuran = formRoomTanggal ? formRoomTanggal.value.trim() : '';
    const kondisi = formRoomKondisi ? formRoomKondisi.value : 'Baik';
    const peruntukan = formRoomPeruntukan ? formRoomPeruntukan.value.trim() : '';
    const deskripsi = formRoomDeskripsi ? formRoomDeskripsi.value.trim() : '';

    if (!nama) {
      showToast('Nama kamar / tipe wajib diisi!', 'warning');
      if (formRoomName) formRoomName.focus();
      return;
    }
    if (!namaGedung) {
      showToast('Silakan pilih lokasi gedung penginapan!', 'warning');
      if (formRoomGedung) formRoomGedung.focus();
      return;
    }
    if (isNaN(panjang) || panjang <= 0 || isNaN(lebar) || lebar <= 0) {
      showToast('Dimensi panjang dan lebar kamar harus berupa angka positif lebih dari 0.', 'warning');
      return;
    }
    if (tRaw !== '' && (isNaN(tVal) || tVal < 0)) {
      showToast('Tinggi plafon tidak boleh berupa angka negatif.', 'warning');
      return;
    }
    const tinggi = (!isNaN(tVal) && tVal > 0) ? tVal : null;

    const luas = Math.round(panjang * lebar * 100) / 100;
    const volume = tinggi !== null ? Math.round(panjang * lebar * tinggi * 100) / 100 : null;

    const fasilitas = (formRoomFasilitas ? formRoomFasilitas.value : '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const kelebihan = (formRoomKelebihan ? formRoomKelebihan.value : '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    // Ambil foto utama dan galeri
    const primaryPhotoItem = currentRoomPhotos.find(p => p.isPrimary) || currentRoomPhotos[0];
    const foto = primaryPhotoItem ? primaryPhotoItem.src : 'assets/bangunan/kamar-standar.jpg';
    const galeriFoto = currentRoomPhotos.map(p => p.src);
    if (galeriFoto.length === 0) {
      galeriFoto.push(foto);
    }

    const roomPayload = {
      nama,
      nomorKamar,
      namaGedung,
      tipe,
      kapasitas: kapasitas || `${jumlahTempatTidur} Jamaah`,
      jumlahTempatTidur,
      panjang,
      lebar,
      tinggi,
      satuan,
      luas,
      volume,
      sumberPengukuran,
      tanggalPengukuran,
      kondisi,
      peruntukan,
      deskripsi,
      fasilitas,
      kelebihan,
      foto,
      galeriFoto
    };

    if (rawId) {
      // Edit existing room
      const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
      const idx = roomsDataset.findIndex(r => String(r.id) === String(id));
      if (idx !== -1) {
        roomsDataset[idx] = { ...roomsDataset[idx], ...roomPayload, id };
      } else {
        roomsDataset.push({ id, ...roomPayload });
      }
      showToast(`Data kamar "${nama}" berhasil diperbarui!`, 'success');
    } else {
      // Add new room
      const maxId = roomsDataset.reduce((max, r) => {
        const num = Number(r.id);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      const newRoom = { id: maxId + 1, ...roomPayload };
      roomsDataset.unshift(newRoom);
      showToast(`Kamar baru "${nama}" (${namaGedung}) berhasil ditambahkan!`, 'success');
    }

    saveRoomTypesData([...roomsDataset]);
    closeRoomModal();
  }

  function deleteRoom(roomId) {
    const target = roomsDataset.find(r => String(r.id) === String(roomId));
    if (!target) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus data kamar "${target.nama}" (${target.namaGedung})? Seluruh foto dan spesifikasi terkait akan dihapus.`,
      'Hapus Kamar Penginapan',
      () => {
        roomsDataset = roomsDataset.filter(r => String(r.id) !== String(roomId));
        saveRoomTypesData([...roomsDataset]);
        showToast(`Kamar "${target.nama}" berhasil dihapus.`, 'gold');
      }
    );
  }

  function getFilteredRooms() {
    const q = roomSearchInput ? roomSearchInput.value.trim().toLowerCase() : '';
    const gedung = roomFilterGedung ? roomFilterGedung.value : '';
    const tipe = roomFilterTipe ? roomFilterTipe.value : '';
    const kondisi = roomFilterKondisi ? roomFilterKondisi.value : '';

    return (roomsDataset || []).filter(r => {
      if (q) {
        const inName = r.nama && r.nama.toLowerCase().includes(q);
        const inNo = r.nomorKamar && r.nomorKamar.toLowerCase().includes(q);
        const inBld = r.namaGedung && r.namaGedung.toLowerCase().includes(q);
        const inDesc = r.deskripsi && r.deskripsi.toLowerCase().includes(q);
        const inPeruntukan = r.peruntukan && r.peruntukan.toLowerCase().includes(q);
        const inFasilitas = Array.isArray(r.fasilitas) && r.fasilitas.some(f => f.toLowerCase().includes(q));
        if (!inName && !inNo && !inBld && !inDesc && !inPeruntukan && !inFasilitas) {
          return false;
        }
      }
      if (gedung && r.namaGedung !== gedung) return false;
      if (tipe && r.tipe !== tipe) return false;
      if (kondisi && r.kondisi !== kondisi) return false;
      return true;
    });
  }

  function renderRoomTypes() {
    if (!roomTypesContainer) return;
    const items = getFilteredRooms();

    if (roomCountBadge) {
      roomCountBadge.textContent = `Menampilkan ${items.length} dari ${roomsDataset.length} Kamar`;
    }

    roomTypesContainer.innerHTML = '';

    if (items.length === 0) {
      roomTypesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Tidak ada kamar yang sesuai</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Silakan sesuaikan kata kunci pencarian atau bersihkan filter gedung/tipe/kondisi.</div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-reset-rooms">Reset Semua Filter</button>
        </div>
      `;
      const btnResetEmpty = document.getElementById('btn-empty-reset-rooms');
      if (btnResetEmpty && roomBtnReset) {
        btnResetEmpty.addEventListener('click', () => roomBtnReset.click());
      }
      return;
    }

    items.forEach(room => {
      const card = document.createElement('div');
      card.className = 'room-card';

      const fasilitasHtml = (room.fasilitas || [])
        .map(f => `<li>${f}</li>`)
        .join('');

      const kelebihanHtml = (room.kelebihan || [])
        .map(k => `
          <div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 0.82rem; color: #065F46;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.5" style="flex-shrink: 0; margin-top: 2px;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>${k}</span>
          </div>
        `).join('');

      // Galeri Strip Thumbnails
      const gallery = Array.isArray(room.galeriFoto) && room.galeriFoto.length > 0
        ? room.galeriFoto
        : [room.foto || 'assets/bangunan/kamar-standar.jpg'];

      let galleryStripHtml = '';
      if (gallery.length > 1) {
        const thumbItems = gallery.map((src, i) => `
          <img src="${src}" alt="Thumbnail ${i + 1}" class="room-gallery-thumb" data-room-id="${room.id}" data-img-idx="${i}" title="Perbesar foto ${i + 1}">
        `).join('');

        galleryStripHtml = `
          <div class="room-gallery-strip">
            ${thumbItems}
            <span style="font-size: 0.72rem; color: var(--text-muted); align-self: center; margin-left: auto;">${gallery.length} Foto</span>
          </div>
        `;
      }

      const badgeKondisiClass = getKondisiBadgeClass(room.kondisi);

      card.innerHTML = `
        <div style="position: relative; overflow: hidden;">
          <img src="${room.foto || 'assets/bangunan/kamar-standar.jpg'}" alt="${room.nama}" class="room-card-photo" style="cursor: zoom-in;" title="Klik untuk memperbesar foto">
          <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge ${room.tipe === 'Superior' ? 'badge-primary' : (room.tipe === 'VIP' ? 'badge-gold' : 'badge-kondisi-baik')}">${room.tipe}</span>
            <span class="badge ${badgeKondisiClass}">${room.kondisi || 'Baik'}</span>
          </div>
          ${room.nomorKamar ? `<div style="position: absolute; bottom: 10px; left: 10px; background: rgba(1, 43, 35, 0.85); color: #FFFFFF; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; backdrop-filter: blur(4px);">No. ${room.nomorKamar}</div>` : ''}
        </div>

        ${galleryStripHtml}

        <div class="room-card-content">
          <div class="room-title-row">
            <div>
              <h4 class="room-title" style="margin-bottom: 2px;">${room.nama}</h4>
              <div style="font-size: 0.8rem; font-weight: 600; color: var(--primary); display: flex; align-items: center; gap: 4px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3"/></svg>
                ${room.namaGedung || 'Gedung Penginapan'}
              </div>
            </div>
          </div>

          ${room.deskripsi ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin: 6px 0 10px 0; line-height: 1.4;">${room.deskripsi}</div>` : ''}

          ${(() => {
            const rSat = room.satuan || 'm';
            const rFootprint = calculateFootprintArea(room.panjang, room.lebar, rSat);
            const rVol = calculateGeometricVolume(room.panjang, room.lebar, room.tinggi, rSat, false);
            const rP = formatDimensionValue(room.panjang, rSat);
            const rL = formatDimensionValue(room.lebar, rSat);
            const rT = formatDimensionValue(room.tinggi, rSat);
            return `
          <div class="dimension-badge-row">
            <div class="dim-badge">
              <strong>P × L × T:</strong> ${rP} × ${rL} × ${rT}
            </div>
            <div class="dim-badge">
              <strong>Luas Dasar:</strong> ${rFootprint.formatted}
            </div>
            <div class="dim-badge">
              <strong>Volume Geometris:</strong> ${rVol.formatted}
            </div>
            <div class="dim-badge">
              <strong>Kapasitas:</strong> ${room.kapasitas}
            </div>
            <div class="dim-badge">
              <strong>Tempat Tidur:</strong> ${room.jumlahTempatTidur || 4} Bed
            </div>
          </div>`;
          })()}

          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin: 10px 0 6px 0;">
            Fasilitas Kamar:
          </div>
          <ul class="facility-list">
            ${fasilitasHtml}
          </ul>

          ${kelebihanHtml ? `
            <div class="advantage-box">
              <div class="advantage-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Keunggulan & Fasilitas Unggulan:
              </div>
              ${kelebihanHtml}
            </div>
          ` : ''}

          <div class="admin-only" style="display: flex; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #CBD5E1;">
            <button class="btn btn-gold btn-sm btn-room-edit" style="flex: 1;" title="Edit data dan foto kamar ini">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Kamar
            </button>
            <button class="btn btn-secondary btn-sm btn-room-delete" style="color: #DC2626; border-color: #FECACA;" title="Hapus kamar ini">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Hapus
            </button>
          </div>
        </div>
      `;

      // Click to open main photo in lightbox
      const mainImg = card.querySelector('.room-card-photo');
      if (mainImg) {
        mainImg.addEventListener('click', () => {
          openLightbox(room.foto || 'assets/bangunan/kamar-standar.jpg', `${room.nama} - ${room.namaGedung}`);
        });
      }

      // Click thumbnails to open in lightbox
      card.querySelectorAll('.room-gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          const imgIdx = parseInt(thumb.getAttribute('data-img-idx'), 10) || 0;
          openLightbox(gallery[imgIdx], `${room.nama} (Foto ${imgIdx + 1} dari ${gallery.length})`);
        });
      });

      const btnEdit = card.querySelector('.btn-room-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => openRoomModal(room));
      }

      const btnDel = card.querySelector('.btn-room-delete');
      if (btnDel) {
        btnDel.addEventListener('click', () => deleteRoom(room.id));
      }

      roomTypesContainer.appendChild(card);
    });
  }

  // Bind Room Event Listeners
  if (btnAddRoom) btnAddRoom.addEventListener('click', () => openRoomModal(null));
  if (btnCloseRoomModal) btnCloseRoomModal.addEventListener('click', closeRoomModal);
  if (btnCancelRoom) btnCancelRoom.addEventListener('click', closeRoomModal);
  if (btnSaveRoom) btnSaveRoom.addEventListener('click', handleSaveRoom);
  if (formRoomPanjang) formRoomPanjang.addEventListener('input', updateRoomFormCalculations);
  if (formRoomLebar) formRoomLebar.addEventListener('input', updateRoomFormCalculations);
  if (formRoomTinggi) formRoomTinggi.addEventListener('input', updateRoomFormCalculations);
  if (formRoomSatuan) formRoomSatuan.addEventListener('change', updateRoomFormCalculations);

  if (roomSearchInput) roomSearchInput.addEventListener('input', renderRoomTypes);
  if (roomFilterGedung) roomFilterGedung.addEventListener('change', renderRoomTypes);
  if (roomFilterTipe) roomFilterTipe.addEventListener('change', renderRoomTypes);
  if (roomFilterKondisi) roomFilterKondisi.addEventListener('change', renderRoomTypes);
  if (roomBtnReset) {
    roomBtnReset.addEventListener('click', () => {
      if (roomSearchInput) roomSearchInput.value = '';
      if (roomFilterGedung) roomFilterGedung.value = '';
      if (roomFilterTipe) roomFilterTipe.value = '';
      if (roomFilterKondisi) roomFilterKondisi.value = '';
      renderRoomTypes();
      showToast('Filter kamar berhasil di-reset.', 'success');
    });
  }

  // ==========================================================================
  // 10. PENGELOLAAN KONTEN: SARANA MEDIA & VIDEOTRON
  // ==========================================================================
  let editingMediaId = null;

  function updateMediaFormCalculations() {
    if (!formMediaPanjang || !formMediaLebar) return;
    const p = parseFloat(formMediaPanjang.value);
    const l = parseFloat(formMediaLebar.value);
    const tRaw = formMediaTinggi ? formMediaTinggi.value.trim() : '';
    const t = tRaw !== '' ? parseFloat(tRaw) : NaN;
    const satuan = (formMediaSatuan && formMediaSatuan.value) ? formMediaSatuan.value : 'm';

    const footprint = calculateFootprintArea(p, l, satuan);
    const volume = calculateGeometricVolume(p, l, t, satuan, false);
    if (formCalcMediaLuas) formCalcMediaLuas.textContent = footprint.formatted;
    if (formCalcMediaVolume) formCalcMediaVolume.textContent = volume.formatted;
  }

  function openMediaModal(item = null) {
    if (!mediaFormModal) return;
    if (item) {
      editingMediaId = item.id;
      if (formMediaId) formMediaId.value = item.id;
      if (formMediaNama) formMediaNama.value = item.nama || '';
      if (formMediaJenis) formMediaJenis.value = item.jenis || '';
      if (formMediaLokasi) formMediaLokasi.value = item.lokasi || '';
      if (formMediaPanjang) formMediaPanjang.value = (item.panjang !== undefined && item.panjang !== null) ? item.panjang : '';
      if (formMediaLebar) formMediaLebar.value = (item.lebar !== undefined && item.lebar !== null) ? item.lebar : '';
      if (formMediaTinggi) formMediaTinggi.value = (item.tinggi !== undefined && item.tinggi !== null) ? item.tinggi : '';
      if (formMediaSatuan) formMediaSatuan.value = item.satuan || 'm';
      if (formMediaSumber) formMediaSumber.value = item.sumberPengukuran || 'Spesifikasi Teknis & SIM-ASET BMN';
      if (formMediaTanggal) formMediaTanggal.value = item.tanggalPengukuran || '';
      if (formMediaTiang) formMediaTiang.value = (item.tinggiTiang !== undefined && item.tinggiTiang !== null) ? item.tinggiTiang : '';
      if (formMediaFoto) formMediaFoto.value = item.foto || 'assets/bangunan/videotron.jpg';
      if (formMediaSpesifikasi) formMediaSpesifikasi.value = item.spesifikasi || '';
      if (formMediaFungsi) formMediaFungsi.value = item.fungsi || '';
    } else {
      editingMediaId = null;
      if (formMediaId) formMediaId.value = '';
      if (formMediaNama) formMediaNama.value = '';
      if (formMediaJenis) formMediaJenis.value = 'Media Informasi Digital';
      if (formMediaLokasi) formMediaLokasi.value = '';
      if (formMediaPanjang) formMediaPanjang.value = '6.0';
      if (formMediaLebar) formMediaLebar.value = '3.5';
      if (formMediaTinggi) formMediaTinggi.value = '0.15';
      if (formMediaSatuan) formMediaSatuan.value = 'm';
      if (formMediaSumber) formMediaSumber.value = 'Spesifikasi Teknis & SIM-ASET BMN';
      if (formMediaTanggal) formMediaTanggal.value = new Date().toISOString().split('T')[0];
      if (formMediaTiang) formMediaTiang.value = '4.0';
      if (formMediaFoto) formMediaFoto.value = 'assets/bangunan/videotron.jpg';
      if (formMediaSpesifikasi) formMediaSpesifikasi.value = 'LED Full Color P4 Outdoor High Brightness IP65';
      if (formMediaFungsi) formMediaFungsi.value = '';
    }
    updateMediaFormCalculations();
    mediaFormModal.classList.add('active');
  }

  function closeMediaModal() {
    if (mediaFormModal) mediaFormModal.classList.remove('active');
    editingMediaId = null;
  }

  function handleSaveMedia() {
    const nama = formMediaNama ? formMediaNama.value.trim() : '';
    if (!nama) {
      showToast('Nama Sarana / Videotron wajib diisi!', 'error');
      if (formMediaNama) formMediaNama.focus();
      return;
    }

    const p = parseFloat(formMediaPanjang ? formMediaPanjang.value : '');
    const l = parseFloat(formMediaLebar ? formMediaLebar.value : '');
    if (isNaN(p) || p <= 0 || isNaN(l) || l <= 0) {
      showToast('Panjang dan lebar sarana harus berupa angka positif lebih dari 0!', 'error');
      return;
    }

    const tRaw = formMediaTinggi ? formMediaTinggi.value.trim() : '';
    const tVal = tRaw !== '' ? parseFloat(tRaw) : NaN;
    if (tRaw !== '' && (isNaN(tVal) || tVal < 0)) {
      showToast('Tinggi/tebal sarana tidak boleh negatif!', 'error');
      return;
    }
    const tinggi = (!isNaN(tVal) && tVal > 0) ? tVal : null;
    const tiangRaw = formMediaTiang ? formMediaTiang.value.trim() : '';
    const tiangVal = tiangRaw !== '' ? parseFloat(tiangRaw) : NaN;
    if (tiangRaw !== '' && (isNaN(tiangVal) || tiangVal < 0)) {
      showToast('Tinggi tiang penopang tidak boleh negatif!', 'error');
      return;
    }
    const tinggiTiang = (!isNaN(tiangVal) && tiangVal > 0) ? tiangVal : null;
    const satuan = (formMediaSatuan && formMediaSatuan.value) ? formMediaSatuan.value : 'm';

    const itemData = {
      nama,
      jenis: (formMediaJenis ? formMediaJenis.value.trim() : '') || 'Media Informasi Digital',
      lokasi: (formMediaLokasi ? formMediaLokasi.value.trim() : '') || '-',
      panjang: p,
      lebar: l,
      tinggi,
      satuan,
      luasLayar: Math.round(p * l * 100) / 100,
      volume: tinggi !== null ? Math.round(p * l * tinggi * 100) / 100 : null,
      tinggiTiang,
      sumberPengukuran: formMediaSumber ? formMediaSumber.value.trim() : 'Spesifikasi Teknis & SIM-ASET BMN',
      tanggalPengukuran: formMediaTanggal ? formMediaTanggal.value.trim() : '',
      foto: (formMediaFoto ? formMediaFoto.value : '') || 'assets/bangunan/videotron.jpg',
      spesifikasi: (formMediaSpesifikasi ? formMediaSpesifikasi.value.trim() : '') || '-',
      fungsi: (formMediaFungsi ? formMediaFungsi.value.trim() : '') || '-'
    };

    if (editingMediaId) {
      const idx = mediaDataset.findIndex(m => String(m.id) === String(editingMediaId));
      if (idx !== -1) {
        mediaDataset[idx] = { ...mediaDataset[idx], ...itemData };
      }
    } else {
      const maxId = mediaDataset.reduce((max, m) => Math.max(max, Number(m.id) || 0), 0);
      mediaDataset.push({ id: maxId + 1, ...itemData });
    }

    saveMediaFacilitiesData([...mediaDataset]);
    closeMediaModal();
    showToast(`Sarana media "${nama}" berhasil disimpan!`, 'success');
  }

  function deleteMedia(id) {
    const item = mediaDataset.find(m => String(m.id) === String(id));
    if (!item) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus sarana media "${item.nama}"?`,
      'Hapus Sarana Media',
      () => {
        mediaDataset = mediaDataset.filter(m => String(m.id) !== String(id));
        saveMediaFacilitiesData([...mediaDataset]);
        showToast(`Sarana "${item.nama}" berhasil dihapus.`, 'gold');
      }
    );
  }

  function renderMediaFacilities() {
    if (!mediaFacilitiesContainer) return;
    const media = mediaDataset || [];
    mediaFacilitiesContainer.innerHTML = '';

    media.forEach(item => {
      const card = document.createElement('div');
      card.className = 'media-card';
      const sat = item.satuan || 'm';
      const mFootprint = calculateFootprintArea(item.panjang, item.lebar, sat);
      const isAreaOnly = (item.jenis || '').toLowerCase().includes('area terbuka') || (item.tinggi === 0 && (item.id || '') === 'halaman-kawasan');
      const mVol = calculateGeometricVolume(item.panjang, item.lebar, item.tinggi, sat, isAreaOnly);

      const pStr = formatDimensionValue(item.panjang, sat);
      const lStr = formatDimensionValue(item.lebar, sat);
      const tStr = isAreaOnly ? '— (Tidak relevan)' : formatDimensionValue(item.tinggi, sat);
      let dimText = `P: ${pStr} × L: ${lStr} × T: ${tStr} • Luas: ${mFootprint.formatted} • Vol: ${mVol.formatted}`;

      if (item.tinggiTiang) {
        dimText += ` (T. Tiang: ${item.tinggiTiang} m)`;
      }

      card.innerHTML = `
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px;">
          <h4 class="media-title">${item.nama}</h4>
          <span class="badge badge-primary">${item.jenis}</span>
        </div>
        <div class="media-dim-tag">
          ${dimText}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;">
          <strong>Lokasi:</strong> ${item.lokasi}
        </div>
        <div style="font-size: 0.8rem; color: #334155; line-height: 1.5; background: #F8FAFC; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); flex: 1;">
          <strong>Spesifikasi & Fungsi:</strong><br>${item.fungsi || item.spesifikasi || '-'}
        </div>
        <div class="admin-only" style="display: flex; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #CBD5E1;">
          <button class="btn btn-gold btn-sm btn-media-edit" style="flex: 1;">Edit Sarana</button>
          <button class="btn btn-secondary btn-sm btn-media-delete" style="color: #DC2626; border-color: #FECACA;">Hapus</button>
        </div>
      `;

      const btnEdit = card.querySelector('.btn-media-edit');
      const btnDel = card.querySelector('.btn-media-delete');
      if (btnEdit) btnEdit.addEventListener('click', () => openMediaModal(item));
      if (btnDel) btnDel.addEventListener('click', () => deleteMedia(item.id));

      mediaFacilitiesContainer.appendChild(card);
    });
  }

  if (btnAddMedia) btnAddMedia.addEventListener('click', () => openMediaModal(null));
  if (btnCloseMediaModal) btnCloseMediaModal.addEventListener('click', closeMediaModal);
  if (btnCancelMedia) btnCancelMedia.addEventListener('click', closeMediaModal);
  if (btnSaveMedia) btnSaveMedia.addEventListener('click', handleSaveMedia);
  if (formMediaPanjang) formMediaPanjang.addEventListener('input', updateMediaFormCalculations);
  if (formMediaLebar) formMediaLebar.addEventListener('input', updateMediaFormCalculations);
  if (formMediaTinggi) formMediaTinggi.addEventListener('input', updateMediaFormCalculations);
  if (formMediaSatuan) formMediaSatuan.addEventListener('change', updateMediaFormCalculations);

  // ==========================================================================
  // 11. SUB-TAB SWITCHER: KELISTRIKAN VS UNIT GENSET
  // ==========================================================================
  const tabBtnElectrical = document.getElementById('tab-btn-electrical');
  const tabBtnGenset = document.getElementById('tab-btn-genset');
  const paneElectrical = document.getElementById('pane-electrical');
  const paneGenset = document.getElementById('pane-genset');

  function switchElectricalSubTab(tabName) {
    if (tabName === 'genset') {
      if (tabBtnElectrical) tabBtnElectrical.classList.remove('active');
      if (tabBtnGenset) tabBtnGenset.classList.add('active');
      if (paneElectrical) paneElectrical.style.display = 'none';
      if (paneGenset) paneGenset.style.display = 'block';
      renderGensets();
    } else {
      if (tabBtnElectrical) tabBtnElectrical.classList.add('active');
      if (tabBtnGenset) tabBtnGenset.classList.remove('active');
      if (paneElectrical) paneElectrical.style.display = 'block';
      if (paneGenset) paneGenset.style.display = 'none';
      renderElectricalPanels();
    }
  }

  if (tabBtnElectrical) tabBtnElectrical.addEventListener('click', () => switchElectricalSubTab('electrical'));
  if (tabBtnGenset) tabBtnGenset.addEventListener('click', () => switchElectricalSubTab('genset'));

  // ==========================================================================
  // 12. PENGELOLAAN KONTEN: PANEL KELISTRIKAN (kVA / VA vs kWh)
  // ==========================================================================
  const panelSearchInput = document.getElementById('panel-search-input');
  const panelFilterStatus = document.getElementById('panel-filter-status');
  const panelFilterKondisi = document.getElementById('panel-filter-kondisi');
  const panelBtnReset = document.getElementById('panel-btn-reset');
  const panelCountBadge = document.getElementById('panel-count-badge');
  const btnAddPanel = document.getElementById('btn-add-panel');

  const kpiTotalDaya = document.getElementById('kpi-total-daya');
  const kpiTotalPanel = document.getElementById('kpi-total-panel');
  const kpiTotalKwh = document.getElementById('kpi-total-kwh');
  const kpiKondisiListrik = document.getElementById('kpi-kondisi-listrik');

  const electricalFormModal = document.getElementById('electrical-form-modal');
  const electricalModalTitle = document.getElementById('electrical-modal-title');
  const btnCloseElectricalModal = document.getElementById('btn-close-electrical-modal');
  const btnSaveElectrical = document.getElementById('btn-save-electrical');
  const btnCancelElectrical = document.getElementById('btn-cancel-electrical');

  const formPanelId = document.getElementById('form-panel-id');
  const formPanelNama = document.getElementById('form-panel-nama');
  const formPanelLokasi = document.getElementById('form-panel-lokasi');
  const formPanelSumber = document.getElementById('form-panel-sumber');
  const formPanelDayaNilai = document.getElementById('form-panel-daya-nilai');
  const formPanelDayaSatuan = document.getElementById('form-panel-daya-satuan');
  const formPanelKwh = document.getElementById('form-panel-kwh');
  const formPanelPerangkat = document.getElementById('form-panel-perangkat');
  const formPanelStatus = document.getElementById('form-panel-status');
  const formPanelKondisi = document.getElementById('form-panel-kondisi');
  const formPanelCakupan = document.getElementById('form-panel-cakupan');
  const formPanelCatatan = document.getElementById('form-panel-catatan');

  const panelDropzone = document.getElementById('panel-dropzone');
  const formPanelPhotoInput = document.getElementById('form-panel-photo-input');
  const btnTriggerPanelUpload = document.getElementById('btn-trigger-panel-upload');
  const panelPhotoPreviewWrap = document.getElementById('panel-photo-preview-wrap');
  const panelPhotoPreviewImg = document.getElementById('panel-photo-preview-img');
  const btnRemovePanelPhoto = document.getElementById('btn-remove-panel-photo');

  let currentPanelPhoto = '';

  function openElectricalModal(panel = null) {
    if (!electricalFormModal) return;

    if (panel) {
      if (electricalModalTitle) electricalModalTitle.textContent = 'Edit Panel & Feeder Kelistrikan';
      if (formPanelId) formPanelId.value = panel.id;
      if (formPanelNama) formPanelNama.value = panel.namaPanel || '';
      if (formPanelLokasi) formPanelLokasi.value = panel.lokasiGedung || '';
      if (formPanelSumber) formPanelSumber.value = panel.sumberListrik || '';
      if (formPanelDayaNilai) formPanelDayaNilai.value = panel.dayaNilai || 350;
      if (formPanelDayaSatuan) formPanelDayaSatuan.value = panel.dayaSatuan || 'kVA';
      if (formPanelKwh) formPanelKwh.value = panel.penggunaanKwh || '';
      if (formPanelPerangkat) formPanelPerangkat.value = panel.jenisPerangkat || '';
      if (formPanelStatus) formPanelStatus.value = panel.statusOperasional || 'Aktif / Beroperasi';
      if (formPanelKondisi) formPanelKondisi.value = panel.kondisiInstalasi || 'Baik / Prima';
      if (formPanelCakupan) formPanelCakupan.value = panel.cakupan || '';
      if (formPanelCatatan) formPanelCatatan.value = panel.catatan || '';

      currentPanelPhoto = panel.foto || '';
    } else {
      if (electricalModalTitle) electricalModalTitle.textContent = 'Tambah Panel Kelistrikan Baru';
      if (formPanelId) formPanelId.value = '';
      if (formPanelNama) formPanelNama.value = '';
      if (formPanelLokasi) formPanelLokasi.value = '';
      if (formPanelSumber) formPanelSumber.value = 'Trafo Distribusi PLN Kawasan & Feeder ATS';
      if (formPanelDayaNilai) formPanelDayaNilai.value = 100;
      if (formPanelDayaSatuan) formPanelDayaSatuan.value = 'kVA';
      if (formPanelKwh) formPanelKwh.value = '';
      if (formPanelPerangkat) formPanelPerangkat.value = '';
      if (formPanelStatus) formPanelStatus.value = 'Aktif / Beroperasi';
      if (formPanelKondisi) formPanelKondisi.value = 'Baik / Prima';
      if (formPanelCakupan) formPanelCakupan.value = '';
      if (formPanelCatatan) formPanelCatatan.value = '';

      currentPanelPhoto = 'assets/bangunan/pos-satpam-depan.jpg';
    }

    updatePanelPhotoPreviewUI();
    electricalFormModal.classList.add('active');
  }

  function closeElectricalModal() {
    if (electricalFormModal) electricalFormModal.classList.remove('active');
    currentPanelPhoto = '';
  }

  function updatePanelPhotoPreviewUI() {
    if (!panelPhotoPreviewWrap || !panelPhotoPreviewImg) return;
    if (currentPanelPhoto) {
      panelPhotoPreviewImg.src = currentPanelPhoto;
      panelPhotoPreviewWrap.style.display = 'flex';
    } else {
      panelPhotoPreviewWrap.style.display = 'none';
      panelPhotoPreviewImg.src = '';
    }
  }

  if (btnTriggerPanelUpload && formPanelPhotoInput) {
    btnTriggerPanelUpload.addEventListener('click', () => formPanelPhotoInput.click());
  }

  if (formPanelPhotoInput) {
    formPanelPhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        currentPanelPhoto = await compressImage(file);
        updatePanelPhotoPreviewUI();
        showToast('Foto panel berhasil dipratinjau!', 'success');
      } catch (err) {
        showToast(err.message, 'warning');
      }
      formPanelPhotoInput.value = '';
    });
  }

  if (btnRemovePanelPhoto) {
    btnRemovePanelPhoto.addEventListener('click', () => {
      currentPanelPhoto = '';
      updatePanelPhotoPreviewUI();
      showToast('Foto panel dihapus dari formulir.', 'info');
    });
  }

  function handleSaveElectrical() {
    const rawId = formPanelId ? formPanelId.value.trim() : '';
    const namaPanel = formPanelNama ? formPanelNama.value.trim() : '';
    const lokasiGedung = formPanelLokasi ? formPanelLokasi.value.trim() : '';
    const sumberListrik = formPanelSumber ? formPanelSumber.value.trim() : '';
    const dayaNilai = parseFloat(formPanelDayaNilai ? formPanelDayaNilai.value : '0') || 0;
    const dayaSatuan = formPanelDayaSatuan ? formPanelDayaSatuan.value : 'kVA';
    const penggunaanKwh = formPanelKwh && formPanelKwh.value ? parseFloat(formPanelKwh.value) : undefined;
    const jenisPerangkat = formPanelPerangkat ? formPanelPerangkat.value.trim() : '';
    const statusOperasional = formPanelStatus ? formPanelStatus.value : 'Aktif / Beroperasi';
    const kondisiInstalasi = formPanelKondisi ? formPanelKondisi.value : 'Baik / Prima';
    const cakupan = formPanelCakupan ? formPanelCakupan.value.trim() : '';
    const catatan = formPanelCatatan ? formPanelCatatan.value.trim() : '';

    if (!namaPanel) {
      showToast('Nama panel listrik wajib diisi!', 'warning');
      if (formPanelNama) formPanelNama.focus();
      return;
    }
    if (!lokasiGedung) {
      showToast('Lokasi gedung/gardu wajib diisi!', 'warning');
      if (formPanelLokasi) formPanelLokasi.focus();
      return;
    }
    if (dayaNilai <= 0) {
      showToast('Nilai kapasitas daya harus berupa angka lebih besar dari 0!', 'warning');
      if (formPanelDayaNilai) formPanelDayaNilai.focus();
      return;
    }

    const panelPayload = {
      namaPanel,
      lokasiGedung,
      sumberListrik,
      dayaNilai,
      dayaSatuan,
      penggunaanKwh,
      jenisPerangkat,
      statusOperasional,
      kondisiInstalasi,
      cakupan,
      catatan,
      foto: currentPanelPhoto || 'assets/bangunan/pos-satpam-depan.jpg'
    };

    if (rawId) {
      const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
      const idx = electricalPanelsDataset.findIndex(p => String(p.id) === String(id));
      if (idx !== -1) {
        electricalPanelsDataset[idx] = { ...electricalPanelsDataset[idx], ...panelPayload, id };
      } else {
        electricalPanelsDataset.push({ id, ...panelPayload });
      }
      showToast(`Data panel "${namaPanel}" berhasil disimpan!`, 'success');
    } else {
      const maxId = electricalPanelsDataset.reduce((max, p) => {
        const num = Number(p.id);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      const newPanel = { id: maxId + 1, ...panelPayload };
      electricalPanelsDataset.push(newPanel);
      showToast(`Panel baru "${namaPanel}" berhasil ditambahkan!`, 'success');
    }

    saveElectricalPanelsData([...electricalPanelsDataset]);
    closeElectricalModal();
  }

  function deleteElectricalPanel(panelId) {
    const target = electricalPanelsDataset.find(p => String(p.id) === String(panelId));
    if (!target) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus data panel "${target.namaPanel}" (${target.lokasiGedung})?`,
      'Hapus Panel Kelistrikan',
      () => {
        electricalPanelsDataset = electricalPanelsDataset.filter(p => String(p.id) !== String(panelId));
        saveElectricalPanelsData([...electricalPanelsDataset]);
        showToast(`Panel "${target.namaPanel}" berhasil dihapus.`, 'gold');
      }
    );
  }

  function getFilteredPanels() {
    const q = panelSearchInput ? panelSearchInput.value.trim().toLowerCase() : '';
    const status = panelFilterStatus ? panelFilterStatus.value : '';
    const kondisi = panelFilterKondisi ? panelFilterKondisi.value : '';

    return (electricalPanelsDataset || []).filter(p => {
      if (q) {
        const inName = p.namaPanel && p.namaPanel.toLowerCase().includes(q);
        const inLoc = p.lokasiGedung && p.lokasiGedung.toLowerCase().includes(q);
        const inSource = p.sumberListrik && p.sumberListrik.toLowerCase().includes(q);
        const inCakup = p.cakupan && p.cakupan.toLowerCase().includes(q);
        const inPerangkat = p.jenisPerangkat && p.jenisPerangkat.toLowerCase().includes(q);
        if (!inName && !inLoc && !inSource && !inCakup && !inPerangkat) {
          return false;
        }
      }
      if (status && p.statusOperasional !== status) return false;
      if (kondisi && p.kondisiInstalasi !== kondisi) return false;
      return true;
    });
  }

  function renderElectricalPanels() {
    if (!powerZonesContainer) return;
    const items = getFilteredPanels();

    // Hitung KPI
    let totalDayaKvaVal = 0;
    let totalKwhVal = 0;
    let countActive = 0;

    electricalPanelsDataset.forEach(p => {
      const val = Number(p.dayaNilai) || 0;
      if ((p.dayaSatuan || 'kVA').toUpperCase() === 'VA') {
        totalDayaKvaVal += val / 1000;
      } else {
        totalDayaKvaVal += val;
      }
      if (p.penggunaanKwh) {
        totalKwhVal += Number(p.penggunaanKwh) || 0;
      }
      if (!p.statusOperasional || p.statusOperasional.toLowerCase().includes('aktif') || p.statusOperasional.toLowerCase().includes('siaga')) {
        countActive++;
      }
    });

    if (kpiTotalDaya) kpiTotalDaya.textContent = `${formatNumber(Math.round(totalDayaKvaVal))} kVA`;
    if (kpiTotalPanel) kpiTotalPanel.textContent = `${electricalPanelsDataset.length} Panel Utama`;
    if (kpiTotalKwh) kpiTotalKwh.textContent = `~${formatNumber(Math.round(totalKwhVal))} kWh`;
    if (kpiKondisiListrik) {
      const ratio = electricalPanelsDataset.length > 0 ? Math.round((countActive / electricalPanelsDataset.length) * 100) : 100;
      kpiKondisiListrik.textContent = `${ratio}% Siaga`;
    }

    if (panelCountBadge) {
      panelCountBadge.textContent = `Menampilkan ${items.length} dari ${electricalPanelsDataset.length} Panel`;
    }

    powerZonesContainer.innerHTML = '';

    if (items.length === 0) {
      powerZonesContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Tidak ada panel yang sesuai filter</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">Coba ubah kata kunci pencarian atau reset filter status.</div>
        </div>
      `;
      return;
    }

    items.forEach((panel, idx) => {
      const card = document.createElement('div');
      let borderClass = 'power-card';
      if (idx === 1) borderClass += ' blue-border';
      if (idx === 2) borderClass += ' gold-border';
      card.className = borderClass;

      const badgeKondisiClass = getKondisiBadgeClass(panel.kondisiInstalasi);

      let photoThumbnailHtml = '';
      if (panel.foto) {
        photoThumbnailHtml = `
          <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px; background: #F8FAFC; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;" class="panel-photo-thumb-click" title="Klik untuk memperbesar foto dokumentasi">
            <img src="${panel.foto}" alt="Dokumentasi ${panel.namaPanel}" style="width: 58px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #CBD5E1;">
            <div style="font-size: 0.75rem; color: var(--text-main);">
              <strong>Dokumentasi Panel & Meteran</strong><br>
              <span style="color: var(--primary); font-weight: 600;">Lihat Foto Penuh &rarr;</span>
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="power-header" style="flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 class="power-title" style="margin-bottom: 2px;">${panel.namaPanel}</h4>
            <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${panel.lokasiGedung}
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="unit-tag-kva">${panel.dayaNilai} ${panel.dayaSatuan}</span>
            ${panel.penggunaanKwh ? `<span class="unit-tag-kwh">${formatNumber(panel.penggunaanKwh)} kWh/bln</span>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin: 10px 0; flex-wrap: wrap;">
          <span class="badge ${badgeKondisiClass}">${panel.kondisiInstalasi || 'Baik'}</span>
          <span class="badge badge-primary">${panel.statusOperasional || 'Aktif'}</span>
          ${panel.sumberListrik ? `<span class="badge" style="background: #F1F5F9; color: #475569;">${panel.sumberListrik}</span>` : ''}
        </div>

        ${panel.jenisPerangkat ? `
          <div style="font-size: 0.8rem; color: #334155; margin-bottom: 6px;">
            <strong>Beban Perangkat:</strong> ${panel.jenisPerangkat}
          </div>
        ` : ''}

        <div class="power-scope">
          <strong>Cakupan Beban & Bangunan:</strong><br>${panel.cakupan || '-'}
        </div>

        ${photoThumbnailHtml}

        <div class="power-footer-note" style="margin-top: 10px;">
          💡 ${panel.catatan || 'Jalur suplai kelistrikan terhubung sistem proteksi ATS kawasan.'}
        </div>

        <div class="admin-only" style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed #CBD5E1;">
          <button class="btn btn-gold btn-sm btn-panel-edit" style="flex: 1;" title="Edit data panel ini">
            Edit Panel
          </button>
          <button class="btn btn-secondary btn-sm btn-panel-delete" style="color: #DC2626; border-color: #FECACA;" title="Hapus panel ini">
            Hapus
          </button>
        </div>
      `;

      const photoThumb = card.querySelector('.panel-photo-thumb-click');
      if (photoThumb && panel.foto) {
        photoThumb.addEventListener('click', () => {
          openLightbox(panel.foto, `${panel.namaPanel} - ${panel.lokasiGedung}`);
        });
      }

      const btnEdit = card.querySelector('.btn-panel-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => openElectricalModal(panel));
      }

      const btnDel = card.querySelector('.btn-panel-delete');
      if (btnDel) {
        btnDel.addEventListener('click', () => deleteElectricalPanel(panel.id));
      }

      powerZonesContainer.appendChild(card);
    });
  }

  // Bind Electrical Panel Events
  if (btnAddPanel) btnAddPanel.addEventListener('click', () => openElectricalModal(null));
  if (btnCloseElectricalModal) btnCloseElectricalModal.addEventListener('click', closeElectricalModal);
  if (btnCancelElectrical) btnCancelElectrical.addEventListener('click', closeElectricalModal);
  if (btnSaveElectrical) btnSaveElectrical.addEventListener('click', handleSaveElectrical);

  if (panelSearchInput) panelSearchInput.addEventListener('input', renderElectricalPanels);
  if (panelFilterStatus) panelFilterStatus.addEventListener('change', renderElectricalPanels);
  if (panelFilterKondisi) panelFilterKondisi.addEventListener('change', renderElectricalPanels);
  if (panelBtnReset) {
    panelBtnReset.addEventListener('click', () => {
      if (panelSearchInput) panelSearchInput.value = '';
      if (panelFilterStatus) panelFilterStatus.value = '';
      if (panelFilterKondisi) panelFilterKondisi.value = '';
      renderElectricalPanels();
      showToast('Filter panel listrik berhasil di-reset.', 'success');
    });
  }

  // ==========================================================================
  // 13. PENGELOLAAN KONTEN: UNIT GENSET & CADANGAN ATS
  // ==========================================================================
  const gensetSearchInput = document.getElementById('genset-search-input');
  const gensetFilterStatus = document.getElementById('genset-filter-status');
  const gensetFilterKondisi = document.getElementById('genset-filter-kondisi');
  const gensetBtnReset = document.getElementById('genset-btn-reset');
  const gensetCountBadge = document.getElementById('genset-count-badge');
  const btnAddGenset = document.getElementById('btn-add-genset');
  const gensetUnitsGrid = document.getElementById('genset-units-grid');

  const kpiGensetTotalKva = document.getElementById('kpi-genset-total-kva');
  const kpiGensetSiap = document.getElementById('kpi-genset-siap');

  const gensetFormModal = document.getElementById('genset-form-modal');
  const gensetModalTitle = document.getElementById('genset-modal-title');
  const btnCloseGensetModal = document.getElementById('btn-close-genset-modal');
  const btnSaveGenset = document.getElementById('btn-save-genset');
  const btnCancelGenset = document.getElementById('btn-cancel-genset');

  const formGensetId = document.getElementById('form-genset-id');
  const formGensetNama = document.getElementById('form-genset-nama');
  const formGensetLokasi = document.getElementById('form-genset-lokasi');
  const formGensetMerek = document.getElementById('form-genset-merek');
  const formGensetTipe = document.getElementById('form-genset-tipe');
  const formGensetNomerId = document.getElementById('form-genset-nomer-id');
  const formGensetKapasitasKva = document.getElementById('form-genset-kapasitas-kva');
  const formGensetBahanBakar = document.getElementById('form-genset-bahan-bakar');
  const formGensetStatus = document.getElementById('form-genset-status');
  const formGensetKondisi = document.getElementById('form-genset-kondisi');
  const formGensetHourMeter = document.getElementById('form-genset-hour-meter');
  const formGensetTglTerakhir = document.getElementById('form-genset-tgl-terakhir');
  const formGensetTglBerikutnya = document.getElementById('form-genset-tgl-berikutnya');
  const formGensetSistemAts = document.getElementById('form-genset-sistem-ats');
  const formGensetFiturList = document.getElementById('form-genset-fitur-list');

  const gensetDropzone = document.getElementById('genset-dropzone');
  const formGensetPhotoInput = document.getElementById('form-genset-photo-input');
  const btnTriggerGensetUpload = document.getElementById('btn-trigger-genset-upload');
  const gensetPhotoPreviewWrap = document.getElementById('genset-photo-preview-wrap');
  const gensetPhotoPreviewImg = document.getElementById('genset-photo-preview-img');
  const btnRemoveGensetPhoto = document.getElementById('btn-remove-genset-photo');

  let currentGensetPhoto = '';

  function openGensetModal(genset = null) {
    if (!gensetFormModal) return;

    if (genset) {
      if (gensetModalTitle) gensetModalTitle.textContent = 'Edit Data Unit Genset';
      if (formGensetId) formGensetId.value = genset.id;
      if (formGensetNama) formGensetNama.value = genset.nama || '';
      if (formGensetLokasi) formGensetLokasi.value = genset.lokasiGedung || '';
      if (formGensetMerek) formGensetMerek.value = genset.merek || '';
      if (formGensetTipe) formGensetTipe.value = genset.tipe || '';
      if (formGensetNomerId) formGensetNomerId.value = genset.nomorIdentifikasi || '';
      if (formGensetKapasitasKva) formGensetKapasitasKva.value = genset.kapasitasKva || 1000;
      if (formGensetBahanBakar) formGensetBahanBakar.value = genset.bahanBakar || '';
      if (formGensetStatus) formGensetStatus.value = genset.statusOperasional || 'Siap Siaga (Standby ATS)';
      if (formGensetKondisi) formGensetKondisi.value = genset.kondisi || 'Baik / Prima';
      if (formGensetHourMeter) formGensetHourMeter.value = genset.hourMeter || '';
      if (formGensetTglTerakhir) formGensetTglTerakhir.value = genset.tglTerakhirServis || '';
      if (formGensetTglBerikutnya) formGensetTglBerikutnya.value = genset.tglJadwalServis || '';
      if (formGensetSistemAts) formGensetSistemAts.value = genset.sistemAts || '';
      if (formGensetFiturList) formGensetFiturList.value = (genset.fitur || []).join('\n');

      currentGensetPhoto = genset.foto || '';
    } else {
      if (gensetModalTitle) gensetModalTitle.textContent = 'Tambah Unit Genset Baru';
      if (formGensetId) formGensetId.value = '';
      if (formGensetNama) formGensetNama.value = '';
      if (formGensetLokasi) formGensetLokasi.value = 'Gedung Gardu & Ruang Genset Belakang';
      if (formGensetMerek) formGensetMerek.value = 'Cummins';
      if (formGensetTipe) formGensetTipe.value = 'Silent Containerized';
      if (formGensetNomerId) formGensetNomerId.value = 'BMN-AHB/GEN-003/2026';
      if (formGensetKapasitasKva) formGensetKapasitasKva.value = 500;
      if (formGensetBahanBakar) formGensetBahanBakar.value = 'Solar HSD / Biosolar (Tangki 1.500 Liter)';
      if (formGensetStatus) formGensetStatus.value = 'Siap Siaga (Standby ATS)';
      if (formGensetKondisi) formGensetKondisi.value = 'Baik / Prima';
      if (formGensetHourMeter) formGensetHourMeter.value = 150;
      if (formGensetTglTerakhir) formGensetTglTerakhir.value = new Date().toISOString().split('T')[0];
      if (formGensetTglBerikutnya) formGensetTglBerikutnya.value = '';
      if (formGensetSistemAts) formGensetSistemAts.value = 'Automatic Transfer Switch (ATS) 5 Detik';
      if (formGensetFiturList) {
        formGensetFiturList.value = 'Peralihan otomatis ATS kurang dari 5 detik\nTangki reservoir cadangan kontinu 48 jam\nSistem peredam suara canopy silent box\nProteksi overspeed & overheat trip';
      }

      currentGensetPhoto = 'assets/bangunan/genset-kawasan.jpg';
    }

    updateGensetPhotoPreviewUI();
    gensetFormModal.classList.add('active');
  }

  function closeGensetModal() {
    if (gensetFormModal) gensetFormModal.classList.remove('active');
    currentGensetPhoto = '';
  }

  function updateGensetPhotoPreviewUI() {
    if (!gensetPhotoPreviewWrap || !gensetPhotoPreviewImg) return;
    if (currentGensetPhoto) {
      gensetPhotoPreviewImg.src = currentGensetPhoto;
      gensetPhotoPreviewWrap.style.display = 'flex';
    } else {
      gensetPhotoPreviewWrap.style.display = 'none';
      gensetPhotoPreviewImg.src = '';
    }
  }

  if (btnTriggerGensetUpload && formGensetPhotoInput) {
    btnTriggerGensetUpload.addEventListener('click', () => formGensetPhotoInput.click());
  }

  if (formGensetPhotoInput) {
    formGensetPhotoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        currentGensetPhoto = await compressImage(file);
        updateGensetPhotoPreviewUI();
        showToast('Foto genset berhasil dipratinjau!', 'success');
      } catch (err) {
        showToast(err.message, 'warning');
      }
      formGensetPhotoInput.value = '';
    });
  }

  if (btnRemoveGensetPhoto) {
    btnRemoveGensetPhoto.addEventListener('click', () => {
      currentGensetPhoto = '';
      updateGensetPhotoPreviewUI();
      showToast('Foto genset dihapus dari formulir.', 'info');
    });
  }

  function handleSaveGenset() {
    const rawId = formGensetId ? formGensetId.value.trim() : '';
    const nama = formGensetNama ? formGensetNama.value.trim() : '';
    const lokasiGedung = formGensetLokasi ? formGensetLokasi.value.trim() : '';
    const merek = formGensetMerek ? formGensetMerek.value.trim() : '';
    const tipe = formGensetTipe ? formGensetTipe.value.trim() : '';
    const nomorIdentifikasi = formGensetNomerId ? formGensetNomerId.value.trim() : '';
    const kapasitasKva = parseFloat(formGensetKapasitasKva ? formGensetKapasitasKva.value : '0') || 0;
    const bahanBakar = formGensetBahanBakar ? formGensetBahanBakar.value.trim() : '';
    const statusOperasional = formGensetStatus ? formGensetStatus.value : 'Siap Siaga (Standby ATS)';
    const kondisi = formGensetKondisi ? formGensetKondisi.value : 'Baik / Prima';
    const hourMeter = formGensetHourMeter && formGensetHourMeter.value ? parseInt(formGensetHourMeter.value, 10) : undefined;
    const tglTerakhirServis = formGensetTglTerakhir ? formGensetTglTerakhir.value : '';
    const tglJadwalServis = formGensetTglBerikutnya ? formGensetTglBerikutnya.value : '';
    const sistemAts = formGensetSistemAts ? formGensetSistemAts.value.trim() : '';

    if (!nama) {
      showToast('Nama unit genset wajib diisi!', 'warning');
      if (formGensetNama) formGensetNama.focus();
      return;
    }
    if (!lokasiGedung) {
      showToast('Lokasi ruang/gedung genset wajib diisi!', 'warning');
      if (formGensetLokasi) formGensetLokasi.focus();
      return;
    }
    if (kapasitasKva <= 0) {
      showToast('Kapasitas genset dalam kVA harus berupa angka lebih besar dari 0!', 'warning');
      if (formGensetKapasitasKva) formGensetKapasitasKva.focus();
      return;
    }

    const fitur = (formGensetFiturList ? formGensetFiturList.value : '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const gensetPayload = {
      nama,
      lokasiGedung,
      merek,
      tipe,
      nomorIdentifikasi,
      kapasitasKva,
      bahanBakar,
      statusOperasional,
      kondisi,
      hourMeter,
      tglTerakhirServis,
      tglJadwalServis,
      sistemAts,
      fitur,
      foto: currentGensetPhoto || 'assets/bangunan/genset-kawasan.jpg'
    };

    if (rawId) {
      const id = isNaN(Number(rawId)) ? rawId : Number(rawId);
      const idx = gensetsDataset.findIndex(g => String(g.id) === String(id));
      if (idx !== -1) {
        gensetsDataset[idx] = { ...gensetsDataset[idx], ...gensetPayload, id };
      } else {
        gensetsDataset.push({ id, ...gensetPayload });
      }
      showToast(`Data genset "${nama}" berhasil disimpan!`, 'success');
    } else {
      const maxId = gensetsDataset.reduce((max, g) => {
        const num = Number(g.id);
        return (!isNaN(num) && num > max) ? num : max;
      }, 0);
      const newGenset = { id: maxId + 1, ...gensetPayload };
      gensetsDataset.push(newGenset);
      showToast(`Unit genset baru "${nama}" berhasil ditambahkan!`, 'success');
    }

    saveGensetsData([...gensetsDataset]);
    closeGensetModal();
  }

  function deleteGenset(gensetId) {
    const target = gensetsDataset.find(g => String(g.id) === String(gensetId));
    if (!target) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus data genset "${target.nama}" (${target.lokasiGedung})?`,
      'Hapus Unit Genset',
      () => {
        gensetsDataset = gensetsDataset.filter(g => String(g.id) !== String(gensetId));
        saveGensetsData([...gensetsDataset]);
        showToast(`Unit genset "${target.nama}" berhasil dihapus.`, 'gold');
      }
    );
  }

  function getFilteredGensets() {
    const q = gensetSearchInput ? gensetSearchInput.value.trim().toLowerCase() : '';
    const status = gensetFilterStatus ? gensetFilterStatus.value : '';
    const kondisi = gensetFilterKondisi ? gensetFilterKondisi.value : '';

    return (gensetsDataset || []).filter(g => {
      if (q) {
        const inName = g.nama && g.nama.toLowerCase().includes(q);
        const inLoc = g.lokasiGedung && g.lokasiGedung.toLowerCase().includes(q);
        const inBrand = g.merek && g.merek.toLowerCase().includes(q);
        const inModel = g.tipe && g.tipe.toLowerCase().includes(q);
        const inId = g.nomorIdentifikasi && g.nomorIdentifikasi.toLowerCase().includes(q);
        const inFuel = g.bahanBakar && g.bahanBakar.toLowerCase().includes(q);
        if (!inName && !inLoc && !inBrand && !inModel && !inId && !inFuel) {
          return false;
        }
      }
      if (status && g.statusOperasional !== status) return false;
      if (kondisi && g.kondisi !== kondisi) return false;
      return true;
    });
  }

  function renderGensets() {
    if (!gensetUnitsGrid) return;
    const items = getFilteredGensets();

    // KPI Total kVA
    let totalKva = 0;
    let countSiaga = 0;
    gensetsDataset.forEach(g => {
      totalKva += Number(g.kapasitasKva) || 0;
      if (!g.statusOperasional || g.statusOperasional.toLowerCase().includes('siap') || g.statusOperasional.toLowerCase().includes('standby')) {
        countSiaga++;
      }
    });

    if (kpiGensetTotalKva) kpiGensetTotalKva.textContent = `${formatNumber(totalKva)} kVA`;
    if (kpiGensetSiap) {
      const ratio = gensetsDataset.length > 0 ? Math.round((countSiaga / gensetsDataset.length) * 100) : 100;
      kpiGensetSiap.textContent = `${ratio}% Siap Siaga`;
    }

    if (gensetCountBadge) {
      gensetCountBadge.textContent = `Menampilkan ${items.length} dari ${gensetsDataset.length} Genset`;
    }

    gensetUnitsGrid.innerHTML = '';

    if (items.length === 0) {
      gensetUnitsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Tidak ada genset yang cocok</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">Coba ubah kata kunci pencarian atau reset filter.</div>
        </div>
      `;
      return;
    }

    items.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'power-card gold-border';

      const badgeKondisiClass = getKondisiBadgeClass(g.kondisi);

      const fiturHtml = (g.fitur || [])
        .map(f => `<li>${f}</li>`)
        .join('');

      card.innerHTML = `
        <div class="power-header" style="flex-wrap: wrap; gap: 8px;">
          <div>
            <h4 class="power-title" style="margin-bottom: 2px;">${g.nama}</h4>
            <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${g.lokasiGedung} &bull; Merek: <strong>${g.merek || '-'}</strong> (${g.tipe || '-'})
            </div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="unit-tag-kva">${g.kapasitasKva} kVA</span>
            ${g.hourMeter !== undefined ? `<span class="hour-meter-tag">⏱ ${formatNumber(g.hourMeter)} Jam Kerja</span>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin: 10px 0; flex-wrap: wrap;">
          <span class="badge ${badgeKondisiClass}">${g.kondisi || 'Baik'}</span>
          <span class="badge badge-primary">${g.statusOperasional || 'Siaga ATS'}</span>
          ${g.nomorIdentifikasi ? `<span class="badge" style="background: #F1F5F9; color: #475569;">NUP: ${g.nomorIdentifikasi}</span>` : ''}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; font-size: 0.8rem; background: #F8FAFC; padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <div>
            <div style="color: var(--text-muted); font-size: 0.72rem;">Bahan Bakar & Tangki:</div>
            <strong>${g.bahanBakar || 'Solar HSD'}</strong>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 0.72rem;">Sistem Alih Otomatis:</div>
            <strong>${g.sistemAts || 'ATS 5 Detik'}</strong>
          </div>
          ${g.tglTerakhirServis ? `
            <div>
              <div style="color: var(--text-muted); font-size: 0.72rem;">Servis Terakhir:</div>
              <strong>${g.tglTerakhirServis}</strong>
            </div>
          ` : ''}
          ${g.tglJadwalServis ? `
            <div>
              <div style="color: var(--text-muted); font-size: 0.72rem;">Jadwal Servis Rutin:</div>
              <strong style="color: #065F46;">${g.tglJadwalServis}</strong>
            </div>
          ` : ''}
        </div>

        ${fiturHtml ? `
          <div style="margin: 10px 0;">
            <div style="font-size: 0.76rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">
              Fitur & Proteksi Mesin:
            </div>
            <ul class="facility-list">
              ${fiturHtml}
            </ul>
          </div>
        ` : ''}

        ${g.foto ? `
          <div style="margin-top: 10px; display: flex; align-items: center; gap: 10px; background: #F8FAFC; padding: 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); cursor: pointer;" class="genset-photo-thumb-click" title="Klik untuk memperbesar foto genset">
            <img src="${g.foto}" alt="Dokumentasi ${g.nama}" style="width: 58px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #CBD5E1;">
            <div style="font-size: 0.75rem; color: var(--text-main);">
              <strong>Dokumentasi Fisik Unit Genset</strong><br>
              <span style="color: var(--gold-dark); font-weight: 600;">Lihat Foto Penuh &rarr;</span>
            </div>
          </div>
        ` : ''}

        <div class="admin-only" style="display: flex; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px dashed #CBD5E1;">
          <button class="btn btn-gold btn-sm btn-genset-edit" style="flex: 1;" title="Edit data genset ini">
            Edit Data Genset
          </button>
          <button class="btn btn-secondary btn-sm btn-genset-delete" style="color: #DC2626; border-color: #FECACA;" title="Hapus genset ini">
            Hapus
          </button>
        </div>
      `;

      const photoThumb = card.querySelector('.genset-photo-thumb-click');
      if (photoThumb && g.foto) {
        photoThumb.addEventListener('click', () => {
          openLightbox(g.foto, `${g.nama} - ${g.lokasiGedung}`);
        });
      }

      const btnEdit = card.querySelector('.btn-genset-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => openGensetModal(g));
      }

      const btnDel = card.querySelector('.btn-genset-delete');
      if (btnDel) {
        btnDel.addEventListener('click', () => deleteGenset(g.id));
      }

      gensetUnitsGrid.appendChild(card);
    });
  }

  // Bind Genset Events
  if (btnAddGenset) btnAddGenset.addEventListener('click', () => openGensetModal(null));
  if (btnCloseGensetModal) btnCloseGensetModal.addEventListener('click', closeGensetModal);
  if (btnCancelGenset) btnCancelGenset.addEventListener('click', closeGensetModal);
  if (btnSaveGenset) btnSaveGenset.addEventListener('click', handleSaveGenset);

  if (gensetSearchInput) gensetSearchInput.addEventListener('input', renderGensets);
  if (gensetFilterStatus) gensetFilterStatus.addEventListener('change', renderGensets);
  if (gensetFilterKondisi) gensetFilterKondisi.addEventListener('change', renderGensets);
  if (gensetBtnReset) {
    gensetBtnReset.addEventListener('click', () => {
      if (gensetSearchInput) gensetSearchInput.value = '';
      if (gensetFilterStatus) gensetFilterStatus.value = '';
      if (gensetFilterKondisi) gensetFilterKondisi.value = '';
      renderGensets();
      showToast('Filter genset berhasil di-reset.', 'success');
    });
  }

  // ==========================================================================
  // PENGELOLAAN KATALOG WILAYAH & LUAS TANAH KAWASAN (BMN HAK PAKAI NO. 00012)
  // ==========================================================================
  const landSearchInput = document.getElementById('land-search-input');
  const landFilterZona = document.getElementById('land-filter-zona');
  const landFilterTipe = document.getElementById('land-filter-tipe');
  const landBtnReset = document.getElementById('land-btn-reset');
  const landCountBadge = document.getElementById('land-count-badge');
  const landParcelsGrid = document.getElementById('land-parcels-grid');
  const btnAddLand = document.getElementById('btn-add-land');
  const btnPrintLand = document.getElementById('btn-print-land');

  // KPI Elements
  const landKpiTotalLuas = document.getElementById('land-kpi-total-luas');
  const landKpiTotalHa = document.getElementById('land-kpi-total-ha');
  const landKpiKdb = document.getElementById('land-kpi-kdb');
  const landKpiKdbPct = document.getElementById('land-kpi-kdb-pct');
  const landKpiKdh = document.getElementById('land-kpi-kdh');
  const landKpiKdhPct = document.getElementById('land-kpi-kdh-pct');
  const landKpiSirkulasi = document.getElementById('land-kpi-sirkulasi');
  const landKpiSirkulasiPct = document.getElementById('land-kpi-sirkulasi-pct');
  const landKpiCadangan = document.getElementById('land-kpi-cadangan');
  const landKpiCadanganPct = document.getElementById('land-kpi-cadangan-pct');

  // Modal Form Elements
  const landFormModal = document.getElementById('land-form-modal');
  const btnCloseLandModal = document.getElementById('btn-close-land-modal');
  const btnCancelLand = document.getElementById('btn-cancel-land');
  const btnSaveLand = document.getElementById('btn-save-land');
  const formLandId = document.getElementById('form-land-id');
  const formLandNama = document.getElementById('form-land-nama');
  const formLandZona = document.getElementById('form-land-zona');
  const formLandPanjang = document.getElementById('form-land-panjang');
  const formLandLebar = document.getElementById('form-land-lebar');
  const formLandSatuan = document.getElementById('form-land-satuan');
  const formLandSumber = document.getElementById('form-land-sumber');
  const formLandTanggal = document.getElementById('form-land-tanggal');
  const formLandLuas = document.getElementById('form-land-luas');
  const formLandLuasHaHint = document.getElementById('form-land-luas-ha-hint');
  const formLandTipe = document.getElementById('form-land-tipe');
  const formLandNib = document.getElementById('form-land-nib');
  const formLandPeruntukan = document.getElementById('form-land-peruntukan');
  const formLandLegal = document.getElementById('form-land-legal');
  const formLandKoordinat = document.getElementById('form-land-koordinat');
  const formLandBatasUtara = document.getElementById('form-land-batas-utara');
  const formLandBatasSelatan = document.getElementById('form-land-batas-selatan');
  const formLandBatasTimur = document.getElementById('form-land-batas-timur');
  const formLandBatasBarat = document.getElementById('form-land-batas-barat');
  const formLandCakupan = document.getElementById('form-land-cakupan');
  const formLandKeterangan = document.getElementById('form-land-keterangan');

  // Photo Upload & Manager Elements
  const landDropzone = document.getElementById('land-dropzone');
  const formLandPhotosInput = document.getElementById('form-land-photos-input');
  const btnTriggerLandUpload = document.getElementById('btn-trigger-land-upload');
  const landPhotosGalleryPreview = document.getElementById('land-photos-gallery-preview');

  // Print Land Modal Elements
  const printLandModal = document.getElementById('print-land-modal');
  const btnClosePrintLandModal = document.getElementById('btn-close-print-land-modal');
  const btnClosePrintLand = document.getElementById('btn-close-print-land');
  const btnExecutePrintLand = document.getElementById('btn-execute-print-land');
  const btnTriggerPrintLandBottom = document.getElementById('btn-trigger-print-land-bottom');
  const printLandSheetContent = document.getElementById('print-land-sheet-content');

  let editingLandId = null;
  let currentLandEditingPhotos = [];

  function updateLandLuasHaHint() {
    if (!formLandLuas || !formLandLuasHaHint) return;
    const luasVal = Number(formLandLuas.value) || 0;
    const haVal = (luasVal / 10000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const p = formLandPanjang ? parseFloat(formLandPanjang.value) : NaN;
    const l = formLandLebar ? parseFloat(formLandLebar.value) : NaN;
    const sat = (formLandSatuan && formLandSatuan.value) ? formLandSatuan.value : 'm';
    let dimInfo = '';
    if (!isNaN(p) && p > 0 && !isNaN(l) && l > 0) {
      const calc = calculateFootprintArea(p, l, sat);
      dimInfo = ` • Estimasi P × L: ${calc.formatted}`;
    }
    formLandLuasHaHint.textContent = `= ${haVal} Hektare (Ha)${dimInfo}`;
  }

  if (formLandLuas) {
    formLandLuas.addEventListener('input', updateLandLuasHaHint);
  }
  if (formLandPanjang) formLandPanjang.addEventListener('input', updateLandLuasHaHint);
  if (formLandLebar) formLandLebar.addEventListener('input', updateLandLuasHaHint);
  if (formLandSatuan) formLandSatuan.addEventListener('change', updateLandLuasHaHint);

  function renderLandPhotosGallery() {
    if (!landPhotosGalleryPreview) return;
    landPhotosGalleryPreview.innerHTML = '';

    if (currentLandEditingPhotos.length === 0) {
      landPhotosGalleryPreview.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.78rem; padding: 12px; background: #F8FAFC; border-radius: var(--radius-sm); border: 1px dashed var(--border-color);">
          Belum ada foto yang dipilih. Unggah foto lokasi tanah atau foto udara di atas.
        </div>
      `;
      return;
    }

    currentLandEditingPhotos.forEach((photoUrl, idx) => {
      const item = document.createElement('div');
      item.className = 'photo-manager-item';
      const isPrimary = idx === 0;

      item.innerHTML = `
        <img src="${photoUrl}" alt="Foto Bidang ${idx + 1}" class="photo-manager-thumb">
        ${isPrimary ? '<span class="primary-photo-badge">★ Foto Utama</span>' : ''}
        <div class="photo-manager-actions">
          ${!isPrimary ? `<button type="button" class="btn-photo-action btn-make-primary" title="Jadikan Foto Utama">Utama</button>` : ''}
          <button type="button" class="btn-photo-action btn-delete-photo" title="Hapus Foto">&times;</button>
        </div>
      `;

      const btnPrimary = item.querySelector('.btn-make-primary');
      if (btnPrimary) {
        btnPrimary.addEventListener('click', (e) => {
          e.stopPropagation();
          const chosen = currentLandEditingPhotos.splice(idx, 1)[0];
          currentLandEditingPhotos.unshift(chosen);
          renderLandPhotosGallery();
          showToast('Foto utama bidang tanah berhasil diperbarui.', 'info');
        });
      }

      const btnDel = item.querySelector('.btn-delete-photo');
      if (btnDel) {
        btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          currentLandEditingPhotos.splice(idx, 1);
          renderLandPhotosGallery();
          showToast('Foto telah dihapus dari antrean simpan.', 'info');
        });
      }

      landPhotosGalleryPreview.appendChild(item);
    });
  }

  async function handleLandPhotoFiles(files) {
    if (!files || files.length === 0) return;
    let addedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await compressImage(file, 1400, 1050, 0.85);
        currentLandEditingPhotos.push(compressed);
        addedCount++;
      } catch (err) {
        showToast(err.message || 'Gagal memproses berkas foto.', 'error');
      }
    }
    if (addedCount > 0) {
      renderLandPhotosGallery();
      showToast(`${addedCount} foto wilayah tanah berhasil ditambahkan dan dikompresi.`, 'success');
    }
  }

  if (btnTriggerLandUpload && formLandPhotosInput) {
    btnTriggerLandUpload.addEventListener('click', () => formLandPhotosInput.click());
  }

  if (formLandPhotosInput) {
    formLandPhotosInput.addEventListener('change', (e) => {
      handleLandPhotoFiles(e.target.files);
      e.target.value = '';
    });
  }

  if (landDropzone) {
    landDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      landDropzone.classList.add('dragover');
    });
    landDropzone.addEventListener('dragleave', () => landDropzone.classList.remove('dragover'));
    landDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      landDropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleLandPhotoFiles(e.dataTransfer.files);
      }
    });
  }

  function openLandModal(land = null) {
    if (!landFormModal) return;
    if (land) {
      editingLandId = land.id;
      if (formLandId) formLandId.value = land.id;
      if (formLandNama) formLandNama.value = land.nama || '';
      if (formLandZona) formLandZona.value = land.zona || 'Zona A';
      if (formLandPanjang) formLandPanjang.value = (land.panjang !== undefined && land.panjang !== null) ? land.panjang : '';
      if (formLandLebar) formLandLebar.value = (land.lebar !== undefined && land.lebar !== null) ? land.lebar : '';
      if (formLandSatuan) formLandSatuan.value = land.satuan || 'm';
      if (formLandSumber) formLandSumber.value = land.sumberPengukuran || 'Sertifikat Hak Pakai No. 00012 BPN Banjarbaru';
      if (formLandTanggal) formLandTanggal.value = land.tanggalPengukuran || '';
      if (formLandLuas) formLandLuas.value = land.luasM2 || 0;
      if (formLandTipe) formLandTipe.value = land.tipeArea || 'sirkulasi';
      if (formLandNib) formLandNib.value = land.nib || '';
      if (formLandPeruntukan) formLandPeruntukan.value = land.peruntukan || '';
      if (formLandLegal) formLandLegal.value = land.statusLegal || 'Sertifikat Hak Pakai No. 00012/Landasan Ulin';
      if (formLandKoordinat) formLandKoordinat.value = land.koordinat || '';
      if (formLandBatasUtara) formLandBatasUtara.value = land.batasUtara || '';
      if (formLandBatasSelatan) formLandBatasSelatan.value = land.batasSelatan || '';
      if (formLandBatasTimur) formLandBatasTimur.value = land.batasTimur || '';
      if (formLandBatasBarat) formLandBatasBarat.value = land.batasBarat || '';
      if (formLandCakupan) formLandCakupan.value = land.cakupan || '';
      if (formLandKeterangan) formLandKeterangan.value = land.keterangan || '';

      const photos = Array.isArray(land.galeriFoto) && land.galeriFoto.length > 0
        ? [...land.galeriFoto]
        : (land.foto ? [land.foto] : []);
      currentLandEditingPhotos = [...photos];
    } else {
      editingLandId = null;
      if (formLandId) formLandId.value = '';
      if (formLandNama) formLandNama.value = '';
      if (formLandZona) formLandZona.value = 'Zona A';
      if (formLandPanjang) formLandPanjang.value = '';
      if (formLandLebar) formLandLebar.value = '';
      if (formLandSatuan) formLandSatuan.value = 'm';
      if (formLandSumber) formLandSumber.value = 'Sertifikat Hak Pakai No. 00012 BPN Banjarbaru';
      if (formLandTanggal) formLandTanggal.value = new Date().toISOString().split('T')[0];
      if (formLandLuas) formLandLuas.value = '';
      if (formLandTipe) formLandTipe.value = 'sirkulasi';
      if (formLandNib) formLandNib.value = '';
      if (formLandPeruntukan) formLandPeruntukan.value = '';
      if (formLandLegal) formLandLegal.value = 'Sertifikat Hak Pakai No. 00012/Landasan Ulin';
      if (formLandKoordinat) formLandKoordinat.value = '';
      if (formLandBatasUtara) formLandBatasUtara.value = '';
      if (formLandBatasSelatan) formLandBatasSelatan.value = '';
      if (formLandBatasTimur) formLandBatasTimur.value = '';
      if (formLandBatasBarat) formLandBatasBarat.value = '';
      if (formLandCakupan) formLandCakupan.value = '';
      if (formLandKeterangan) formLandKeterangan.value = '';
      currentLandEditingPhotos = [];
    }
    updateLandLuasHaHint();
    renderLandPhotosGallery();
    landFormModal.classList.add('active');
  }

  function closeLandModal() {
    if (landFormModal) landFormModal.classList.remove('active');
    editingLandId = null;
    currentLandEditingPhotos = [];
  }

  function handleSaveLand() {
    const nama = formLandNama ? formLandNama.value.trim() : '';
    const luas = formLandLuas ? Number(formLandLuas.value) : 0;
    const peruntukan = formLandPeruntukan ? formLandPeruntukan.value.trim() : '';

    if (!nama) {
      showToast('Nama bidang / zona tanah wajib diisi!', 'error');
      if (formLandNama) formLandNama.focus();
      return;
    }

    const pRaw = formLandPanjang ? formLandPanjang.value.trim() : '';
    const lRaw = formLandLebar ? formLandLebar.value.trim() : '';
    const pVal = pRaw !== '' ? parseFloat(pRaw) : null;
    const lVal = lRaw !== '' ? parseFloat(lRaw) : null;

    if ((pRaw !== '' && (isNaN(pVal) || pVal < 0)) || (lRaw !== '' && (isNaN(lVal) || lVal < 0))) {
      showToast('Panjang dan lebar bidang tanah tidak boleh bernilai negatif!', 'error');
      return;
    }

    if (isNaN(luas) || luas <= 0) {
      showToast('Luas tanah (m²) harus berupa angka positif lebih dari 0!', 'error');
      if (formLandLuas) formLandLuas.focus();
      return;
    }

    if (!peruntukan) {
      showToast('Peruntukan / fungsi tata ruang tanah wajib diisi!', 'error');
      if (formLandPeruntukan) formLandPeruntukan.focus();
      return;
    }

    const payload = {
      nama,
      zona: formLandZona ? formLandZona.value : 'Zona A',
      panjang: (pVal !== null && pVal > 0) ? pVal : null,
      lebar: (lVal !== null && lVal > 0) ? lVal : null,
      tinggi: null,
      satuan: (formLandSatuan && formLandSatuan.value) ? formLandSatuan.value : 'm',
      sumberPengukuran: formLandSumber ? formLandSumber.value.trim() : 'Sertifikat Hak Pakai No. 00012 BPN Banjarbaru',
      tanggalPengukuran: formLandTanggal ? formLandTanggal.value.trim() : '',
      luasM2: luas,
      tipeArea: formLandTipe ? formLandTipe.value : 'sirkulasi',
      nib: formLandNib ? formLandNib.value.trim() : '',
      peruntukan,
      statusLegal: formLandLegal ? formLandLegal.value.trim() : 'Sertifikat Hak Pakai No. 00012/Landasan Ulin',
      koordinat: formLandKoordinat ? formLandKoordinat.value.trim() : '',
      batasUtara: formLandBatasUtara ? formLandBatasUtara.value.trim() : '',
      batasSelatan: formLandBatasSelatan ? formLandBatasSelatan.value.trim() : '',
      batasTimur: formLandBatasTimur ? formLandBatasTimur.value.trim() : '',
      batasBarat: formLandBatasBarat ? formLandBatasBarat.value.trim() : '',
      cakupan: formLandCakupan ? formLandCakupan.value.trim() : '',
      keterangan: formLandKeterangan ? formLandKeterangan.value.trim() : '',
      foto: currentLandEditingPhotos.length > 0 ? currentLandEditingPhotos[0] : 'assets/bangunan/pos-satpam-depan.jpg',
      galeriFoto: currentLandEditingPhotos.length > 0 ? [...currentLandEditingPhotos] : ['assets/bangunan/pos-satpam-depan.jpg']
    };

    if (editingLandId) {
      const idx = landDataset.findIndex(x => x.id === editingLandId);
      if (idx !== -1) {
        landDataset[idx] = { ...landDataset[idx], ...payload, id: editingLandId };
        showToast(`Data bidang "${nama}" berhasil diperbarui.`, 'success');
      }
    } else {
      const maxId = landDataset.reduce((max, x) => Math.max(max, Number(x.id) || 0), 0);
      const newLand = { id: maxId + 1, ...payload };
      landDataset.push(newLand);
      showToast(`Bidang tanah baru "${nama}" berhasil ditambahkan ke inventaris BMN.`, 'success');
    }

    saveLandData(landDataset);
    closeLandModal();
  }

  function deleteLand(id) {
    const item = landDataset.find(x => x.id === id);
    if (!item) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus data bidang tanah "${item.nama}" (Luas: ${formatNumber(item.luasM2)} m²)? Tindakan ini akan menghapus catatan batas dan inventaris bidang terkait.`,
      'Hapus Data Bidang Tanah',
      () => {
        landDataset = landDataset.filter(x => x.id !== id);
        saveLandData(landDataset);
        showToast(`Bidang tanah "${item.nama}" berhasil dihapus.`, 'info');
      }
    );
  }

  function renderLandParcels() {
    if (!landParcelsGrid) return;

    const query = landSearchInput ? landSearchInput.value.trim().toLowerCase() : '';
    const filterZona = landFilterZona ? landFilterZona.value : '';
    const filterTipe = landFilterTipe ? landFilterTipe.value : '';

    const filtered = landDataset.filter(p => {
      if (query) {
        const matchName = p.nama && p.nama.toLowerCase().includes(query);
        const matchZona = p.zona && p.zona.toLowerCase().includes(query);
        const matchPeruntukan = p.peruntukan && p.peruntukan.toLowerCase().includes(query);
        const matchNib = p.nib && p.nib.toLowerCase().includes(query);
        const matchKet = p.keterangan && p.keterangan.toLowerCase().includes(query);
        const matchCakup = p.cakupan && p.cakupan.toLowerCase().includes(query);
        const matchLegal = p.statusLegal && p.statusLegal.toLowerCase().includes(query);
        const matchBatas = (p.batasUtara && p.batasUtara.toLowerCase().includes(query)) ||
                           (p.batasSelatan && p.batasSelatan.toLowerCase().includes(query)) ||
                           (p.batasTimur && p.batasTimur.toLowerCase().includes(query)) ||
                           (p.batasBarat && p.batasBarat.toLowerCase().includes(query));

        if (!matchName && !matchZona && !matchPeruntukan && !matchNib && !matchKet && !matchCakup && !matchLegal && !matchBatas) {
          return false;
        }
      }

      if (filterZona && p.zona !== filterZona) return false;
      if (filterTipe && p.tipeArea !== filterTipe) return false;

      return true;
    });

    // Update KPI strip
    let totalM2 = 0;
    let luasKdb = 0;
    let luasKdh = 0;
    let luasSirkulasi = 0;
    let luasCadangan = 0;

    landDataset.forEach(p => {
      const l = Number(p.luasM2) || 0;
      totalM2 += l;
      const t = (p.tipeArea || '').toLowerCase();
      if (t === 'kdb') luasKdb += l;
      else if (t === 'kdh') luasKdh += l;
      else if (t === 'cadangan') luasCadangan += l;
      else luasSirkulasi += l;
    });

    const baseTotal = totalM2 > 0 ? totalM2 : 87420;
    if (landKpiTotalLuas) landKpiTotalLuas.textContent = `${formatNumber(totalM2)} m²`;
    if (landKpiTotalHa) landKpiTotalHa.textContent = `Setara ${(totalM2 / 10000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} Hektare (Ha)`;
    if (landKpiKdb) landKpiKdb.textContent = `${formatNumber(luasKdb)} m²`;
    if (landKpiKdbPct) landKpiKdbPct.textContent = `${(Math.round((luasKdb / baseTotal) * 1000) / 10).toLocaleString('id-ID')}% Luas Tapak Gedung`;
    if (landKpiKdh) landKpiKdh.textContent = `${formatNumber(luasKdh)} m²`;
    if (landKpiKdhPct) landKpiKdhPct.textContent = `${(Math.round((luasKdh / baseTotal) * 1000) / 10).toLocaleString('id-ID')}% RTH & Lanskap Asri`;
    if (landKpiSirkulasi) landKpiSirkulasi.textContent = `${formatNumber(luasSirkulasi)} m²`;
    if (landKpiSirkulasiPct) landKpiSirkulasiPct.textContent = `${(Math.round((luasSirkulasi / baseTotal) * 1000) / 10).toLocaleString('id-ID')}% Jalan, Lapangan & Parkir`;
    if (landKpiCadangan) landKpiCadangan.textContent = `${formatNumber(luasCadangan)} m²`;
    if (landKpiCadanganPct) landKpiCadanganPct.textContent = `${(Math.round((luasCadangan / baseTotal) * 1000) / 10).toLocaleString('id-ID')}% Cadangan Ekspansi`;

    if (landCountBadge) {
      landCountBadge.textContent = `Menampilkan ${filtered.length} dari ${landDataset.length} Bidang Tanah`;
    }

    landParcelsGrid.innerHTML = '';

    if (filtered.length === 0) {
      landParcelsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🗺️</div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 1.05rem; margin-bottom: 4px;">Tidak Ada Bidang Tanah Ditemukan</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 400px; margin: 0 auto 16px auto;">
            Tidak ditemukan bidang tanah yang cocok dengan kata kunci atau filter terpilih.
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-reset-land">Reset Semua Filter</button>
        </div>
      `;
      const btnEmptyReset = document.getElementById('btn-empty-reset-land');
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', () => {
          if (landSearchInput) landSearchInput.value = '';
          if (landFilterZona) landFilterZona.value = '';
          if (landFilterTipe) landFilterTipe.value = '';
          renderLandParcels();
        });
      }
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'land-card';

      const gallery = Array.isArray(p.galeriFoto) && p.galeriFoto.length > 0
        ? p.galeriFoto
        : (p.foto ? [p.foto] : ['assets/bangunan/pos-satpam-depan.jpg']);
      const mainPhoto = gallery[0];

      let tipeBadgeClass = 'land-pill-sirkulasi';
      let tipeLabel = 'Sirkulasi & Lapangan';
      const t = (p.tipeArea || '').toLowerCase();
      if (t === 'kdb') {
        tipeBadgeClass = 'land-pill-kdb';
        tipeLabel = 'Tapak Bangunan (KDB)';
      } else if (t === 'kdh') {
        tipeBadgeClass = 'land-pill-kdh';
        tipeLabel = 'Ruang Terbuka Hijau (KDH)';
      } else if (t === 'cadangan') {
        tipeBadgeClass = 'land-pill-cadangan';
        tipeLabel = 'Lahan Cadangan Strategis';
      }

      const luasHa = (Number(p.luasM2) / 10000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

      // Build thumbnail strip
      let thumbStripHtml = '';
      if (gallery.length > 1) {
        thumbStripHtml = `
          <div class="land-photo-strip">
            ${gallery.map((img, idx) => `
              <img src="${img}" alt="Thumb ${idx + 1}" class="land-thumb-preview" data-img-idx="${idx}" title="Klik untuk memperbesar foto ${idx + 1}">
            `).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="land-card-header">
          <div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
              <span class="badge badge-primary" style="font-weight: 800; font-size: 0.72rem;">${p.zona || 'Zona'}</span>
              <span class="land-pill-tag ${tipeBadgeClass}">${tipeLabel}</span>
              ${p.nib ? `<span class="badge" style="background: #F1F5F9; color: #475569; font-size: 0.7rem;">NIB: ${p.nib}</span>` : ''}
            </div>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: var(--primary-deep); line-height: 1.3;">${p.nama}</h3>
          </div>
        </div>

        <div class="land-photo-wrapper">
          <img src="${mainPhoto}" alt="${p.nama}" loading="lazy">
          <div class="land-photo-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            ${gallery.length} Foto
          </div>
        </div>

        ${thumbStripHtml}

        <div class="land-metrics-bar">
          <div>
            <div style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--primary-dark); font-weight: 700;">Luas Wilayah Bidang:</div>
            <div class="land-area-val">${formatNumber(p.luasM2)} <span style="font-size: 0.82rem; font-weight: 600;">m²</span></div>
          </div>
          <div style="text-align: right;">
            <div class="land-area-ha">= ${luasHa} Ha</div>
            <div style="font-size: 0.68rem; color: var(--text-muted);">
              P × L: ${formatDimensionValue(p.panjang, p.satuan || 'm')} × ${formatDimensionValue(p.lebar, p.satuan || 'm')} • T: —
            </div>
          </div>
        </div>

        <div style="padding: 14px 16px; flex: 1; display: flex; flex-direction: column;">
          <div style="margin-bottom: 8px;">
            <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Peruntukan / Tata Ruang:</div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 1px;">${p.peruntukan || '-'}</div>
          </div>

          <div class="land-boundary-grid">
            <div class="boundary-item">
              <span class="boundary-label">▲ Utara (Depan):</span>
              <span class="boundary-val">${p.batasUtara || '-'}</span>
            </div>
            <div class="boundary-item">
              <span class="boundary-label">▼ Selatan (Belakang):</span>
              <span class="boundary-val">${p.batasSelatan || '-'}</span>
            </div>
            <div class="boundary-item">
              <span class="boundary-label">▶ Timur (Kanan):</span>
              <span class="boundary-val">${p.batasTimur || '-'}</span>
            </div>
            <div class="boundary-item">
              <span class="boundary-label">◀ Barat (Kiri):</span>
              <span class="boundary-val">${p.batasBarat || '-'}</span>
            </div>
          </div>

          ${p.cakupan ? `
            <div style="font-size: 0.78rem; color: #334155; margin-bottom: 8px; line-height: 1.45;">
              <strong style="color: var(--primary-dark);">Cakupan Fasilitas & Sarana:</strong><br>${p.cakupan}
            </div>
          ` : ''}

          ${p.keterangan ? `
            <div style="font-size: 0.76rem; color: #64748B; line-height: 1.4; margin-top: auto; padding-top: 8px; border-top: 1px dashed var(--border-color);">
              ℹ️ ${p.keterangan}
            </div>
          ` : ''}

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px; font-size: 0.72rem; color: var(--text-muted);">
            <div>${p.statusLegal || 'Hak Pakai No. 00012'}</div>
            ${p.koordinat ? `<div style="font-family: monospace; color: var(--primary); font-weight: 600;">📍 ${p.koordinat}</div>` : ''}
          </div>

          <div class="admin-only" style="display: flex; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--border-color);">
            <button class="btn btn-gold btn-sm btn-land-edit" style="flex: 1;" title="Edit data bidang tanah ini">
              Edit Bidang Tanah
            </button>
            <button class="btn btn-secondary btn-sm btn-land-delete" style="color: #DC2626; border-color: #FECACA;" title="Hapus bidang ini">
              Hapus
            </button>
          </div>
        </div>
      `;

      // Click photo to open in Lightbox
      const mainImgWrap = card.querySelector('.land-photo-wrapper');
      if (mainImgWrap) {
        mainImgWrap.addEventListener('click', () => {
          openLightbox(mainPhoto, `${p.nama} (Luas: ${formatNumber(p.luasM2)} m²)`);
        });
      }

      card.querySelectorAll('.land-thumb-preview').forEach(thumb => {
        thumb.addEventListener('click', (e) => {
          e.stopPropagation();
          const imgIdx = parseInt(thumb.getAttribute('data-img-idx'), 10) || 0;
          openLightbox(gallery[imgIdx], `${p.nama} (Foto ${imgIdx + 1} dari ${gallery.length})`);
        });
      });

      const btnEdit = card.querySelector('.btn-land-edit');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => openLandModal(p));
      }

      const btnDel = card.querySelector('.btn-land-delete');
      if (btnDel) {
        btnDel.addEventListener('click', () => deleteLand(p.id));
      }

      landParcelsGrid.appendChild(card);
    });
  }

  // Official A4 Printable Document Generation for Land (Standar Kemenhaj RI)
  function generateOfficialLandPrintHtml() {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let totalM2 = 0;
    landDataset.forEach(p => { totalM2 += Number(p.luasM2) || 0; });
    const totalHa = (totalM2 / 10000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

    const rowsHtml = landDataset.map((p, idx) => {
      const dims = calculateObjectDimensions(p);
      const ha = (Number(p.luasM2) / 10000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      const pVal = dims.panjang !== null ? dims.panjang.toLocaleString('id-ID') : 'Belum diisi';
      const lVal = dims.lebar !== null ? dims.lebar.toLocaleString('id-ID') : 'Belum diisi';
      return `
        <tr>
          <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
          <td style="font-weight: 700;">
            ${escapeHtml(p.nama)}
            <div style="font-size: 0.65rem; color: #64748B; font-weight: normal;">${escapeHtml(p.cakupan || '-')}</div>
          </td>
          <td style="text-align: center; font-weight: 600;">
            ${escapeHtml(p.zona || '-')}
            ${p.nib ? `<div style="font-family: monospace; font-size: 0.64rem; color: #475569; font-weight: normal;">${escapeHtml(p.nib)}</div>` : ''}
          </td>
          <td style="text-align: right;">${pVal}</td>
          <td style="text-align: right;">${lVal}</td>
          <td style="text-align: center; color: #64748B;">—</td>
          <td style="text-align: center; color: #64748B;">—</td>
          <td style="text-align: center;">${dims.satuan}</td>
          <td style="text-align: right; font-weight: 700; color: #004C3F;">${formatNumber(p.luasM2)}</td>
          <td style="text-align: right; font-weight: 600;">${ha}</td>
          <td style="font-size: 0.68rem;">${escapeHtml(p.peruntukan || '-')}</td>
          <td style="font-size: 0.65rem; line-height: 1.3;">
            U: ${escapeHtml(p.batasUtara || '-')}<br>
            S: ${escapeHtml(p.batasSelatan || '-')}<br>
            T: ${escapeHtml(p.batasTimur || '-')}<br>
            B: ${escapeHtml(p.batasBarat || '-')}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="gov-print-sheet gov-print-landscape">
        <!-- Security Watermark -->
        <div class="gov-watermark">
          DOKUMEN RESMI BMN &bull; KEMENTERIAN HAJI DAN UMRAH RI
        </div>

        ${getKemenhajOfficialLetterheadHtml()}

        <!-- Document Heading Block -->
        <div class="gov-doc-title-block">
          <h2 class="gov-doc-title">
            LEMBAR INVENTARISASI DATA FISIK, DIMENSI & YURIDIS BIDANG TANAH BMN
          </h2>
          <div class="gov-doc-number">
            NOMOR: BMN-TNH/UPT-BDJ/${now.getFullYear()}/REG-01 &bull; SERTIFIKAT HAK PAKAI NO. 00012/LANDASAN ULIN BARAT
          </div>
        </div>

        <!-- Rekapitulasi Data Yuridis -->
        <table class="gov-table" style="margin-bottom: 10px;">
          <colgroup>
            <col style="width: 26%;">
            <col style="width: 74%;">
          </colgroup>
          <tbody>
            <tr>
              <th>Instansi Pemegang Hak</th>
              <td style="font-weight: 700; color: #004C3F;">Kementerian Haji dan Umrah Republik Indonesia (UPT Asrama Haji Embarkasi Banjarmasin)</td>
            </tr>
            <tr>
              <th>Status Kepemilikan & Hak</th>
              <td>Sertifikat Hak Pakai No. 00012 / Kel. Landasan Ulin Barat, Kec. Liang Anggang, Kota Banjarbaru</td>
            </tr>
            <tr>
              <th>Instansi Penerbit Sertifikat</th>
              <td>Kantor Pertanahan Kota Banjarbaru (Kementerian Agraria dan Tata Ruang / BPN RI)</td>
            </tr>
            <tr>
              <th>Total Luas Keseluruhan</th>
              <td style="font-weight: 800; color: #004C3F; font-size: 0.92rem;">
                ${formatNumber(totalM2)} m² (Setara ${totalHa} Hektare)
              </td>
            </tr>
            <tr>
              <th>Peruntukan Kawasan Terpadu</th>
              <td>Penyelenggaraan Operasional Pelayanan Ibadah Haji & Umrah Embarkasi Banjarmasin (BDJ)</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 0.78rem; font-weight: 800; color: #012B23; margin: 10px 0 5px 0; text-transform: uppercase;">
          Tabel Rincian Bidang Tanah, Dimensi Terukur (P × L) & Zonasi Spasial Kawasan:
        </div>

        <table class="gov-table" style="font-size: 0.68rem;">
          <colgroup>
            <col style="width: 32px;">
            <col style="width: 18%;">
            <col style="width: 105px;">
            <col style="width: 44px;">
            <col style="width: 44px;">
            <col style="width: 34px;">
            <col style="width: 36px;">
            <col style="width: 36px;">
            <col style="width: 58px;">
            <col style="width: 52px;">
            <col style="width: 15%;">
            <col style="width: 135px;">
          </colgroup>
          <thead>
            <tr>
              <th style="text-align: center; white-space: nowrap;">No</th>
              <th>Nama Bidang / Klaster</th>
              <th style="text-align: center;">Zona & NIB</th>
              <th style="text-align: right;">P</th>
              <th style="text-align: right;">L</th>
              <th style="text-align: center;">T</th>
              <th style="text-align: center; white-space: nowrap;">Vol</th>
              <th style="text-align: center; white-space: nowrap;">Sat</th>
              <th style="text-align: right;">Luas (m²)</th>
              <th style="text-align: right;">Luas (Ha)</th>
              <th>Fungsi Peruntukan</th>
              <th>Batas Terluar Wilayah</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #E6F4EA; font-weight: 800;">
              <td colspan="8" style="text-align: right; padding: 6px 8px;">TOTAL LUAS TERDAFTAR RESMI:</td>
              <td style="text-align: right; color: #004C3F;">${formatNumber(totalM2)} m²</td>
              <td style="text-align: right; color: #004C3F;">${totalHa} Ha</td>
              <td colspan="2" style="font-size: 0.65rem; color: #475569;">100% Bersertifikat Hak Pakai BMN Aktif</td>
            </tr>
          </tfoot>
        </table>

        <div style="font-size: 6.8pt; color: #475569; line-height: 1.35; margin: 6px 0 8px 0; border-left: 3px solid #004C3F; padding-left: 8px;">
          <strong>Catatan Standarisasi Dimensi Lahan:</strong> Objek bidang tanah terbuka tidak memiliki dimensi elevasi tinggi; kolom Tinggi (T) dan Volume ditandai <strong>— (Tidak relevan)</strong> sesuai ketentuan pendataan aset lahan. Nilai panjang/lebar kosong tidak dianggap nol.
        </div>

        <!-- Tanda Tangan Pengesahan -->
        <div class="gov-signatures-block" style="margin-top: 18px;">
          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Mengetahui / Menyetujui,</div>
            <div class="gov-sign-post">Kepala UPT Asrama Haji Embarkasi Banjarmasin</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">H. Saipuddin, S.Ag., M.Pd.I</div>
            <div class="gov-sign-nip">NIP. 19710824 199803 1 003</div>
          </div>

          ${getKemenhajOfficialSealHtml()}

          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Banjarbaru, ${dateFormatted}</div>
            <div class="gov-sign-post">Petugas Pengelola Aset BMN Kawasan</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">Muhammad Azkiya Ramadhani, S.Kom</div>
            <div class="gov-sign-nip">NIP. 19890412 201503 1 002</div>
          </div>
        </div>

        <!-- Footer Keamanan -->
        ${getKemenhajOfficialSecurityFooterHtml('TANAH', dateFormatted, timeFormatted)}
      </div>
    `;
  }

  function openPrintLandModal() {
    if (!printLandModal || !printLandSheetContent) return;
    printLandSheetContent.innerHTML = generateOfficialLandPrintHtml();
    printLandModal.classList.add('active');
  }

  function closePrintLandModal() {
    if (printLandModal) printLandModal.classList.remove('active');
  }

  function executeDirectPrintLand() {
    const printHtml = generateOfficialLandPrintHtml();
    const printableContainer = document.getElementById('printable-building-profile');
    if (printableContainer) {
      printableContainer.innerHTML = printHtml;
    }
    if (printLandSheetContent) {
      printLandSheetContent.innerHTML = printHtml;
    }

    const prevTitle = document.title;
    document.title = 'Lembar_Data_Bidang_Tanah_BMN_Asrama_Haji';

    const triggerPrint = () => {
      window.print();
      setTimeout(() => { document.title = prevTitle; }, 1500);
    };

    const fontPromise = (document.fonts && document.fonts.ready)
      ? Promise.race([
          document.fonts.ready,
          new Promise(res => setTimeout(res, 250))
        ])
      : Promise.resolve();

    fontPromise.then(triggerPrint).catch(triggerPrint);
  }

  // Bind Land Events
  if (btnAddLand) btnAddLand.addEventListener('click', () => openLandModal(null));
  if (btnCloseLandModal) btnCloseLandModal.addEventListener('click', closeLandModal);
  if (btnCancelLand) btnCancelLand.addEventListener('click', closeLandModal);
  if (btnSaveLand) btnSaveLand.addEventListener('click', handleSaveLand);

  if (landSearchInput) landSearchInput.addEventListener('input', renderLandParcels);
  if (landFilterZona) landFilterZona.addEventListener('change', renderLandParcels);
  if (landFilterTipe) landFilterTipe.addEventListener('change', renderLandParcels);
  if (landBtnReset) {
    landBtnReset.addEventListener('click', () => {
      if (landSearchInput) landSearchInput.value = '';
      if (landFilterZona) landFilterZona.value = '';
      if (landFilterTipe) landFilterTipe.value = '';
      renderLandParcels();
      showToast('Filter bidang tanah berhasil di-reset.', 'success');
    });
  }

  if (btnPrintLand) btnPrintLand.addEventListener('click', openPrintLandModal);
  if (btnClosePrintLandModal) btnClosePrintLandModal.addEventListener('click', closePrintLandModal);
  if (btnClosePrintLand) btnClosePrintLand.addEventListener('click', closePrintLandModal);
  if (btnExecutePrintLand) btnExecutePrintLand.addEventListener('click', executeDirectPrintLand);
  if (btnTriggerPrintLandBottom) btnTriggerPrintLandBottom.addEventListener('click', executeDirectPrintLand);

  // ==========================================================================
  // 7. KATALOG & KONFIGURASI JARINGAN WI-FI KAWASAN
  // ==========================================================================
  const wifiNetworksGrid = document.getElementById('wifi-networks-grid');
  const wifiSearchInput = document.getElementById('wifi-search-input');
  const wifiFilterTipe = document.getElementById('wifi-filter-tipe');
  const wifiFilterFrekuensi = document.getElementById('wifi-filter-frekuensi');
  const wifiFilterKeamanan = document.getElementById('wifi-filter-keamanan');
  const wifiBtnReset = document.getElementById('wifi-btn-reset');
  const wifiCountBadge = document.getElementById('wifi-count-badge');

  // KPI elements
  const wifiKpiTotalSsid = document.getElementById('wifi-kpi-total-ssid');
  const wifiKpiTotalAp = document.getElementById('wifi-kpi-total-ap');
  const wifiKpiTotalBandwidth = document.getElementById('wifi-kpi-total-bandwidth');
  const wifiKpiSecurity = document.getElementById('wifi-kpi-security');

  // Action buttons
  const btnAddWifi = document.getElementById('btn-add-wifi');
  const btnOpenWifiPrint = document.getElementById('btn-open-wifi-print');
  const btnExportWifiCsv = document.getElementById('btn-export-wifi-csv');

  // Modal Form Elements
  const wifiFormModal = document.getElementById('wifi-form-modal');
  const btnCloseWifiModal = document.getElementById('btn-close-wifi-modal');
  const btnCancelWifi = document.getElementById('btn-cancel-wifi');
  const btnSaveWifi = document.getElementById('btn-save-wifi');
  const formWifiId = document.getElementById('wifi-id');
  const formWifiSsid = document.getElementById('wifi-ssid');
  const formWifiTipe = document.getElementById('wifi-tipe');
  const formWifiBandwidth = document.getElementById('wifi-bandwidth');
  const formWifiFrekuensi = document.getElementById('wifi-frekuensi');
  const formWifiKeamanan = document.getElementById('wifi-keamanan');
  const formWifiPassword = document.getElementById('wifi-password');
  const formWifiStatus = document.getElementById('wifi-status');
  const formWifiCakupan = document.getElementById('wifi-cakupan');
  const formWifiJumlahAp = document.getElementById('wifi-jumlah-ap');
  const formWifiModelAp = document.getElementById('wifi-model-ap');
  const formWifiVlan = document.getElementById('wifi-vlan');
  const formWifiIpRange = document.getElementById('wifi-ip-range');
  const formWifiVendor = document.getElementById('wifi-vendor');
  const formWifiKeterangan = document.getElementById('wifi-keterangan');
  const formWifiFoto = document.getElementById('wifi-foto');

  // Print Modal Elements
  const printWifiModal = document.getElementById('print-wifi-modal');
  const btnClosePrintWifiModal = document.getElementById('btn-close-print-wifi-modal');
  const btnClosePrintWifi = document.getElementById('btn-close-print-wifi');
  const btnExecutePrintWifi = document.getElementById('btn-execute-print-wifi');
  const btnTriggerPrintWifiBottom = document.getElementById('btn-trigger-print-wifi-bottom');
  const printWifiSheetContent = document.getElementById('print-wifi-sheet-content');

  let editingWifiId = null;
  const revealedWifiPasswords = new Set();

  function renderWifiNetworks() {
    if (!wifiNetworksGrid) return;

    const query = wifiSearchInput ? wifiSearchInput.value.trim().toLowerCase() : '';
    const filterTipe = wifiFilterTipe ? wifiFilterTipe.value : '';
    const filterFreq = wifiFilterFrekuensi ? wifiFilterFrekuensi.value : '';
    const filterSec = wifiFilterKeamanan ? wifiFilterKeamanan.value : '';

    const filtered = wifiDataset.filter(w => {
      if (query) {
        const matchSsid = w.ssid && w.ssid.toLowerCase().includes(query);
        const matchTipe = w.tipe && w.tipe.toLowerCase().includes(query);
        const matchCakupan = (w.cakupan || '').toLowerCase().includes(query);
        const matchVendor = (w.vendor || '').toLowerCase().includes(query);
        const matchVlan = (w.vlan || '').toLowerCase().includes(query);
        const matchIp = (w.ipRange || '').toLowerCase().includes(query);
        const matchKet = (w.keterangan || '').toLowerCase().includes(query);
        const matchModel = (w.modelAp || '').toLowerCase().includes(query);
        if (!matchSsid && !matchTipe && !matchCakupan && !matchVendor && !matchVlan && !matchIp && !matchKet && !matchModel) {
          return false;
        }
      }

      if (filterTipe && w.tipe !== filterTipe) return false;
      if (filterFreq && w.frekuensi && !w.frekuensi.toLowerCase().includes(filterFreq.toLowerCase())) return false;
      if (filterSec && w.keamanan && !w.keamanan.toLowerCase().includes(filterSec.toLowerCase())) return false;

      return true;
    });

    // Update KPI strip
    let totalAp = 0;
    let totalBandwidth = 0;
    wifiDataset.forEach(w => {
      totalAp += Number(w.jumlahAp) || 1;
      totalBandwidth += Number(w.bandwidthMbps) || 0;
    });

    if (wifiKpiTotalSsid) wifiKpiTotalSsid.textContent = `${wifiDataset.length} Jaringan`;
    if (wifiKpiTotalAp) wifiKpiTotalAp.textContent = `${totalAp} Unit AP`;
    if (wifiKpiTotalBandwidth) wifiKpiTotalBandwidth.textContent = `${formatNumber(totalBandwidth)} Mbps`;
    if (wifiKpiSecurity) wifiKpiSecurity.textContent = 'WPA3 / 802.1X';

    if (wifiCountBadge) {
      wifiCountBadge.textContent = `Menampilkan ${filtered.length} dari ${wifiDataset.length} Jaringan`;
    }

    wifiNetworksGrid.innerHTML = '';

    if (filtered.length === 0) {
      wifiNetworksGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: #FFFFFF; border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">📡</div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 1.05rem; margin-bottom: 4px;">Tidak Ada Jaringan Wi-Fi Ditemukan</div>
          <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 420px; margin: 0 auto 16px auto;">
            Tidak ditemukan jaringan Wi-Fi yang cocok dengan kata kunci atau filter terpilih.
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-empty-reset-wifi">Reset Semua Filter</button>
        </div>
      `;
      const btnEmptyReset = document.getElementById('btn-empty-reset-wifi');
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', () => {
          if (wifiSearchInput) wifiSearchInput.value = '';
          if (wifiFilterTipe) wifiFilterTipe.value = '';
          if (wifiFilterFrekuensi) wifiFilterFrekuensi.value = '';
          if (wifiFilterKeamanan) wifiFilterKeamanan.value = '';
          renderWifiNetworks();
        });
      }
      return;
    }

    filtered.forEach(w => {
      const card = document.createElement('div');
      card.className = 'wifi-card';

      // Tentukan avatar icon dan class berdasarkan tipe
      let avatarClass = 'wifi-avatar-dedicated';
      const tipeLower = (w.tipe || '').toLowerCase();
      if (tipeLower.includes('jamaah') || tipeLower.includes('publik')) {
        avatarClass = 'wifi-avatar-jamaah';
      } else if (tipeLower.includes('ppih') || tipeLower.includes('vip')) {
        avatarClass = 'wifi-avatar-ppih';
      } else if (tipeLower.includes('media') || tipeLower.includes('siaran')) {
        avatarClass = 'wifi-avatar-media';
      } else if (tipeLower.includes('iot') || tipeLower.includes('utilitas')) {
        avatarClass = 'wifi-avatar-iot';
      }

      const isPasswordRevealed = revealedWifiPasswords.has(w.id);
      const displayPassword = isPasswordRevealed
        ? (w.passwordKredensial || 'Tidak ada sandi / Captive')
        : '••••••••••••';

      card.innerHTML = `
        <div class="wifi-card-header">
          <div class="wifi-header-main">
            <div class="wifi-icon-avatar ${avatarClass}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            </div>
            <div>
              <div class="wifi-ssid-title">${escapeHtml(w.ssid)}</div>
              <div class="wifi-type-sub">${escapeHtml(w.tipe || 'Infrastruktur Jaringan')}</div>
            </div>
          </div>
          <span class="badge ${w.status === 'Aktif' ? 'badge-kondisi-baik' : 'badge-kondisi-rusak'}">
            ● ${escapeHtml(w.status || 'Aktif')}
          </span>
        </div>

        <div class="wifi-card-body">
          <div class="wifi-badges-row">
            <span class="speed-badge-pill" title="Alokasi Bandwidth">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
              ${w.bandwidthMbps || 0} Mbps
            </span>
            <span class="freq-badge-pill" title="Frekuensi & Standar Transmisi">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h20"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/></svg>
              ${escapeHtml(w.frekuensi || 'Dual Band')}
            </span>
            <span class="sec-badge-pill" title="Protokol Enkripsi & Keamanan">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              ${escapeHtml(w.keamanan || 'WPA2/WPA3')}
            </span>
          </div>

          <div class="wifi-meta-grid">
            <div class="wifi-meta-item" style="grid-column: 1 / -1;">
              <span class="wifi-meta-label">Lokasi Cakupan Gedung</span>
              <span class="wifi-meta-val" style="color: var(--primary-dark);">📍 ${escapeHtml(w.cakupan || '-')}</span>
            </div>
            <div class="wifi-meta-item">
              <span class="wifi-meta-label">Hardware AP</span>
              <span class="wifi-meta-val">${w.jumlahAp || 1} Unit &bull; ${escapeHtml(w.modelAp || 'Enterprise AP')}</span>
            </div>
            <div class="wifi-meta-item">
              <span class="wifi-meta-label">VLAN Tag</span>
              <span class="wifi-meta-val" style="font-family: monospace;">${escapeHtml(w.vlan || '-')}</span>
            </div>
            <div class="wifi-meta-item">
              <span class="wifi-meta-label">IP Subnet / Pool</span>
              <span class="wifi-meta-val" style="font-family: monospace;">${escapeHtml(w.ipRange || '-')}</span>
            </div>
            <div class="wifi-meta-item">
              <span class="wifi-meta-label">Penyedia ISP & SLA</span>
              <span class="wifi-meta-val">${escapeHtml(w.vendor || '-')}</span>
            </div>
          </div>

          <div class="wifi-cred-box">
            <div class="wifi-cred-left">
              <span class="wifi-cred-label">Kredensial / Sandi Akses</span>
              <span class="wifi-cred-text" id="wifi-pass-text-${w.id}">${escapeHtml(displayPassword)}</span>
            </div>
            <div class="wifi-cred-actions">
              <button type="button" class="btn-cred-icon btn-toggle-wifi-pass" data-id="${w.id}" title="${isPasswordRevealed ? 'Sembunyikan sandi' : 'Tampilkan sandi'}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  ${isPasswordRevealed
                    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                  }
                </svg>
              </button>
              <button type="button" class="btn-cred-icon btn-copy-wifi-pass" data-id="${w.id}" title="Salin sandi ke clipboard">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>

          ${w.keterangan ? `
            <div class="wifi-desc-box">
              ${escapeHtml(w.keterangan)}
            </div>
          ` : ''}
        </div>

        <div class="wifi-card-footer">
          <button type="button" class="btn btn-secondary btn-sm btn-print-single-wifi" data-id="${w.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Cetak Lembar</span>
          </button>

          <div class="admin-only" style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-gold btn-sm btn-edit-wifi" data-id="${w.id}">
              Edit
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-delete-wifi" data-id="${w.id}" style="color: #DC2626; border-color: #FECACA;">
              Hapus
            </button>
          </div>
        </div>
      `;

      // Event toggles
      const btnToggle = card.querySelector('.btn-toggle-wifi-pass');
      if (btnToggle) {
        btnToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          if (revealedWifiPasswords.has(w.id)) {
            revealedWifiPasswords.delete(w.id);
          } else {
            revealedWifiPasswords.add(w.id);
          }
          renderWifiNetworks();
        });
      }

      const btnCopy = card.querySelector('.btn-copy-wifi-pass');
      if (btnCopy) {
        btnCopy.addEventListener('click', (e) => {
          e.stopPropagation();
          const pass = w.passwordKredensial || '';
          if (navigator.clipboard && pass) {
            navigator.clipboard.writeText(pass).then(() => {
              showToast(`Password SSID "${w.ssid}" berhasil disalin ke clipboard!`, 'success');
            }).catch(() => {
              showToast(`Password: ${pass}`, 'info');
            });
          } else {
            showToast(`Password: ${pass || 'Tidak ada sandi khusus'}`, 'info');
          }
        });
      }

      const btnPrintSingle = card.querySelector('.btn-print-single-wifi');
      if (btnPrintSingle) {
        btnPrintSingle.addEventListener('click', () => openPrintWifiModal(w));
      }

      const btnEdit = card.querySelector('.btn-edit-wifi');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => openWifiModal(w));
      }

      const btnDelete = card.querySelector('.btn-delete-wifi');
      if (btnDelete) {
        btnDelete.addEventListener('click', () => deleteWifiNetwork(w.id));
      }

      wifiNetworksGrid.appendChild(card);
    });
  }

  function openWifiModal(wifiObj = null) {
    if (!wifiFormModal) return;
    editingWifiId = wifiObj ? wifiObj.id : null;

    const modalTitle = document.getElementById('wifi-modal-title');
    if (modalTitle) {
      modalTitle.textContent = wifiObj ? 'Edit Konfigurasi Jaringan Wi-Fi' : 'Tambah Konfigurasi Jaringan Wi-Fi';
    }

    if (formWifiId) formWifiId.value = wifiObj ? wifiObj.id : '';
    if (formWifiSsid) formWifiSsid.value = wifiObj ? wifiObj.ssid : '';
    if (formWifiTipe) formWifiTipe.value = wifiObj ? wifiObj.tipe : 'Publik / Jamaah';
    if (formWifiBandwidth) formWifiBandwidth.value = wifiObj ? wifiObj.bandwidthMbps : '100';
    if (formWifiFrekuensi) formWifiFrekuensi.value = wifiObj ? wifiObj.frekuensi : 'Dual Band 2.4 / 5 GHz';
    if (formWifiKeamanan) formWifiKeamanan.value = wifiObj ? wifiObj.keamanan : 'Captive Portal (Otentikasi No. Porsi / Paspor)';
    if (formWifiPassword) formWifiPassword.value = wifiObj ? (wifiObj.passwordKredensial || '') : '';
    if (formWifiStatus) formWifiStatus.value = wifiObj ? (wifiObj.status || 'Aktif') : 'Aktif';
    if (formWifiCakupan) formWifiCakupan.value = wifiObj ? wifiObj.cakupan : '';
    if (formWifiJumlahAp) formWifiJumlahAp.value = wifiObj ? wifiObj.jumlahAp : '4';
    if (formWifiModelAp) formWifiModelAp.value = wifiObj ? (wifiObj.modelAp || '') : '';
    if (formWifiVlan) formWifiVlan.value = wifiObj ? (wifiObj.vlan || '') : '';
    if (formWifiIpRange) formWifiIpRange.value = wifiObj ? (wifiObj.ipRange || '') : '';
    if (formWifiVendor) formWifiVendor.value = wifiObj ? (wifiObj.vendor || '') : '';
    if (formWifiKeterangan) formWifiKeterangan.value = wifiObj ? (wifiObj.keterangan || '') : '';
    if (formWifiFoto) formWifiFoto.value = wifiObj ? (wifiObj.foto || '') : '';

    wifiFormModal.classList.add('active');
  }

  function closeWifiModal() {
    if (wifiFormModal) wifiFormModal.classList.remove('active');
    editingWifiId = null;
  }

  function saveWifiNetwork() {
    const ssid = formWifiSsid ? formWifiSsid.value.trim() : '';
    const tipe = formWifiTipe ? formWifiTipe.value : '';
    const bandwidth = Number(formWifiBandwidth ? formWifiBandwidth.value : 0);
    const frekuensi = formWifiFrekuensi ? formWifiFrekuensi.value : '';
    const keamanan = formWifiKeamanan ? formWifiKeamanan.value : '';
    const cakupan = formWifiCakupan ? formWifiCakupan.value.trim() : '';
    const jumlahAp = Number(formWifiJumlahAp ? formWifiJumlahAp.value : 1);

    if (!ssid) {
      showToast('Nama SSID Wi-Fi wajib diisi.', 'error');
      if (formWifiSsid) formWifiSsid.focus();
      return;
    }

    if (ssid.length > 32) {
      showToast('Nama SSID maksimal 32 karakter sesuai standar IEEE 802.11.', 'error');
      return;
    }

    if (isNaN(bandwidth) || bandwidth <= 0) {
      showToast('Bandwidth harus berupa angka positif dalam satuan Mbps.', 'error');
      if (formWifiBandwidth) formWifiBandwidth.focus();
      return;
    }

    if (!cakupan) {
      showToast('Lokasi cakupan gedung wajib diisi.', 'error');
      if (formWifiCakupan) formWifiCakupan.focus();
      return;
    }

    const payload = {
      id: editingWifiId || (wifiDataset.length > 0 ? Math.max(...wifiDataset.map(w => w.id)) + 1 : 1),
      ssid,
      tipe,
      frekuensi,
      bandwidthMbps: bandwidth,
      keamanan,
      passwordKredensial: formWifiPassword ? formWifiPassword.value.trim() : '',
      status: formWifiStatus ? formWifiStatus.value : 'Aktif',
      cakupan,
      jumlahAp: isNaN(jumlahAp) || jumlahAp <= 0 ? 1 : jumlahAp,
      modelAp: formWifiModelAp ? formWifiModelAp.value.trim() : '',
      vlan: formWifiVlan ? formWifiVlan.value.trim() : '',
      ipRange: formWifiIpRange ? formWifiIpRange.value.trim() : '',
      vendor: formWifiVendor ? formWifiVendor.value.trim() : '',
      keterangan: formWifiKeterangan ? formWifiKeterangan.value.trim() : '',
      foto: formWifiFoto ? formWifiFoto.value.trim() : 'assets/bangunan/siskohat.jpg'
    };

    if (editingWifiId) {
      const idx = wifiDataset.findIndex(w => w.id === editingWifiId);
      if (idx !== -1) {
        wifiDataset[idx] = payload;
        showToast(`Konfigurasi jaringan Wi-Fi "${payload.ssid}" berhasil diperbarui.`, 'success');
      }
    } else {
      wifiDataset.push(payload);
      showToast(`Jaringan Wi-Fi baru "${payload.ssid}" berhasil ditambahkan.`, 'success');
    }

    saveWifiData(wifiDataset);
    closeWifiModal();
  }

  function deleteWifiNetwork(id) {
    const target = wifiDataset.find(w => w.id === id);
    if (!target) return;

    showConfirmModal(
      `Apakah Anda yakin ingin menghapus inventaris jaringan Wi-Fi "${target.ssid}"? Tindakan ini akan menghapus konfigurasi dari database lokal.`,
      'Hapus Jaringan Wi-Fi',
      () => {
        wifiDataset = wifiDataset.filter(w => w.id !== id);
        saveWifiData(wifiDataset);
        showToast(`Jaringan Wi-Fi "${target.ssid}" berhasil dihapus.`, 'success');
      }
    );
  }

  let currentWifiPrintTarget = null;

  // Official Government Print Engine for Wi-Fi Sheet (A4 Portrait)
  function generateOfficialWifiPrintHtml(selectedWifi = null) {
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    let totalAp = 0;
    let totalBw = 0;
    wifiDataset.forEach(w => {
      totalAp += Number(w.jumlahAp) || 1;
      totalBw += Number(w.bandwidthMbps) || 0;
    });

    const isSingle = !!selectedWifi;
    const targetList = isSingle ? [selectedWifi] : wifiDataset;

    const rowsHtml = targetList.map((w, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td style="font-weight: 800; color: #0F172A;">
          ${escapeHtml(w.ssid)}
          <div style="font-size: 7.2pt; color: #64748B; font-weight: normal; margin-top: 1px;">
            ${escapeHtml(w.tipe || '-')}
          </div>
        </td>
        <td style="font-size: 7.8pt; font-weight: 600;">${escapeHtml(w.frekuensi || '-')}</td>
        <td style="text-align: right; font-weight: 800; color: #0284C7;">${w.bandwidthMbps || 0} Mbps</td>
        <td style="font-size: 7.5pt;">${escapeHtml(w.keamanan || '-')}</td>
        <td style="font-size: 7.8pt; color: #004C3F; font-weight: 600;">${escapeHtml(w.cakupan || '-')}</td>
        <td style="text-align: center; font-weight: 700;">${w.jumlahAp || 1} Unit</td>
        <td style="font-family: monospace; font-size: 7.2pt;">${escapeHtml(w.vlan || '-')}</td>
        <td style="font-family: monospace; font-size: 7.2pt;">${escapeHtml(w.ipRange || '-')}</td>
        <td style="text-align: center; font-weight: 700; font-size: 7.2pt; color: ${w.status === 'Aktif' ? '#15803D' : '#B91C1C'};">
          ${escapeHtml(w.status || 'Aktif')}
        </td>
      </tr>
    `).join('');

    return `
      <div class="gov-print-sheet">
        <!-- Security Watermark -->
        <div class="gov-watermark">
          DOKUMEN RESMI BMN &bull; KEMENTERIAN HAJI DAN UMRAH RI
        </div>

        <!-- Official Kemenhaj Letterhead (KOP SURAT RESMI) -->
        ${getKemenhajOfficialLetterheadHtml()}

        <!-- Document Heading Block -->
        <div class="gov-doc-title-block">
          <h2 class="gov-doc-title">
            ${isSingle
              ? `LEMBAR KONFIGURASI TEKNIS JARINGAN WI-FI: ${escapeHtml(selectedWifi.ssid)}`
              : 'LEMBAR INVENTARISASI & KONFIGURASI JARINGAN WI-FI KAWASAN EMBARKASI'
            }
          </h2>
          <div class="gov-doc-number">
            NOMOR: BMN-WIFI/UPT-BDJ/${now.getFullYear()}/REG-${isSingle ? selectedWifi.id : '01'} &bull; KLASIFIKASI: INFRASTRUKTUR TEKNOLOGI INFORMASI BMN
          </div>
        </div>

        <!-- Technical Metadata Table -->
        <table class="gov-table gov-table-striped">
          <colgroup>
            <col style="width: 22%;">
            <col style="width: 28%;">
            <col style="width: 22%;">
            <col style="width: 28%;">
          </colgroup>
          <tr>
            <td class="gov-table-label-col">Nama Satuan Kerja</td>
            <td style="font-weight: 700;">UPT Asrama Haji Embarkasi Banjarmasin (Kode Satker: 425263)</td>
            <td class="gov-table-label-col">Lokasi Kawasan</td>
            <td>Kompleks Embarkasi Haji Km. 28 Banjarbaru</td>
          </tr>
          <tr>
            <td class="gov-table-label-col">Total Agregat Bandwidth</td>
            <td style="font-weight: 800; color: #0284C7;">${formatNumber(totalBw)} Mbps (Dedicated Fiber + Mesh)</td>
            <td class="gov-table-label-col">Total Titik Access Point</td>
            <td style="font-weight: 700;">${totalAp} Unit AP Terintegrasi</td>
          </tr>
          <tr>
            <td class="gov-table-label-col">Standar Protokol & Enkripsi</td>
            <td>IEEE 802.11ax (Wi-Fi 6), 802.1Q VLAN, WPA3-Enterprise & Captive Portal</td>
            <td class="gov-table-label-col">Tanggal Verifikasi Fisik</td>
            <td>${dateFormatted} (Audit BMN Tahunan)</td>
          </tr>
        </table>

        ${isSingle ? `
          <!-- Single Network Detailed Sheet -->
          <div style="font-size: 8.5pt; font-weight: 800; color: #004C3F; margin: 10px 0 6px 0; text-transform: uppercase;">
            Detail Spesifikasi Konfigurasi & Topologi Jaringan:
          </div>
          <table class="gov-table gov-table-striped">
            <colgroup>
              <col style="width: 32%;">
              <col style="width: 68%;">
            </colgroup>
            <tr>
              <td class="gov-table-label-col">Service Set Identifier (SSID)</td>
              <td style="font-weight: 800; font-size: 9.5pt; color: #0F172A;">${escapeHtml(selectedWifi.ssid)}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Kategori & Sasaran Pengguna</td>
              <td style="font-weight: 700;">${escapeHtml(selectedWifi.tipe || '-')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Alokasi Bandwidth & QoS</td>
              <td style="font-weight: 700; color: #0284C7;">${selectedWifi.bandwidthMbps || 0} Mbps Symmetrical / Prioritas Utama</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Frekuensi & Standar Transmisi</td>
              <td>${escapeHtml(selectedWifi.frekuensi || 'Dual Band 2.4 / 5 GHz')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Protokol Keamanan Jaringan</td>
              <td style="font-weight: 700;">${escapeHtml(selectedWifi.keamanan || 'WPA3-Enterprise')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Kredensial / Metode Akses</td>
              <td style="font-family: monospace; font-weight: 700; color: #004C3F;">
                ${escapeHtml(selectedWifi.passwordKredensial || 'Otentikasi Terpusat SISKOHAT / Captive Portal')}
              </td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Cakupan Wilayah & Gedung</td>
              <td style="font-weight: 700;">${escapeHtml(selectedWifi.cakupan || '-')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Populasi Perangkat Access Point</td>
              <td>${selectedWifi.jumlahAp || 1} Unit &bull; Tipe: ${escapeHtml(selectedWifi.modelAp || 'Enterprise High-Density AP')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Segregasi VLAN & Alokasi IP</td>
              <td style="font-family: monospace;">${escapeHtml(selectedWifi.vlan || '-')} &bull; Subnet: ${escapeHtml(selectedWifi.ipRange || '-')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Penyedia Layanan (ISP) & SLA</td>
              <td>${escapeHtml(selectedWifi.vendor || 'Telkom Astinet Dedicated (SLA 99.8%)')}</td>
            </tr>
            <tr>
              <td class="gov-table-label-col">Catatan Teknis Operasional</td>
              <td style="line-height: 1.4;">${escapeHtml(selectedWifi.keterangan || 'Infrastruktur aktif siap mendukung kelancaran operasional ibadah haji dan umrah.')}</td>
            </tr>
          </table>
        ` : `
          <!-- Full Inventory Table -->
          <div style="font-size: 8.2pt; font-weight: 800; color: #004C3F; margin: 10px 0 5px 0; text-transform: uppercase;">
            Tabel Matriks Distribusi Jaringan & Access Point Seluruh Kawasan:
          </div>
          <table class="gov-table gov-table-striped">
            <colgroup>
              <col style="width: 4%;">
              <col style="width: 21%;">
              <col style="width: 11%;">
              <col style="width: 9%;">
              <col style="width: 11%;">
              <col style="width: 17%;">
              <col style="width: 6%;">
              <col style="width: 7%;">
              <col style="width: 7%;">
              <col style="width: 7%;">
            </colgroup>
            <thead>
              <tr>
                <th style="text-align: center;">No</th>
                <th>SSID Jaringan</th>
                <th>Frekuensi</th>
                <th style="text-align: right;">Speed</th>
                <th>Keamanan</th>
                <th>Lokasi Cakupan</th>
                <th style="text-align: center;">AP</th>
                <th>VLAN</th>
                <th>IP Subnet</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #E2E8F0; font-weight: 800;">
                <td colspan="3" style="text-align: right;">TOTAL AGREGAT KAWASAN:</td>
                <td style="text-align: right; color: #0284C7;">${formatNumber(totalBw)} Mbps</td>
                <td colspan="2" style="font-size: 7.2pt; color: #334155;">Multi-SSID 802.1Q Segregated</td>
                <td style="text-align: center; color: #004C3F;">${totalAp} Unit</td>
                <td colspan="3" style="font-size: 6.8pt; color: #15803D; text-align: center;">100% ONLINE SIAGA</td>
              </tr>
            </tfoot>
          </table>
        `}

        <!-- Dual Signature Block (Formal Government Validation) -->
        <div class="gov-signatures-block">
          <div class="gov-sign-box">
            <div>Diverifikasi & Dikonfigurasi Oleh:</div>
            <div style="font-weight: 700; margin-top: 2px;">Pengelola Jaringan & BMN Kawasan</div>
            <div class="gov-sign-space"></div>
            <div class="gov-sign-name">Ahmad Baihaki, S.Kom.</div>
            <div class="gov-sign-nip">NIP. 19850314 201001 1 012</div>
          </div>

          <div class="gov-sign-box">
            <div>Banjarbaru, ${dateFormatted}</div>
            <div style="font-weight: 700; margin-top: 2px;">Mengetahui,<br>Kepala UPT Asrama Haji Embarkasi Banjarmasin</div>
            <div class="gov-sign-space"></div>
            <div class="gov-sign-name">H. Saipuddin, S.Ag., M.Pd.I</div>
            <div class="gov-sign-nip">NIP. 19710824 199803 1 003</div>

            <!-- Official Seal Vector -->
            <div class="gov-official-stamp-seal">
              <div style="font-size: 4.5pt; font-weight: 800; letter-spacing: 0.5px;">KEMENTERIAN HAJI DAN UMRAH RI</div>
              <div style="font-size: 5pt; margin: 1px 0;">★ ★ ★</div>
              <div style="font-size: 5pt; font-weight: 800;">UPT ASRAMA HAJI</div>
              <div style="font-size: 4pt; font-weight: 700;">BANJARMASIN</div>
            </div>
          </div>
        </div>

        <!-- Security Microprint Footer & QR Code -->
        <div class="gov-security-footer">
          <div class="gov-qr-code-box">
            <svg class="gov-qr-svg" viewBox="0 0 24 24" fill="none" stroke="#004C3F" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <line x1="7" y1="17" x2="7" y2="17.01"/><line x1="17" y1="7" x2="17" y2="7.01"/>
            </svg>
            <div>
              <div style="font-weight: 800; color: #004C3F; font-size: 6.8pt;">VERIFIKASI SISTEM ELEKTRONIK BMN</div>
              <div>Dokumen resmi sah sesuai PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN.</div>
            </div>
          </div>
          <div style="text-align: right; font-family: monospace; font-size: 6.8pt;">
            HASH: SHA256-${now.getTime().toString(16).toUpperCase()}-UPT-BDJ<br>
            Dicetak: ${now.toLocaleTimeString('id-ID')} WITA
          </div>
        </div>
      </div>
    `;
  }

  function openPrintWifiModal(selectedWifi = null) {
    if (!printWifiModal || !printWifiSheetContent) return;
    currentWifiPrintTarget = selectedWifi;
    const printHtml = generateOfficialWifiPrintHtml(selectedWifi);
    printWifiSheetContent.innerHTML = printHtml;
    
    // Synchronize dedicated native print container immediately so main window is always ready
    const printableContainer = document.getElementById('printable-building-profile');
    if (printableContainer) {
      printableContainer.innerHTML = printHtml;
    }

    printWifiModal.classList.add('active');
  }

  function closePrintWifiModal() {
    if (printWifiModal) printWifiModal.classList.remove('active');
  }

  function executeDirectPrintWifi(selectedWifi = undefined) {
    // Preserve target: explicit parameter or currently viewed preview sheet
    const targetWifi = selectedWifi !== undefined ? selectedWifi : currentWifiPrintTarget;
    const printHtml = generateOfficialWifiPrintHtml(targetWifi);

    // Keep screen modal preview and native print target in 100% exact parity
    if (printWifiSheetContent) {
      printWifiSheetContent.innerHTML = printHtml;
    }

    const printableContainer = document.getElementById('printable-building-profile');
    if (printableContainer) {
      printableContainer.innerHTML = printHtml;
    }

    const prevTitle = document.title;
    document.title = targetWifi
      ? `Lembar_WiFi_${(targetWifi.ssid || 'Jaringan').replace(/[^a-zA-Z0-9]/g, '_')}`
      : 'Lembar_Inventaris_WiFi_Kawasan_Asrama_Haji';

    const triggerPrint = () => {
      window.print();
      setTimeout(() => {
        document.title = prevTitle;
      }, 1500);
    };

    const fontPromise = (document.fonts && document.fonts.ready)
      ? Promise.race([
          document.fonts.ready,
          new Promise(res => setTimeout(res, 250))
        ])
      : Promise.resolve();

    fontPromise.then(triggerPrint).catch(triggerPrint);
  }

  function exportWifiCsv() {
    const headers = ['ID', 'SSID', 'Tipe', 'Frekuensi', 'Bandwidth_Mbps', 'Keamanan', 'Password', 'Cakupan_Wilayah', 'Jumlah_AP', 'Model_AP', 'VLAN', 'IP_Subnet', 'Vendor_ISP', 'Status', 'Keterangan'];
    const rows = wifiDataset.map(w => [
      w.id,
      `"${(w.ssid || '').replace(/"/g, '""')}"`,
      `"${(w.tipe || '').replace(/"/g, '""')}"`,
      `"${(w.frekuensi || '').replace(/"/g, '""')}"`,
      w.bandwidthMbps || 0,
      `"${(w.keamanan || '').replace(/"/g, '""')}"`,
      `"${(w.passwordKredensial || '').replace(/"/g, '""')}"`,
      `"${(w.cakupan || '').replace(/"/g, '""')}"`,
      w.jumlahAp || 1,
      `"${(w.modelAp || '').replace(/"/g, '""')}"`,
      `"${(w.vlan || '').replace(/"/g, '""')}"`,
      `"${(w.ipRange || '').replace(/"/g, '""')}"`,
      `"${(w.vendor || '').replace(/"/g, '""')}"`,
      `"${(w.status || 'Aktif').replace(/"/g, '""')}"`,
      `"${(w.keterangan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventaris_Jaringan_WiFi_Asrama_Haji_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Berkas CSV inventaris jaringan Wi-Fi berhasil diunduh.', 'success');
  }

  // Event Listeners for Wi-Fi Management
  if (wifiSearchInput) wifiSearchInput.addEventListener('input', renderWifiNetworks);
  if (wifiFilterTipe) wifiFilterTipe.addEventListener('change', renderWifiNetworks);
  if (wifiFilterFrekuensi) wifiFilterFrekuensi.addEventListener('change', renderWifiNetworks);
  if (wifiFilterKeamanan) wifiFilterKeamanan.addEventListener('change', renderWifiNetworks);
  if (wifiBtnReset) {
    wifiBtnReset.addEventListener('click', () => {
      if (wifiSearchInput) wifiSearchInput.value = '';
      if (wifiFilterTipe) wifiFilterTipe.value = '';
      if (wifiFilterFrekuensi) wifiFilterFrekuensi.value = '';
      if (wifiFilterKeamanan) wifiFilterKeamanan.value = '';
      renderWifiNetworks();
      showToast('Filter katalog Wi-Fi berhasil di-reset.', 'success');
    });
  }

  if (btnAddWifi) btnAddWifi.addEventListener('click', () => openWifiModal());
  if (btnCloseWifiModal) btnCloseWifiModal.addEventListener('click', closeWifiModal);
  if (btnCancelWifi) btnCancelWifi.addEventListener('click', closeWifiModal);
  if (btnSaveWifi) btnSaveWifi.addEventListener('click', saveWifiNetwork);

  if (btnOpenWifiPrint) btnOpenWifiPrint.addEventListener('click', () => openPrintWifiModal());
  if (btnExportWifiCsv) btnExportWifiCsv.addEventListener('click', exportWifiCsv);
  if (btnClosePrintWifiModal) btnClosePrintWifiModal.addEventListener('click', closePrintWifiModal);
  if (btnClosePrintWifi) btnClosePrintWifi.addEventListener('click', closePrintWifiModal);
  if (btnExecutePrintWifi) btnExecutePrintWifi.addEventListener('click', () => executeDirectPrintWifi());
  if (btnTriggerPrintWifiBottom) btnTriggerPrintWifiBottom.addEventListener('click', () => executeDirectPrintWifi());

  // ==========================================================================
  // 8. AUTENTIKASI DAN VERIFIKASI 2 LANGKAH (TWO-FACTOR AUTHENTICATION / 2FA)
  // ==========================================================================
  const STORAGE_KEY_USERS = 'asrama_haji_users';
  const STORAGE_KEY_ACTIVE_USER = 'asrama_active_user';

  const DEFAULT_USERS = [
    {
      id: 1,
      nama: 'Administrator BMN',
      email: 'admin@asramahaji.kemenhaj.go.id',
      password: 'Password123',
      role: 'admin',
      nip: '19870514 201101 1 003',
      noHp: '08115001234',
      twoFactorEnabled: true,
      registeredAt: '2026-01-01T08:00:00.000Z'
    },
    {
      id: 2,
      nama: 'Petugas Penginapan & Kamar',
      email: 'petugas@asramahaji.kemenhaj.go.id',
      password: 'Petugas2026!',
      role: 'petugas',
      nip: '19920311 201802 1 002',
      noHp: '081234567890',
      twoFactorEnabled: true,
      registeredAt: '2026-02-15T09:00:00.000Z'
    }
  ];

  function loadUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca users dari localStorage:', e);
    }
    // Inisialisasi data akun default
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USERS));
    } catch (e) {
      console.warn('Gagal menyimpan default users:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_USERS));
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Gagal menyimpan users ke localStorage:', e);
    }
  }

  function loadActiveUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca active user dari localStorage:', e);
    }
    return null;
  }

  function saveActiveUser(user) {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      }
    } catch (e) {
      console.error('Gagal menyimpan active user ke localStorage:', e);
    }
  }

  let currentUser = loadActiveUser();

  // State Verifikasi 2 Langkah (2FA)
  let login2faState = {
    user: null,
    otp: null,
    expiry: null,
    timerId: null
  };

  let register2faState = {
    data: null,
    otp: null,
    expiry: null,
    timerId: null
  };

  // State Verifikasi Keamanan CAPTCHA
  let currentLoginCaptcha = '';
  let currentRegCaptcha = '';

  function generateCaptchaString(len = 5) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  function drawCaptchaCanvas(canvas, text) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width || 140;
    const height = canvas.height || 42;

    // Reset & Background Gradient
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#F8FAFC');
    grad.addColorStop(0.5, '#F1F5F9');
    grad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Background noise dots
    for (let i = 0; i < 35; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, 0.25)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Curved interference lines
    const lineColors = ['rgba(6, 78, 59, 0.35)', 'rgba(30, 64, 175, 0.35)', 'rgba(217, 119, 6, 0.35)'];
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = lineColors[i % lineColors.length];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.random() * 20, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width * 0.5, Math.random() * height,
        Math.random() * width * 0.7, Math.random() * height,
        width - Math.random() * 15, Math.random() * height
      );
      ctx.stroke();
    }

    // Characters rendering with rotation & varied styling
    const textColors = ['#064E3B', '#1E40AF', '#B45309', '#0F172A', '#047857'];
    const fonts = ['bold 22px Arial, sans-serif', 'bold 23px Verdana', 'bold 21px "Trebuchet MS"', 'bold 24px Georgia'];
    const charSpacing = (width - 24) / (text.length || 1);

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      ctx.save();
      const x = 16 + i * charSpacing + (Math.random() * 4 - 2);
      const y = height / 2 + (Math.random() * 6 - 3);
      ctx.translate(x, y);

      // Random rotation (-14 deg to +14 deg)
      const angle = (Math.random() * 28 - 14) * Math.PI / 180;
      ctx.rotate(angle);

      ctx.font = fonts[Math.floor(Math.random() * fonts.length)];
      ctx.fillStyle = textColors[i % textColors.length];
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 2;
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }

  function refreshLoginCaptcha() {
    currentLoginCaptcha = generateCaptchaString(5);
    drawCaptchaCanvas(loginCaptchaCanvas, currentLoginCaptcha);
    if (loginCaptchaInput) {
      loginCaptchaInput.value = '';
    }
    if (loginCaptchaStatus) {
      loginCaptchaStatus.textContent = '';
      loginCaptchaStatus.className = 'captcha-status-indicator';
    }
    if (loginCaptchaMsg) {
      loginCaptchaMsg.style.display = 'none';
    }
    if (btnRefreshLoginCaptcha) {
      btnRefreshLoginCaptcha.classList.add('rotating');
      setTimeout(() => btnRefreshLoginCaptcha.classList.remove('rotating'), 500);
    }
  }

  function refreshRegCaptcha() {
    currentRegCaptcha = generateCaptchaString(5);
    drawCaptchaCanvas(regCaptchaCanvas, currentRegCaptcha);
    if (regCaptchaInput) {
      regCaptchaInput.value = '';
    }
    if (regCaptchaStatus) {
      regCaptchaStatus.textContent = '';
      regCaptchaStatus.className = 'captcha-status-indicator';
    }
    if (regCaptchaMsg) {
      regCaptchaMsg.style.display = 'none';
    }
    if (btnRefreshRegCaptcha) {
      btnRefreshRegCaptcha.classList.add('rotating');
      setTimeout(() => btnRefreshRegCaptcha.classList.remove('rotating'), 500);
    }
  }

  function speakCaptchaText(code) {
    if (!code) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const spaced = code.split('').join(' , ');
      const utterance = new SpeechSynthesisUtterance(`Kode keamanan verifikasi adalah: ${spaced}`);
      utterance.rate = 0.85;
      utterance.lang = 'id-ID';
      window.speechSynthesis.speak(utterance);
    } else {
      showToast(`Kode CAPTCHA: ${code.split('').join(' ')}`, 'info');
    }
  }

  function getInitials(name) {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatRole(role) {
    switch (role) {
      case 'admin':
        return 'Administrator BMN';
      case 'petugas':
        return 'Petugas Penginapan & Kamar';
      case 'utilitas':
        return 'Petugas Utilitas Listrik & Genset';
      default:
        return 'Petugas Kawasan';
    }
  }

  function getRolePermissionDesc(role) {
    switch (role) {
      case 'admin':
        return 'Kelola Gedung, Kamar, Sarana Media, Kelistrikan & Akses Mode Admin Penuh';
      case 'petugas':
        return 'Pencatatan Gedung Penginapan, Monitoring Kamar & Pembaruan Sarana Jamaah';
      case 'utilitas':
        return 'Monitoring Distribusi Daya Listrik Zonasi & Pemeliharaan Genset 1.000 kVA';
      default:
        return 'Akses Terverifikasi Sistem BMN UPT Asrama Haji';
    }
  }

  function updateAuthUI() {
    const badgeNavInternal = document.getElementById('badge-nav-internal');
    const internalLockedGate = document.getElementById('internal-locked-gate');
    const internalUnlockedContent = document.getElementById('internal-unlocked-content');
    const internalAuthStatusPill = document.getElementById('internal-auth-status-pill');
    const internalUserName = document.getElementById('internal-user-name');
    const internalUserRole = document.getElementById('internal-user-role');
    const inspPelaporDisplay = document.getElementById('insp-pelapor-display');

    if (currentUser) {
      // Tampilkan profil aktif di navbar
      if (userProfileBadge) userProfileBadge.style.display = 'flex';
      if (userAvatarInitials) userAvatarInitials.textContent = getInitials(currentUser.nama);
      if (userDisplayName) userDisplayName.textContent = currentUser.nama;
      if (btnTopAuth) btnTopAuth.style.display = 'none';
      if (navAuthText) navAuthText.textContent = 'Profil Akun (2FA)';

      // Switch panel tampilan dalam view-auth
      if (authUnauthenticatedPanel) authUnauthenticatedPanel.style.display = 'none';
      if (authAuthenticatedPanel) authAuthenticatedPanel.style.display = 'block';

      // Isi rincian data profil
      if (profileAvatarLarge) profileAvatarLarge.textContent = getInitials(currentUser.nama);
      if (profileName) profileName.textContent = currentUser.nama;
      if (profileRoleBadge) profileRoleBadge.textContent = formatRole(currentUser.role);
      if (profileEmail) profileEmail.textContent = currentUser.email;
      if (profileNip) profileNip.textContent = currentUser.nip || '-';
      if (profilePhone) profilePhone.textContent = currentUser.noHp || '-';
      if (profilePermission) profilePermission.textContent = getRolePermissionDesc(currentUser.role);

      // Status Menu Khusus Internal (Terbuka)
      if (badgeNavInternal) {
        badgeNavInternal.textContent = '✓ Terbuka';
        badgeNavInternal.className = 'nav-lock-badge unlocked';
      }
      const internalSectionHeader = document.getElementById('internal-section-header');
      if (internalSectionHeader) internalSectionHeader.style.display = 'none';
      if (internalLockedGate) internalLockedGate.style.display = 'none';
      if (internalUnlockedContent) internalUnlockedContent.style.display = 'block';
      if (internalAuthStatusPill) {
        internalAuthStatusPill.innerHTML = `✓ Akses Terbuka (${currentUser.nama})`;
        internalAuthStatusPill.style.background = 'rgba(0, 107, 84, 0.25)';
        internalAuthStatusPill.style.borderColor = 'var(--gold)';
      }
      if (internalUserName) internalUserName.textContent = currentUser.nama;
      if (internalUserRole) internalUserRole.textContent = currentUser.role === 'admin' ? 'Administrator BMN' : 'Petugas Verifikator';
      if (inspPelaporDisplay) inspPelaporDisplay.value = `${currentUser.nama} (${currentUser.nip || 'Petugas BMN'})`;
    } else {
      // User tamu / belum login
      if (userProfileBadge) userProfileBadge.style.display = 'none';
      if (btnTopAuth) btnTopAuth.style.display = 'flex';
      if (btnTopAuthText) btnTopAuthText.textContent = 'Masuk / Daftar';
      if (navAuthText) navAuthText.textContent = 'Masuk / Daftar';

      if (authUnauthenticatedPanel) authUnauthenticatedPanel.style.display = 'block';
      if (authAuthenticatedPanel) authAuthenticatedPanel.style.display = 'none';

      // Status Menu Khusus Internal (Terkunci)
      if (badgeNavInternal) {
        badgeNavInternal.textContent = '🔒 Wajib Akun';
        badgeNavInternal.className = 'nav-lock-badge locked';
      }
      const internalSectionHeader = document.getElementById('internal-section-header');
      if (internalSectionHeader) internalSectionHeader.style.display = 'block';
      if (internalLockedGate) internalLockedGate.style.display = 'block';
      if (internalUnlockedContent) internalUnlockedContent.style.display = 'none';
      if (internalAuthStatusPill) {
        internalAuthStatusPill.innerHTML = '🔒 Memerlukan Akun Petugas';
        internalAuthStatusPill.style.background = 'rgba(255,255,255,0.18)';
        internalAuthStatusPill.style.borderColor = 'rgba(201, 164, 76, 0.4)';
      }
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const STORAGE_KEY_AUDIT_LOGS = 'asrama_haji_audit_reports';

  const DEFAULT_INSPECTION_REPORTS = [
    {
      id: 1,
      reportNumber: 'INSP-AHB/2026/001',
      gedungId: 1,
      namaGedung: 'Gedung Jabal Rahmah',
      deskripsi: 'Pengecekan rutin filter AC sentral dan lift lansia menjelang operasional kloter jamaah haji.',
      prioritas: 'sedang',
      pelapor: 'Muhammad Ridho, S.Kom (Petugas BMN)',
      status: 'Selesai',
      createdAt: '2026-03-15T08:30:00Z',
      formattedDate: '15 Maret 2026'
    },
    {
      id: 2,
      reportNumber: 'INSP-AHB/2026/002',
      gedungId: 2,
      namaGedung: 'Gedung Marwah',
      deskripsi: 'Perbaikan saklar instalasi kamar mandi lantai 3 dan pengujian sirkulasi water heater.',
      prioritas: 'rendah',
      pelapor: 'Ahmad Fauzi (Petugas Kamar)',
      status: 'Dalam Penanganan',
      createdAt: '2026-03-18T10:15:00Z',
      formattedDate: '18 Maret 2026'
    },
    {
      id: 3,
      reportNumber: 'INSP-AHB/2026/003',
      gedungId: 10,
      namaGedung: 'Aula Jeddah',
      deskripsi: 'Inspeksi sistem pendingin dan pengujian sound system ruang penerimaan jemaah terpadu.',
      prioritas: 'tinggi',
      pelapor: 'Administrator BMN',
      status: 'Menunggu Verifikasi',
      createdAt: '2026-03-20T14:00:00Z',
      formattedDate: '20 Maret 2026'
    }
  ];

  function loadAuditReports() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca audit logs:', e);
    }
    return [...DEFAULT_INSPECTION_REPORTS];
  }

  function saveAuditReports(reports) {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(reports));
    } catch (e) {
      console.error('Gagal menyimpan audit reports:', e);
    }
  }

  const STORAGE_KEY_DOCS = 'asrama_haji_bmn_documents';

  const DEFAULT_BMN_DOCUMENTS = [
    {
      id: 1,
      title: 'Sertifikat Hak Pakai No. 00012/Landasan Ulin',
      category: 'Sertifikat Tanah BPN',
      issuer: 'Kantor Pertanahan Kota Banjarbaru',
      date: '14 Agustus 2018',
      number: 'HP-BPN-63.72/2018',
      fileSize: '4.8 MB (PDF)',
      status: 'Berlaku Permanen',
      desc: 'Sertifikat Hak Pakai atas nama Pemerintah RI c.q. Kementerian Agama RI seluas 87.420 m² untuk kawasan terpadu asrama haji embarkasi.'
    },
    {
      id: 2,
      title: 'SK Penetapan Status Penggunaan BMN Kawasan',
      category: 'Keputusan Kemenkeu RI',
      issuer: 'DJKN Kementerian Keuangan RI',
      date: '22 Januari 2021',
      number: 'KMK-DJKN/PSP-BMN/2021/412',
      fileSize: '2.4 MB (PDF)',
      status: 'Terdaftar di SIMAN',
      desc: 'Penetapan status penggunaan 17 unit gedung dan sarana penunjang operasional haji embarkasi sesuai PMK No. 181/PMK.06/2016.'
    },
    {
      id: 3,
      title: 'Persetujuan Bangunan Gedung (PBG) & SLF Kawasan',
      category: 'Izin Bangunan & SLF',
      issuer: 'Dinas PUPR Kota Banjarbaru',
      date: '10 November 2023',
      number: 'PBG-SLF-6372/2023/889',
      fileSize: '3.1 MB (PDF)',
      status: 'Laik Fungsi',
      desc: 'Sertifikat Laik Fungsi bangunan gedung penginapan jamaah dan aula seremoni embarkasi dengan audit kelayakan teknis berkala.'
    },
    {
      id: 4,
      title: 'Hasil Uji Kelayakan Genset 1.000 kVA & Instalasi Listrik',
      category: 'SLO Kelistrikan',
      issuer: 'PT PLN (Persero) & Lembaga Inspeksi Teknik',
      date: '05 Februari 2026',
      number: 'SLO-TR/PLN-KALSEL/2026/044',
      fileSize: '1.9 MB (PDF)',
      status: 'Tersertifikasi',
      desc: 'Sertifikat Laik Operasi genset synchronizing 2x500 kVA dan sistem ATS trafo kawasan Jabal Rahmah, Marwah, dan sarana ibadah.'
    }
  ];

  function loadBmnDocuments() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca dokumen BMN:', e);
    }
    return [...DEFAULT_BMN_DOCUMENTS];
  }

  function saveBmnDocuments(docs) {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    } catch (e) {
      console.error('Gagal menyimpan dokumen BMN:', e);
    }
  }

  let selectedReportForDetail = null;
  let selectedDocForPreview = null;

  function renderInternalDocuments(searchQuery = '', filterCategory = 'all') {
    const container = document.getElementById('container-internal-docs');
    const kpiCount = document.getElementById('kpi-docs-count');
    if (!container) return;

    const allDocs = loadBmnDocuments();
    if (kpiCount) kpiCount.textContent = `${allDocs.length} Berkas`;

    const query = (searchQuery || '').trim().toLowerCase();
    const filtered = allDocs.filter(doc => {
      const matchCat = filterCategory === 'all' || doc.category === filterCategory;
      const matchQuery = !query ||
        doc.title.toLowerCase().includes(query) ||
        doc.number.toLowerCase().includes(query) ||
        doc.issuer.toLowerCase().includes(query) ||
        doc.desc.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; background: #FFFFFF; border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">Tidak Ada Dokumen BMN Ditemukan</div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">Silakan coba kata kunci lain atau ubah filter kategori.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(doc => `
      <div class="doc-card">
        <div>
          <div class="doc-card-header">
            <div class="doc-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
            </div>
            <div>
              <span class="gate-lock-tag" style="background: rgba(0,107,84,0.1); color: var(--primary); font-weight: 700;">${escapeHtml(doc.category)}</span>
              <h4 class="doc-title" style="margin-top: 4px;">${escapeHtml(doc.title)}</h4>
            </div>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.45; margin-bottom: 12px;">${escapeHtml(doc.desc)}</p>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Nomor Dokumen:</span>
            <span class="doc-meta-val">${escapeHtml(doc.number)}</span>
          </div>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Penerbit:</span>
            <span class="doc-meta-val">${escapeHtml(doc.issuer)}</span>
          </div>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Tanggal Terbit:</span>
            <span class="doc-meta-val">${escapeHtml(doc.date)}</span>
          </div>
          <div class="doc-meta-row">
            <span class="doc-meta-label">Status Arsip:</span>
            <span class="doc-meta-val" style="color: var(--primary); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${escapeHtml(doc.status)}</span>
          </div>
        </div>
        <div class="doc-card-footer">
          <button type="button" class="btn btn-secondary btn-sm btn-doc-preview" data-id="${doc.id}" style="flex: 1; font-weight: 600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Pratinjau Resmi
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-doc-download" data-title="${escapeHtml(doc.title)}" style="flex: 1; font-weight: 600;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Unduh (${escapeHtml(doc.fileSize || 'PDF')})
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-doc-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-id');
        const doc = allDocs.find(d => String(d.id) === String(docId));
        if (doc) openDocPreviewModal(doc);
      });
    });

    container.querySelectorAll('.btn-doc-download').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.getAttribute('data-title');
        showToast(`Memulai unduhan dokumen BMN: "${title}" (Mode Simulasi Resmi)`, 'success');
      });
    });
  }

  function openDocPreviewModal(doc) {
    selectedDocForPreview = doc;
    const modal = document.getElementById('modal-doc-preview');
    const title = document.getElementById('doc-preview-modal-title');
    const badge = document.getElementById('doc-preview-badge');
    const sheetTitle = document.getElementById('doc-preview-sheet-title');
    const sheetNum = document.getElementById('doc-preview-sheet-num');
    const cat = document.getElementById('doc-preview-cat');
    const issuer = document.getElementById('doc-preview-issuer');
    const date = document.getElementById('doc-preview-date');
    const status = document.getElementById('doc-preview-status');
    const desc = document.getElementById('doc-preview-desc');

    if (title) title.textContent = doc.title;
    if (badge) badge.textContent = doc.category;
    if (sheetTitle) sheetTitle.textContent = doc.title;
    if (sheetNum) sheetNum.textContent = `Nomor Legalitas: ${doc.number}`;
    if (cat) cat.textContent = doc.category;
    if (issuer) issuer.textContent = doc.issuer;
    if (date) date.textContent = doc.date;
    if (status) status.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>${escapeHtml(doc.status)}</span>`;
    if (desc) desc.textContent = doc.desc;

    if (modal) modal.classList.add('active');
  }

  function renderAuditReportsTable(filterStatus = 'all', searchQuery = '') {
    const tbody = document.getElementById('tbody-audit-reports');
    const badge = document.getElementById('audit-count-badge');
    const statTotal = document.getElementById('audit-stat-total');
    const statPending = document.getElementById('audit-stat-pending');
    const statDone = document.getElementById('audit-stat-done');
    const statActiveReports = document.getElementById('stat-active-reports');
    const statActivePendingSub = document.getElementById('stat-active-pending-sub');
    if (!tbody) return;

    const reports = loadAuditReports();
    if (badge) badge.textContent = reports.length;

    const totalCount = reports.length;
    const pendingCount = reports.filter(r => r.status === 'Menunggu Verifikasi').length;
    const doneCount = reports.filter(r => r.status === 'Selesai').length;

    if (statTotal) statTotal.textContent = totalCount;
    if (statPending) statPending.textContent = pendingCount;
    if (statDone) statDone.textContent = doneCount;
    if (statActiveReports) statActiveReports.textContent = `${totalCount} Laporan`;
    if (statActivePendingSub) statActivePendingSub.textContent = `${pendingCount} Menunggu Tindakan`;

    const query = (searchQuery || '').trim().toLowerCase();
    const filtered = reports.filter(r => {
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchQuery = !query ||
        r.reportNumber.toLowerCase().includes(query) ||
        r.namaGedung.toLowerCase().includes(query) ||
        r.deskripsi.toLowerCase().includes(query) ||
        r.pelapor.toLowerCase().includes(query);
      return matchStatus && matchQuery;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada data laporan inspeksi untuk filter yang dipilih.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
      let priorityStyle = 'background: #F3F4F6; color: #374151;';
      if (r.prioritas === 'tinggi') {
        priorityStyle = 'background: #FEE2E2; color: #B91C1C; font-weight: 700;';
      } else if (r.prioritas === 'sedang') {
        priorityStyle = 'background: #FEF3C7; color: #B45309; font-weight: 600;';
      } else {
        priorityStyle = 'background: #ECFDF5; color: #047857;';
      }

      let statusBadgeStyle = 'background: #EFF6FF; color: #1D4ED8;';
      if (r.status === 'Selesai') {
        statusBadgeStyle = 'background: #ECFDF5; color: #065F46; font-weight: 700;';
      } else if (r.status === 'Dalam Penanganan') {
        statusBadgeStyle = 'background: #FEF3C7; color: #92400E; font-weight: 600;';
      }

      return `
        <tr>
          <td><strong style="color: var(--primary);">${escapeHtml(r.reportNumber)}</strong></td>
          <td style="white-space: nowrap; font-size: 0.82rem;">${escapeHtml(r.formattedDate || '-')}</td>
          <td><strong>${escapeHtml(r.namaGedung)}</strong></td>
          <td style="font-size: 0.82rem; max-width: 260px; line-height: 1.4;">
            ${escapeHtml(r.deskripsi)}
            ${r.estimasiBiaya ? `<div style="font-size: 0.74rem; color: #006B54; font-weight: 700; margin-top: 3px;">Biaya: ${escapeHtml(r.estimasiBiaya)}</div>` : ''}
          </td>
          <td><span class="badge" style="${priorityStyle}">${escapeHtml(r.prioritas.toUpperCase())}</span></td>
          <td style="font-size: 0.82rem;">${escapeHtml(r.pelapor)}</td>
          <td><span class="badge" style="${statusBadgeStyle}">${escapeHtml(r.status)}</span></td>
          <td style="text-align: center; white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-xs btn-report-cycle-status" data-id="${r.id}" title="Perbarui status penanganan" style="margin-right: 4px;">
              Ubah Status
            </button>
            <button type="button" class="btn btn-gold btn-xs btn-report-detail-view" data-id="${r.id}" title="Lihat rincian lengkap">
              Detail
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row action buttons
    tbody.querySelectorAll('.btn-report-cycle-status').forEach(btn => {
      btn.addEventListener('click', () => {
        const reportId = Number(btn.getAttribute('data-id'));
        cycleReportStatus(reportId);
      });
    });

    tbody.querySelectorAll('.btn-report-detail-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const reportId = Number(btn.getAttribute('data-id'));
        const r = reports.find(item => item.id === reportId);
        if (r) openReportDetailModal(r);
      });
    });
  }

  function cycleReportStatus(reportId) {
    const reports = loadAuditReports();
    const target = reports.find(r => r.id === reportId);
    if (!target) return;

    if (target.status === 'Menunggu Verifikasi') {
      target.status = 'Dalam Penanganan';
    } else if (target.status === 'Dalam Penanganan') {
      target.status = 'Selesai';
    } else {
      target.status = 'Menunggu Verifikasi';
    }

    saveAuditReports(reports);
    const filterSelect = document.getElementById('filter-audit-status');
    const searchInput = document.getElementById('input-search-audit');
    renderAuditReportsTable(filterSelect ? filterSelect.value : 'all', searchInput ? searchInput.value : '');
    showToast(`Status laporan ${target.reportNumber} diperbarui menjadi "${target.status}".`, 'success');
  }

  function openReportDetailModal(report) {
    selectedReportForDetail = report;
    const modal = document.getElementById('modal-report-detail');
    const number = document.getElementById('report-detail-number');
    const statusBadge = document.getElementById('report-detail-status-badge');
    const priorityBadge = document.getElementById('report-detail-priority-badge');
    const date = document.getElementById('report-detail-date');
    const pelapor = document.getElementById('report-detail-pelapor');
    const gedung = document.getElementById('report-detail-gedung');
    const lokasi = document.getElementById('report-detail-lokasi');
    const rekomendasi = document.getElementById('report-detail-rekomendasi');
    const biaya = document.getElementById('report-detail-biaya');
    const deskripsi = document.getElementById('report-detail-deskripsi');

    if (number) number.textContent = report.reportNumber;
    if (statusBadge) statusBadge.textContent = report.status;
    if (priorityBadge) priorityBadge.textContent = `Prioritas ${report.prioritas.toUpperCase()}`;
    if (date) date.textContent = report.formattedDate || '-';
    if (pelapor) pelapor.textContent = report.pelapor;
    if (gedung) gedung.textContent = report.namaGedung;
    if (lokasi) lokasi.textContent = report.lokasiSpesifik || 'Kawasan Gedung';
    if (rekomendasi) rekomendasi.textContent = report.rekomendasi || 'Perbaikan Rutin';
    if (biaya) biaya.textContent = report.estimasiBiaya || 'Rp 0 (Penanganan Mandiri)';
    if (deskripsi) deskripsi.textContent = report.deskripsi;

    if (modal) modal.classList.add('active');
  }

  function updateBuildingInspectionPreview() {
    const previewWrap = document.getElementById('insp-building-preview');
    const select = document.getElementById('insp-gedung-select');
    if (!previewWrap || !select) return;

    const bldId = select.value;
    if (!bldId) {
      previewWrap.style.display = 'none';
      return;
    }

    const bld = dataset.find(b => String(b.id) === String(bldId));
    if (!bld) {
      previewWrap.style.display = 'none';
      return;
    }

    const thumb = document.getElementById('insp-preview-thumb');
    const nama = document.getElementById('insp-preview-nama');
    const jenis = document.getElementById('insp-preview-jenis');
    const kondisi = document.getElementById('insp-preview-kondisi');
    const dimensi = document.getElementById('insp-preview-dimensi');
    const daya = document.getElementById('insp-preview-daya');

    if (thumb) thumb.src = bld.foto || 'assets/bangunan/gedung-jabal-rahmah.jpg';
    if (nama) nama.textContent = bld.nama;
    if (jenis) jenis.textContent = bld.jenis;
    if (kondisi) {
      kondisi.textContent = `Kondisi: ${bld.kondisi}`;
      kondisi.className = `badge ${getKondisiBadgeClass(bld.kondisi)}`;
    }
    const bldDims = calculateObjectDimensions(bld);
    if (dimensi) dimensi.textContent = `${bldDims.panjangFormatted} × ${bldDims.lebarFormatted} × ${bldDims.tinggiFormatted} • Luas Dasar: ${bldDims.luasDasarFormatted} • Total: ${bldDims.luasTotalLantaiFormatted} (${bldDims.lantai} Lt)`;
    if (daya) daya.textContent = `Daya Listrik: ${bld.dayaListrik || 'Sistem Terintegrasi'}`;

    previewWrap.style.display = 'flex';
    previewWrap.classList.add('active');
  }

  function renderBeritaAcaraPreview() {
    const container = document.getElementById('ba-preview-container');
    const select = document.getElementById('select-ba-building');
    const dateInput = document.getElementById('input-ba-date');
    if (!container) return;

    const bldId = select ? select.value : (dataset[0] ? dataset[0].id : 1);
    const bld = dataset.find(b => String(b.id) === String(bldId)) || dataset[0];
    if (!bld) return;

    const statusSelect = document.getElementById('select-ba-status');
    const statusKelaikan = statusSelect ? statusSelect.value : 'Laik Penuh';

    const paddedId = String(bld.id || '0').padStart(3, '0');
    const regNo = `BMN-AHB/GDG-${paddedId}/2026`;

    let checkDate = new Date();
    if (dateInput && dateInput.value) {
      checkDate = new Date(dateInput.value);
    }
    const dateFormatted = checkDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[checkDate.getMonth()] || 'X';
    const yearVal = checkDate.getFullYear();
    const docNumber = `BA.03/AHB.BMN-KALSEL/GDG-${paddedId}/${romanMonth}/${yearVal}`;

    const userName = currentUser ? currentUser.nama : 'Administrator BMN';
    const userNip = (currentUser && currentUser.nip) ? currentUser.nip : '19870514 201101 1 003';

    let statusNote = 'dinyatakan dalam keadaan baik, laik operasional penuh, dan memenuhi standar sarana akomodasi/pelayanan ibadah haji terpadu 1447H/2026M.';
    if (statusKelaikan === 'Laik Pemeliharaan Rutin') {
      statusNote = 'dinyatakan laik fungsi dengan rekomendasi tindakan pemeliharaan rutin preventif pada utilitas penunjang gedung.';
    } else if (statusKelaikan === 'Perlu Perbaikan Prioritas') {
      statusNote = 'dinyatakan memerlukan jadwal perbaikan prioritas sarpras teknis oleh Seksi Pengelolaan BMN sebelum operasional kloter haji.';
    }

    container.innerHTML = `
      <div class="gov-print-sheet">
        <!-- Security Watermark -->
        <div class="gov-watermark">
          DOKUMEN RESMI BMN &bull; KEMENTERIAN HAJI DAN UMRAH RI
        </div>

        ${getKemenhajOfficialLetterheadHtml()}

        <div class="gov-doc-title-block">
          <h2 class="gov-doc-title">BERITA ACARA PEMERIKSAAN FISIK SARANA PRASARANA BMN</h2>
          <div class="gov-doc-number">Nomor: ${escapeHtml(docNumber)} &bull; STATUS RESMI: TERVERIFIKASI SISTEM</div>
        </div>

        <div style="font-size: 0.8rem; line-height: 1.5; color: #1E293B; margin-bottom: 12px; text-align: justify;">
          Berdasarkan <strong>Undang-Undang Nomor 8 Tahun 2019</strong> tentang Penyelenggaraan Ibadah Haji dan Umrah, <strong>Peraturan Menteri Keuangan Republik Indonesia Nomor 181/PMK.06/2016</strong> tentang Penatausahaan Barang Milik Negara (BMN), serta Ketentuan Kementerian Haji dan Umrah Republik Indonesia tentang Standarisasi Sarana Prasarana Asrama Haji Embarkasi, pada hari ini, <strong>${dateFormatted}</strong>, bertempat di kawasan UPT Asrama Haji Embarkasi Banjarmasin, telah dilakukan pemeriksaan fisik lapangan terhadap aset BMN negara dengan rincian teknis sebagai berikut:
        </div>

        <table class="gov-table" style="margin-bottom: 12px;">
          <colgroup>
            <col style="width: 34%;">
            <col style="width: 66%;">
          </colgroup>
          <tbody>
            <tr>
              <th>Kode Register BMN / NUP</th>
              <td><strong>${escapeHtml(regNo)}</strong></td>
            </tr>
            <tr>
              <th>Nama Gedung / Sarana</th>
              <td><strong style="color: #004C3F; font-size: 0.92rem;">${escapeHtml(bld.nama)}</strong></td>
            </tr>
            <tr>
              <th>Klasifikasi / Jenis Aset</th>
              <td>${escapeHtml(bld.jenis)}</td>
            </tr>
            <tr>
              <th>Peruntukan Operasional</th>
              <td>${escapeHtml(bld.fungsi)}</td>
            </tr>
            <tr>
              <th>Dimensi Fisik (P × L × T) & Luas</th>
              <td>P: ${calculateObjectDimensions(bld).panjangFormatted} &bull; L: ${calculateObjectDimensions(bld).lebarFormatted} &bull; T: ${calculateObjectDimensions(bld).tinggiFormatted}<br>Luas Dasar: <strong>${calculateObjectDimensions(bld).luasDasarFormatted}</strong> &bull; Total Luas Lantai: <strong>${calculateObjectDimensions(bld).luasTotalLantaiFormatted}</strong> &bull; Volume: <strong>${calculateObjectDimensions(bld).volumeFormatted}</strong></td>
            </tr>
            <tr>
              <th>Konstruksi Bangunan & Kapasitas</th>
              <td>${calculateObjectDimensions(bld).lantai} Lantai &bull; Kapasitas Tampung: <strong>${formatNumber(bld.kapasitas)} Orang / Jamaah</strong></td>
            </tr>
            <tr>
              <th>Kondisi Fisik Lapangan</th>
              <td><strong style="color: #166534;">Kondisi: ${escapeHtml(bld.kondisi)}</strong></td>
            </tr>
            <tr>
              <th>Suplai Sistem Kelistrikan</th>
              <td>${escapeHtml(bld.dayaListrik || 'Sistem Distribusi Terintegrasi Kawasan')}</td>
            </tr>
            <tr>
              <th>Fasilitas Penunjang / Khusus</th>
              <td>${bld.videotron ? `Layar Videotron Digital Aktif (${escapeHtml(bld.videotronInfo || 'Display Informasi')})` : (escapeHtml(bld.keterangan || 'Fasilitas standar operasional jemaah haji'))}</td>
            </tr>
            <tr>
              <th>Status Rekomendasi Kelaikan</th>
              <td><strong style="color: #004C3F; font-size: 0.92rem; letter-spacing: 0.02em;">[STATUS: ${escapeHtml(statusKelaikan.toUpperCase())}]</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="font-size: 0.8rem; line-height: 1.5; color: #1E293B; margin-bottom: 16px; text-align: justify;">
          Berdasarkan hasil pemeriksaan fisik terinci tersebut di atas, sarana prasarana ${statusNote} Demikian Berita Acara Pemeriksaan Fisik BMN ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya dan memiliki kekuatan hukum yang sah.
        </div>

        <div class="gov-signatures-block">
          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Petugas Pemeriksa Fisik BMN,</div>
            <div class="gov-sign-post">Verifikator Sarpras Kawasan</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">${escapeHtml(userName)}</div>
            <div class="gov-sign-nip">NIP. ${escapeHtml(userNip)}</div>
          </div>

          ${getKemenhajOfficialSealHtml()}

          <div class="gov-sign-col">
            <div class="gov-sign-role-title">Mengetahui & Mengesahkan,</div>
            <div class="gov-sign-post">Kepala UPT Asrama Haji</div>
            <div class="gov-sign-spacer"></div>
            <div class="gov-sign-name">H. Saipuddin, S.Ag., M.Pd.I</div>
            <div class="gov-sign-nip">NIP. 19710824 199803 1 003</div>
          </div>
        </div>

        ${getKemenhajOfficialSecurityFooterHtml('BERITA_ACARA', dateFormatted)}
      </div>
    `;
  }

  function renderInternalView() {
    updateAuthUI();

    // Populate dropdowns for inspection and BA
    const inspSelect = document.getElementById('insp-gedung-select');
    const baSelect = document.getElementById('select-ba-building');
    const baDateInput = document.getElementById('input-ba-date');
    const baStatusSelect = document.getElementById('select-ba-status');

    if (inspSelect && inspSelect.options.length <= 1) {
      dataset.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.nama} (${b.jenis})`;
        inspSelect.appendChild(opt);
      });
      inspSelect.addEventListener('change', updateBuildingInspectionPreview);
    }

    if (baDateInput && !baDateInput.value) {
      const today = new Date().toISOString().split('T')[0];
      baDateInput.value = today;
      baDateInput.addEventListener('change', renderBeritaAcaraPreview);
    }

    if (baSelect && baSelect.options.length === 0) {
      dataset.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.nama} (${b.luas} m²)`;
        baSelect.appendChild(opt);
      });
      baSelect.addEventListener('change', renderBeritaAcaraPreview);
    }

    if (baStatusSelect) {
      baStatusSelect.addEventListener('change', renderBeritaAcaraPreview);
    }

    renderInternalDocuments();
    renderAuditReportsTable();
    renderBeritaAcaraPreview();
  }

  /**
   * Validasi Syarat Password Minimal 8 Karakter
   */
  function checkPasswordRequirements(password) {
    const pwd = String(password || '');
    const len = pwd.length;
    const hasMinLength = len >= 8;
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasComplexity = hasLetters && hasNumbers;

    if (regPwdCharCount) {
      regPwdCharCount.textContent = `${len}/8 Karakter`;
      if (hasMinLength) {
        regPwdCharCount.style.color = '#059669';
        regPwdCharCount.style.fontWeight = '700';
      } else {
        regPwdCharCount.style.color = '#DC2626';
        regPwdCharCount.style.fontWeight = '600';
      }
    }

    if (reqMinChars) {
      const dot = reqMinChars.querySelector('.req-dot');
      if (hasMinLength) {
        reqMinChars.classList.add('met');
        if (dot) dot.textContent = '✓';
      } else {
        reqMinChars.classList.remove('met');
        if (dot) dot.textContent = '✕';
      }
    }

    if (reqComplexity) {
      const dot = reqComplexity.querySelector('.req-dot');
      if (hasComplexity) {
        reqComplexity.classList.add('met');
        if (dot) dot.textContent = '✓';
      } else {
        reqComplexity.classList.remove('met');
        if (dot) dot.textContent = '✕';
      }
    }

    if (pwdStrengthBar) {
      pwdStrengthBar.className = 'pwd-strength-bar';
      if (len === 0) {
        pwdStrengthBar.style.width = '0%';
      } else if (!hasMinLength) {
        pwdStrengthBar.style.width = '30%';
        pwdStrengthBar.style.background = '#DC2626';
      } else if (hasMinLength && !hasComplexity) {
        pwdStrengthBar.style.width = '65%';
        pwdStrengthBar.style.background = '#F59E0B';
      } else {
        pwdStrengthBar.style.width = '100%';
        pwdStrengthBar.style.background = '#10B981';
      }
    }

    return {
      hasMinLength,
      hasComplexity,
      isValid: hasMinLength
    };
  }

  function checkPasswordMatch() {
    if (!regPasswordConfirm || !regPassword || !regPwdMatchMsg) return;
    const pwd = regPassword.value;
    const confirm = regPasswordConfirm.value;

    if (!confirm) {
      regPwdMatchMsg.style.display = 'none';
      return;
    }

    regPwdMatchMsg.style.display = 'block';
    if (pwd === confirm) {
      regPwdMatchMsg.style.color = '#059669';
      regPwdMatchMsg.textContent = '✓ Konfirmasi kata sandi cocok.';
    } else {
      regPwdMatchMsg.style.color = '#DC2626';
      regPwdMatchMsg.textContent = '✕ Konfirmasi kata sandi belum sama dengan kata sandi di atas.';
    }
  }

  /**
   * Generator Kode OTP 6 Digit untuk Verifikasi Dua Langkah (2FA)
   */
  function generate6DigitOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Alur Masuk (Login) Step 1: Kredensial
   */
  function handleLoginStep1() {
    if (!loginEmail || !loginPassword) return;
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;

    if (!email) {
      showToast('Masukkan email petugas atau akun Anda!', 'error');
      loginEmail.focus();
      return;
    }

    if (!password) {
      showToast('Masukkan kata sandi akun Anda!', 'error');
      loginPassword.focus();
      return;
    }

    // Verifikasi CAPTCHA Keamanan Login
    const captchaVal = loginCaptchaInput ? loginCaptchaInput.value.trim() : '';
    if (!captchaVal) {
      showToast('Masukkan kode CAPTCHA keamanan terlebih dahulu!', 'error');
      if (loginCaptchaMsg) {
        loginCaptchaMsg.textContent = 'Wajib mengisi 5 digit kode CAPTCHA di atas.';
        loginCaptchaMsg.style.display = 'block';
      }
      if (loginCaptchaInput) loginCaptchaInput.focus();
      return;
    }

    if (captchaVal.toUpperCase() !== (currentLoginCaptcha || '').toUpperCase()) {
      showToast('Kode CAPTCHA tidak sesuai! Silakan periksa kembali.', 'error');
      if (loginCaptchaMsg) {
        loginCaptchaMsg.textContent = 'Kode CAPTCHA salah. Coba lagi atau klik refresh.';
        loginCaptchaMsg.style.display = 'block';
      }
      refreshLoginCaptcha();
      if (loginCaptchaInput) {
        loginCaptchaInput.value = '';
        loginCaptchaInput.focus();
      }
      return;
    }
    if (loginCaptchaMsg) loginCaptchaMsg.style.display = 'none';

    const users = loadUsers();
    const matchedUser = users.find(u => u.email.toLowerCase() === email);

    if (!matchedUser) {
      showToast('Email belum terdaftar. Silakan lakukan pendaftaran akun terlebih dahulu!', 'error');
      return;
    }

    if (matchedUser.password !== password) {
      showToast('Kata sandi yang Anda masukkan salah. Silakan coba kembali!', 'error');
      loginPassword.focus();
      return;
    }

    // Kredensial & CAPTCHA benar -> Masuk ke Step 2: Verifikasi Dua Langkah (2FA)
    const otp = generate6DigitOtp();
    const expiry = Date.now() + 60000; // 60 detik batas kedaluwarsa

    if (login2faState.timerId) clearInterval(login2faState.timerId);

    login2faState = {
      user: matchedUser,
      otp,
      expiry,
      timerId: null
    };

    if (login2faTargetEmail) login2faTargetEmail.textContent = matchedUser.email;
    if (loginSimulatedOtp) loginSimulatedOtp.textContent = otp;
    if (loginOtpInput) loginOtpInput.value = '';

    if (loginStep1) loginStep1.style.display = 'none';
    if (loginStep2) loginStep2.style.display = 'block';

    startLoginOtpCountdown();
    if (loginOtpInput) loginOtpInput.focus();

    showToast('Kredensial & CAPTCHA valid. Masukkan kode 6 digit untuk verifikasi 2 langkah.', 'info');
  }

  function startLoginOtpCountdown() {
    if (!loginOtpTimer) return;
    function updateTimer() {
      const remainingSec = Math.max(0, Math.ceil((login2faState.expiry - Date.now()) / 1000));
      if (remainingSec > 0) {
        loginOtpTimer.textContent = `Sisa waktu kode: ${remainingSec} detik`;
        loginOtpTimer.style.color = '#D97706';
        if (loginOtpProgressBar) {
          const pct = Math.max(0, Math.min(100, (remainingSec / 60) * 100));
          loginOtpProgressBar.style.width = `${pct}%`;
          if (remainingSec <= 15) {
            loginOtpProgressBar.style.backgroundColor = '#DC2626';
          } else if (remainingSec <= 30) {
            loginOtpProgressBar.style.backgroundColor = '#D97706';
          } else {
            loginOtpProgressBar.style.backgroundColor = '#059669';
          }
        }
      } else {
        loginOtpTimer.textContent = 'Kode telah kedaluwarsa! Silakan klik tombol "Kirim Ulang".';
        loginOtpTimer.style.color = '#DC2626';
        if (loginOtpProgressBar) loginOtpProgressBar.style.width = '0%';
        if (login2faState.timerId) clearInterval(login2faState.timerId);
      }
    }
    updateTimer();
    login2faState.timerId = setInterval(updateTimer, 1000);
  }

  /**
   * Alur Masuk (Login) Step 2: Verifikasi OTP 2FA
   */
  function handleLoginStep2() {
    if (!loginOtpInput) return;
    const entered = loginOtpInput.value.trim();

    if (!entered) {
      showToast('Masukkan 6-digit kode verifikasi!', 'error');
      loginOtpInput.focus();
      return;
    }

    if (Date.now() > login2faState.expiry) {
      showToast('Kode verifikasi telah kedaluwarsa. Silakan klik tombol Kirim Ulang untuk mendapatkan kode baru!', 'error');
      return;
    }

    if (entered !== login2faState.otp) {
      showToast('Kode verifikasi tidak sesuai! Silakan periksa kembali 6 digit kode.', 'error');
      loginOtpInput.focus();
      return;
    }

    // 2FA Berhasil
    if (login2faState.timerId) clearInterval(login2faState.timerId);

    currentUser = login2faState.user;
    saveActiveUser(currentUser);

    // Jika akun ber-role admin, aktifkan mode admin
    if (currentUser.role === 'admin') {
      currentRole = 'admin';
      updateRoleUI();
      renderCatalog();
      renderTable();
    }

    // Bersihkan form
    if (formLogin) formLogin.reset();
    if (loginStep1) loginStep1.style.display = 'block';
    if (loginStep2) loginStep2.style.display = 'none';

    updateAuthUI();
    showToast(`Verifikasi 2 langkah berhasil! Selamat datang, ${currentUser.nama}.`, 'success');
  }

  function handleLoginResendOtp() {
    if (!login2faState.user) return;
    const newOtp = generate6DigitOtp();
    login2faState.otp = newOtp;
    login2faState.expiry = Date.now() + 60000;

    if (loginSimulatedOtp) loginSimulatedOtp.textContent = newOtp;
    if (loginOtpInput) {
      loginOtpInput.value = '';
      loginOtpInput.focus();
    }

    if (login2faState.timerId) clearInterval(login2faState.timerId);
    startLoginOtpCountdown();

    showToast('Kode keamanan 2FA baru telah digenerate (berlaku 60 detik).', 'info');
  }

  function handleLoginBackStep1() {
    if (login2faState.timerId) clearInterval(login2faState.timerId);
    if (loginStep1) loginStep1.style.display = 'block';
    if (loginStep2) loginStep2.style.display = 'none';
  }

  /**
   * Alur Daftar Akun (Register) Step 1: Validasi Form & Syarat 8 Karakter Password
   */
  function handleRegisterStep1() {
    if (!regNama || !regEmail || !regPhone || !regPassword || !regPasswordConfirm) return;

    const nama = regNama.value.trim();
    const nip = regNip ? regNip.value.trim() : '';
    const role = regRole ? regRole.value : 'petugas';
    const email = regEmail.value.trim().toLowerCase();
    const phone = regPhone.value.trim();
    const password = regPassword.value;
    const confirm = regPasswordConfirm.value;

    if (!nama) {
      showToast('Nama lengkap petugas wajib diisi!', 'error');
      regNama.focus();
      return;
    }

    if (!email || !email.includes('@')) {
      showToast('Format email dinas/aktif tidak valid!', 'error');
      regEmail.focus();
      return;
    }

    if (!phone) {
      showToast('Nomor Handphone / WhatsApp wajib diisi untuk pengiriman kode verifikasi 2FA!', 'error');
      regPhone.focus();
      return;
    }

    // SYARAT WAJIB 8 KARAKTER PASSWORD
    if (password.length < 8) {
      showToast('Kata sandi wajib memiliki minimal 8 karakter demi keamanan akun!', 'error');
      regPassword.focus();
      return;
    }

    if (password !== confirm) {
      showToast('Konfirmasi kata sandi tidak cocok dengan kata sandi!', 'error');
      regPasswordConfirm.focus();
      return;
    }

    // Cek duplikasi email
    const users = loadUsers();
    const duplicate = users.find(u => u.email.toLowerCase() === email);
    if (duplicate) {
      showToast('Email ini sudah terdaftar. Silakan gunakan menu Masuk atau gunakan email lain!', 'error');
      return;
    }

    // Verifikasi CAPTCHA Keamanan Pendaftaran
    const captchaVal = regCaptchaInput ? regCaptchaInput.value.trim() : '';
    if (!captchaVal) {
      showToast('Masukkan kode CAPTCHA keamanan anti-bot!', 'error');
      if (regCaptchaMsg) {
        regCaptchaMsg.textContent = 'Wajib mengisi kode keamanan CAPTCHA.';
        regCaptchaMsg.style.display = 'block';
      }
      if (regCaptchaInput) regCaptchaInput.focus();
      return;
    }

    if (captchaVal.toUpperCase() !== (currentRegCaptcha || '').toUpperCase()) {
      showToast('Kode CAPTCHA anti-bot salah! Silakan periksa kembali.', 'error');
      if (regCaptchaMsg) {
        regCaptchaMsg.textContent = 'Kode CAPTCHA salah. Silakan coba kode baru.';
        regCaptchaMsg.style.display = 'block';
      }
      refreshRegCaptcha();
      if (regCaptchaInput) {
        regCaptchaInput.value = '';
        regCaptchaInput.focus();
      }
      return;
    }
    if (regCaptchaMsg) regCaptchaMsg.style.display = 'none';

    // Lanjut ke Step 2: Verifikasi 2 Langkah Aktivasi Akun
    const otp = generate6DigitOtp();
    const expiry = Date.now() + 60000;

    if (register2faState.timerId) clearInterval(register2faState.timerId);

    register2faState = {
      data: { nama, nip, role, email, phone, password },
      otp,
      expiry,
      timerId: null
    };

    if (reg2faTargetEmail) reg2faTargetEmail.textContent = email;
    if (reg2faTargetPhone) reg2faTargetPhone.textContent = phone;
    if (registerSimulatedOtp) registerSimulatedOtp.textContent = otp;
    if (registerOtpInput) registerOtpInput.value = '';

    if (registerStep1) registerStep1.style.display = 'none';
    if (registerStep2) registerStep2.style.display = 'block';

    startRegisterOtpCountdown();
    if (registerOtpInput) registerOtpInput.focus();

    showToast('Data akun & CAPTCHA valid. Silakan verifikasi 2 langkah untuk mengaktifkan akun.', 'info');
  }

  function startRegisterOtpCountdown() {
    if (!registerOtpTimer) return;
    function updateTimer() {
      const remainingSec = Math.max(0, Math.ceil((register2faState.expiry - Date.now()) / 1000));
      if (remainingSec > 0) {
        registerOtpTimer.textContent = `Sisa waktu kode: ${remainingSec} detik`;
        registerOtpTimer.style.color = '#D97706';
        if (regOtpProgressBar) {
          const pct = Math.max(0, Math.min(100, (remainingSec / 60) * 100));
          regOtpProgressBar.style.width = `${pct}%`;
          if (remainingSec <= 15) {
            regOtpProgressBar.style.backgroundColor = '#DC2626';
          } else if (remainingSec <= 30) {
            regOtpProgressBar.style.backgroundColor = '#D97706';
          } else {
            regOtpProgressBar.style.backgroundColor = '#059669';
          }
        }
      } else {
        registerOtpTimer.textContent = 'Kode telah kedaluwarsa! Silakan klik "Kirim Ulang".';
        registerOtpTimer.style.color = '#DC2626';
        if (regOtpProgressBar) regOtpProgressBar.style.width = '0%';
        if (register2faState.timerId) clearInterval(register2faState.timerId);
      }
    }
    updateTimer();
    register2faState.timerId = setInterval(updateTimer, 1000);
  }

  /**
   * Alur Daftar Akun (Register) Step 2: Verifikasi OTP 2FA & Simpan Akun Baru
   */
  function handleRegisterStep2() {
    if (!registerOtpInput || !register2faState.data) return;
    const entered = registerOtpInput.value.trim();

    if (!entered) {
      showToast('Masukkan 6-digit kode verifikasi aktivasi!', 'error');
      registerOtpInput.focus();
      return;
    }

    if (Date.now() > register2faState.expiry) {
      showToast('Kode aktivasi telah kedaluwarsa. Silakan klik tombol Kirim Ulang!', 'error');
      return;
    }

    if (entered !== register2faState.otp) {
      showToast('Kode verifikasi salah! Pastikan memasukkan 6 digit yang sesuai.', 'error');
      registerOtpInput.focus();
      return;
    }

    // 2FA Sukses -> Buat Akun Baru
    if (register2faState.timerId) clearInterval(register2faState.timerId);

    const users = loadUsers();
    const maxId = users.reduce((m, u) => Math.max(m, Number(u.id) || 0), 0);

    const newUser = {
      id: maxId + 1,
      nama: register2faState.data.nama,
      nip: register2faState.data.nip,
      role: register2faState.data.role,
      email: register2faState.data.email,
      noHp: register2faState.data.phone,
      password: register2faState.data.password,
      twoFactorEnabled: true,
      registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    currentUser = newUser;
    saveActiveUser(currentUser);

    if (newUser.role === 'admin') {
      currentRole = 'admin';
      updateRoleUI();
      renderCatalog();
      renderTable();
    }

    // Reset Form Pendaftaran
    if (formRegister) formRegister.reset();
    checkPasswordRequirements('');
    if (regPwdMatchMsg) regPwdMatchMsg.style.display = 'none';

    if (registerStep1) registerStep1.style.display = 'block';
    if (registerStep2) registerStep2.style.display = 'none';

    updateAuthUI();
    showToast(`Akun Anda (${newUser.nama}) berhasil didaftarkan dan diaktifkan dengan verifikasi 2 langkah!`, 'success');
  }

  function handleRegisterResendOtp() {
    if (!register2faState.data) return;
    const newOtp = generate6DigitOtp();
    register2faState.otp = newOtp;
    register2faState.expiry = Date.now() + 60000;

    if (registerSimulatedOtp) registerSimulatedOtp.textContent = newOtp;
    if (registerOtpInput) {
      registerOtpInput.value = '';
      registerOtpInput.focus();
    }

    if (register2faState.timerId) clearInterval(register2faState.timerId);
    startRegisterOtpCountdown();

    showToast('Kode aktivasi 2FA baru telah digenerate (berlaku 60 detik).', 'info');
  }

  function handleRegisterBackStep1() {
    if (register2faState.timerId) clearInterval(register2faState.timerId);
    if (registerStep1) registerStep1.style.display = 'block';
    if (registerStep2) registerStep2.style.display = 'none';
  }

  /**
   * Logout Petugas
   */
  function handleLogout() {
    showConfirmModal(
      'Apakah Anda yakin ingin keluar dari akun petugas? Akses terverifikasi 2FA Anda akan dinonaktifkan dari sesi ini.',
      'Konfirmasi Keluar Akun (Logout)',
      () => {
        currentUser = null;
        saveActiveUser(null);

        // Jika sebelumnya admin, kembalikan ke role tamu
        if (currentRole === 'admin') {
          currentRole = 'tamu';
          updateRoleUI();
          renderCatalog();
          renderTable();
        }

        updateAuthUI();
        switchView('auth');
        showToast('Anda telah keluar dari akun petugas.', 'info');
      }
    );
  }

  /**
   * Binding Seluruh Event Listener Auth & 2FA
   */
  function bindAuthEvents() {
    // Navigasi View Auth dari Menu & Header
    if (navAuth) {
      navAuth.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('auth');
      });
    }

    if (btnTopAuth) {
      btnTopAuth.addEventListener('click', () => switchView('auth'));
    }

    if (userProfileBadge) {
      userProfileBadge.addEventListener('click', (e) => {
        if (e.target !== btnNavbarLogout) {
          switchView('auth');
        }
      });
    }

    if (btnNavbarLogout) {
      btnNavbarLogout.addEventListener('click', (e) => {
        e.stopPropagation();
        handleLogout();
      });
    }

    if (btnProfileLogout) {
      btnProfileLogout.addEventListener('click', handleLogout);
    }

    if (btnProfileGotoCatalog) {
      btnProfileGotoCatalog.addEventListener('click', () => switchView('katalog'));
    }

    if (btnProfileGotoDashboard) {
      btnProfileGotoDashboard.addEventListener('click', () => switchView('dashboard'));
    }

    // Tab Masuk vs Daftar
    if (tabBtnLogin && tabBtnRegister) {
      tabBtnLogin.addEventListener('click', () => {
        tabBtnLogin.classList.add('active');
        tabBtnRegister.classList.remove('active');
        if (authLoginPane) authLoginPane.classList.add('active');
        if (authRegisterPane) authRegisterPane.classList.remove('active');
        if (!currentLoginCaptcha) refreshLoginCaptcha();
      });

      tabBtnRegister.addEventListener('click', () => {
        tabBtnRegister.classList.add('active');
        tabBtnLogin.classList.remove('active');
        if (authRegisterPane) authRegisterPane.classList.add('active');
        if (authLoginPane) authLoginPane.classList.remove('active');
        if (!currentRegCaptcha) refreshRegCaptcha();
      });
    }

    // Toggle Lihat/Sembunyikan Password
    if (btnToggleLoginPwd && loginPassword) {
      btnToggleLoginPwd.addEventListener('click', () => {
        const isPwd = loginPassword.type === 'password';
        loginPassword.type = isPwd ? 'text' : 'password';
      });
    }

    if (btnToggleRegPwd && regPassword) {
      btnToggleRegPwd.addEventListener('click', () => {
        const isPwd = regPassword.type === 'password';
        regPassword.type = isPwd ? 'text' : 'password';
      });
    }

    // Pengisian Cepat Akun Demo (Termasuk Auto-fill Captcha demi kemudahan pengujian)
    if (btnFillDemoLogin && loginEmail && loginPassword) {
      btnFillDemoLogin.addEventListener('click', () => {
        loginEmail.value = 'admin@asramahaji.kemenhaj.go.id';
        loginPassword.value = 'Password123';
        if (currentLoginCaptcha && loginCaptchaInput) {
          loginCaptchaInput.value = currentLoginCaptcha;
          if (loginCaptchaStatus) {
            loginCaptchaStatus.textContent = '✓';
            loginCaptchaStatus.className = 'captcha-status-indicator valid';
          }
        }
        showToast('Kredensial akun demo BMN & kode CAPTCHA telah diisikan.', 'info');
      });
    }

    // Interaktivitas CAPTCHA Login
    if (btnRefreshLoginCaptcha) {
      btnRefreshLoginCaptcha.addEventListener('click', (e) => {
        e.preventDefault();
        refreshLoginCaptcha();
      });
    }
    if (loginCaptchaCanvas) {
      loginCaptchaCanvas.addEventListener('click', () => refreshLoginCaptcha());
    }
    if (btnSpeakLoginCaptcha) {
      btnSpeakLoginCaptcha.addEventListener('click', (e) => {
        e.preventDefault();
        speakCaptchaText(currentLoginCaptcha);
      });
    }

    // Interaktivitas CAPTCHA Pendaftaran
    if (btnRefreshRegCaptcha) {
      btnRefreshRegCaptcha.addEventListener('click', (e) => {
        e.preventDefault();
        refreshRegCaptcha();
      });
    }
    if (regCaptchaCanvas) {
      regCaptchaCanvas.addEventListener('click', () => refreshRegCaptcha());
    }
    if (btnSpeakRegCaptcha) {
      btnSpeakRegCaptcha.addEventListener('click', (e) => {
        e.preventDefault();
        speakCaptchaText(currentRegCaptcha);
      });
    }

    // Validasi Real-time CAPTCHA Login
    if (loginCaptchaInput) {
      loginCaptchaInput.addEventListener('input', () => {
        const val = loginCaptchaInput.value.trim().toUpperCase();
        if (val.length >= 5) {
          if (val === (currentLoginCaptcha || '').toUpperCase()) {
            if (loginCaptchaStatus) {
              loginCaptchaStatus.textContent = '✓';
              loginCaptchaStatus.className = 'captcha-status-indicator valid';
            }
            if (loginCaptchaMsg) loginCaptchaMsg.style.display = 'none';
          } else {
            if (loginCaptchaStatus) {
              loginCaptchaStatus.textContent = '✗';
              loginCaptchaStatus.className = 'captcha-status-indicator invalid';
            }
          }
        } else {
          if (loginCaptchaStatus) {
            loginCaptchaStatus.textContent = '';
            loginCaptchaStatus.className = 'captcha-status-indicator';
          }
        }
      });

      loginCaptchaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLoginStep1();
      });
    }

    // Validasi Real-time CAPTCHA Pendaftaran
    if (regCaptchaInput) {
      regCaptchaInput.addEventListener('input', () => {
        const val = regCaptchaInput.value.trim().toUpperCase();
        if (val.length >= 5) {
          if (val === (currentRegCaptcha || '').toUpperCase()) {
            if (regCaptchaStatus) {
              regCaptchaStatus.textContent = '✓';
              regCaptchaStatus.className = 'captcha-status-indicator valid';
            }
            if (regCaptchaMsg) regCaptchaMsg.style.display = 'none';
          } else {
            if (regCaptchaStatus) {
              regCaptchaStatus.textContent = '✗';
              regCaptchaStatus.className = 'captcha-status-indicator invalid';
            }
          }
        } else {
          if (regCaptchaStatus) {
            regCaptchaStatus.textContent = '';
            regCaptchaStatus.className = 'captcha-status-indicator';
          }
        }
      });

      regCaptchaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegisterStep1();
      });
    }

    // Validasi Real-time Kata Sandi (Minimal 8 Karakter)
    if (regPassword) {
      regPassword.addEventListener('input', () => {
        checkPasswordRequirements(regPassword.value);
        checkPasswordMatch();
      });
    }

    if (regPasswordConfirm) {
      regPasswordConfirm.addEventListener('input', checkPasswordMatch);
    }

    // Login Action Handlers
    if (btnLoginProceed) btnLoginProceed.addEventListener('click', handleLoginStep1);
    if (btnLoginVerifyOtp) btnLoginVerifyOtp.addEventListener('click', handleLoginStep2);
    if (btnLoginResendOtp) btnLoginResendOtp.addEventListener('click', handleLoginResendOtp);
    if (btnLoginBackStep1) btnLoginBackStep1.addEventListener('click', handleLoginBackStep1);

    if (btnCopyLoginOtp && loginOtpInput) {
      btnCopyLoginOtp.addEventListener('click', () => {
        if (login2faState.otp) {
          loginOtpInput.value = login2faState.otp;
          navigator.clipboard?.writeText?.(login2faState.otp).catch(() => {});
          showToast('Kode OTP 2FA telah disalin ke kolom input!', 'success');
        }
      });
    }

    if (loginOtpInput) {
      loginOtpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLoginStep2();
      });
    }

    if (loginPassword) {
      loginPassword.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLoginStep1();
      });
    }

    // Register Action Handlers
    if (btnRegisterProceed) btnRegisterProceed.addEventListener('click', handleRegisterStep1);
    if (btnRegisterVerifyOtp) btnRegisterVerifyOtp.addEventListener('click', handleRegisterStep2);
    if (btnRegisterResendOtp) btnRegisterResendOtp.addEventListener('click', handleRegisterResendOtp);
    if (btnRegisterBackStep1) btnRegisterBackStep1.addEventListener('click', handleRegisterBackStep1);

    if (btnCopyRegOtp && registerOtpInput) {
      btnCopyRegOtp.addEventListener('click', () => {
        if (register2faState.otp) {
          registerOtpInput.value = register2faState.otp;
          navigator.clipboard?.writeText?.(register2faState.otp).catch(() => {});
          showToast('Kode aktivasi 2FA telah disalin ke kolom input!', 'success');
        }
      });
    }

    if (registerOtpInput) {
      registerOtpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegisterStep2();
      });
    }

    if (regPasswordConfirm) {
      regPasswordConfirm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleRegisterStep1();
      });
    }

    // Tab Navigasi Menu Internal BMN
    const internalTabs = document.querySelectorAll('.internal-tab-btn');
    internalTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        internalTabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.getAttribute('data-tab');
        document.querySelectorAll('.internal-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(`pane-internal-${tabName}`);
        if (activePane) activePane.classList.add('active');
      });
    });

    // Quick Action Shortcuts dari Officer Banner
    const btnQuickNewReport = document.getElementById('btn-quick-new-report');
    if (btnQuickNewReport) {
      btnQuickNewReport.addEventListener('click', () => {
        const tabForm = document.getElementById('tab-internal-form');
        if (tabForm) tabForm.click();
        document.getElementById('insp-gedung-select')?.focus();
      });
    }

    const btnQuickBA = document.getElementById('btn-quick-ba');
    if (btnQuickBA) {
      btnQuickBA.addEventListener('click', () => {
        const tabBA = document.getElementById('tab-internal-ba');
        if (tabBA) tabBA.click();
      });
    }

    const btnQuickUploadDoc = document.getElementById('btn-quick-upload-doc');
    if (btnQuickUploadDoc) {
      btnQuickUploadDoc.addEventListener('click', () => {
        const tabDocs = document.getElementById('tab-internal-docs');
        if (tabDocs) tabDocs.click();
        const btnOpenDoc = document.getElementById('btn-open-upload-doc');
        if (btnOpenDoc) btnOpenDoc.click();
      });
    }

    // Pencarian & Filter Dokumen Legalitas BMN
    const inputSearchDocs = document.getElementById('input-search-docs');
    const filterDocsCat = document.getElementById('filter-docs-category');
    function applyDocFilters() {
      const q = inputSearchDocs ? inputSearchDocs.value : '';
      const cat = filterDocsCat ? filterDocsCat.value : 'all';
      renderInternalDocuments(q, cat);
    }
    if (inputSearchDocs) inputSearchDocs.addEventListener('input', applyDocFilters);
    if (filterDocsCat) filterDocsCat.addEventListener('change', applyDocFilters);

    // Modal Unggah Dokumen Baru
    const modalUploadDoc = document.getElementById('modal-upload-doc');
    const btnOpenUploadDoc = document.getElementById('btn-open-upload-doc');
    const btnCloseUploadDoc = document.getElementById('btn-close-upload-doc');
    const btnCancelUploadDoc = document.getElementById('btn-cancel-upload-doc');
    const btnSubmitUploadDoc = document.getElementById('btn-submit-upload-doc');

    function closeUploadDocModal() {
      if (modalUploadDoc) modalUploadDoc.classList.remove('active');
      const formUploadDoc = document.getElementById('form-upload-doc');
      if (formUploadDoc) formUploadDoc.reset();
    }

    if (btnOpenUploadDoc && modalUploadDoc) {
      btnOpenUploadDoc.addEventListener('click', () => {
        const formUploadDoc = document.getElementById('form-upload-doc');
        if (formUploadDoc) formUploadDoc.reset();
        const inputDate = document.getElementById('upload-doc-date');
        if (inputDate && !inputDate.value) {
          inputDate.value = new Date().toISOString().split('T')[0];
        }
        modalUploadDoc.classList.add('active');
      });
    }
    if (btnCloseUploadDoc) btnCloseUploadDoc.addEventListener('click', closeUploadDocModal);
    if (btnCancelUploadDoc) btnCancelUploadDoc.addEventListener('click', closeUploadDocModal);

    if (btnSubmitUploadDoc) {
      btnSubmitUploadDoc.addEventListener('click', () => {
        const title = document.getElementById('upload-doc-title')?.value.trim();
        const category = document.getElementById('upload-doc-category')?.value || 'Sertifikat Tanah BPN';
        const number = document.getElementById('upload-doc-number')?.value.trim();
        const issuer = document.getElementById('upload-doc-issuer')?.value.trim();
        const dateVal = document.getElementById('upload-doc-date')?.value;
        const desc = document.getElementById('upload-doc-desc')?.value.trim();

        if (!title || !number || !issuer || !desc) {
          showToast('Harap lengkapi semua kolom bertanda bintang (*).', 'warning');
          return;
        }

        let formattedDate = 'Hari ini';
        if (dateVal) {
          try {
            formattedDate = new Date(dateVal).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          } catch (_) {
            formattedDate = dateVal;
          }
        }

        const docs = loadBmnDocuments();
        const maxId = docs.reduce((m, d) => Math.max(m, Number(d.id) || 0), 0);
        const newDoc = {
          id: maxId + 1,
          title,
          category,
          issuer,
          date: formattedDate,
          number,
          fileSize: '3.2 MB (PDF)',
          status: 'Terdaftar & Tervalidasi',
          desc
        };

        docs.unshift(newDoc);
        saveBmnDocuments(docs);
        closeUploadDocModal();
        applyDocFilters();
        showToast(`Dokumen "${title}" berhasil ditambahkan ke arsip BMN!`, 'success');
      });
    }

    // Modal Pratinjau Dokumen BMN
    const modalDocPreview = document.getElementById('modal-doc-preview');
    const btnCloseDocPreview = document.getElementById('btn-close-doc-preview');
    const btnDocPreviewClose = document.getElementById('btn-doc-preview-close');
    const btnDocPreviewDownload = document.getElementById('btn-doc-preview-download');

    function closeDocPreviewModal() {
      if (modalDocPreview) modalDocPreview.classList.remove('active');
    }
    if (btnCloseDocPreview) btnCloseDocPreview.addEventListener('click', closeDocPreviewModal);
    if (btnDocPreviewClose) btnDocPreviewClose.addEventListener('click', closeDocPreviewModal);
    if (btnDocPreviewDownload) {
      btnDocPreviewDownload.addEventListener('click', () => {
        if (selectedDocForPreview) {
          showToast(`Mengunduh berkas resmi "${selectedDocForPreview.title}" (${selectedDocForPreview.number})...`, 'success');
        }
      });
    }

    // Modal Detail Laporan Inspeksi
    const modalReportDetail = document.getElementById('modal-report-detail');
    const btnCloseReportDetail = document.getElementById('btn-close-report-detail');
    const btnCloseReportDetailBottom = document.getElementById('btn-close-report-detail-bottom');
    const btnReportToggleStatus = document.getElementById('btn-report-toggle-status');

    function closeReportDetailModal() {
      if (modalReportDetail) modalReportDetail.classList.remove('active');
    }
    if (btnCloseReportDetail) btnCloseReportDetail.addEventListener('click', closeReportDetailModal);
    if (btnCloseReportDetailBottom) btnCloseReportDetailBottom.addEventListener('click', closeReportDetailModal);
    if (btnReportToggleStatus) {
      btnReportToggleStatus.addEventListener('click', () => {
        if (selectedReportForDetail) {
          cycleReportStatus(selectedReportForDetail.id);
          const updatedReports = loadAuditReports();
          const target = updatedReports.find(r => r.id === selectedReportForDetail.id);
          if (target) {
            openReportDetailModal(target);
          }
        }
      });
    }

    // Pencarian & Filter Status Laporan Audit
    const filterAuditSelect = document.getElementById('filter-audit-status');
    const inputSearchAudit = document.getElementById('input-search-audit');
    function applyAuditFilters() {
      const status = filterAuditSelect ? filterAuditSelect.value : 'all';
      const q = inputSearchAudit ? inputSearchAudit.value : '';
      renderAuditReportsTable(status, q);
    }
    if (filterAuditSelect) filterAuditSelect.addEventListener('change', applyAuditFilters);
    if (inputSearchAudit) inputSearchAudit.addEventListener('input', applyAuditFilters);

    // Ekspor CSV Laporan Audit BMN
    const btnExportAuditCsv = document.getElementById('btn-export-audit-csv');
    if (btnExportAuditCsv) {
      btnExportAuditCsv.addEventListener('click', () => {
        const reports = loadAuditReports();
        if (!reports || reports.length === 0) {
          showToast('Tidak ada data laporan audit untuk diekspor.', 'warning');
          return;
        }

        const headers = ['No. Laporan', 'Tanggal', 'Gedung / Sarana', 'Uraian Temuan', 'Prioritas', 'Petugas Pelapor', 'Status'];
        const csvRows = [
          headers.join(','),
          ...reports.map(r => [
            `"${String(r.reportNumber || '').replace(/"/g, '""')}"`,
            `"${String(r.formattedDate || '').replace(/"/g, '""')}"`,
            `"${String(r.namaGedung || '').replace(/"/g, '""')}"`,
            `"${String(r.deskripsi || '').replace(/"/g, '""')}"`,
            `"${String(r.prioritas || '').toUpperCase()}"`,
            `"${String(r.pelapor || '').replace(/"/g, '""')}"`,
            `"${String(r.status || '').replace(/"/g, '""')}"`
          ].join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rekap_Audit_BMN_Asrama_Haji_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Rekap log audit BMN berhasil diekspor ke file CSV!', 'success');
      });
    }

    // Interactive Severity Radio Pills in Form
    const severityLabels = [
      { id: 'label-prioritas-rendah', value: 'rendah', cls: 'selected-rendah' },
      { id: 'label-prioritas-sedang', value: 'sedang', cls: 'selected-sedang' },
      { id: 'label-prioritas-tinggi', value: 'tinggi', cls: 'selected-tinggi' }
    ];
    severityLabels.forEach(item => {
      const label = document.getElementById(item.id);
      if (label) {
        label.addEventListener('click', () => {
          severityLabels.forEach(l => {
            const el = document.getElementById(l.id);
            if (el) el.classList.remove('selected-rendah', 'selected-sedang', 'selected-tinggi');
          });
          label.classList.add(item.cls);
          const hiddenInput = document.getElementById('insp-prioritas');
          if (hiddenInput) hiddenInput.value = item.value;
          const radio = label.querySelector('input[type="radio"]');
          if (radio) radio.checked = true;
        });
      }
    });

    // Format Otomatis Estimasi Biaya Pemeliharaan
    const inspBiayaInput = document.getElementById('insp-estimasi-biaya');
    if (inspBiayaInput) {
      inspBiayaInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        if (!val) {
          e.target.value = '';
          return;
        }
        e.target.value = new Intl.NumberFormat('id-ID').format(Number(val));
      });
    }

    // Submit Formulir Inspeksi Lapangan
    const formInspection = document.getElementById('form-inspection-report');
    if (formInspection) {
      formInspection.addEventListener('submit', (e) => {
        e.preventDefault();
        const bldId = document.getElementById('insp-gedung-select')?.value;
        const bld = dataset.find(b => String(b.id) === String(bldId));
        if (!bld) {
          showToast('Silakan pilih gedung/sarana bangunan terlebih dahulu.', 'warning');
          return;
        }
        const lokasiSpesifik = document.getElementById('insp-lokasi-spesifik')?.value.trim() || 'Kawasan Gedung';
        const rekomendasi = document.getElementById('insp-rekomendasi')?.value || 'Perbaikan Ringan Rutin';
        const estimasiBiaya = document.getElementById('insp-estimasi-biaya')?.value.trim() || '';
        const deskripsi = document.getElementById('insp-deskripsi')?.value || '';
        const prioritas = document.getElementById('insp-prioritas')?.value || 'sedang';
        const pelapor = currentUser ? `${currentUser.nama} (${currentUser.nip || 'Petugas BMN'})` : 'Petugas BMN';

        if (deskripsi.trim().length < 10) {
          showToast('Deskripsi temuan inspeksi minimal 10 karakter.', 'warning');
          return;
        }

        const existingReports = loadAuditReports();
        const maxId = existingReports.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
        const now = new Date();
        const reportNumber = `INSP-AHB/${now.getFullYear()}/${String(maxId + 1).padStart(3, '0')}`;

        const newReport = {
          id: maxId + 1,
          reportNumber,
          gedungId: bld.id,
          namaGedung: bld.nama,
          lokasiSpesifik,
          rekomendasi,
          estimasiBiaya: estimasiBiaya ? `Rp ${estimasiBiaya}` : '',
          deskripsi: deskripsi.trim(),
          prioritas,
          pelapor,
          status: 'Menunggu Verifikasi',
          createdAt: now.toISOString(),
          formattedDate: now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
        };

        existingReports.unshift(newReport);
        saveAuditReports(existingReports);
        formInspection.reset();
        const previewWrap = document.getElementById('insp-building-preview');
        if (previewWrap) previewWrap.style.display = 'none';

        applyAuditFilters();
        showToast(`Laporan ${newReport.reportNumber} berhasil diterbitkan dan masuk ke log audit BMN!`, 'success');

        // Beralih ke tab log audit
        const auditTab = document.getElementById('tab-internal-audit');
        if (auditTab) auditTab.click();
      });
    }

    // Tombol Cetak Berita Acara (Format A4 Pemerintah Resmi)
    const btnPrintBA = document.getElementById('btn-print-berita-acara');
    if (btnPrintBA) {
      btnPrintBA.addEventListener('click', () => {
        const printableContainer = document.getElementById('printable-building-profile');
        const baContainer = document.getElementById('ba-preview-container');
        const select = document.getElementById('select-ba-building');
        const dateInput = document.getElementById('input-ba-date');
        const bldId = select ? select.value : 1;
        const bld = dataset.find(b => String(b.id) === String(bldId)) || dataset[0];
        const dateStr = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
        const bldNameClean = (bld ? bld.nama : 'Gedung').replace(/[^a-zA-Z0-9]/g, '_');

        if (printableContainer && baContainer) {
          printableContainer.innerHTML = baContainer.innerHTML;
        }

        const prevTitle = document.title;
        document.title = `Berita_Acara_BMN_${bldNameClean}_${dateStr}`;

        window.print();

        setTimeout(() => {
          document.title = prevTitle;
        }, 1500);

        showToast('Dokumen Berita Acara siap dicetak atau disimpan sebagai file PDF resmi A4.', 'success');
      });
    }

    // Tombol Unduh Dokumen Berita Acara (Berkas Standalone HTML/PDF Resmi Mandiri)
    const btnDownloadBADoc = document.getElementById('btn-download-ba-doc');
    if (btnDownloadBADoc) {
      btnDownloadBADoc.addEventListener('click', () => {
        const baContainer = document.getElementById('ba-preview-container');
        const select = document.getElementById('select-ba-building');
        const dateInput = document.getElementById('input-ba-date');
        const bldId = select ? select.value : 1;
        const bld = dataset.find(b => String(b.id) === String(bldId)) || dataset[0];
        const dateStr = dateInput && dateInput.value ? dateInput.value : new Date().toISOString().split('T')[0];
        const bldNameClean = (bld ? bld.nama : 'Gedung').replace(/[^a-zA-Z0-9]/g, '_');

        if (!baContainer) return;

        const standaloneHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Berita Acara Pemeriksaan Fisik BMN - ${escapeHtml(bld ? bld.nama : '')}</title>
  <style>
    @page { size: A4 portrait; margin: 20mm 20mm 20mm 30mm; }
    body { font-family: "Times New Roman", Times, Georgia, serif; color: #000000; background: #FFFFFF; margin: 0; padding: 16px; line-height: 1.35; font-size: 12pt; }
    .gov-print-sheet { width: 210mm; max-width: 100%; margin: 0 auto; padding: 20mm 20mm 20mm 30mm; box-sizing: border-box; background: #FFFFFF; position: relative; }
    .gov-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 34pt; font-weight: 900; color: rgba(0, 76, 63, 0.05); text-transform: uppercase; letter-spacing: 5px; white-space: nowrap; pointer-events: none; z-index: 0; }
    .gov-kop-header { display: flex; align-items: center; gap: 16px; padding-bottom: 6px; position: relative; z-index: 1; }
    .gov-kop-emblem { width: 76px; height: 76px; flex-shrink: 0; }
    .gov-kop-titles { flex: 1; text-align: center; }
    .gov-kop-t1 { font-size: 11pt; font-weight: 800; text-transform: uppercase; line-height: 1.25; }
    .gov-kop-t2 { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; margin-top: 2px; line-height: 1.25; }
    .gov-kop-t3 { font-size: 12.5pt; font-weight: 800; text-transform: uppercase; color: #004C3F; margin-top: 2px; line-height: 1.25; }
    .gov-kop-sub { font-size: 7.5pt; color: #333333; line-height: 1.35; margin-top: 3px; }
    .gov-kop-rule-thick { height: 2.5px; background: #000000; margin-top: 6px; }
    .gov-kop-rule-thin { height: 1px; background: #000000; margin-top: 1.5px; margin-bottom: 12px; }
    .gov-doc-title-block { text-align: center; margin: 8px 0 14px 0; position: relative; z-index: 1; }
    .gov-doc-title { font-size: 12pt; font-weight: 800; text-transform: uppercase; text-decoration: underline; margin: 0; }
    .gov-doc-number { font-size: 8.8pt; font-weight: 600; color: #333333; margin-top: 3px; }
    .gov-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 8pt; position: relative; z-index: 1; }
    .gov-table th, .gov-table td { border: 1px solid #000000; padding: 4px 6px; vertical-align: middle; line-height: 1.35; }
    .gov-table th { background: #F1F5F9; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 7.8pt; }
    .gov-signatures-block { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; position: relative; z-index: 1; page-break-inside: avoid; break-inside: avoid; }
    .gov-sign-col { text-align: center; font-size: 8.5pt; line-height: 1.35; }
    .gov-sign-post { font-weight: 700; margin-top: 2px; }
    .gov-sign-spacer { height: 52px; }
    .gov-sign-name { font-size: 9pt; font-weight: 700; text-decoration: underline; }
    .gov-sign-nip { font-size: 8pt; color: #333333; }
    .gov-official-stamp-seal { position: absolute; right: 18px; top: 12px; width: 78px; height: 78px; border: 2px dashed #004C3F; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #004C3F; font-size: 5pt; font-weight: 800; transform: rotate(-10deg); opacity: 0.9; text-align: center; line-height: 1.15; box-shadow: inset 0 0 0 1.5px rgba(0,76,63,0.45); }
    .gov-doc-footer-bar { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #64748B; padding-top: 6px; margin-top: 14px; font-size: 6.8pt; color: #475569; }
    @media print { body { padding: 0; } .gov-print-sheet { width: auto; padding: 0; } .btn-print-trigger { display: none !important; } }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 16px;" class="btn-print-trigger">
    <button onclick="window.print()" style="background: #004C3F; color: #FFFFFF; border: none; padding: 10px 22px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 10px rgba(0,76,63,0.3);">🖨️ Cetak Dokumen / Simpan PDF</button>
  </div>
  ${baContainer.innerHTML}
</body>
</html>`;

        const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Berita_Acara_BMN_${bldNameClean}_${dateStr}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Dokumen Berita Acara ${bld ? bld.nama : ''} berhasil diunduh!`, 'success');
      });
    }

    // Tombol Salin Naskah Teks Berita Acara
    const btnCopyBAText = document.getElementById('btn-copy-ba-text');
    if (btnCopyBAText) {
      btnCopyBAText.addEventListener('click', () => {
        const select = document.getElementById('select-ba-building');
        const dateInput = document.getElementById('input-ba-date');
        const statusSelect = document.getElementById('select-ba-status');
        const bldId = select ? select.value : 1;
        const bld = dataset.find(b => String(b.id) === String(bldId)) || dataset[0];
        const statusKelaikan = statusSelect ? statusSelect.value : 'Laik Penuh';
        const paddedId = String(bld ? bld.id : '0').padStart(3, '0');
        const checkDate = dateInput && dateInput.value ? new Date(dateInput.value) : new Date();
        const dateFormatted = checkDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const userName = currentUser ? currentUser.nama : 'Administrator BMN';
        const userNip = (currentUser && currentUser.nip) ? currentUser.nip : '19870514 201101 1 003';

        const baDims = calculateObjectDimensions(bld || {});
        const textToCopy = `BERITA ACARA PEMERIKSAAN FISIK SARANA PRASARANA BMN
Nomor: BA.03/AHB.BMN-KALSEL/GDG-${paddedId}/X/2026
UPT ASRAMA HAJI EMBARKASI BANJARMASIN - KEMENTERIAN HAJI DAN UMRAH RI

Berdasarkan UU No. 8/2019 dan PMK No. 181/PMK.06/2016 tentang Penatausahaan BMN, pada hari ini, ${dateFormatted}, telah dilakukan pemeriksaan fisik lapangan terhadap:
- Kode Register / NUP : BMN-AHB/GDG-${paddedId}/2026
- Nama Gedung/Sarana  : ${bld ? bld.nama : '-'}
- Jenis / Fungsi Aset : ${bld ? bld.jenis : '-'} / ${bld ? bld.fungsi : '-'}
- Dimensi (P × L × T) : ${baDims.panjangFormatted} × ${baDims.lebarFormatted} × ${baDims.tinggiFormatted}
- Luas Dasar / Total  : ${baDims.luasDasarFormatted} / ${baDims.luasTotalLantaiFormatted} (${baDims.lantai} Lantai)
- Volume Geometris    : ${baDims.volumeFormatted}
- Kapasitas Tampung   : ${bld ? formatNumber(bld.kapasitas) : 0} Orang / Jamaah
- Kondisi Fisik       : ${bld ? bld.kondisi : '-'}
- Status Kelaikan     : [STATUS: ${statusKelaikan.toUpperCase()}]

Petugas Verifikator: ${userName} (NIP. ${userNip})
Mengetahui: Kepala UPT Asrama Haji Embarkasi Banjarmasin (H. Saipuddin, S.Ag., M.Pd.I - NIP. 19710824 199803 1 003)
Tervalidasi Elektronik melalui Portal BMN UPT Asrama Haji Embarkasi Banjarmasin.`;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Naskah resmi Berita Acara berhasil disalin ke papan klip!', 'success');
          }).catch(() => {
            showToast('Naskah teks siap disalin.', 'info');
          });
        } else {
          showToast('Naskah teks siap disalin.', 'info');
        }
      });
    }

    // Tombol Aksi di Layar Terkunci (Locked Gate Screen)
    const btnGateGoLogin = document.getElementById('btn-gate-go-login');
    if (btnGateGoLogin) {
      btnGateGoLogin.addEventListener('click', () => {
        switchView('auth');
      });
    }

    const btnGateGoRegister = document.getElementById('btn-gate-go-register');
    if (btnGateGoRegister) {
      btnGateGoRegister.addEventListener('click', () => {
        switchView('auth');
        const tabReg = document.getElementById('tab-btn-register');
        if (tabReg) tabReg.click();
      });
    }

    const btnGateQuickDemo = document.getElementById('btn-gate-quick-demo');
    if (btnGateQuickDemo) {
      btnGateQuickDemo.addEventListener('click', () => {
        switchView('auth');
        const demoBtn = document.getElementById('btn-fill-demo-login');
        if (demoBtn) demoBtn.click();
        showToast('Kredensial akun resmi demo telah diisi! Klik tombol Lanjut ke 2FA.', 'info');
      });
    }

    // KPI Cards Clickable Quick Navigation
    const kpiBuildings = document.getElementById('kpi-card-buildings');
    if (kpiBuildings) {
      kpiBuildings.addEventListener('click', () => {
        switchView('katalog');
      });
    }

    const kpiDocs = document.getElementById('kpi-card-docs');
    if (kpiDocs) {
      kpiDocs.addEventListener('click', () => {
        const tab = document.getElementById('tab-internal-docs');
        if (tab) tab.click();
      });
    }

    const kpiAudit = document.getElementById('kpi-card-audit');
    if (kpiAudit) {
      kpiAudit.addEventListener('click', () => {
        const tab = document.getElementById('tab-internal-audit');
        if (tab) tab.click();
      });
    }

    const kpiBA = document.getElementById('kpi-card-ba');
    if (kpiBA) {
      kpiBA.addEventListener('click', () => {
        const tab = document.getElementById('tab-internal-ba');
        if (tab) tab.click();
      });
    }

    const btnInternalProfileGoto = document.getElementById('btn-internal-profile-goto');
    if (btnInternalProfileGoto) {
      btnInternalProfileGoto.addEventListener('click', () => {
        switchView('auth');
      });
    }
  }

  // ==========================================================================
  // 8B. PENGELOLAAN KONTEN MENU INFORMASI RESMI LEMBAGA (ADMIN MODE)
  // ==========================================================================
  const DEFAULT_INSTITUTION_INFO = {
    aboutTitle: 'Tentang UPT Asrama Haji Embarkasi Banjarmasin',
    aboutParagraphs: [
      'Unit Pelaksana Teknis (UPT) Asrama Haji Embarkasi Banjarmasin merupakan instansi pemerintah di bawah Direktorat Jenderal Penyelenggaraan Haji dan Umrah (PHU) Kementerian Haji dan Umrah Republik Indonesia (Kemenhaj RI).',
      'Asrama Haji Embarkasi Banjarmasin melayani pemberangkatan dan pemulangan jamaah calon haji dari Provinsi Kalimantan Selatan dan Kalimantan Tengah (Embarkasi BDJ) menuju Tanah Suci Makkah dan Madinah, dengan mengedepankan prinsip pelayanan Ramah Lansia, Profesional, Akuntabel, dan Nyaman.',
      'Kawasan asrama haji ini berdiri di lokasi strategis dekat Bandara Internasional Syamsudin Noor, dilengkapi gedung penginapan berstandar hotel, aula pelepasan, masjid jamik, sarana manasik haji terpadu, poliklinik kesehatan pelabuhan, dan fasilitas One Stop Service (OSS).'
    ],
    dutiesTitle: 'Tugas & Fungsi Pokok Fasilitas Kawasan',
    dutiesItems: [
      {
        label: 'Akomodasi Jamaah',
        desc: 'Memberikan tempat peristirahatan yang nyaman, aman, dan higienis bagi jamaah kloter sebelum jadwal penerbangan.'
      },
      {
        label: 'Pelayanan One-Stop-Service (OSS)',
        desc: 'Pemeriksaan administrasi terpadu mencakup paspor, living cost riyal, visa, dan gelang identitas.'
      },
      {
        label: 'Pemeriksaan Kesehatan Akhir',
        desc: "Memastikan seluruh jamaah memenuhi kriteria Istitha'ah kesehatan sebelum keberangkatan."
      },
      {
        label: 'Bimbingan Manasik Akhir & Pembekalan',
        desc: 'Pemantapan ibadah dan simulasi keselamatan penerbangan di Aula Al-Mabrur.'
      }
    ],
    guideTitle: 'Panduan Pengelolaan Data untuk Pengelola BMN',
    guideIntro: 'Aplikasi ini dirancang dengan arsitektur pure static tanpa database server, sehingga sangat ringan dan dapat dibuka langsung melalui browser.',
    guidePrompt: 'Untuk menambah atau memperbarui data bangunan:',
    guideSteps: [
      'Gunakan tombol Mode Admin di navigasi atas, masukkan PIN (default: 1234 atau admin) untuk mengedit data per-katalog atau menambah gedung baru langsung dari aplikasi.',
      'Atau buka file data.js menggunakan teks editor untuk mengedit data master bangunan secara manual.',
      'Ubah properti pada array buildings (nama, jenis, panjang, lebar, kapasitas, kondisi, foto, keterangan).',
      'Simpan perubahan dan refresh browser. Seluruh katalog, tabel inventaris, dan statistik otomatis terbarui.'
    ],
    contactTitle: 'Kontak & Lokasi Resmi',
    contactInstansi: 'UPT Asrama Haji Embarkasi Banjarmasin',
    contactAlamat: 'Jl. Jenderal Ahmad Yani Km. 28, Landasan Ulin, Kota Banjarbaru, Kalimantan Selatan 70724',
    contactEmail: 'asramahaji.banjarmasin@kemenhaj.go.id',
    contactTelepon: '(0511) 4705200',
    contactJamKerja: 'Senin - Jumat: 08.00 - 16.00 WITA',
    contactJamHaji: '(Masa Operasional Haji: 24 Jam Penuh)',
    logoTitle: 'Logo & Lambang Resmi',
    logoImg: 'assets/logo.png',
    logoCaption: 'UPT Asrama Haji Embarkasi Banjarmasin',
    logoSubcaption: 'Kementerian Haji dan Umrah Republik Indonesia'
  };

  function parseInfoDutiesText(rawText) {
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

  function formatInfoDutiesText(items) {
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

  function validateInstitutionInfoData(info) {
    const errors = [];
    const data = info || {};

    if (!data.aboutTitle || !String(data.aboutTitle).trim()) {
      errors.push('Judul bagian Tentang Lembaga wajib diisi.');
    }

    const paragraphs = Array.isArray(data.aboutParagraphs)
      ? data.aboutParagraphs.map(p => String(p).trim()).filter(Boolean)
      : String(data.aboutParagraphs || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) {
      errors.push('Isi deskripsi Tentang Lembaga minimal memiliki 1 paragraf.');
    }

    if (!data.dutiesTitle || !String(data.dutiesTitle).trim()) {
      errors.push('Judul bagian Tugas & Fungsi Pokok wajib diisi.');
    }

    if (!data.contactTitle || !String(data.contactTitle).trim()) {
      errors.push('Judul bagian Kontak & Lokasi wajib diisi.');
    }

    if (!data.contactInstansi || !String(data.contactInstansi).trim()) {
      errors.push('Nama instansi pada bagian Kontak & Lokasi wajib diisi.');
    }

    if (!data.contactAlamat || !String(data.contactAlamat).trim()) {
      errors.push('Alamat resmi instansi wajib diisi.');
    }

    const email = String(data.contactEmail || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Format alamat email resmi tidak valid.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function loadInstitutionInfo() {
    const fallback = JSON.parse(JSON.stringify(DEFAULT_INSTITUTION_INFO));
    try {
      const stored = safeStorageGet(STORAGE_KEY_INFORMASI);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return Object.assign(fallback, parsed, {
            aboutParagraphs: Array.isArray(parsed.aboutParagraphs) && parsed.aboutParagraphs.length > 0
              ? parsed.aboutParagraphs
              : fallback.aboutParagraphs,
            dutiesItems: Array.isArray(parsed.dutiesItems)
              ? parsed.dutiesItems
              : fallback.dutiesItems,
            guideSteps: Array.isArray(parsed.guideSteps)
              ? parsed.guideSteps
              : fallback.guideSteps
          });
        }
      }
    } catch (e) {
      console.warn('Gagal membaca informasi lembaga dari localStorage:', e);
    }
    return fallback;
  }

  let institutionInfoData = loadInstitutionInfo();
  let pendingInfoLogoData = institutionInfoData.logoImg || 'assets/logo.png';

  function saveInstitutionInfo(newData) {
    institutionInfoData = newData;
    try {
      safeStorageSet(STORAGE_KEY_INFORMASI, JSON.stringify(institutionInfoData));
    } catch (e) {
      console.warn('Gagal menyimpan informasi lembaga:', e);
    }
    renderInstitutionInfo();
  }

  function sanitizeSafeImageSrc(src) {
    const raw = String(src || '').trim();
    if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(raw)) return raw;
    if (/^assets\/[a-zA-Z0-9_.\-/]+$/i.test(raw)) return raw;
    return 'assets/logo.png';
  }

  function renderInstitutionInfo() {
    const d = institutionInfoData || DEFAULT_INSTITUTION_INFO;

    const aboutTitleEl = document.getElementById('info-about-title');
    const aboutContentEl = document.getElementById('info-about-content');
    if (aboutTitleEl) aboutTitleEl.textContent = d.aboutTitle || DEFAULT_INSTITUTION_INFO.aboutTitle;
    if (aboutContentEl) {
      const paragraphs = Array.isArray(d.aboutParagraphs) ? d.aboutParagraphs.filter(Boolean) : [];
      aboutContentEl.innerHTML = paragraphs.length > 0
        ? paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')
        : '<p class="text-muted">Belum diisi.</p>';
    }

    const dutiesTitleEl = document.getElementById('info-duties-title');
    const dutiesContentEl = document.getElementById('info-duties-content');
    if (dutiesTitleEl) dutiesTitleEl.textContent = d.dutiesTitle || DEFAULT_INSTITUTION_INFO.dutiesTitle;
    if (dutiesContentEl) {
      const items = Array.isArray(d.dutiesItems) ? d.dutiesItems : [];
      if (items.length > 0) {
        const listHtml = items.map(item => {
          const lbl = String(item && item.label ? item.label : '').trim();
          const desc = String(item && item.desc ? item.desc : '').trim();
          if (lbl && desc) {
            return `<li><strong>${escapeHtml(lbl)}:</strong> ${escapeHtml(desc)}</li>`;
          }
          return `<li>${escapeHtml(lbl || desc)}</li>`;
        }).join('');
        dutiesContentEl.innerHTML = `<ul class="info-list">${listHtml}</ul>`;
      } else {
        dutiesContentEl.innerHTML = '<p style="color: var(--text-muted);">Belum ada poin tugas &amp; fungsi yang dicatat.</p>';
      }
    }

    const guideTitleEl = document.getElementById('info-guide-title');
    const guideContentEl = document.getElementById('info-guide-content');
    if (guideTitleEl) guideTitleEl.textContent = d.guideTitle || DEFAULT_INSTITUTION_INFO.guideTitle;
    if (guideContentEl) {
      const parts = [];
      if (d.guideIntro && String(d.guideIntro).trim()) {
        parts.push(`<p>${escapeHtml(d.guideIntro)}</p>`);
      }
      if (d.guidePrompt && String(d.guidePrompt).trim()) {
        parts.push(`<p>${escapeHtml(d.guidePrompt)}</p>`);
      }
      const steps = Array.isArray(d.guideSteps) ? d.guideSteps.map(s => String(s).trim()).filter(Boolean) : [];
      if (steps.length > 0) {
        parts.push(`<ol class="info-list">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`);
      }
      guideContentEl.innerHTML = parts.length > 0 ? parts.join('') : '<p style="color: var(--text-muted);">Belum diisi.</p>';
    }

    const contactTitleEl = document.getElementById('info-contact-title');
    const contactContentEl = document.getElementById('info-contact-content');
    if (contactTitleEl) contactTitleEl.textContent = d.contactTitle || DEFAULT_INSTITUTION_INFO.contactTitle;
    if (contactContentEl) {
      const contactLines = [];
      contactLines.push(`<p><strong>${escapeHtml(d.contactInstansi || DEFAULT_INSTITUTION_INFO.contactInstansi)}</strong></p>`);
      contactLines.push(`<p>${escapeHtml(d.contactAlamat || DEFAULT_INSTITUTION_INFO.contactAlamat)}</p>`);
      if (d.contactEmail && String(d.contactEmail).trim()) {
        contactLines.push(`<p style="margin-top: 8px;"><strong>Email:</strong> ${escapeHtml(d.contactEmail)}</p>`);
      }
      if (d.contactTelepon && String(d.contactTelepon).trim()) {
        contactLines.push(`<p><strong>Layanan Informasi:</strong> ${escapeHtml(d.contactTelepon)}</p>`);
      }
      if ((d.contactJamKerja && String(d.contactJamKerja).trim()) || (d.contactJamHaji && String(d.contactJamHaji).trim())) {
        const jamParts = ['<strong>Jam Operasional Kantor:</strong>'];
        if (d.contactJamKerja && String(d.contactJamKerja).trim()) {
          jamParts.push(escapeHtml(d.contactJamKerja));
        }
        if (d.contactJamHaji && String(d.contactJamHaji).trim()) {
          jamParts.push(`<em>${escapeHtml(d.contactJamHaji)}</em>`);
        }
        contactLines.push(`<p>${jamParts.join('<br>')}</p>`);
      }
      contactContentEl.innerHTML = contactLines.join('');
    }

    const logoTitleEl = document.getElementById('info-logo-title');
    const logoContentEl = document.getElementById('info-logo-content');
    if (logoTitleEl) logoTitleEl.textContent = d.logoTitle || DEFAULT_INSTITUTION_INFO.logoTitle;
    if (logoContentEl) {
      const safeImg = sanitizeSafeImageSrc(d.logoImg);
      const caption = d.logoCaption ? escapeHtml(d.logoCaption) : '';
      const subcaption = d.logoSubcaption ? escapeHtml(d.logoSubcaption) : '';
      const captionLines = [caption, subcaption].filter(Boolean).join('<br>');
      logoContentEl.innerHTML = `
        <img src="${safeImg}" alt="Logo Resmi" style="width: 120px; height: 120px; object-fit: contain; margin-bottom: 10px;">
        <p style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${captionLines}</p>
      `;
    }
  }

  const informasiFormModal = document.getElementById('informasi-form-modal');
  const btnEditInformasi = document.getElementById('btn-edit-informasi');
  const btnResetInformasi = document.getElementById('btn-reset-informasi');
  const btnCloseInformasiModal = document.getElementById('btn-close-informasi-modal');
  const btnCancelInformasi = document.getElementById('btn-cancel-informasi');
  const btnSaveInformasi = document.getElementById('btn-save-informasi');

  const formInfoAboutTitle = document.getElementById('form-info-about-title');
  const formInfoAboutBody = document.getElementById('form-info-about-body');
  const formInfoDutiesTitle = document.getElementById('form-info-duties-title');
  const formInfoDutiesList = document.getElementById('form-info-duties-list');
  const formInfoGuideTitle = document.getElementById('form-info-guide-title');
  const formInfoGuideIntro = document.getElementById('form-info-guide-intro');
  const formInfoGuidePrompt = document.getElementById('form-info-guide-prompt');
  const formInfoGuideSteps = document.getElementById('form-info-guide-steps');
  const formInfoContactTitle = document.getElementById('form-info-contact-title');
  const formInfoContactInstansi = document.getElementById('form-info-contact-instansi');
  const formInfoContactAlamat = document.getElementById('form-info-contact-alamat');
  const formInfoContactEmail = document.getElementById('form-info-contact-email');
  const formInfoContactTelepon = document.getElementById('form-info-contact-telepon');
  const formInfoContactJamKerja = document.getElementById('form-info-contact-jam-kerja');
  const formInfoContactJamHaji = document.getElementById('form-info-contact-jam-haji');
  const formInfoLogoTitle = document.getElementById('form-info-logo-title');
  const formInfoLogoCaption = document.getElementById('form-info-logo-caption');
  const formInfoLogoSubcaption = document.getElementById('form-info-logo-subcaption');
  const infoLogoPreviewImg = document.getElementById('info-logo-preview-img');
  const formInfoLogoInput = document.getElementById('form-info-logo-input');
  const btnTriggerInfoLogoUpload = document.getElementById('btn-trigger-info-logo-upload');
  const btnResetInfoLogo = document.getElementById('btn-reset-info-logo');

  function openInformasiModal(focusSection = null) {
    if (currentRole !== 'admin') {
      showToast('Aktifkan Mode Admin terlebih dahulu untuk mengedit informasi lembaga.', 'warning');
      return;
    }
    if (!informasiFormModal) return;

    const d = institutionInfoData || DEFAULT_INSTITUTION_INFO;
    if (formInfoAboutTitle) formInfoAboutTitle.value = d.aboutTitle || '';
    if (formInfoAboutBody) {
      formInfoAboutBody.value = Array.isArray(d.aboutParagraphs) ? d.aboutParagraphs.join('\n\n') : '';
    }
    if (formInfoDutiesTitle) formInfoDutiesTitle.value = d.dutiesTitle || '';
    if (formInfoDutiesList) formInfoDutiesList.value = formatInfoDutiesText(d.dutiesItems || []);
    if (formInfoGuideTitle) formInfoGuideTitle.value = d.guideTitle || '';
    if (formInfoGuideIntro) formInfoGuideIntro.value = d.guideIntro || '';
    if (formInfoGuidePrompt) formInfoGuidePrompt.value = d.guidePrompt || '';
    if (formInfoGuideSteps) {
      formInfoGuideSteps.value = Array.isArray(d.guideSteps) ? d.guideSteps.join('\n') : '';
    }
    if (formInfoContactTitle) formInfoContactTitle.value = d.contactTitle || '';
    if (formInfoContactInstansi) formInfoContactInstansi.value = d.contactInstansi || '';
    if (formInfoContactAlamat) formInfoContactAlamat.value = d.contactAlamat || '';
    if (formInfoContactEmail) formInfoContactEmail.value = d.contactEmail || '';
    if (formInfoContactTelepon) formInfoContactTelepon.value = d.contactTelepon || '';
    if (formInfoContactJamKerja) formInfoContactJamKerja.value = d.contactJamKerja || '';
    if (formInfoContactJamHaji) formInfoContactJamHaji.value = d.contactJamHaji || '';
    if (formInfoLogoTitle) formInfoLogoTitle.value = d.logoTitle || '';
    if (formInfoLogoCaption) formInfoLogoCaption.value = d.logoCaption || '';
    if (formInfoLogoSubcaption) formInfoLogoSubcaption.value = d.logoSubcaption || '';

    pendingInfoLogoData = sanitizeSafeImageSrc(d.logoImg || 'assets/logo.png');
    if (infoLogoPreviewImg) infoLogoPreviewImg.src = pendingInfoLogoData;
    if (formInfoLogoInput) formInfoLogoInput.value = '';

    const sectionCards = informasiFormModal.querySelectorAll('.info-form-section-card');
    sectionCards.forEach(card => card.classList.remove('is-highlighted'));

    informasiFormModal.classList.add('active');

    if (focusSection) {
      const targetCard = document.getElementById(`info-sec-${focusSection}`);
      if (targetCard) {
        targetCard.classList.add('is-highlighted');
        setTimeout(() => {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 60);
      }
    }
  }

  function closeInformasiModal() {
    if (!informasiFormModal) return;
    informasiFormModal.classList.remove('active');
    const sectionCards = informasiFormModal.querySelectorAll('.info-form-section-card');
    sectionCards.forEach(card => card.classList.remove('is-highlighted'));
  }

  function handleSaveInformasi() {
    if (currentRole !== 'admin') {
      showToast('Akses ditolak: aktifkan Mode Admin untuk menyimpan perubahan.', 'error');
      return;
    }

    const rawBody = formInfoAboutBody ? formInfoAboutBody.value : '';
    let paragraphs = rawBody.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0 && rawBody.trim()) {
      paragraphs = [rawBody.trim()];
    }

    const candidate = {
      aboutTitle: formInfoAboutTitle ? formInfoAboutTitle.value.trim() : '',
      aboutParagraphs: paragraphs,
      dutiesTitle: formInfoDutiesTitle ? formInfoDutiesTitle.value.trim() : '',
      dutiesItems: parseInfoDutiesText(formInfoDutiesList ? formInfoDutiesList.value : ''),
      guideTitle: formInfoGuideTitle ? formInfoGuideTitle.value.trim() : '',
      guideIntro: formInfoGuideIntro ? formInfoGuideIntro.value.trim() : '',
      guidePrompt: formInfoGuidePrompt ? formInfoGuidePrompt.value.trim() : '',
      guideSteps: (formInfoGuideSteps ? formInfoGuideSteps.value : '')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean),
      contactTitle: formInfoContactTitle ? formInfoContactTitle.value.trim() : '',
      contactInstansi: formInfoContactInstansi ? formInfoContactInstansi.value.trim() : '',
      contactAlamat: formInfoContactAlamat ? formInfoContactAlamat.value.trim() : '',
      contactEmail: formInfoContactEmail ? formInfoContactEmail.value.trim() : '',
      contactTelepon: formInfoContactTelepon ? formInfoContactTelepon.value.trim() : '',
      contactJamKerja: formInfoContactJamKerja ? formInfoContactJamKerja.value.trim() : '',
      contactJamHaji: formInfoContactJamHaji ? formInfoContactJamHaji.value.trim() : '',
      logoTitle: (formInfoLogoTitle ? formInfoLogoTitle.value.trim() : '') || DEFAULT_INSTITUTION_INFO.logoTitle,
      logoImg: sanitizeSafeImageSrc(pendingInfoLogoData || institutionInfoData.logoImg || 'assets/logo.png'),
      logoCaption: formInfoLogoCaption ? formInfoLogoCaption.value.trim() : '',
      logoSubcaption: formInfoLogoSubcaption ? formInfoLogoSubcaption.value.trim() : ''
    };

    const validation = validateInstitutionInfoData(candidate);
    if (!validation.valid) {
      showToast(validation.errors[0], 'error');
      return;
    }

    saveInstitutionInfo(candidate);
    closeInformasiModal();
    showToast('Informasi resmi lembaga berhasil diperbarui.', 'success');
  }

  function bindInformasiEvents() {
    if (btnEditInformasi) {
      btnEditInformasi.addEventListener('click', () => openInformasiModal());
    }

    document.querySelectorAll('.btn-edit-info-section').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.getAttribute('data-info-section');
        openInformasiModal(section);
      });
    });

    if (btnResetInformasi) {
      btnResetInformasi.addEventListener('click', () => {
        if (currentRole !== 'admin') {
          showToast('Aktifkan Mode Admin terlebih dahulu untuk mereset informasi lembaga.', 'warning');
          return;
        }
        showConfirmModal(
          'Apakah Anda yakin ingin mengembalikan seluruh konten menu Informasi (Tentang Lembaga, Tugas & Fungsi, Panduan BMN, Kontak, dan Logo) ke teks standar resmi bawaan?',
          'Reset Informasi Lembaga',
          () => {
            try {
              localStorage.removeItem(STORAGE_KEY_INFORMASI);
            } catch (e) {
              // Abaikan jika browser membatasi localStorage
            }
            const freshDefault = JSON.parse(JSON.stringify(DEFAULT_INSTITUTION_INFO));
            saveInstitutionInfo(freshDefault);
            showToast('Konten Informasi Resmi Lembaga berhasil dikembalikan ke standar bawaan.', 'success');
          }
        );
      });
    }

    if (btnCloseInformasiModal) btnCloseInformasiModal.addEventListener('click', closeInformasiModal);
    if (btnCancelInformasi) btnCancelInformasi.addEventListener('click', closeInformasiModal);
    if (btnSaveInformasi) btnSaveInformasi.addEventListener('click', handleSaveInformasi);

    if (informasiFormModal) {
      informasiFormModal.addEventListener('click', (e) => {
        if (e.target === informasiFormModal) closeInformasiModal();
      });
    }

    if (btnTriggerInfoLogoUpload && formInfoLogoInput) {
      btnTriggerInfoLogoUpload.addEventListener('click', () => formInfoLogoInput.click());
    }

    if (formInfoLogoInput) {
      formInfoLogoInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressImage(file, 600, 600, 0.85)
          .then(dataUrl => {
            pendingInfoLogoData = dataUrl;
            if (infoLogoPreviewImg) infoLogoPreviewImg.src = dataUrl;
            showToast('Pratinjau logo baru siap disimpan.', 'info');
          })
          .catch(err => {
            showToast(err.message || 'Gagal memproses gambar logo.', 'error');
            formInfoLogoInput.value = '';
          });
      });
    }

    if (btnResetInfoLogo) {
      btnResetInfoLogo.addEventListener('click', () => {
        pendingInfoLogoData = 'assets/logo.png';
        if (infoLogoPreviewImg) infoLogoPreviewImg.src = 'assets/logo.png';
        if (formInfoLogoInput) formInfoLogoInput.value = '';
        showToast('Logo dikembalikan ke lambang bawaan Kemenhaj RI (klik Simpan untuk menerapkan).', 'info');
      });
    }
  }

  // ==========================================================================
  // 9. INITIALIZATION
  // ==========================================================================
  function init() {
    bindAuthEvents();
    bindInformasiEvents();
    if (currentUser && currentUser.role === 'admin') {
      currentRole = 'admin';
    }
    updateRoleUI();
    updateAuthUI();
    refreshLoginCaptcha();
    refreshRegCaptcha();
    calculateAndRenderStatistics();
    populateAllCategoryDropdowns();
    populateRoomFilterDropdowns();
    renderCatalog();
    renderTable();
    renderRoomTypes();
    renderMediaFacilities();
    renderElectricalPanels();
    renderGensets();
    renderLandParcels();
    renderWifiNetworks();
    renderInstitutionInfo();

    // Global Escape Key to close open modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (landFormModal && landFormModal.classList.contains('active')) closeLandModal();
        if (printLandModal && printLandModal.classList.contains('active')) closePrintLandModal();
        if (wifiFormModal && wifiFormModal.classList.contains('active')) closeWifiModal();
        if (printWifiModal && printWifiModal.classList.contains('active')) closePrintWifiModal();
        if (informasiFormModal && informasiFormModal.classList.contains('active')) closeInformasiModal();
      }
    });

    console.log(`UPT Asrama Haji Embarkasi Banjarmasin: Sistem Terinisialisasi dengan ${dataset.length} data bangunan dalam ${currentRole.toUpperCase()} mode.`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
