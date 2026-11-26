// Skylark Canyon Run — the valley and everything in it.
// Rings, rock spires, balloons, birds, fuel cans and stars spawn ahead of
// the aircraft and travel toward it as it flies. The world also owns the
// deterministic ridge shapes the renderer draws, so the canyon looks the
// same on every run with the same seed.

// A small deterministic generator: the same seed builds the same valley.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

import { VIEW_DISTANCE, World } from './config.js';

export class CanyonWorld {
  constructor(seed) {
    this.seed = seed || 20261127;
    this.reset('rings');
  }

  reset(missionId) {
    this.rng = mulberry32(this.seed);
    this.missionId = missionId;
    this.travelled = 0;
    this.rings = [];
    this.obstacles = [];
    this.collectibles = [];
    this.nextRingAt = 500;
    this.nextObstacleAt = 700;
    this.nextCollectibleAt = 900;
    // Ridge phases, one set per depth layer, fixed for the whole run.
    this.ridgePhases = [0, 1, 2, 3].map(() => this.rng() * Math.PI * 2);
    this.riverPhase = this.rng() * Math.PI * 2;
    // Storm missions pack the obstacles closer together.
    this.obstacleSpacing = missionId === 'storm' ? World.obstacleSpacingMetres * 0.55 : World.obstacleSpacingMetres;
  }

  // A smooth pseudo-random value for a ridge at a given distance and layer.
  ridgeValue(layer, distance) {
    const phase = this.ridgePhases[layer];
    return (
      Math.sin(distance * 0.0011 + phase) * 0.55 +
      Math.sin(distance * 0.0027 + phase * 2.3) * 0.3 +
      Math.sin(distance * 0.0061 + phase * 0.7) * 0.15
    );
  }

  riverCentre(distance) {
    return Math.sin(distance * 0.0009 + this.riverPhase) * 0.35;
  }

  spawnRing(distance) {
    this.rings.push({
      kind: 'ring',
      x: (this.rng() * 2 - 1) * 0.72,
      y: 0.28 + this.rng() * 0.5,
      z: distance,
      size: 1,
      passed: false,
    });
  }

  spawnObstacle(distance) {
    const roll = this.rng();
    if (roll < 0.42) {
      // A rock spire rooted on the valley floor.
      this.obstacles.push({
        kind: 'spire',
        x: (this.rng() * 2 - 1) * 0.9,
        y: 0,
        top: 0.35 + this.rng() * 0.3,
        z: distance,
        size: 0.8 + this.rng() * 0.7,
      });
    } else if (roll < 0.72) {
      // A hot-air balloon drifting in the lane.
      this.obstacles.push({
        kind: 'balloon',
        x: (this.rng() * 2 - 1) * 0.8,
        y: 0.3 + this.rng() * 0.42,
        top: 0,
        z: distance,
        size: 0.9 + this.rng() * 0.5,
        drift: (this.rng() * 2 - 1) * 0.05,
      });
    } else {
      // A bird crossing the valley.
      this.obstacles.push({
        kind: 'bird',
        x: (this.rng() * 2 - 1) * 0.85,
        y: 0.4 + this.rng() * 0.4,
        top: 0,
        z: distance,
        size: 0.7,
        drift: (this.rng() * 2 - 1) * 0.16,
      });
    }
  }

  spawnCollectible(distance) {
    const isFuel = this.rng() < 0.45;
    this.collectibles.push({
      kind: isFuel ? 'fuel' : 'star',
      x: (this.rng() * 2 - 1) * 0.75,
      y: 0.25 + this.rng() * 0.55,
      z: distance,
      size: 1,
    });
  }

  // Advance the world by the metres just flown. Returns the events the
  // game loop must answer: ring passes and misses, hits, pickups.
  update(distanceDelta, plane) {
    const events = [];
    this.travelled += distanceDelta;
    const ahead = this.travelled + VIEW_DISTANCE;

    while (this.nextRingAt < ahead) {
      this.spawnRing(this.nextRingAt - this.travelled);
      this.nextRingAt += World.ringSpacingMetres;
    }
    while (this.nextObstacleAt < ahead) {
      this.spawnObstacle(this.nextObstacleAt - this.travelled);
      this.nextObstacleAt += this.obstacleSpacing;
    }
    while (this.nextCollectibleAt < ahead) {
      this.spawnCollectible(this.nextCollectibleAt - this.travelled);
      this.nextCollectibleAt += World.collectibleSpacingMetres;
    }

    const move = (list) => {
      for (const item of list) {
        item.z -= distanceDelta;
        if (item.drift) item.x += item.drift * distanceDelta * 0.01;
      }
    };
    move(this.rings);
    move(this.obstacles);
    move(this.collectibles);

    const crossed = (item) => item.z <= 0 && item.z > -distanceDelta - 1;

    for (const ring of this.rings) {
      if (crossed(ring) && !ring.passed) {
        ring.passed = true;
        const dx = Math.abs(plane.x - ring.x);
        const dy = Math.abs(plane.altitudeNorm - ring.y);
        if (dx < World.ringPassRadius && dy < World.ringPassRadius) {
          events.push({ type: 'ring', ring });
        } else {
          events.push({ type: 'ring-missed', ring });
        }
      }
    }
    for (const obstacle of this.obstacles) {
      if (crossed(obstacle) && !obstacle.hit) {
        obstacle.hit = true;
        const dx = Math.abs(plane.x - obstacle.x);
        let hit = false;
        if (obstacle.kind === 'spire') {
          hit = dx < World.obstacleHitRadius && plane.altitudeNorm < obstacle.top;
        } else {
          const dy = Math.abs(plane.altitudeNorm - obstacle.y);
          hit = dx < World.obstacleHitRadius && dy < 0.22;
        }
        if (hit) events.push({ type: 'hit', obstacle });
      }
    }
    for (const item of this.collectibles) {
      if (crossed(item) && !item.taken) {
        item.taken = true;
        const dx = Math.abs(plane.x - item.x);
        const dy = Math.abs(plane.altitudeNorm - item.y);
        if (dx < World.collectibleHitRadius && dy < World.collectibleHitRadius) {
          events.push({ type: item.kind, item });
        }
      }
    }

    const keep = (list) => list.filter((item) => item.z > -80);
    this.rings = keep(this.rings);
    this.obstacles = keep(this.obstacles);
    this.collectibles = keep(this.collectibles);
    return events;
  }
}
