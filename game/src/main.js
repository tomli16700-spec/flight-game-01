// Skylark Canyon Run — the game loop and the state machine.
// Owns the aircraft, the valley, the mission, the score and the screens,
// and hands them to the renderer once a frame. Menu, flying, paused,
// game over and mission complete are the only states the game ever has.

import { Damage, Fuel, Missions, Score, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Plane } from './plane.js';
import { CanyonWorld } from './world.js';
import { MissionTracker } from './missions.js';
import { Renderer } from './render.js';

const BEST_KEY = 'skylark-canyon-run-best';

export class SkylarkGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.renderer = new Renderer(canvas);
    this.plane = new Plane();
    this.world = new CanyonWorld(20261127);
    this.missionDefs = Missions;
    this.mission = new MissionTracker(Missions[0]);
    this.state = 'menu';
    this.score = 0;
    this.combo = 0;
    this.travelled = 0;
    this.time = 0;
    this.dt = 0;
    this.particles = [];
    this.flashText = '';
    this.flashColor = '';
    this.flashUntil = 0;
    this.endReason = '';
    this.best = this.loadBest();
    this.isTouch = 'ontouchstart' in window;
    this.lastFrame = performance.now();
    this.wind = 0;
    this.warnedLowFuel = false;

    canvas.addEventListener('pointerdown', () => this.sound.unlock());
    window.addEventListener('keydown', () => this.sound.unlock());
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyM') {
        const muted = this.sound.toggleMute();
        this.flash(muted ? 'SOUND OFF' : 'SOUND ON', '#d8f2ff');
      }
    });

    // A small handle for screenshots and play-tests: the maker can drive
    // the game to a chosen moment without playing through it by hand.
    window.__SKYLARK__ = {
      game: this,
      shot: (kind) => this.debugShot(kind),
    };
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch (error) {
      return 0;
    }
  }

  saveBest() {
    if (this.score <= this.best) return;
    this.best = this.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(this.best));
    } catch (error) {
      // Private mode or a blocked store; the in-memory best still stands.
    }
  }

  flash(text, color) {
    this.flashText = text;
    this.flashColor = color || '#ffc857';
    this.flashUntil = this.time + 1.6;
  }

  startMission(index) {
    const def = this.missionDefs[index] || this.missionDefs[0];
    this.mission = new MissionTracker(def);
    this.world.reset(def.id);
    this.plane.reset();
    this.score = 0;
    this.combo = 0;
    this.travelled = 0;
    this.time = 0;
    this.particles = [];
    this.wind = 0;
    this.warnedLowFuel = false;
    this.state = 'playing';
    this.sound.startEngine();
    this.flash(`${def.name.toUpperCase()} — GO`, '#7dffa8');
  }

  endSortie(outcome, reason) {
    this.endReason = reason;
    this.saveBest();
    this.sound.stopEngine();
    if (outcome === 'complete' || outcome === 'landed') {
      this.state = 'complete';
      this.sound.fanfare();
    } else {
      this.state = 'over';
      this.sound.crashThud();
      this.burst(VIEW_WIDTH / 2, VIEW_HEIGHT * 0.6, '#ff6b5e', 60);
      this.burst(VIEW_WIDTH / 2, VIEW_HEIGHT * 0.6, '#ffb400', 40);
    }
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.7 + Math.random() * 0.6,
        maxLife: 1.3,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 260 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // Drive the game to a photogenic moment for a screenshot.
  debugShot(kind) {
    if (kind === 'menu') {
      this.state = 'menu';
      return;
    }
    this.startMission(kind === 'land' ? 1 : 0);
    if (kind === 'ring') {
      // Put a ring right ahead and the Skylark lined up on it.
      this.world.rings = [{ kind: 'ring', x: 0.05, y: 0.42, z: 420, size: 1, passed: false }];
      this.world.nextRingAt = 900;
      this.plane.x = 0.05;
      this.plane.altitude = 0.42 * 600;
      this.plane.speedKnots = 240;
      this.plane.throttle = 0.7;
    }
    if (kind === 'land') {
      // On final approach: the strip ahead, low and slow, centred.
      this.travelled = 2350;
      this.world.travelled = 2350;
      this.plane.x = 0.02;
      this.plane.altitude = 60;
      this.plane.speedKnots = 125;
      this.plane.throttle = 0.35;
      this.score = 640;
      this.mission.ringsPassed = 0;
    }
    if (kind === 'storm') {
      this.startMission(2);
      this.plane.x = -0.2;
      this.plane.altitude = 300;
      this.plane.speedKnots = 260;
      this.score = 850;
      this.mission.starsCollected = 5;
      this.mission.elapsed = 41;
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.dt = dt;

    if (this.state === 'menu') {
      // The valley scrolls gently behind the menu so it never looks dead.
      this.travelled += 40 * dt;
      this.world.travelled = this.travelled;
      if (this.input.wasPressed('Digit1')) this.startMission(0);
      if (this.input.wasPressed('Digit2')) this.startMission(1);
      if (this.input.wasPressed('Digit3')) this.startMission(2);
      if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) this.startMission(0);
      if (this.input.pointerDown) this.menuClick();
    } else if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'paused') {
      if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
        this.state = 'playing';
        this.sound.startEngine();
      }
      if (this.input.wasPressed('KeyR')) this.startMission(this.missionDefs.indexOf(this.mission.def));
    } else if (this.state === 'over' || this.state === 'complete') {
      this.updateParticles(dt);
      if (this.input.wasPressed('KeyR')) {
        this.startMission(this.missionDefs.indexOf(this.mission.def));
      }
      if (this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
        this.state = 'menu';
      }
      if (this.input.pointerDown) this.state = 'menu';
    }

    this.renderer.draw(this);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  menuClick() {
    // Mission cards on the menu: three boxes across the middle.
    const rect = this.canvas.getBoundingClientRect();
    const nx = (this.input.pointerX + 1) / 2;
    const ny = (this.input.pointerY + 1) / 2;
    // pointerX/Y are centred -1..1; convert back to fractions of the canvas.
    const fx = nx;
    const fy = 0.5 - this.input.pointerY / 2;
    void rect;
    void fy;
    if (fx > 0.17 && fx < 0.38) this.startMission(0);
    else if (fx > 0.39 && fx < 0.61) this.startMission(1);
    else if (fx > 0.62 && fx < 0.83) this.startMission(2);
  }

  updatePlaying(dt) {
    this.time += dt;
    if (this.input.wasPressed('KeyP') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.sound.stopEngine();
      return;
    }
    if (this.input.wasPressed('KeyR')) {
      this.startMission(this.missionDefs.indexOf(this.mission.def));
      return;
    }

    // Storm wind shoves the aircraft sideways.
    if (this.mission.def.kind === 'storm') {
      this.wind = Math.sin(this.time * 0.7) * 0.22 + Math.sin(this.time * 1.9) * 0.08;
    } else {
      this.wind = 0;
    }

    this.plane.update(dt, this.input, this.wind);
    const distanceDelta = this.plane.speedMetresPerSecond * dt;
    this.travelled += distanceDelta;
    const events = this.world.update(distanceDelta, this.plane);
    this.sound.setEngine(this.plane.throttle, this.plane.speedKnots);

    for (const event of events) {
      if (event.type === 'ring') {
        this.combo += 1;
        const points = Score.ringPoints + (this.combo - 1) * Score.ringComboStep;
        this.score += points;
        this.plane.refuel(Fuel.ringBonus);
        this.flash(`RING +${points}`, '#7dffa8');
        this.sound.ringChime();
        this.burst(VIEW_WIDTH / 2 + this.plane.x * 200, VIEW_HEIGHT * 0.55, '#ffd94a', 24);
      }
      if (event.type === 'ring-missed') {
        this.combo = 0;
        this.flash('RING MISSED', '#ff6b5e');
      }
      if (event.type === 'star') {
        this.score += Score.starPoints;
        this.flash(`STAR +${Score.starPoints}`, '#ffd94a');
        this.sound.starBlip();
      }
      if (event.type === 'fuel') {
        this.score += Score.canPoints;
        this.plane.refuel(Fuel.canBonus);
        this.flash(`FUEL +${Fuel.canBonus}`, '#7dffa8');
        this.sound.fuelBlip();
      }
      if (event.type === 'hit') {
        const dead = this.plane.takeHit();
        this.combo = 0;
        this.flash(dead ? 'HULL BREACH' : 'HIT — HULL DAMAGED', '#ff6b5e');
        this.sound.crashThud();
        this.burst(VIEW_WIDTH / 2 + this.plane.x * 200, VIEW_HEIGHT * 0.6, '#ff6b5e', 40);
        if (dead) {
          this.endSortie('crashed', 'Three hits tore the Skylark apart.');
          return;
        }
      }
    }

    // Low fuel warning, once per sortie.
    if (this.plane.fuel < Fuel.lowWarning && !this.warnedLowFuel) {
      this.warnedLowFuel = true;
      this.sound.warningBeep();
    }

    // Touching the ground: a landing, or a crash.
    if (this.plane.groundContact && !this.plane.dead) {
      const landing = this.mission.checkLanding(this.plane, this.travelled);
      if (landing) {
        if (landing.outcome === 'landed') {
          this.score += landing.bonus;
          this.endSortie('landed', landing.reason);
        } else {
          this.endSortie('crashed', landing.reason);
        }
        return;
      }
      if (this.mission.def.kind !== 'landing' || this.travelled < this.mission.runwayStart) {
        this.plane.dead = true;
        this.endSortie('crashed', 'The Skylark met the valley floor at speed.');
        return;
      }
    }

    // Out of fuel with no altitude left is a crash, not a glide.
    if (this.plane.fuel <= 0 && this.plane.altitude <= 0 && !this.plane.dead) {
      this.plane.dead = true;
      this.endSortie('crashed', 'Fuel starved. The Skylark glided into the rocks.');
      return;
    }

    const result = this.mission.update(dt, events, this.plane, this.travelled);
    if (result) {
      if (result.outcome === 'complete') {
        this.score += result.bonus || 0;
        this.endSortie('complete', result.reason);
        return;
      }
      if (result.outcome === 'failed') {
        this.endSortie('failed', result.reason);
        return;
      }
    }

    this.updateParticles(dt);
  }

  start() {
    requestAnimationFrame((t) => {
      this.lastFrame = t;
      this.frame(t);
    });
  }
}

// Boot the game from the page.
const canvas = document.getElementById('game-canvas');
const game = new SkylarkGame(canvas);
game.start();
