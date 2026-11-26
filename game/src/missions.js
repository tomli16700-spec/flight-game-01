// Skylark Canyon Run — the three missions and their win/lose rules.
// The tracker reads the world events and the aircraft state once a frame
// and answers one question: is the sortie over, and how did it end?

import { Score } from './config.js';

export class MissionTracker {
  constructor(definition) {
    this.def = definition;
    this.reset();
  }

  reset() {
    this.ringsPassed = 0;
    this.ringsMissed = 0;
    this.starsCollected = 0;
    this.elapsed = 0;
    this.completed = false;
    this.failed = false;
    this.failReason = '';
    this.completeReason = '';
    // The courier strip sits 2,800 m down the valley.
    this.runwayStart = 2800;
    this.landed = false;
  }

  get progress() {
    if (this.def.kind === 'rings') return Math.min(1, this.ringsPassed / this.def.target);
    if (this.def.kind === 'landing') return Math.min(1, this.travelledMetres / this.def.target);
    if (this.def.kind === 'storm') return Math.min(1, this.elapsed / this.def.target);
    return 0;
  }

  // A line for the HUD: what the pilot still has to do.
  get objectiveText() {
    if (this.def.kind === 'rings') return `Rings ${this.ringsPassed}/${this.def.target}`;
    if (this.def.kind === 'landing') {
      const left = Math.max(0, this.def.target - this.travelledMetres);
      return `Strip in ${Math.round(left)} m`;
    }
    if (this.def.kind === 'storm') {
      const left = Math.max(0, this.def.target - this.elapsed);
      return `Survive ${Math.ceil(left)} s — stars ${this.starsCollected}/8`;
    }
    return '';
  }

  // dt, the world events, the aircraft and the metres flown so far.
  update(dt, events, plane, travelledMetres) {
    this.travelledMetres = travelledMetres;
    if (this.completed || this.failed) return null;

    for (const event of events) {
      if (event.type === 'ring') this.ringsPassed += 1;
      if (event.type === 'ring-missed') this.ringsMissed += 1;
      if (event.type === 'star') this.starsCollected += 1;
    }
    if (this.def.kind === 'storm') this.elapsed += dt;

    if (this.def.kind === 'rings' && this.ringsPassed >= this.def.target) {
      this.completed = true;
      this.completeReason = `All ${this.def.target} rings threaded — the valley is yours.`;
      return { outcome: 'complete', bonus: Score.landingBonus, reason: this.completeReason };
    }

    if (this.def.kind === 'storm') {
      if (this.elapsed >= this.def.target) {
        if (this.starsCollected >= 8) {
          this.completed = true;
          this.completeReason = 'Ninety seconds of storm, eight stars home. Superb flying.';
          return { outcome: 'complete', bonus: Score.stormSurviveBonus, reason: this.completeReason };
        }
        this.failed = true;
        this.failReason = `The storm let go with only ${this.starsCollected} of 8 stars aboard.`;
        return { outcome: 'failed', reason: this.failReason };
      }
    }

    if (this.def.kind === 'landing') {
      if (travelledMetres > this.runwayStart + 600 && !this.landed) {
        this.failed = true;
        this.failReason = 'You flew past the strip. The mail goes back to base.';
        return { outcome: 'failed', reason: this.failReason };
      }
    }
    return null;
  }

  // The courier landing test, called when the wheels touch the ground.
  checkLanding(plane, travelledMetres) {
    if (this.def.kind !== 'landing' || this.completed || this.failed) return null;
    if (travelledMetres < this.runwayStart) return null;
    if (plane.speedKnots > 130) {
      this.failed = true;
      this.failReason = `Touchdown at ${Math.round(plane.speedKnots)} kt — far too fast for this strip.`;
      return { outcome: 'failed', reason: this.failReason };
    }
    if (Math.abs(plane.x) > 0.18) {
      this.failed = true;
      this.failReason = 'Touchdown off the centreline — the Skylark ran into the grass.';
      return { outcome: 'failed', reason: this.failReason };
    }
    this.landed = true;
    this.completed = true;
    this.completeReason = 'Wheels down on the centreline. The mail is delivered.';
    return { outcome: 'landed', bonus: Score.landingBonus, reason: this.completeReason };
  }
}
