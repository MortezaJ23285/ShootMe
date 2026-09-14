import { WEAPONS, WEAPON_IDS, DEFAULT_WEAPON_ID, PLAYER_MAX_HEALTH, MAPS, MAP_IDS, type WeaponId, type MapId } from '@shootme/shared';

const WEAPON_KEY_HINT: Record<WeaponId, string> = { rifle: '1', shotgun: '2', pistol: '3' };
const WEAPON_SHORT_NAME: Record<WeaponId, string> = { rifle: 'RIFLE', shotgun: 'SHOTGUN', pistol: 'PISTOL' };

export interface LeaderboardRow {
  id: string;
  name: string;
  kills: number;
  deaths: number;
}

export class UIManager {
  private root: HTMLElement;
  private landing!: HTMLElement;
  private mapSelect!: HTMLElement;
  private connecting!: HTMLElement;
  private pendingName = '';
  private hud!: HTMLElement;
  private deathOverlay!: HTMLElement;
  private matchEndOverlay!: HTMLElement;
  private damageFlash!: HTMLElement;
  private crosshair!: HTMLElement;
  private hitmarker!: HTMLElement;
  private healthFill!: HTMLElement;
  private healthLabel!: HTMLElement;
  private ammoDisplay!: HTMLElement;
  private weaponSlotsEl!: HTMLElement;
  private killsLabel!: HTMLElement;
  private deathsLabel!: HTMLElement;
  private timerLabel!: HTMLElement;
  private killfeed!: HTMLElement;
  private scoreboard!: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.buildLanding();
    this.buildMapSelect();
    this.buildConnecting();
    this.buildHUD();
    this.buildDeathOverlay();
    this.buildMatchEnd();
    this.buildDamageFlash();
  }

  private buildLanding() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'landing';
    el.innerHTML = `
      <div class="panel">
        <div class="logo">VOLTBREAK</div>
        <div class="tagline">LOW-POLY ARENA SHOOTER</div>
        <input type="text" id="name-input" placeholder="Enter nickname" maxlength="16" />
        <div>
          <button id="play-btn">PLAY NOW</button>
        </div>
        <div class="how-to-play">
          WASD move &middot; MOUSE look &middot; CLICK shoot &middot; SPACE jump<br/>
          SHIFT sprint &middot; R reload &middot; ESC release cursor
        </div>
      </div>`;
    this.root.appendChild(el);
    this.landing = el;

    const stored = localStorage.getItem('voltbreak_name');
    const input = el.querySelector<HTMLInputElement>('#name-input')!;
    if (stored) input.value = stored;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.root.querySelector<HTMLButtonElement>('#play-btn')!.click();
    });

    el.querySelector('#play-btn')!.addEventListener('click', () => {
      const name = input.value.trim() || `Player${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('voltbreak_name', name);
      this.pendingName = name;
      this.showMapSelect();
    });
  }

  private buildMapSelect() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'map-select';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="panel map-select-panel">
        <div class="logo" style="font-size:30px;">CHOOSE A MAP</div>
        <div class="tagline">Players who pick the same map play together</div>
        <div class="map-grid" id="map-grid">
          ${MAP_IDS.map((id) => {
            const map = MAPS[id];
            const accent = mapAccentColor(id);
            return `
            <button class="map-card" data-map="${id}" style="--map-accent:#${accent.toString(16).padStart(6, '0')}">
              <div class="map-card-swatch"></div>
              <div class="map-card-name">${escapeHtml(map.name)}</div>
              <div class="map-card-size">${sizeLabel(map.halfSize)}</div>
            </button>`;
          }).join('')}
        </div>
        <div>
          <button id="map-back-btn" class="secondary">BACK</button>
        </div>
      </div>`;
    this.root.appendChild(el);
    this.mapSelect = el;

    el.querySelector('#map-back-btn')!.addEventListener('click', () => this.showLanding());

    el.querySelectorAll<HTMLButtonElement>('.map-card').forEach((card) => {
      card.addEventListener('click', () => {
        const mapId = card.dataset.map as MapId;
        this.playCb?.(this.pendingName, mapId);
      });
    });
  }

  private buildConnecting() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'connecting';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="panel">
        <div class="logo" style="font-size:32px;">JOINING ARENA</div>
        <div class="connect-status" id="connect-status">Connecting to server...</div>
      </div>`;
    this.root.appendChild(el);
    this.connecting = el;
  }

  private buildHUD() {
    const el = document.createElement('div');
    el.id = 'hud';
    el.innerHTML = `
      <div class="crosshair" id="crosshair"></div>
      <div class="hitmarker" id="hitmarker"><span></span><span></span><span></span><span></span></div>
      <div class="scoreboard-hint">Hold TAB for scoreboard</div>
      <div class="hud-bottom-left">
        <div class="stat-row">
          <div class="bar-bg"><div class="bar-fill" id="health-fill" style="width:100%"></div></div>
          <div class="stat-label" id="health-label">100</div>
        </div>
        <div class="ammo-display" id="ammo-display">${WEAPONS[DEFAULT_WEAPON_ID].magazineSize}<span class="max"> / ${WEAPONS[DEFAULT_WEAPON_ID].magazineSize}</span></div>
        <div class="weapon-slots" id="weapon-slots">
          ${WEAPON_IDS.map(
            (id) => `
            <div class="weapon-slot${id === DEFAULT_WEAPON_ID ? ' active' : ''}" data-weapon="${id}">
              <span class="key-hint">${WEAPON_KEY_HINT[id]}</span>
              <span class="weapon-name">${WEAPON_SHORT_NAME[id]}</span>
              <span class="weapon-ammo">${WEAPONS[id].magazineSize}</span>
            </div>`,
          ).join('')}
        </div>
      </div>
      <div class="hud-top-right">
        <div class="timer" id="timer">03:00</div>
        <div class="kd" id="kd">0 K / 0 D</div>
      </div>
      <div class="killfeed" id="killfeed"></div>
      <div id="scoreboard"><table><thead><tr><th>Player</th><th>K</th><th>D</th></tr></thead><tbody id="scoreboard-body"></tbody></table></div>
    `;
    this.root.appendChild(el);
    this.hud = el;
    this.crosshair = el.querySelector('#crosshair')!;
    this.hitmarker = el.querySelector('#hitmarker')!;
    this.healthFill = el.querySelector('#health-fill')!;
    this.healthLabel = el.querySelector('#health-label')!;
    this.ammoDisplay = el.querySelector('#ammo-display')!;
    this.weaponSlotsEl = el.querySelector('#weapon-slots')!;
    this.killsLabel = el.querySelector('#kd')!;
    this.deathsLabel = this.killsLabel;
    this.timerLabel = el.querySelector('#timer')!;
    this.killfeed = el.querySelector('#killfeed')!;
    this.scoreboard = el.querySelector('#scoreboard')!;

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.scoreboard.classList.add('active');
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Tab') this.scoreboard.classList.remove('active');
    });
  }

  private buildDeathOverlay() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'death-overlay';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="panel">
        <h2 id="death-title">ELIMINATED</h2>
        <p id="death-sub">Respawning...</p>
      </div>`;
    this.root.appendChild(el);
    this.deathOverlay = el;
  }

  private buildMatchEnd() {
    const el = document.createElement('div');
    el.className = 'overlay';
    el.id = 'match-end';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="panel">
        <h2>MATCH OVER</h2>
        <div style="font-size:15px;color:#c3cad6;">Winner: <span class="winner-name" id="winner-name">-</span></div>
        <table><thead><tr><th>Player</th><th>Kills</th><th>Deaths</th></tr></thead><tbody id="match-end-body"></tbody></table>
        <div>
          <button id="play-again-btn">PLAY AGAIN</button>
          <button id="main-menu-btn" class="secondary">MAIN MENU</button>
        </div>
      </div>`;
    this.root.appendChild(el);
    this.matchEndOverlay = el;
  }

  private buildDamageFlash() {
    const el = document.createElement('div');
    el.className = 'damage-flash';
    this.root.appendChild(el);
    this.damageFlash = el;
  }

  private playCb: ((name: string, mapId: MapId) => void) | null = null;

  onPlay(cb: (name: string, mapId: MapId) => void) {
    this.playCb = cb;
  }

  onPlayAgain(cb: () => void) {
    this.matchEndOverlay.querySelector('#play-again-btn')!.addEventListener('click', cb);
  }

  onMainMenu(cb: () => void) {
    this.matchEndOverlay.querySelector('#main-menu-btn')!.addEventListener('click', cb);
  }

  showLanding() {
    this.landing.style.display = 'flex';
    this.mapSelect.style.display = 'none';
    this.connecting.style.display = 'none';
    this.hud.classList.remove('active');
    this.deathOverlay.style.display = 'none';
    this.matchEndOverlay.style.display = 'none';
  }

  showMapSelect() {
    this.landing.style.display = 'none';
    this.mapSelect.style.display = 'flex';
  }

  showConnecting(status: string) {
    this.landing.style.display = 'none';
    this.mapSelect.style.display = 'none';
    this.connecting.style.display = 'flex';
    this.connecting.querySelector('#connect-status')!.textContent = status;
  }

  showHUD() {
    this.connecting.style.display = 'none';
    this.deathOverlay.style.display = 'none';
    this.hud.classList.add('active');
  }

  updateHealth(health: number) {
    const pct = Math.max(0, Math.min(100, (health / PLAYER_MAX_HEALTH) * 100));
    this.healthFill.style.width = `${pct}%`;
    this.healthLabel.textContent = String(Math.max(0, Math.round(health)));
    this.healthFill.classList.toggle('low', health > 0 && health <= 30);
  }

  updateWeaponSlots(currentId: WeaponId, ammoByWeapon: Record<WeaponId, number>, reloadingByWeapon: Record<WeaponId, boolean>) {
    const reloading = reloadingByWeapon[currentId];
    this.ammoDisplay.classList.toggle('reloading', reloading);
    this.ammoDisplay.innerHTML = reloading
      ? `RELOADING`
      : `${ammoByWeapon[currentId]}<span class="max"> / ${WEAPONS[currentId].magazineSize}</span>`;

    for (const id of WEAPON_IDS) {
      const slot = this.weaponSlotsEl.querySelector<HTMLElement>(`[data-weapon="${id}"]`);
      if (!slot) continue;
      slot.classList.toggle('active', id === currentId);
      const ammoEl = slot.querySelector('.weapon-ammo')!;
      ammoEl.textContent = reloadingByWeapon[id] ? '...' : String(ammoByWeapon[id]);
    }
  }

  updateKD(kills: number, deaths: number) {
    this.killsLabel.textContent = `${kills} K / ${deaths} D`;
  }

  updateTimer(remainingMs: number) {
    const total = Math.max(0, Math.ceil(remainingMs / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    this.timerLabel.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  updateScoreboard(rows: LeaderboardRow[], myId: string) {
    const body = this.scoreboard.querySelector('#scoreboard-body')!;
    body.innerHTML = rows
      .sort((a, b) => b.kills - a.kills)
      .map(
        (r) =>
          `<tr class="${r.id === myId ? 'me' : ''}"><td>${escapeHtml(r.name)}</td><td>${r.kills}</td><td>${r.deaths}</td></tr>`,
      )
      .join('');
  }

  showHitMarker(headshot: boolean) {
    this.hitmarker.classList.remove('show');
    // Force reflow so the animation can restart.
    void this.hitmarker.offsetWidth;
    this.hitmarker.style.setProperty('--color', headshot ? '#ff5f4d' : '#ffd23f');
    this.hitmarker.querySelectorAll('span').forEach((s) => {
      (s as HTMLElement).style.background = headshot ? '#ff5f4d' : '#ffd23f';
    });
    this.hitmarker.classList.add('show');
  }

  showDamageFlash() {
    this.damageFlash.classList.remove('show');
    void this.damageFlash.offsetWidth;
    this.damageFlash.classList.add('show');
  }

  addKillFeed(killerName: string, victimName: string, headshot: boolean, isLocalKill: boolean, isLocalDeath: boolean) {
    const item = document.createElement('div');
    item.className = 'killfeed-item';
    item.innerHTML = `<span class="killer">${escapeHtml(killerName)}</span> eliminated <span class="victim">${escapeHtml(victimName)}</span>${headshot ? '<span class="headshot">HEADSHOT</span>' : ''}`;
    this.killfeed.appendChild(item);
    setTimeout(() => item.remove(), 4200);
    if (isLocalKill) this.pulseCrosshairKill();
  }

  private pulseCrosshairKill() {
    this.crosshair.classList.add('hitflash');
    setTimeout(() => this.crosshair.classList.remove('hitflash'), 200);
  }

  showDeathOverlay(killerName: string, respawnMs: number) {
    this.deathOverlay.style.display = 'flex';
    this.deathOverlay.querySelector('#death-sub')!.textContent = killerName
      ? `Killed by ${killerName} · respawning in ${Math.ceil(respawnMs / 1000)}s`
      : `Respawning in ${Math.ceil(respawnMs / 1000)}s`;
  }

  hideDeathOverlay() {
    this.deathOverlay.style.display = 'none';
  }

  showMatchEnd(rows: LeaderboardRow[], myId: string) {
    this.hud.classList.remove('active');
    this.deathOverlay.style.display = 'none';
    this.matchEndOverlay.style.display = 'flex';
    const sorted = [...rows].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    this.matchEndOverlay.querySelector('#winner-name')!.textContent = sorted[0]?.name ?? '-';
    const body = this.matchEndOverlay.querySelector('#match-end-body')!;
    body.innerHTML = sorted
      .map(
        (r) =>
          `<tr class="${r.id === myId ? 'me' : ''}"><td>${escapeHtml(r.name)}</td><td>${r.kills}</td><td>${r.deaths}</td></tr>`,
      )
      .join('');
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// A representative accent color per map card — the tallest box in the layout
// tends to be its most visually defining structure (tower/fortress/building).
function mapAccentColor(id: MapId): number {
  const boxes = MAPS[id].boxes;
  if (boxes.length === 0) return 0x8a9bb0;
  return boxes.reduce((tallest, b) => (b.sy > tallest.sy ? b : tallest), boxes[0]).color;
}

function sizeLabel(halfSize: number): string {
  if (halfSize <= 35) return 'Small';
  if (halfSize <= 50) return 'Medium';
  if (halfSize <= 65) return 'Large';
  return 'Huge';
}
