import fs from 'node:fs';
import path from 'node:path';
import { encodePNG } from './png-encoder.js';

fs.mkdirSync('assets/bangunan', { recursive: true });

// 1. Generate updated denah.png with accurate layout for the 17 buildings
const denahW = 1200;
const denahH = 800;

// Layout representation of the 17 buildings in Asrama Haji Banjarmasin
const mapBuildings = [
  // Jalan & Akses Utama
  { x: 30, y: 730, w: 1140, h: 45, color: [75, 85, 99], type: 'road', name: 'Jl. A. Yani Km 28' },
  
  // Pos Satpam Depan & Gerbang
  { x: 260, y: 660, w: 90, h: 50, color: [34, 197, 94], type: 'security', name: 'Pos Satpam Depan' },
  
  // Siskohat & Gedung Pelayanan Depan
  { x: 370, y: 640, w: 140, h: 70, color: [16, 185, 129], type: 'service', name: 'Siskohat' },

  // Halaman Kawasan & Lapangan Upacara Depan
  { x: 530, y: 630, w: 320, h: 80, color: [203, 213, 225], type: 'plaza', name: 'Halaman Kawasan' },

  // Pos Satpam Masjid
  { x: 100, y: 550, w: 80, h: 50, color: [34, 197, 94], type: 'security', name: 'Pos Satpam Masjid' },

  // Masjid Utama Asrama Haji
  { x: 60, y: 350, w: 220, h: 180, color: [13, 148, 136], type: 'mosque', name: 'Masjid' },

  // Aula Jeddah (Aula Penerimaan / Pembekalan)
  { x: 320, y: 470, w: 210, h: 130, color: [180, 83, 9], type: 'hall', name: 'Aula Jeddah' },

  // Poliklinik Kesehatan
  { x: 560, y: 480, w: 150, h: 110, color: [225, 29, 72], type: 'clinic', name: 'Poliklinik' },

  // Catering II & Dapur
  { x: 740, y: 480, w: 180, h: 110, color: [217, 119, 6], type: 'catering', name: 'Catering II' },
  { x: 940, y: 480, w: 140, h: 110, color: [180, 83, 9], type: 'kitchen', name: 'Dapur' },

  // Genset & Gardu Listrik Belakang
  { x: 1095, y: 480, w: 75, h: 90, color: [100, 116, 139], type: 'utility', name: 'Genset Kawasan' },

  // Aula Mekkah (Aula Utama Pelepasan)
  { x: 320, y: 290, w: 260, h: 140, color: [202, 138, 4], type: 'hall', name: 'Aula Mekkah' },

  // Gedung Muzdalifah & Gedung Bir Ali
  { x: 610, y: 290, w: 190, h: 140, color: [37, 99, 235], type: 'dorm', name: 'Gedung Muzdalifah' },
  { x: 820, y: 290, w: 180, h: 140, color: [59, 130, 246], type: 'dorm', name: 'Gedung Bir Ali' },
  { x: 1020, y: 290, w: 140, h: 140, color: [99, 102, 241], type: 'dorm', name: 'Gedung Mina' },

  // Baris Asrama Utama Belakang / Atas:
  // Gedung Jabal Rahmah (Daya 345 kVA bersama Marwah)
  { x: 60, y: 100, w: 200, h: 150, color: [29, 78, 216], type: 'dorm', name: 'Gedung Jabal Rahmah' },

  // Gedung Marwah
  { x: 280, y: 100, w: 200, h: 150, color: [30, 64, 175], type: 'dorm', name: 'Gedung Marwah' },

  // Gedung Aziziyah
  { x: 500, y: 100, w: 200, h: 150, color: [30, 58, 138], type: 'dorm', name: 'Gedung Aziziyah' },

  // Gedung Madinah
  { x: 720, y: 100, w: 200, h: 150, color: [67, 56, 202], type: 'dorm', name: 'Gedung Madinah' },

  // Gedung Raudhah
  { x: 940, y: 100, w: 190, h: 150, color: [109, 40, 217], type: 'dorm', name: 'Gedung Raudhah' }
];

console.log('Generating assets/denah.png with updated layout...');
const denahBuffer = encodePNG(denahW, denahH, (x, y) => {
  // Border of map
  if (x < 12 || x > denahW - 12 || y < 12 || y > denahH - 12) {
    return [13, 110, 66, 255]; // Border frame
  }
  if (x < 16 || x > denahW - 16 || y < 16 || y > denahH - 16) {
    return [212, 175, 55, 255]; // Gold inner frame
  }

  // Header banner on map
  if (y >= 16 && y <= 55) {
    return [10, 83, 50, 255];
  }

  // Base grass / pavement background
  const isGridX = (x % 40 === 0);
  const isGridY = (y % 40 === 0);
  let bgR = 244, bgG = 247, bgB = 242;
  if (isGridX || isGridY) {
    bgR = 226; bgG = 232; bgB = 224;
  }

  // Paved roads & pedestrian walkways
  if (y >= 255 && y <= 280 && x >= 50 && x <= 1150) {
    bgR = 215; bgG = 220; bgB = 225;
  }
  if (y >= 435 && y <= 465 && x >= 50 && x <= 1150) {
    bgR = 215; bgG = 220; bgB = 225;
  }
  if (x >= 285 && x <= 315 && y >= 60 && y <= 720) {
    bgR = 210; bgG = 215; bgB = 220;
    if (Math.abs(x - 300) < 2 && y % 30 < 18) {
      bgR = 234; bgG = 179; bgB = 8;
    }
  }
  if (x >= 575 && x <= 600 && y >= 60 && y <= 620) {
    bgR = 210; bgG = 215; bgB = 220;
  }

  // North Arrow top right
  const cdx = x - 1140;
  const cdy = y - 36;
  if (cdx * cdx + cdy * cdy < 200) {
    if (cdy < 0 && Math.abs(cdx) < -cdy * 0.5) return [220, 38, 38, 255];
    return [255, 255, 255, 255];
  }

  // Buildings drawing
  for (const b of mapBuildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      const isBorder = (x - b.x < 3 || (b.x + b.w) - x < 3 || y - b.y < 3 || (b.y + b.h) - y < 3);
      if (isBorder) return [20, 30, 40, 255];
      const [br, bg, bb] = b.color;
      const gradH = (y - b.y) / b.h;
      const shadowFactor = 0.9 + 0.2 * (1 - gradH);
      const pr = Math.min(255, Math.round(br * shadowFactor));
      const pg = Math.min(255, Math.round(bg * shadowFactor));
      const pb = Math.min(255, Math.round(bb * shadowFactor));
      return [pr, pg, pb, 255];
    }
  }

  return [bgR, bgG, bgB, 255];
});
fs.writeFileSync('assets/denah.png', denahBuffer);

console.log('Generating building photos for all requested buildings...');
// 2. All 17 Buildings & specialized facilities photos
const photoList = [
  { id: 'gedung-jabal-rahmah', name: 'Gedung Jabal Rahmah', color: [29, 78, 216] },
  { id: 'gedung-marwah', name: 'Gedung Marwah', color: [30, 64, 175] },
  { id: 'gedung-aziziyah', name: 'Gedung Aziziyah', color: [30, 58, 138] },
  { id: 'gedung-raudhah', name: 'Gedung Raudhah', color: [109, 40, 217] },
  { id: 'gedung-mina', name: 'Gedung Mina', color: [99, 102, 241] },
  { id: 'gedung-muzdalifah', name: 'Gedung Muzdalifah', color: [37, 99, 235] },
  { id: 'gedung-madinah', name: 'Gedung Madinah', color: [67, 56, 202] },
  { id: 'gedung-bir-ali', name: 'Gedung Bir Ali', color: [59, 130, 246] },
  { id: 'catering-ii', name: 'Catering II', color: [217, 119, 6] },
  { id: 'dapur', name: 'Dapur Kawasan', color: [180, 83, 9] },
  { id: 'aula-mekkah', name: 'Aula Mekkah', color: [202, 138, 4] },
  { id: 'aula-jeddah', name: 'Aula Jeddah', color: [180, 83, 9] },
  { id: 'poliklinik', name: 'Poliklinik', color: [225, 29, 72] },
  { id: 'siskohat', name: 'Siskohat', color: [16, 185, 129] },
  { id: 'pos-satpam-depan', name: 'Pos Satpam Depan', color: [34, 197, 94] },
  { id: 'pos-satpam-masjid', name: 'Pos Satpam Masjid', color: [22, 163, 74] },
  { id: 'masjid', name: 'Masjid Asrama Haji', color: [13, 148, 136] },
  { id: 'genset-kawasan', name: 'Genset & Gardu Listrik', color: [100, 116, 139] },
  { id: 'kamar-standar', name: 'Kamar Standar Jamaah', color: [2, 132, 199] },
  { id: 'kamar-superior', name: 'Kamar Superior Jamaah', color: [217, 119, 6] },
  { id: 'videotron', name: 'Videotron Kawasan', color: [15, 23, 42] }
];

for (const item of photoList) {
  const photoBuf = encodePNG(400, 260, (x, y) => {
    // Sky
    if (y < 80) {
      const t = y / 80;
      return [
        Math.round(186 * (1 - t) + 224 * t),
        Math.round(230 * (1 - t) + 242 * t),
        Math.round(253 * (1 - t) + 254 * t),
        255
      ];
    }
    // Ground
    if (y > 215) {
      const g = 145 + Math.round((y - 215) * 1.5);
      return [g - 10, g, g - 5, 255];
    }
    // Facade
    if (x >= 35 && x <= 365 && y >= 55 && y <= 218) {
      if (y < 70) return [212, 175, 55, 255]; // Gold decorative crown
      const [br, bg, bb] = item.color;
      // Windows
      const winX = (x - 45) % 38;
      const winY = (y - 80) % 32;
      if (winX > 10 && winX < 30 && winY > 8 && winY < 25) {
        return [224, 242, 254, 255];
      }
      // White columns
      if (x % 75 < 8) return [248, 250, 252, 255];
      return [br, bg, bb, 255];
    }
    return [241, 245, 249, 255];
  });
  fs.writeFileSync(`assets/bangunan/${item.id}.jpg`, photoBuf);
}

console.log('All 21 assets generated successfully.');
