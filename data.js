/**
 * ============================================================================
 * DATA MASTER BANGUNAN & UTILITAS KAWASAN UPT ASRAMA HAJI EMBARKASI BANJARMASIN
 * ============================================================================
 * 
 * SUMBER TUNGGAL DATA:
 * - 17 Gedung & Sarana Utama Kawasan
 * - Spesifikasi Genset & Sistem Kelistrikan Kawasan (Depan, Belakang, Jabal Rahmah & Marwah)
 * - Detail Kamar Standar & Superior (P × L × T beserta kelebihannya masing-masing)
 * - Detail Sarana Media & Lapangan (Videotron, Spanduk, Panggung, Halaman)
 */

// GANTI DENGAN DATA ASLI (Data resmi inventaris UPT Asrama Haji Embarkasi Banjarmasin)
const buildings = [
  {
    id: 1,
    nama: "Gedung Jabal Rahmah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah Kloter Reguler",
    panjang: 52,
    lebar: 22,
    luas: 1144,
    lantai: 3,
    tinggi: 12.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 460,
    kondisi: "Baik",
    dayaListrik: "345 kVA (Bersama Gedung Marwah)",
    foto: "assets/bangunan/gedung-jabal-rahmah.jpg",
    videotron: true,
    videotronInfo: "Layar Videotron Outdoor P4 (8.0 × 4.5 m) Fasad Depan Gedung Jabal Rahmah - Menayangkan Jadwal Kloter & Bimbingan Ibadah",
    keterangan: "Gedung penginapan utama 3 lantai berkapasitas besar. Dilengkapi fasilitas Layar Videotron Display Informasi Kloter, lift ramah lansia, proteksi kebakaran, AC sentral, dan jalur feeder khusus 345 kVA bersama Gedung Marwah.",
    posisi: {
      x: 5.0,
      y: 12.5,
      width: 16.6,
      height: 18.75
    }
  },
  {
    id: 2,
    nama: "Gedung Marwah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah Kloter Reguler",
    panjang: 52,
    lebar: 22,
    luas: 1144,
    lantai: 3,
    tinggi: 12.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 460,
    kondisi: "Baik",
    dayaListrik: "345 kVA (Bersama Gedung Jabal Rahmah)",
    foto: "assets/bangunan/gedung-marwah.jpg",
    keterangan: "Gedung asrama bertingkat dengan akses jalur kursi roda, ruang laktasi, posko kesehatan perawat kloter di lantai dasar, dan pendingin udara full inverter.",
    posisi: {
      x: 23.3,
      y: 12.5,
      width: 16.6,
      height: 18.75
    }
  },
  {
    id: 3,
    nama: "Gedung Aziziyah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah Kloter",
    panjang: 48,
    lebar: 20,
    luas: 960,
    lantai: 3,
    tinggi: 12.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 380,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-aziziyah.jpg",
    keterangan: "Gedung akomodasi jamaah dengan fasilitas kamar standar 4-6 bed dilengkapi kamar mandi dalam dan sistem sirkulasi udara ganda.",
    posisi: {
      x: 41.6,
      y: 12.5,
      width: 16.6,
      height: 18.75
    }
  },
  {
    id: 4,
    nama: "Gedung Raudhah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi VIP & PPIH",
    panjang: 40,
    lebar: 20,
    luas: 800,
    lantai: 2,
    tinggi: 8.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 120,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-raudhah.jpg",
    keterangan: "Gedung akomodasi kamar tipe Superior dan VIP bagi pejabat Panitia Penyelenggara Ibadah Haji (PPIH), tamu kementerian, dan pembina kloter.",
    posisi: {
      x: 78.3,
      y: 12.5,
      width: 15.8,
      height: 18.75
    }
  },
  {
    id: 5,
    nama: "Gedung Mina",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Cadangan & Transit",
    panjang: 35,
    lebar: 18,
    luas: 630,
    lantai: 2,
    tinggi: 8.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 180,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-mina.jpg",
    keterangan: "Gedung akomodasi cadangan untuk mengantisipasi jamaah tunda terbang, transit antar-provinsi, atau petugas pendukung.",
    posisi: {
      x: 85.0,
      y: 36.25,
      width: 11.6,
      height: 17.5
    }
  },
  {
    id: 6,
    nama: "Gedung Muzdalifah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah Kloter",
    panjang: 45,
    lebar: 20,
    luas: 900,
    lantai: 2,
    tinggi: 8.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 300,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-muzdalifah.jpg",
    keterangan: "Gedung penginapan 2 lantai dengan aula pertemuan mini di lantai satu untuk pengarahan ketua regu (Karu) dan ketua rombongan (Karom).",
    posisi: {
      x: 50.8,
      y: 36.25,
      width: 15.8,
      height: 17.5
    }
  },
  {
    id: 7,
    nama: "Gedung Madinah",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah Kloter Reguler",
    panjang: 48,
    lebar: 22,
    luas: 1056,
    lantai: 3,
    tinggi: 12.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 420,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-madinah.jpg",
    videotron: true,
    videotronInfo: "Layar Videotron Digital Display Gedung Madinah (5.5 × 3.0 m) - Informasi Manifes Kloter, Jadwal Keberangkatan & PPIH",
    keterangan: "Gedung penginapan bertingkat yang dilengkapi fasilitas Layar Videotron Informasi Keberangkatan, lorong berlantai anti-selip, dispenser air minum terpusat di tiap koridor, dan loker jamaah.",
    posisi: {
      x: 60.0,
      y: 12.5,
      width: 16.6,
      height: 18.75
    }
  },
  {
    id: 8,
    nama: "Gedung Bir Ali",
    jenis: "Gedung Penginapan",
    fungsi: "Akomodasi Jamaah & Petugas",
    panjang: 42,
    lebar: 18,
    luas: 756,
    lantai: 2,
    tinggi: 8.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 240,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/gedung-bir-ali.jpg",
    keterangan: "Gedung penginapan dengan penataan kamar fleksibel, sering difungsikan untuk jamaah penggabungan mahram dan cadangan kloter.",
    posisi: {
      x: 68.3,
      y: 36.25,
      width: 15.0,
      height: 17.5
    }
  },
  {
    id: 9,
    nama: "Catering II",
    jenis: "Ruang Makan",
    fungsi: "Pelayanan Konsumsi & Prasmanan Jamaah",
    panjang: 40,
    lebar: 22,
    luas: 880,
    lantai: 1,
    tinggi: 5.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 600,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/catering-ii.jpg",
    keterangan: "Gedung ruang makan prasmanan representatif berstandar higienitas Dinkes. Menyediakan jalur antrean makan ramah lansia dan wastafel cuci tangan higienis.",
    posisi: {
      x: 61.6,
      y: 60.0,
      width: 15.0,
      height: 13.75
    }
  },
  {
    id: 10,
    nama: "Dapur",
    jenis: "Gedung Utilitas",
    fungsi: "Pengolahan & Persiapan Menu Makanan Jamaah",
    panjang: 30,
    lebar: 18,
    luas: 540,
    lantai: 1,
    tinggi: 5.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 50,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/dapur.jpg",
    keterangan: "Pusat dapur basah dan dapur kering pengolahan makanan dengan kompor high-pressure, cold storage penyimpanan daging & sayur, dan pemadam kebakaran thermatic.",
    posisi: {
      x: 78.3,
      y: 60.0,
      width: 11.6,
      height: 13.75
    }
  },
  {
    id: 11,
    nama: "Aula Mekkah",
    jenis: "Aula",
    fungsi: "Pelepasan & Seremoni Akbar Kloter Jamaah",
    panjang: 55,
    lebar: 30,
    luas: 1650,
    lantai: 1,
    tinggi: 7.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 1200,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/aula-mekkah.jpg",
    keterangan: "Aula utama tempat penyelenggaraan seremonial pelepasan resmi jamaah haji oleh Gubernur/Kakanwil. Dilengkapi Panggung Utama (15×6 m), sound system gantung line-array, dan backdrop spanduk 12×3 m.",
    posisi: {
      x: 26.6,
      y: 36.25,
      width: 21.6,
      height: 17.5
    }
  },
  {
    id: 12,
    nama: "Aula Jeddah",
    jenis: "Aula",
    fungsi: "Penerimaan Kloter & Bimbingan Akhir",
    panjang: 42,
    lebar: 24,
    luas: 1008,
    lantai: 1,
    tinggi: 6.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 750,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/aula-jeddah.jpg",
    videotron: true,
    videotronInfo: "Layar Videotron Panggung Aula Jeddah Indoor HD P2.5 (8.0 × 4.0 m) - Media Simulasi Manasik, Keselamatan Penerbangan & Pembagian Living Cost",
    keterangan: "Aula penerimaan perdana jamaah saat tiba di asrama haji. Dilengkapi panggung utama dengan Layar Videotron Panggung terintegrasi untuk simulasi keselamatan kabin pesawat, panduan ibadah manasik kloter, dan penyerahan living cost.",
    posisi: {
      x: 26.6,
      y: 58.75,
      width: 17.5,
      height: 16.25
    }
  },
  {
    id: 13,
    nama: "Poliklinik",
    jenis: "Gedung Pelayanan",
    fungsi: "Pemeriksaan Kesehatan Akhir & Rawat Sementara",
    panjang: 32,
    lebar: 18,
    luas: 576,
    lantai: 1,
    tinggi: 4.8,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 80,
    kondisi: "Baik",
    dayaListrik: "500 kVA (Sub-Panel Belakang)",
    foto: "assets/bangunan/poliklinik.jpg",
    keterangan: "Fasilitas kesehatan terpadu Balai Kekarantinaan Kesehatan (BKK/KKP). Menyediakan ruang observasi risti (risiko tinggi), isolasi darurat, depo obat, dan armada ambulans siaga 24 jam.",
    posisi: {
      x: 46.6,
      y: 60.0,
      width: 12.5,
      height: 13.75
    }
  },
  {
    id: 14,
    nama: "Siskohat",
    jenis: "Gedung Pelayanan",
    fungsi: "Sistem Komputerisasi Haji Terpadu & Pelayanan Paspor",
    panjang: 28,
    lebar: 16,
    luas: 448,
    lantai: 1,
    tinggi: 4.5,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 120,
    kondisi: "Baik",
    dayaListrik: "350 kVA (Sub-Panel Depan)",
    foto: "assets/bangunan/siskohat.jpg",
    keterangan: "Pusat teknologi data jamaah terhubung server Kementerian Agama RI, verifikasi biometrik imigrasi, scan barcode gelang identitas, dan cetak manifest penerbangan kloter.",
    posisi: {
      x: 30.8,
      y: 80.0,
      width: 11.6,
      height: 8.75
    }
  },
  {
    id: 15,
    nama: "Pos Satpam Depan",
    jenis: "Pos Keamanan",
    fungsi: "Pengamanan Pintu Masuk Kawasan & Barikade Akses",
    panjang: 12,
    lebar: 7,
    luas: 84,
    lantai: 1,
    tinggi: 3.8,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 15,
    kondisi: "Baik",
    dayaListrik: "350 kVA (Sub-Panel Depan)",
    foto: "assets/bangunan/pos-satpam-depan.jpg",
    keterangan: "Pos keamanan pintu gerbang utama Jl. Ahmad Yani Km. 28. Dilengkapi palang gerbang otomatis, screening metal detector, dan monitor pemantau CCTV kawasan.",
    posisi: {
      x: 21.6,
      y: 82.5,
      width: 7.5,
      height: 6.25
    }
  },
  {
    id: 16,
    nama: "Pos Satpam Masjid",
    jenis: "Pos Keamanan",
    fungsi: "Pengamanan Area Masjid & Parkir Jamaah",
    panjang: 10,
    lebar: 6,
    luas: 60,
    lantai: 1,
    tinggi: 3.8,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 10,
    kondisi: "Baik",
    dayaListrik: "350 kVA (Sub-Panel Depan)",
    foto: "assets/bangunan/pos-satpam-masjid.jpg",
    keterangan: "Pos keamanan internal untuk memantau pergerakan jamaah saat shalat berjamaah dan penataan parkir kendaraan pengantar/bus kloter.",
    posisi: {
      x: 8.3,
      y: 68.75,
      width: 6.6,
      height: 6.25
    }
  },
  {
    id: 17,
    nama: "Masjid",
    jenis: "Tempat Ibadah",
    fungsi: "Ibadah Shalat Jamaah & Praktik Manasik",
    panjang: 42,
    lebar: 38,
    luas: 1596,
    lantai: 2,
    tinggi: 14.0,
    satuan: "m",
    sumberPengukuran: "As-Built Drawing & SIM-ASET BMN 2026",
    tanggalPengukuran: "2026-01-15",
    kapasitas: 1500,
    kondisi: "Baik",
    dayaListrik: "350 kVA (Sub-Panel Depan)",
    foto: "assets/bangunan/masjid.jpg",
    keterangan: "Masjid megah dua lantai sebagai sentra ibadah spiritual jamaah haji dan petugas. Dilengkapi mimbar bimbingan tawaf/sai dan tempat wudhu pria dan wanita terpisah berkapasitas besar.",
    posisi: {
      x: 5.0,
      y: 43.75,
      width: 18.3,
      height: 22.5
    }
  }
];

// ============================================================================
// DATA SPESIFIKASI RUANGAN KAMAR (STANDAR VS SUPERIOR)
// ============================================================================
const roomTypes = [
  {
    id: "kamar-standar",
    nama: "Kamar Standar Jamaah",
    tipe: "Standar",
    panjang: 6.0,
    lebar: 4.0,
    tinggi: 3.2,
    luas: 24.0,
    volume: 76.8,
    kapasitas: "4 - 6 Orang",
    foto: "assets/bangunan/kamar-standar.jpg",
    peruntukan: "Jamaah Haji Reguler Kloter Embarkasi",
    fasilitas: [
      "Tempat tidur single ortopedi anti-alergi",
      "Sistem pendingin AC Split hemat energi dengan filter antibakteri",
      "Kamar mandi dalam (shower air hangat, kloset duduk, exhaust fan)",
      "Loker pakaian individual dengan kunci privasi",
      "Stopkontak dan port pengisi daya ponsel di dekat tiap ranjang",
      "Penunjuk arah kiblat dan sajadah di tiap kamar"
    ],
    kelebihan: [
      "Sirkulasi udara alami optimal berkat bukaan jendela ventilasi ganda.",
      "Desain ramah lansia: lantai kamar mandi anti-slip dan pegangan dinding (handrail).",
      "Tata letak efisien yang memudahkan mobilitas jamaah satu regu (Karu/Karom).",
      "Biaya operasional efisien dan perawatan harian mudah dibersihkan."
    ]
  },
  {
    id: "kamar-superior",
    nama: "Kamar Superior Jamaah / VIP",
    tipe: "Superior",
    panjang: 7.5,
    lebar: 5.0,
    tinggi: 3.5,
    luas: 37.5,
    volume: 131.25,
    kapasitas: "2 - 3 Orang",
    foto: "assets/bangunan/kamar-superior.jpg",
    peruntukan: "Petugas PPIH, Tamu Kementerian, Tokoh Pembina Kloter, & VIP",
    fasilitas: [
      "Tempat tidur springbed queen/twin ukuran besar",
      "Smart TV LED 43 Inch dengan siaran berita dan live Makkah/Madinah",
      "Kulkas mini (mini-bar refrigerator) & teko listrik pemanas air (kettle jug)",
      "Meja kerja personal dengan kursi ergonomis & sambungan WiFi berkecepatan tinggi",
      "Kamar mandi berkeramik marmer dengan water heater otomatis & rain shower",
      "Sofa santai tamu, meja kopi, dan lemari pakaian wardrobe 2 pintu",
      "Kunci pintu smart RFID cardlock dengan interkom terintegrasi"
    ],
    kelebihan: [
      "Ruang jauh lebih lega dan kedap suara (soundproof) untuk istirahat optimal petugas kloter.",
      "Pemandangan asri (view) menghadap lanskap taman penghijauan dan Masjid utama asrama.",
      "Standar kenyamanan setara hotel berbintang dengan amenitas lengkap dan room service darurat.",
      "Koneksi jaringan prioritas memudahkan pelaporan cepat data kloter ke pusat data."
    ]
  }
];

// ============================================================================
// DATA SARANA MEDIA, PANGGUNG, DAN HALAMAN TERBUKA
// ============================================================================
const mediaAndFacilities = [
  {
    id: "videotron-jabal-rahmah",
    nama: "Videotron Gedung Jabal Rahmah",
    jenis: "Media Informasi Digital",
    panjang: 8.0,
    lebar: 4.5,
    tinggi: 0.15,
    tinggiTiang: 4.0,
    luasLayar: 36.0,
    lokasi: "Fasad Depan Gedung Jabal Rahmah",
    foto: "assets/bangunan/videotron.jpg",
    spesifikasi: "LED Display Full Color P4 Outdoor High Brightness (Waterproof IP65), Refresh Rate 3840 Hz.",
    fungsi: "Menayangkan jadwal rotasi kloter, informasi jadwal manasik jamaah reguler, dan pengumuman bimbingan ibadah asrama."
  },
  {
    id: "videotron-jeddah",
    nama: "Videotron Panggung Aula Jeddah",
    jenis: "Media Informasi Digital & Simulasi",
    panjang: 8.0,
    lebar: 4.0,
    tinggi: 0.12,
    tinggiTiang: 1.5,
    luasLayar: 32.0,
    lokasi: "Panggung Utama Aula Jeddah",
    foto: "assets/bangunan/aula-jeddah.jpg",
    spesifikasi: "LED Screen Indoor High Definition P2.5 Ultra Crisp, Refresh Rate 3840 Hz, Audio-Visual Integrated.",
    fungsi: "Media simulasi keselamatan penerbangan (safety video kabin pesawat), panduan manasik kloter, dan serah terima living cost perdana."
  },
  {
    id: "videotron-madinah",
    nama: "Videotron Gedung Madinah",
    jenis: "Media Informasi Digital",
    panjang: 5.5,
    lebar: 3.0,
    tinggi: 0.15,
    tinggiTiang: 3.5,
    luasLayar: 16.5,
    lokasi: "Selasar Depan Gedung Madinah",
    foto: "assets/bangunan/gedung-madinah.jpg",
    spesifikasi: "LED Display Full Color P3.91 Semi-Outdoor, High Contrast, Wide Viewing Angle 160°.",
    fungsi: "Menayangkan kesiapan armada bus bandara Syamsudin Noor, status manifes jamaah kloter, dan informasi jadwal transit."
  },
  {
    id: "videotron-kawasan",
    nama: "Videotron Outdoor Gerbang Kawasan",
    jenis: "Media Informasi Digital",
    panjang: 8.0,
    lebar: 4.5,
    tinggi: 0.15,
    tinggiTiang: 6.0,
    luasLayar: 36.0,
    lokasi: "Halaman Depan Utama & Akses Gerbang",
    foto: "assets/bangunan/videotron.jpg",
    spesifikasi: "LED Display Full Color P4 Outdoor High Brightness (Waterproof IP65), Refresh Rate 3840 Hz.",
    fungsi: "Menayangkan jadwal penerbangan kloter BDJ secara real-time, live streaming upacara pelepasan, simulasi manasik, dan informasi darurat kawasan."
  },
  {
    id: "spanduk-aula-lapangan",
    nama: "Spanduk & Baliho (Aula & Lapangan)",
    jenis: "Media Publikasi & Dekorasi",
    panjang: 12.0,
    lebar: 3.0,
    tinggi: 0.05,
    luasLayar: 36.0,
    lokasi: "Backdrop Panggung Aula Mekkah & Rangka Baliho Lapangan (8.0 × 4.0 m)",
    foto: "assets/bangunan/aula-mekkah.jpg",
    spesifikasi: "Bahan Flexi Korea 440 gsm High-Resolution, rangka truss besi galvanis tahan tiupan angin kencang.",
    fungsi: "Media tema resmi musim haji, penyambutan tamu kenegaraan, dan identitas kloter keberangkatan/pemulangan."
  },
  {
    id: "panggung-utama",
    nama: "Panggung Utama Pelepasan",
    jenis: "Fasilitas Seremoni Resmi",
    panjang: 15.0,
    lebar: 6.0,
    tinggi: 0.8,
    tinggiBackdrop: 4.5,
    luasLayar: 90.0,
    lokasi: "Interior Aula Mekkah",
    foto: "assets/bangunan/aula-mekkah.jpg",
    spesifikasi: "Konstruksi panggung kokoh kapasitas 50 orang VIP, karpet beludru peredam, dilengkapi podium orasi kenegaraan dan ramp kursi roda.",
    fungsi: "Tempat prosesi resmi pelepasan jamaah oleh Gubernur Kalsel/Kalteng, Kepala Kanwil Kemenhaj, dan Duta Besar."
  },
  {
    id: "halaman-kawasan",
    nama: "Halaman Kawasan & Lapangan Upacara",
    jenis: "Area Terbuka Serbaguna",
    panjang: 80.0,
    lebar: 45.0,
    tinggi: 0.0,
    luasLayar: 3600.0,
    lokasi: "Kawasan Depan & Tengah Asrama Haji",
    foto: "assets/bangunan/pos-satpam-depan.jpg",
    spesifikasi: "Paving block mutu K-300 resapan air tinggi, kanopi kanvas peneduh, penerangan PJU LED solar cell.",
    fungsi: "Area parkir bus jemputan bandara, apel akbar jamaah satu kloter utuh (s.d. 2.500 orang), serta simulasi tawaf/sai massal."
  }
];

// ============================================================================
// SISTEM DAYA LISTRIK & GENSET KAWASAN
// ============================================================================
const electricalSystem = {
  ringkasan: "Sistem Kelistrikan Terintegrasi UPT Asrama Haji Embarkasi Banjarmasin dengan 3 Zona Feeder dan Genset Sentral Otomatis.",
  totalDayaKawasan: "1.195 kVA",
  zonasi: [
    {
      zona: "Bagian Depan",
      daya: "350 kVA",
      cakupan: "Siskohat, Pos Satpam Depan, Pos Satpam Masjid, Masjid Asrama Haji, Halaman Kawasan, dan Videotron (selain Gedung Marwah)",
      keterangan: "Mendukung operasional teknologi data biometrik tanpa jeda dan penerangan gerbang utama."
    },
    {
      zona: "Bagian Belakang",
      daya: "500 kVA",
      cakupan: "Aula Mekkah, Aula Jeddah, Poliklinik, Catering II, Dapur, Gedung Mina, Gedung Muzdalifah, Gedung Aziziyah, Gedung Madinah, Gedung Raudhah, Gedung Bir Ali (selain Gedung Jabal Rahmah)",
      keterangan: "Mendukung beban tata suara seremoni aula, dapur basah komersial, ruang makan prasmanan, dan gedung penginapan belakang."
    },
    {
      zona: "Gedung Jabal Rahmah & Marwah",
      daya: "345 kVA",
      cakupan: "Khusus untuk Gedung Jabal Rahmah dan Gedung Marwah secara terisolir",
      keterangan: "Jalur feeder prioritas untuk suplai lift lansia dan AC sentral 2 gedung penginapan bertingkat tertinggi tanpa fluktuasi tegangan."
    }
  ],
  genset: {
    nama: "Genset Sentral Heavy-Duty Diesel Silent",
    kapasitasDaya: "1.000 kVA (2 × 500 kVA Synchronized)",
    lokasi: "Gedung Genset & Gardu Listrik Belakang",
    sistem: "Automatic Transfer Switch (ATS) 5 Detik",
    foto: "assets/bangunan/genset-kawasan.jpg",
    fitur: [
      "Peralihan otomatis (ATS) kurang dari 5 detik saat terjadi pemadaman jaringan PLN.",
      "Mampu menopang 100% beban listrik seluruh kawasan asrama haji secara simultan.",
      "Dilengkapi tangki solar reservoir cadangan untuk operasional kontinu 48 jam penuh.",
      "Sistem peredam suara (canopy silent box) menjaga kenyamanan istirahat jamaah."
    ]
  }
};

// ============================================================================
// KATALOG LUAS & WILAYAH TANAH KAWASAN (BMN HAK PAKAI NO. 00012 - TOTAL 87.420 m² / 8,742 Ha)
// ============================================================================
const landParcels = [
  {
    id: 1,
    nama: "Zona A: Gerbang Utama, Fasad Protokol & Pos Depan",
    zona: "Zona A",
    luasM2: 12800,
    panjang: 142.0,
    lebar: 100.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Akses Utama & Keamanan Protokol",
    tipeArea: "sirkulasi",
    nib: "17.02.04.01.00401",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44685, 114.73820",
    batasUtara: "Jl. A. Yani Km. 28 (Jalan Nasional Arteri Primer)",
    batasSelatan: "Zona B (Sentra Spiritual & Ka'bah) & Koridor Boulevard",
    batasTimur: "Pemukiman Warga & Kompleks Perkantoran Kelurahan",
    batasBarat: "Akses Jalan Lingkungan & Kawasan Niaga",
    cakupan: "Pos Satpam Depan, Gerbang Masuk/Keluar Protokoler, Gedung Siskohat Depan, Jalur Pedestrian Fasad, Area Drop-off Kendaraan Pengantar",
    keterangan: "Etalase terdepan asrama haji dengan jalur sirkulasi lebar yang menunjang pergerakan bus pengantar jamaah dan pintu pengamanan biometrik.",
    foto: "assets/bangunan/pos-satpam-depan.jpg",
    galeriFoto: [
      "assets/bangunan/pos-satpam-depan.jpg",
      "assets/bangunan/siskohat.jpg"
    ]
  },
  {
    id: 2,
    nama: "Zona B: Sentra Spiritual, Miniatur Ka'bah & Lapangan Pelepasan",
    zona: "Zona B",
    luasM2: 18500,
    panjang: 185.0,
    lebar: 100.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Ibadah & Praktik Manasik Haji",
    tipeArea: "sirkulasi",
    nib: "17.02.04.01.00402",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44740, 114.73850",
    batasUtara: "Zona A (Fasad Depan & Pos Protokol)",
    batasSelatan: "Zona E (Aula Mekkah & Aula Jeddah)",
    batasTimur: "Zona D (Kawasan Penginapan Timur)",
    batasBarat: "Zona C (Kawasan Penginapan Barat)",
    cakupan: "Masjid Utama Asrama Haji, Plaza Miniatur Ka'bah, Lintasan Simulasi Sai & Lempar Jumrah, Pos Satpam Masjid, Lapangan Upacara / Apel Akbar Kloter",
    keterangan: "Pusat orientasi kegiatan spiritual dan bimbingan manasik massal satu kloter utuh (450-900 jamaah) dilengkapi miniatur replika Ka'bah berstandar nasional.",
    foto: "assets/bangunan/pos-satpam-masjid.jpg",
    galeriFoto: [
      "assets/bangunan/pos-satpam-masjid.jpg",
      "assets/bangunan/siskohat.jpg"
    ]
  },
  {
    id: 3,
    nama: "Zona C: Kawasan Penginapan Barat (Jabal Rahmah & Marwah)",
    zona: "Zona C",
    luasM2: 16400,
    panjang: 155.0,
    lebar: 70.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Akomodasi Penginapan Jamaah Kloter",
    tipeArea: "kdb",
    nib: "17.02.04.01.00403",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44785, 114.73780",
    batasUtara: "Koridor Hijau Samping & Pagar Batas Barat",
    batasSelatan: "Zona F (Sentra Utilitas & Gardu Listrik Belakang)",
    batasTimur: "Boulevard Tengah & Zona B (Sentra Spiritual)",
    batasBarat: "Pagar Batas Barat Kawasan & Saluran Drainase Utama",
    cakupan: "Gedung Jabal Rahmah (3 Lantai, 1.144 m²), Gedung Marwah (3 Lantai, 1.144 m²), Selasar Antar Gedung, Taman Terbuka Hijau RTH Barat",
    keterangan: "Klaster penginapan bertingkat modern dengan kapasitas 920 bed, fasilitas lift khusus lansia, jalur evakuasi darurat, dan suplai feeder 345 kVA.",
    foto: "assets/bangunan/gedung-jabal-rahmah.jpg",
    galeriFoto: [
      "assets/bangunan/gedung-jabal-rahmah.jpg",
      "assets/bangunan/gedung-marwah.jpg"
    ]
  },
  {
    id: 4,
    nama: "Zona D: Kawasan Penginapan Timur & VIP (Raudhah, Aziziyah, Mina)",
    zona: "Zona D",
    luasM2: 15200,
    panjang: 189.7,
    lebar: 70.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Akomodasi Jamaah, PPIH & VIP",
    tipeArea: "kdb",
    nib: "17.02.04.01.00404",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44790, 114.73940",
    batasUtara: "Zona B & Area Penghijauan Timur",
    batasSelatan: "Gedung Bir Ali & Dapur Catering II",
    batasTimur: "Pagar Perimeter Keliling Timur Asrama Haji",
    batasBarat: "Jalan Sirkulasi Internal & Selasar Aula",
    cakupan: "Gedung Aziziyah, Gedung Raudhah (VIP/PPIH), Gedung Mina, Gedung Muzdalifah, Gedung Madinah, Gedung Bir Ali, Koridor Penghubung Berkanopi",
    keterangan: "Klaster akomodasi penginapan jemaah dan pusat sekretariat panitia haji (PPIH), dilengkapi ruang rapat koordinasi harian dan kamar berstandar superior.",
    foto: "assets/bangunan/gedung-aziziyah.jpg",
    galeriFoto: [
      "assets/bangunan/gedung-aziziyah.jpg",
      "assets/bangunan/gedung-raudhah.jpg",
      "assets/bangunan/gedung-mina.jpg"
    ]
  },
  {
    id: 5,
    nama: "Zona E: Sentra Seremoni, Aula Pertemuan & Layanan Kloter (Mekkah & Jeddah)",
    zona: "Zona E",
    luasM2: 11320,
    panjang: 141.5,
    lebar: 80.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Seremoni Pelepasan & Penerimaan Kloter",
    tipeArea: "kdb",
    nib: "17.02.04.01.00405",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44850, 114.73860",
    batasUtara: "Zona B (Plaza Ka'bah & Lapangan Upacara)",
    batasSelatan: "Koridor Jalan Lingkar Selatan Kawasan",
    batasTimur: "Poliklinik Kesehatan & Area Catering",
    batasBarat: "Zona C (Jalur Penginapan Barat)",
    cakupan: "Aula Mekkah (Aula Pelepasan Utama, 1.250 m²), Aula Jeddah (Aula Penerimaan & Simulasi Pesawat, 1.000 m²), Drop-zone Bus Bandara, Selasar Transit Jamaah",
    keterangan: "Pusat prosesi pelepasan resmi jemaah oleh Gubernur Kalsel/Kalteng, penyerahan living cost, gelang identitas haji, dan paspor visa.",
    foto: "assets/bangunan/aula-mekkah.jpg",
    galeriFoto: [
      "assets/bangunan/aula-mekkah.jpg",
      "assets/bangunan/aula-jeddah.jpg"
    ]
  },
  {
    id: 6,
    nama: "Zona F: Sentra Utilitas, Poliklinik Kesehatan, Dapur Komersial & Gardu Genset",
    zona: "Zona F",
    luasM2: 7800,
    panjang: 130.0,
    lebar: 60.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Layanan Medis, Logistik & Sumber Energi",
    tipeArea: "kdb",
    nib: "17.02.04.01.00406",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44910, 114.73880",
    batasUtara: "Zona E (Samping Aula Mekkah & Jeddah)",
    batasSelatan: "Pagar Perimeter Selatan Kawasan",
    batasTimur: "Batas Lahan Perimeter Tenggara",
    batasBarat: "Zona G (Kantong Parkir Bus Armada)",
    cakupan: "Gedung Poliklinik Kesehatan (2 Lantai), Gedung Dapur Utama & Catering II, Gedung Genset Sentral & Gardu Listrik PLN (1.000 kVA ATS), Tangki Reservoir Air Bersih",
    keterangan: "Sentra ketahanan energi, logistik konsumsi jemaah, serta instalasi kesehatan 24 jam dengan ambulans siaga evakuasi rujukan ke RSUD.",
    foto: "assets/bangunan/poliklinik.jpg",
    galeriFoto: [
      "assets/bangunan/poliklinik.jpg",
      "assets/bangunan/catering-2.jpg",
      "assets/bangunan/genset-kawasan.jpg"
    ]
  },
  {
    id: 7,
    nama: "Zona G: Kantong Parkir Bus Armada Bandara & Cadangan Pengembangan",
    zona: "Zona G",
    luasM2: 5400,
    panjang: 90.0,
    lebar: 60.0,
    tinggi: null,
    satuan: "m",
    sumberPengukuran: "Sertifikat Hak Pakai No. 00012 BPN Banjarbaru",
    tanggalPengukuran: "2026-01-15",
    peruntukan: "Parkir Kendaraan Besar & Lahan Cadangan",
    tipeArea: "cadangan",
    nib: "17.02.04.01.00407",
    statusLegal: "Sertifikat Hak Pakai No. 00012/Landasan Ulin",
    koordinat: "-3.44930, 114.73770",
    batasUtara: "Jalur Sirkulasi Distribusi Barat-Selatan",
    batasSelatan: "Pagar Batas Alam / Buffer Kawasan",
    batasTimur: "Zona F (Sentra Utilitas & Gedung Genset)",
    batasBarat: "Pagar Perimeter Terluar Sudut Barat Daya",
    cakupan: "Area Parkir 20 Unit Bus Damri/Pariwisata Pengantar Bandara Syamsudin Noor, Shelter Supir Armada, Jalur Manuver Putar, Lahan Cadangan Gedung Asrama Masa Depan",
    keterangan: "Lahan terbuka terperkeras paving block mutu K-300 yang mampu menampung antrean armada bus kloter secara terisolasi tanpa menimbulkan kemacetan jalan luar.",
    foto: "assets/bangunan/pos-keamanan.jpg",
    galeriFoto: [
      "assets/bangunan/pos-keamanan.jpg",
      "assets/bangunan/pos-satpam-depan.jpg"
    ]
  }
];

// DATA INVENTARIS JARINGAN WI-FI & AKSES INTERNET KAWASAN EMBARKASI HAJI
const wifiNetworks = [
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

// Ekspor ke scope global browser & Node.js
if (typeof window !== 'undefined') {
  window.buildings = buildings;
  window.roomTypes = roomTypes;
  window.mediaAndFacilities = mediaAndFacilities;
  window.electricalSystem = electricalSystem;
  window.landParcels = landParcels;
  window.wifiNetworks = wifiNetworks;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildings,
    roomTypes,
    mediaAndFacilities,
    electricalSystem,
    landParcels,
    wifiNetworks
  };
}

