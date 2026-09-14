// 15 maps. Each composes a handful of the pure generators in `mapGen.ts` at a
// distinct half-size/palette/density so they read as genuinely different places,
// not recolors of one layout. This module is imported identically by client
// (rendering + local collision) and server (spawn selection + shot occlusion) —
// see CLAUDE.md: never duplicate this data, both sides read the same `MAPS` map.

import type { ArenaBox } from './arena.js';
import { ARENA_BOXES, SPAWN_POINTS } from './arena.js';
import { ringBoxes, gridBoxes, crossBoxes, cornerTowers, wallRing, scatteredBoxes, ringSpawnPoints } from './mapGen.js';

export interface MapData {
  id: MapId;
  name: string;
  halfSize: number;
  boxes: ArenaBox[];
  spawnPoints: { x: number; y: number; z: number }[];
}

export type MapId =
  | 'the-yard'
  | 'crossfire'
  | 'twin-peaks'
  | 'the-pit'
  | 'skyline'
  | 'labyrinth'
  | 'outpost'
  | 'wide-open'
  | 'fortress'
  | 'causeway'
  | 'boxtown'
  | 'ruins'
  | 'highlands'
  | 'chokepoint'
  | 'sprawl';

export const MAP_IDS: MapId[] = [
  'the-yard', 'crossfire', 'twin-peaks', 'the-pit', 'skyline',
  'labyrinth', 'outpost', 'wide-open', 'fortress', 'causeway',
  'boxtown', 'ruins', 'highlands', 'chokepoint', 'sprawl',
];

function centerPlatform(size: { sx: number; sy: number; sz: number }, color: number): ArenaBox {
  return { x: 0, y: 0, z: 0, ...size, color };
}

export const MAPS: Record<MapId, MapData> = {
  'the-yard': {
    id: 'the-yard',
    name: 'The Yard',
    halfSize: 30,
    boxes: ARENA_BOXES,
    spawnPoints: SPAWN_POINTS,
  },

  crossfire: {
    id: 'crossfire',
    name: 'Crossfire',
    halfSize: 45,
    boxes: [
      centerPlatform({ sx: 10, sy: 1.2, sz: 10 }, 0x8a9bb0),
      ...crossBoxes(3, 11, { sx: 4, sy: 2.6, sz: 4 }, 0xd97757),
      ...wallRing(20, 14, 1, 2.4, 0x9aa5b1),
    ],
    spawnPoints: ringSpawnPoints(45, 10),
  },

  'twin-peaks': {
    id: 'twin-peaks',
    name: 'Twin Peaks',
    halfSize: 40,
    boxes: [
      { x: 0, y: 0, z: 24, sx: 14, sy: 8, sz: 10, color: 0x6fbf8b },
      { x: 0, y: 0, z: -24, sx: 14, sy: 8, sz: 10, color: 0x7ea6d9 },
      centerPlatform({ sx: 8, sy: 1.3, sz: 8 }, 0xb0b8c4),
      ...scatteredBoxes(22, { sx: 3, sy: 1.4, sz: 3 }, 0xc98bd6),
    ],
    spawnPoints: ringSpawnPoints(40, 10),
  },

  'the-pit': {
    id: 'the-pit',
    name: 'The Pit',
    halfSize: 60,
    boxes: [
      ...ringBoxes(8, 26, { sx: 4, sy: 1.6, sz: 4 }, 0xb0b8c4),
      ...cornerTowers(48, { sx: 9, sy: 6, sz: 9 }, 0xe8c15a),
      centerPlatform({ sx: 12, sy: 1, sz: 12 }, 0x8a9bb0),
    ],
    spawnPoints: ringSpawnPoints(60, 12),
  },

  skyline: {
    id: 'skyline',
    name: 'Skyline',
    halfSize: 50,
    boxes: [
      ...cornerTowers(38, { sx: 8, sy: 10, sz: 8 }, 0x7ea6d9),
      ...scatteredBoxes(24, { sx: 3.5, sy: 2, sz: 3.5 }, 0xef7f9a),
      centerPlatform({ sx: 9, sy: 1.2, sz: 9 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(50, 11),
  },

  labyrinth: {
    id: 'labyrinth',
    name: 'Labyrinth',
    halfSize: 55,
    boxes: [
      ...wallRing(16, 22, 1, 2.8, 0x9aa5b1),
      ...wallRing(30, 30, 1, 2.8, 0x8a9bb0),
      ...wallRing(43, 20, 1, 2.8, 0x9aa5b1),
      centerPlatform({ sx: 6, sy: 1, sz: 6 }, 0x7fd6c9),
    ],
    spawnPoints: ringSpawnPoints(55, 12),
  },

  outpost: {
    id: 'outpost',
    name: 'Outpost',
    halfSize: 35,
    boxes: [
      ...cornerTowers(24, { sx: 7, sy: 5, sz: 7 }, 0xf0a15a),
      centerPlatform({ sx: 7, sy: 1.2, sz: 7 }, 0x8a9bb0),
      ...crossBoxes(1, 14, { sx: 2.5, sy: 1.3, sz: 2.5 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(35, 8),
  },

  'wide-open': {
    id: 'wide-open',
    name: 'Wide Open',
    halfSize: 75,
    boxes: [
      ...scatteredBoxes(48, { sx: 4, sy: 1.6, sz: 4 }, 0xd97757),
      centerPlatform({ sx: 10, sy: 1, sz: 10 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(75, 12),
  },

  fortress: {
    id: 'fortress',
    name: 'Fortress',
    halfSize: 45,
    boxes: [
      ...wallRing(20, 40, 1.2, 4, 0x6b7280),
      ...cornerTowers(35, { sx: 8, sy: 7, sz: 8 }, 0xe8c15a),
      centerPlatform({ sx: 10, sy: 1.4, sz: 10 }, 0x8a9bb0),
    ],
    spawnPoints: ringSpawnPoints(45, 10),
  },

  causeway: {
    id: 'causeway',
    name: 'Causeway',
    halfSize: 65,
    boxes: [
      ...crossBoxes(4, 13, { sx: 3, sy: 2.2, sz: 3 }, 0x7ea6d9),
      { x: 50, y: 0, z: 0, sx: 12, sy: 6, sz: 12, color: 0x6fbf8b },
      { x: -50, y: 0, z: 0, sx: 12, sy: 6, sz: 12, color: 0xd97757 },
      centerPlatform({ sx: 8, sy: 1.2, sz: 8 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(65, 12),
  },

  boxtown: {
    id: 'boxtown',
    name: 'Boxtown',
    halfSize: 40,
    boxes: gridBoxes(5, 5, 13, { sx: 6, sy: 4.5, sz: 6 }, 0xc98bd6, true),
    spawnPoints: ringSpawnPoints(40, 10),
  },

  ruins: {
    id: 'ruins',
    name: 'Ruins',
    halfSize: 50,
    boxes: [
      ...scatteredBoxes(32, { sx: 4.5, sy: 2.4, sz: 4.5 }, 0x9aa5b1),
      ...ringBoxes(6, 16, { sx: 2.5, sy: 1.2, sz: 2.5 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(50, 11),
  },

  highlands: {
    id: 'highlands',
    name: 'Highlands',
    halfSize: 55,
    boxes: [
      { x: 0, y: 0, z: 0, sx: 10, sy: 1.2, sz: 10, color: 0x8a9bb0 },
      { x: 26, y: 0, z: 26, sx: 9, sy: 2.6, sz: 9, color: 0x6fbf8b },
      { x: -26, y: 0, z: 26, sx: 9, sy: 4, sz: 9, color: 0xe8c15a },
      { x: 26, y: 0, z: -26, sx: 9, sy: 5.4, sz: 9, color: 0x7ea6d9 },
      { x: -26, y: 0, z: -26, sx: 9, sy: 6.8, sz: 9, color: 0xd97757 },
    ],
    spawnPoints: ringSpawnPoints(55, 11),
  },

  chokepoint: {
    id: 'chokepoint',
    name: 'Chokepoint',
    halfSize: 35,
    boxes: [
      ...wallRing(10, 22, 1.2, 3, 0x9aa5b1),
      ...wallRing(22, 12, 1.2, 3, 0x8a9bb0),
      centerPlatform({ sx: 5, sy: 1, sz: 5 }, 0x7fd6c9),
    ],
    spawnPoints: ringSpawnPoints(35, 8),
  },

  sprawl: {
    id: 'sprawl',
    name: 'Sprawl',
    halfSize: 85,
    boxes: [
      ...scatteredBoxes(58, { sx: 5, sy: 2.4, sz: 5 }, 0xef7f9a),
      ...cornerTowers(68, { sx: 10, sy: 7, sz: 10 }, 0x7ea6d9),
      centerPlatform({ sx: 12, sy: 1.3, sz: 12 }, 0xb0b8c4),
    ],
    spawnPoints: ringSpawnPoints(85, 14),
  },
};
