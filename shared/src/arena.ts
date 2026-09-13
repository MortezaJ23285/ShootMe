// Static arena layout shared by client (rendering + local collision) and server
// (spawn selection + shot occlusion). Every solid is an axis-aligned box: center (x,y,z)
// is the box's floor-level center, size (sx,sy,sz) is its full width/height/depth.

export interface ArenaBox {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
}

// Ground is an implicit infinite plane at y=0, handled separately.
export const ARENA_BOXES: ArenaBox[] = [
  // Central raised platform (king-of-the-hill style cover in the middle)
  { x: 0, y: 0, z: 0, sx: 8, sy: 1.2, sz: 8, color: 0x8a9bb0 },

  // Four corner buildings
  { x: 22, y: 0, z: 22, sx: 8, sy: 5, sz: 8, color: 0xd97757 },
  { x: -22, y: 0, z: 22, sx: 8, sy: 5, sz: 8, color: 0x6fbf8b },
  { x: 22, y: 0, z: -22, sx: 8, sy: 5, sz: 8, color: 0xe8c15a },
  { x: -22, y: 0, z: -22, sx: 8, sy: 5, sz: 8, color: 0x7ea6d9 },

  // Mid-map cover blocks (low poly crates/walls, jump-height so they double as elevation)
  { x: 10, y: 0, z: 0, sx: 3, sy: 1.3, sz: 3, color: 0xb0b8c4 },
  { x: -10, y: 0, z: 0, sx: 3, sy: 1.3, sz: 3, color: 0xb0b8c4 },
  { x: 0, y: 0, z: 10, sx: 3, sy: 1.3, sz: 3, color: 0xb0b8c4 },
  { x: 0, y: 0, z: -10, sx: 3, sy: 1.3, sz: 3, color: 0xb0b8c4 },

  // Connector walls creating sightline breaks between quadrants
  { x: 14, y: 0, z: 14, sx: 1, sy: 2.4, sz: 10, color: 0x9aa5b1 },
  { x: -14, y: 0, z: 14, sx: 1, sy: 2.4, sz: 10, color: 0x9aa5b1 },
  { x: 14, y: 0, z: -14, sx: 1, sy: 2.4, sz: 10, color: 0x9aa5b1 },
  { x: -14, y: 0, z: -14, sx: 1, sy: 2.4, sz: 10, color: 0x9aa5b1 },

  // Elevated side platforms, low enough to reach with a jump
  { x: 0, y: 0, z: 24, sx: 10, sy: 1.3, sz: 4, color: 0xc98bd6 },
  { x: 0, y: 0, z: -24, sx: 10, sy: 1.3, sz: 4, color: 0xc98bd6 },
];

export const SPAWN_POINTS: { x: number; y: number; z: number }[] = [
  { x: 26, y: 0, z: 26 },
  { x: -26, y: 0, z: 26 },
  { x: 26, y: 0, z: -26 },
  { x: -26, y: 0, z: -26 },
  { x: 26, y: 0, z: 0 },
  { x: -26, y: 0, z: 0 },
  { x: 0, y: 0, z: 26 },
  { x: 0, y: 0, z: -26 },
  { x: 18, y: 0, z: -18 },
  { x: -18, y: 0, z: 18 },
];
