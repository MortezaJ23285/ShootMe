# ShootMe — Low-Poly Browser Shooter

## What this is
A small real-time multiplayer FPS playable in the browser. Client: Three.js + TypeScript + Vite. Server: Node.js + `ws` (plain WebSocket), authoritative for health/damage/kills/score. Free-For-All only.

## Architecture decisions
- **Monorepo, npm workspaces**: `client/`, `server/`, `shared/`. `shared` holds protocol message types and gameplay constants used by both sides — never duplicate a constant (weapon damage, tick rate, arena bounds) in both client and server.
- **Networking is plain WebSocket JSON**, not Socket.IO — one room, one game mode, no need for the extra abstraction. Messages are small typed objects defined in `shared/src/protocol.ts`.
- **Movement is client-authoritative, combat is server-authoritative.** The client simulates its own movement/collision and streams position+yaw+pitch to the server at a fixed rate; the server trusts this for rendering other players (this is a casual arcade shooter, not a competitive anti-cheat product — see the spec's "don't over-engineer" instruction). Health, damage, kills, respawn, ammo/reload, and score live ONLY on the server. The server validates each shot with its own raycast against its own copy of player positions before applying damage — the client never decides whether a shot landed.
- **Single arena, single FFA room** for v1. `server/src/rooms/Room.ts` is written so a second mode/room type could be added later without a rewrite, but do not build that abstraction now.
- **No React.** UI is vanilla DOM/CSS overlays (`client/src/ui`) — the game is a canvas plus lightweight HTML panels, not an app shell.
- **Weapon geometry is procedural** (BoxGeometry/CylinderGeometry/etc. composed into multi-part low-poly-plus assemblies with tuned PBR materials) — no external model files. This is a deliberate choice, not just a v1 shortcut: the game targets a **semi-realistic, not photoreal**, look, and avoids sourced/downloaded 3D assets to sidestep licensing risk and keep load instant. The one allowed "asset" technique is a canvas-generated procedural texture (see `buildNameTagCanvas` in `client/src/entities/PlayerModel.ts` and `getWeaponGrungeTexture` in `client/src/weapons/weaponTexture.ts`) — built at runtime, never loaded from a file.
- **Three weapons, no inventory/pickup system.** `shared/src/constants.ts`'s `WEAPONS` map (keyed by `WeaponId`) is the single source of truth for weapon stats — every player always carries all weapons; there's no reserve ammo or pickup mechanic. Adding a weapon means adding one `WeaponDef` entry plus one `WeaponView` subclass (see `client/src/weapons/`); it should not require touching the switch/reload/HUD plumbing.
- **Postprocessing is part of the render pipeline.** `client/src/render/PostFX.ts` wraps `EffectComposer` (bloom + tone mapping via `three/examples/jsm/postprocessing/*`, which ships inside the installed `three` package — no extra npm dependency). Any metallic (`metalness > 0`) `MeshStandardMaterial` needs `scene.environment` set (see the `PMREMGenerator`/`RoomEnvironment` setup in `client/src/game/Game.ts`) or it renders near-black — there's no reflection source otherwise.

## Commands
- `npm run dev` (repo root) — runs client (Vite, :5173) and server (:8080) concurrently.
- `npm run build` — builds both workspaces.
- Test multiplayer by opening two browser windows/tabs against the same dev server.
- `docker compose up --build` — production build: one container, one port (8080), the Node server serves both the WebSocket API and the built client bundle (`server/src/staticFiles.ts`, enabled via `CLIENT_DIST_PATH`). Behind a TLS-terminating reverse proxy on a different public port/domain, rebuild the client with `VITE_SERVER_URL=wss://yourdomain.com` so it doesn't try to append `:8080` (see `client/src/network/NetClient.ts#resolveServerUrl`).
- Pointer Lock (mouse-look) requires the page to be the top-level document — it will not engage inside an iframe/embedded preview. Test mouse-look in a real top-level browser tab.

## Rules for future changes
- Never trust a client-reported hit, kill, or score value — always recompute/validate server-side. This now includes weapon identity: the server rejects a `shoot`/`reload` whose `weaponId` doesn't match the player's server-tracked `currentWeaponId`.
- Keep per-frame allocations out of the render/game loop (reuse Vector3/Object3D instances) — this is a perf-sensitive 60fps loop. Weapon `update()` calls run for all 3 weapons every frame (so reload timers keep ticking while holstered) — keep that cheap; don't add per-frame allocations to `WeaponView.update`/`onUpdate`.
- Don't add a 4th weapon, a new game mode, an inventory/pickup system, or an account system unless explicitly asked — the loadout is intentionally fixed at 3 weapons with no reserve ammo.
- Don't add downloaded/sourced 3D models, textures, or copyrighted assets — stay procedural (geometry + canvas-generated textures) per the semi-realistic-not-photoreal art direction above.
