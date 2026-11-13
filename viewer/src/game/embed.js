import Phaser from 'phaser';
import { LevelScene } from './scene.js';
import { PAL } from './tileset.js';

// The pixel floor view inside the model-check page: a Phaser game in its own container that
// takes over the stage when one floor is shown in GAME VIEW. Built on first use; a floor change
// restarts the one scene; hiding puts the game loop to sleep.
export class PixelFloorView {
  constructor(container) {
    this.el = container;
    this.game = null;
    this.ready = null;
    this.context = null;     // exports/context.json, when loaded
    this.program = null;     // program/rooms.json, when loaded (room names and uses)
    this.programVersion = 0;
    this.current = null;     // what is on show: floor, view, corner, people, program version
    this.started = false;
    this.onZoom = null;
    this.onReady = null;
    this.focusId = null;     // the room to highlight once the scene is ready
    this.sim = null;         // the running simulation, drawn by the scene when its floor is on show
  }
  setContext(ctx) { this.context = ctx; }
  setSim(sim) { this.sim = sim; const s = this.scene; if (s) s.sim = sim; }
  /** The building's levels from the bottom up ([{ name, file }], the roof excluded): a floor's isometric stands on the ones below it. */
  setLevels(levels) { this.levels = levels; this.tiles = this.tiles || {}; }
  /** The tile files of every level, fetched once. */
  async loadAllTiles() {
    if (!this.levels) return null;
    for (const lv of this.levels) if (!this.tiles[lv.file]) this.tiles[lv.file] = await (await fetch(`exports/tiles/${lv.file}.json`, { cache: 'no-store' })).json();
    return this.levels.map((lv, k) => ({ ...lv, k, L: this.tiles[lv.file] }));
  }
  setProgram(program) { this.program = program; this.programVersion++; }
  /** Highlight and centre a room (Revit id) in whatever view is on show; kept across restarts. */
  focusRoom(id) {
    this.focusId = id;
    const s = this.scene;
    if (s && s.L && s.sys.settings.status === 5) s.focusRoom(id);
  }
  get visible() { return this.el.classList.contains('on'); }
  get scene() { return this.game ? this.game.scene.getScene('level') : null; }

  boot() {
    if (this.game) return this.ready;
    this.el.classList.add('on');
    this.game = new Phaser.Game({
      type: Phaser.CANVAS, parent: this.el,
      width: this.el.clientWidth || window.innerWidth, height: this.el.clientHeight || window.innerHeight,
      backgroundColor: PAL.void, pixelArt: true, roundPixels: true, antialias: false,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
    });
    this.game.scene.add('level', LevelScene, false);
    this.ready = new Promise((r) => this.game.events.once('ready', r));
    return this.ready;
  }

  /** Show a floor (tile file name such as "level-3") as its plan (view "plan") or pixel isometric (view "iso",
   *  from the corner `azimuth`, 0 south-west then clockwise); the same floor and view only brings the view back. */
  async show(file, opts) {
    await this.boot();
    this.el.classList.add('on');
    this.game.loop.wake();
    this.game.scale.refresh();
    const sc = this.scene;
    const view = opts.view === 'iso' ? 'iso' : 'plan', az = ((opts.azimuth || 0) % 4 + 4) % 4;
    const stack = view === 'iso' && opts.stack !== false && !!this.levels;
    const which = `${file}|${view}|${view === 'iso' ? az : 0}|${opts.people ?? 6}|${this.programVersion}|${stack ? 's' : ''}`;
    if (this.started && which === this.current) {
      sc.setLabels(!!opts.labels); sc.setContextVisible(!!opts.contextOn);
      return;
    }
    this.current = which;
    const levels = stack ? await this.loadAllTiles() : null;
    if (this.current !== which) return; // another floor was asked for while the tiles loaded
    const data = {
      file,
      opts: { people: opts.people ?? 6, labels: !!opts.labels, context: this.context, contextOn: !!opts.contextOn, view, azimuth: az, program: this.program, sim: this.sim, levels },
      onReady: (s, L) => {
        s.events.on('zoom', (z) => { if (this.onZoom) this.onZoom(z); });
        if (this.onZoom) this.onZoom(s.zoomLevel);
        if (this.onReady) this.onReady(s, L);
        if (this.focusId != null) s.focusRoom(this.focusId);
      },
    };
    const st = sc.sys.settings.status; // 1 INIT .. 6 PAUSED: already running or loading
    if (st >= 1 && st <= 6) sc.scene.restart(data); else this.game.scene.start('level', data);
    this.started = true;
  }
  hide() {
    this.el.classList.remove('on');
    if (this.game) this.game.loop.sleep();
  }
  fit() { const s = this.scene; if (s && s.L) s.fit(); }
  planRect() { const s = this.scene; return s && s.L && s.planRect ? s.planRect() : null; }
  isPlan() { return this.el.classList.contains('on') && /\|plan\|/.test(this.current || ''); }
  zoomStep(d) { const s = this.scene; if (s && s.L) s.zoomStep(d); }
  pan(dx, dy) { const s = this.scene; if (s && s.L) s.pan(dx, dy); }
  setLabels(on) { const s = this.scene; if (s && s.L) s.setLabels(on); }
  setContextVisible(on) { const s = this.scene; if (s && s.L) s.setContextVisible(on); }
}

/** The tile file name the rasteriser gives a level ("Level 3" -> "level-3"). */
export function tileFileOf(levelName) {
  return String(levelName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
