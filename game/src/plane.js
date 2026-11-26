// Skylark Canyon Run — the flight model.
// The aircraft lives in valley units: lateral x from -1 (left wall) to 1
// (right wall), altitude in metres above the valley floor, speed in knots.
// Everything the renderer and the missions need is a plain field here.

import { Damage, Flight, Fuel } from './config.js';

export class Plane {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.altitude = 120;
    this.speedKnots = Flight.cruiseSpeedKnots;
    this.headingDegrees = 0;
    this.bankDegrees = 0;
    this.pitchDegrees = 0;
    this.throttle = 0.6;
    this.fuel = Fuel.start;
    this.damage = 0;
    this.shakeSeconds = 0;
    this.groundContact = false;
    this.dead = false;
  }

  get altitudeNorm() {
    return this.altitude / Flight.maxAltitudeMetres;
  }

  get speedMetresPerSecond() {
    return this.speedKnots * 0.514444;
  }

  // One frame of flight. wind is a lateral push in valley units per second
  // (the storm mission uses it; calm air passes 0).
  update(dt, input, wind) {
    if (this.dead) return;

    // Throttle answers the stick and the wheel.
    this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttleAxis() * dt * 0.55));

    // Bank follows the stick with a little lag, so the turn feels flown.
    const targetBank = input.steerAxis() * Flight.maxBankDegrees;
    this.bankDegrees += (targetBank - this.bankDegrees) * Math.min(1, dt * 6);
    this.headingDegrees = this.bankDegrees * 0.6;

    // The bank carries the aircraft sideways across the valley.
    const lateralSpeed = (this.bankDegrees / Flight.maxBankDegrees) * (this.speedKnots / Flight.cruiseSpeedKnots) * 0.55;
    this.x += (lateralSpeed + (wind || 0)) * dt;
    this.x = Math.max(-Flight.lateralLimit, Math.min(Flight.lateralLimit, this.x));

    // Pitch answers the stick; climbing costs speed, diving buys it.
    const climbInput = input.climbAxis();
    this.pitchDegrees += (climbInput * 14 - this.pitchDegrees) * Math.min(1, dt * 5);
    if (climbInput > 0) {
      this.altitude += Flight.climbRate * climbInput * dt;
    } else if (climbInput < 0) {
      this.altitude += Flight.diveRate * climbInput * dt;
    }
    this.altitude = Math.max(0, Math.min(Flight.maxAltitudeMetres, this.altitude));

    // Speed chases the throttle setting, then the climb and dive adjust it.
    const targetSpeed = Flight.minSpeedKnots + this.throttle * (Flight.maxSpeedKnots - Flight.minSpeedKnots);
    const speedRate = 42;
    if (this.speedKnots < targetSpeed) {
      this.speedKnots = Math.min(targetSpeed, this.speedKnots + speedRate * dt);
    } else {
      this.speedKnots = Math.max(targetSpeed, this.speedKnots - speedRate * dt);
    }
    if (climbInput > 0) this.speedKnots -= Flight.climbSpeedLoss * climbInput * dt;
    if (climbInput < 0) this.speedKnots += Flight.diveSpeedGain * -climbInput * dt;
    this.speedKnots = Math.max(60, Math.min(Flight.maxSpeedKnots + 30, this.speedKnots));

    // A slow wing stops flying and the aircraft sinks.
    if (this.speedKnots < Flight.stallSpeedKnots && this.altitude > 0) {
      this.altitude = Math.max(0, this.altitude - Flight.stallSinkRate * dt);
    }

    // Fuel burns faster the harder the engine works.
    this.fuel -= (Fuel.burnPerSecond + Fuel.burnPerThrottle * this.throttle) * dt;
    if (this.fuel <= 0) {
      this.fuel = 0;
      this.throttle = 0;
      if (this.altitude > 0) {
        this.altitude = Math.max(0, this.altitude - Flight.stallSinkRate * 0.7 * dt);
      }
    }

    if (this.shakeSeconds > 0) this.shakeSeconds -= dt;
    this.groundContact = this.altitude <= 0;
  }

  // A hard hit: lose speed, shake the camera, count the damage.
  takeHit() {
    this.damage += 1;
    this.speedKnots = Math.max(90, this.speedKnots - Damage.hitSpeedLoss);
    this.shakeSeconds = Damage.hitShakeSeconds;
    if (this.damage >= Damage.maxHits) this.dead = true;
    return this.dead;
  }

  refuel(amount) {
    this.fuel = Math.min(100, this.fuel + amount);
  }
}
