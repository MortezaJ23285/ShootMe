import { MAPS, type MapId } from '@shootme/shared';
import { UIManager } from './ui/UIManager.js';
import { NetClient, resolveServerUrl } from './network/NetClient.js';
import { Game } from './game/Game.js';

const app = document.getElementById('app')!;

const canvasWrap = document.createElement('div');
canvasWrap.id = 'game-canvas-wrap';
app.appendChild(canvasWrap);

const ui = new UIManager(app);
ui.showLanding();

let net: NetClient | null = null;
let game: Game | null = null;

async function joinGame(name: string, mapId: MapId) {
  ui.showConnecting('Connecting to server...');
  net = new NetClient();

  try {
    await net.connect(resolveServerUrl());
  } catch {
    ui.showConnecting('Could not reach server. Retrying...');
    setTimeout(() => joinGame(name, mapId), 1500);
    return;
  }

  ui.showConnecting('Joining arena...');

  net.on('welcome', (msg) => {
    game = new Game(canvasWrap, net!, ui, returnToMenu, MAPS[msg.mapId]);
    game.start(msg.players, msg.id, name, msg.matchEndsAt);
  });

  net.onClose(() => {
    if (game) returnToMenu();
    else ui.showConnecting('Disconnected from server.');
  });

  net.send({ t: 'join', name, mapId });
}

function returnToMenu() {
  game?.dispose();
  game = null;
  net?.close();
  net = null;
  ui.showLanding();
}

ui.onPlay((name, mapId) => joinGame(name, mapId));
ui.onPlayAgain(() => {
  // The server auto-restarts the match; just re-show the HUD.
  ui.showHUD();
});
ui.onMainMenu(() => returnToMenu());
