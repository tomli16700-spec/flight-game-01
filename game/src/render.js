// Skylark Canyon Run — everything the pilot sees.
// One canvas, one painter: sky, canyon, runway, rings, the Skylark herself
// and the instruments. The game state is passed in; this file never mutates
// it, so the screenshots are exactly what the player sees mid-flight.

import { Flight, Fuel, HORIZON_Y, Palette, VIEW_DISTANCE, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: (i * 0.37 + 0.11) % 1.3 - 0.15,
        y: 0.06 + ((i * 0.53) % 0.3),
        size: 60 + ((i * 71) % 90),
        speed: 0.004 + ((i * 13) % 10) * 0.001,
      });
    }
    this.time = 0;
  }

  // Project a valley point into the screen, from a chase camera that rides
  // 40 m above the aircraft and looks straight ahead. z is metres ahead of
  // the nose; altitudeNorm is 0 at the valley floor, 1 at 600 m. Points at
  // the camera's own height sit on the horizon; points below it sink toward
  // the bottom of the frame as they come closer, and objects grow as they
  // approach — a ring is small on the horizon and huge as it passes.
  project(x, altitudeNorm, z) {
    const focal = 300 / (z + 60);
    const camAltitude = this.planeAltitude + 40;
    const sx = VIEW_WIDTH / 2 + x * focal * VIEW_WIDTH * 0.62;
    const sy = HORIZON_Y - (altitudeNorm * 600 - camAltitude) * focal;
    return { x: sx, y: sy, scale: 480 / (z + 60), p: Math.max(0.02, 1 - z / VIEW_DISTANCE) };
  }

  draw(game) {
    const ctx = this.ctx;
    this.time += game.dt;
    this.planeAltitude = game.plane.altitude;
    ctx.save();
    if (game.plane.shakeSeconds > 0) {
      const mag = game.plane.shakeSeconds * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    this.drawSky(game);
    this.drawMountains(game);
    this.drawGround(game);
    this.drawRunway(game);
    this.drawCollectibles(game);
    this.drawObstacles(game);
    this.drawRings(game);
    this.drawParticles(game);
    this.drawPlane(game);
    this.drawHud(game);
    ctx.restore();

    if (game.state === 'menu') this.drawMenu(game);
    if (game.state === 'paused') this.drawPaused(game);
    if (game.state === 'over') this.drawGameOver(game);
    if (game.state === 'complete') this.drawComplete(game);
  }

  drawSky(game) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
    sky.addColorStop(0, Palette.skyTop);
    sky.addColorStop(0.55, Palette.skyMid);
    sky.addColorStop(1, Palette.skyHorizon);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_WIDTH, HORIZON_Y + 40);

    // Sun with a warm halo, top right.
    const sunX = VIEW_WIDTH * 0.8;
    const sunY = 92;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 150);
    glow.addColorStop(0, Palette.sunCore);
    glow.addColorStop(0.25, Palette.sunGlow);
    glow.addColorStop(1, 'rgba(255, 215, 106, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.fillStyle = Palette.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();

    // Clouds drift with the distance flown, slower than the ground.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const cloud of this.clouds) {
      const cx = (((cloud.x + game.travelled * cloud.speed * 0.00002) % 1.3) + 1.3) % 1.3 - 0.15;
      const cy = cloud.y * HORIZON_Y;
      const s = cloud.size;
      ctx.beginPath();
      ctx.ellipse(cx * VIEW_WIDTH, cy, s, s * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(cx * VIEW_WIDTH + s * 0.5, cy + 6, s * 0.7, s * 0.26, 0, 0, Math.PI * 2);
      ctx.ellipse(cx * VIEW_WIDTH - s * 0.55, cy + 8, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Storm murk for the storm mission: a grey veil at the edges.
    if (game.mission.def.kind === 'storm' && game.state === 'playing') {
      const veil = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
      veil.addColorStop(0, 'rgba(40, 50, 66, 0.35)');
      veil.addColorStop(1, 'rgba(40, 50, 66, 0)');
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, VIEW_WIDTH, HORIZON_Y);
      if (Math.random() < 0.02) {
        ctx.strokeStyle = 'rgba(255, 255, 220, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const lx = 200 + Math.random() * 800;
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx - 40, 120);
        ctx.lineTo(lx + 10, 200);
        ctx.stroke();
      }
    }
  }

  drawMountains(game) {
    const ctx = this.ctx;
    // Two far ridge layers, their silhouettes sliding with distance.
    for (let layer = 0; layer < 2; layer++) {
      const base = HORIZON_Y - 8 - layer * 26;
      const amp = 34 - layer * 10;
      ctx.fillStyle = layer === 0 ? Palette.mountainFar : Palette.mountainNear;
      ctx.beginPath();
      ctx.moveTo(0, HORIZON_Y + 2);
      for (let sx = 0; sx <= VIEW_WIDTH; sx += 16) {
        const d = game.travelled + sx * (layer === 0 ? 0.6 : 1.4);
        const y = base + game.world.ridgeValue(layer, d) * amp;
        ctx.lineTo(sx, y);
      }
      ctx.lineTo(VIEW_WIDTH, HORIZON_Y + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Deterministic hash: the same seed always gives the same value in
  // [0, 1), so the valley looks identical on every run with no
  // randomness anywhere in the draw path.
  fieldHash(seed) {
    const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return v - Math.floor(v);
  }

  drawGround(game) {
    const ctx = this.ctx;
    // The valley floor: a trapezoid from the horizon to the bottom edge.
    const ground = ctx.createLinearGradient(0, HORIZON_Y, 0, VIEW_HEIGHT);
    ground.addColorStop(0, Palette.groundDark);
    ground.addColorStop(1, '#4a7a3e');
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(VIEW_WIDTH, HORIZON_Y);
    ctx.lineTo(VIEW_WIDTH, VIEW_HEIGHT);
    ctx.lineTo(0, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // Field patchwork scrolling toward the camera. Each 90 m band draws
    // three staggered parcels in different crop tones, picked by band
    // index, so the floor reads as irregular farmland and scrub instead
    // of one repeating stripe. Near bands get scrub speckles.
    const fieldTones = ['#7fae62', '#6d9c52', '#c2a55e', '#a8b060', '#8a7a4a', '#5d8f4c'];
    const bandLen = 90;
    const firstBand = Math.floor(game.travelled / bandLen);
    for (let i = 0; i < 14; i++) {
      const band = firstBand + i;
      const bandZ = band * bandLen - game.travelled;
      if (bandZ < 0 || bandZ > VIEW_DISTANCE) continue;
      const top = this.project(0, 0, bandZ);
      const bottom = this.project(0, 0, Math.max(0, bandZ - bandLen));
      const bandH = Math.max(1, bottom.y - top.y);
      // Two parcel edges, staggered per band so no two bands line up.
      const edgeA = 0.26 + this.fieldHash(band * 5 + 1) * 0.24;
      const edgeB = 0.56 + this.fieldHash(band * 5 + 2) * 0.2;
      const toneBase = Math.floor(this.fieldHash(band * 9 + 4) * fieldTones.length);
      const parcels = [
        [0, edgeA, fieldTones[toneBase % fieldTones.length]],
        [edgeA, edgeB, fieldTones[(toneBase + 2) % fieldTones.length]],
        [edgeB, 1, fieldTones[(toneBase + 4) % fieldTones.length]],
      ];
      for (const [x0, x1, tone] of parcels) {
        ctx.fillStyle = tone;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(VIEW_WIDTH * x0, top.y, VIEW_WIDTH * (x1 - x0), bandH);
      }
      // Scrub speckles on near bands only — far bands are too small.
      if (bandZ < 600) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = '#4a5c33';
        const speckles = 6 + Math.floor(this.fieldHash(band * 13) * 6);
        for (let s = 0; s < speckles; s++) {
          const sx = this.fieldHash(band * 37 + s * 7) * VIEW_WIDTH;
          const sy = top.y + this.fieldHash(band * 19 + s * 3) * bandH;
          const sr = 2 + this.fieldHash(band * 29 + s) * 3.5;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }

    // The river winds down the valley, left of centre.
    ctx.strokeStyle = Palette.river;
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let z = VIEW_DISTANCE; z >= 0; z -= 60) {
      const centre = game.world.riverCentre(game.travelled + z) - 0.25;
      const p = this.project(centre, 0, z);
      if (z === VIEW_DISTANCE) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let z = VIEW_DISTANCE; z >= 0; z -= 60) {
      const centre = game.world.riverCentre(game.travelled + z) - 0.25;
      const p = this.project(centre, 0, z);
      if (z === VIEW_DISTANCE) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Contact shadow where each wall meets the floor: a dark wedge hugging
    // the wall's inner edge and fading toward the centre, so the wall reads
    // as solid rock standing on the ground rather than a flat backdrop.
    for (const side of [-1, 1]) {
      const outer = [];
      const inner = [];
      for (let z = 0; z <= VIEW_DISTANCE; z += 120) {
        outer.push(this.project(side * 0.92, 0, z));
        inner.push(this.project(side * 0.45, 0, z));
      }
      const fade = ctx.createLinearGradient(
        side < 0 ? 0 : VIEW_WIDTH, 0,
        side < 0 ? VIEW_WIDTH * 0.42 : VIEW_WIDTH * 0.58, 0,
      );
      fade.addColorStop(0, 'rgba(20, 12, 6, 0.34)');
      fade.addColorStop(1, 'rgba(20, 12, 6, 0)');
      ctx.fillStyle = fade;
      ctx.beginPath();
      ctx.moveTo(outer[0].x, outer[0].y);
      for (const p of outer) ctx.lineTo(p.x, p.y);
      for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y);
      ctx.closePath();
      ctx.fill();
    }

    // Canyon walls close in on both sides as ridges scroll past.
    for (const side of [-1, 1]) {
      const sunlit = side < 0 ? '#a4714a' : '#96684a';
      const shadowed = side < 0 ? '#5e3d28' : '#54371f';
      const edgeX = side < 0 ? 0 : VIEW_WIDTH;
      const innerX = side < 0 ? VIEW_WIDTH * 0.16 : VIEW_WIDTH * 0.84;
      ctx.beginPath();
      ctx.moveTo(edgeX, HORIZON_Y - 30);
      ctx.lineTo(innerX, HORIZON_Y + 10);
      for (let z = 0; z <= VIEW_DISTANCE; z += 120) {
        const wobble = game.world.ridgeValue(3, game.travelled + z) * 40;
        const p = this.project(side * 0.92, 0, z);
        ctx.lineTo(p.x + (side < 0 ? -wobble : wobble), p.y);
      }
      ctx.lineTo(edgeX, VIEW_HEIGHT);
      ctx.closePath();
      // Sunlit rock at the top fading to shadow at the base.
      const rockGrad = ctx.createLinearGradient(0, HORIZON_Y - 30, 0, VIEW_HEIGHT);
      rockGrad.addColorStop(0, sunlit);
      rockGrad.addColorStop(0.55, side < 0 ? Palette.canyonLeft : Palette.canyonRight);
      rockGrad.addColorStop(1, shadowed);
      ctx.fillStyle = rockGrad;
      ctx.fill();

      // Layered strata: filled bands between the wall's perspective lines,
      // in alternating warm rock tones, so the face reads as layered rock
      // instead of one flat brown slab.
      const rockTones = ['#9a6a45', '#7d5238', '#a87a52', '#6b4530', '#8f6040', '#744c33'];
      const strata = [];
      for (let k = 0; k < 7; k++) {
        const linePts = [];
        for (let z = 0; z <= VIEW_DISTANCE; z += 120) {
          linePts.push(this.project(side * (0.86 - k * 0.02), 0, z));
        }
        strata.push(linePts);
      }
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = rockTones[(k + (side < 0 ? 0 : 3)) % rockTones.length];
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.moveTo(strata[k][0].x, strata[k][0].y);
        for (const p of strata[k]) ctx.lineTo(p.x, p.y);
        for (let i = strata[k + 1].length - 1; i >= 0; i--) {
          ctx.lineTo(strata[k + 1][i].x, strata[k + 1][i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Thin dark seams between the strata.
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 2;
      for (const linePts of strata) {
        ctx.beginPath();
        for (let i = 0; i < linePts.length; i++) {
          if (i === 0) ctx.moveTo(linePts[i].x, linePts[i].y);
          else ctx.lineTo(linePts[i].x, linePts[i].y);
        }
        ctx.stroke();
      }
      // Cracks running down the wall face, placed deterministically per side.
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 2;
      for (let c = 0; c < 7; c++) {
        const crackZ = 120 + this.fieldHash(side * 91 + c * 13) * 900;
        const crackX = 0.55 + this.fieldHash(side * 57 + c * 29) * 0.35;
        ctx.beginPath();
        for (let z = crackZ; z <= Math.min(VIEW_DISTANCE, crackZ + 420); z += 60) {
          const sway = Math.sin(z * 0.02 + c * 2.1) * 8;
          const p = this.project(side * crackX, 0, z);
          if (z === crackZ) ctx.moveTo(p.x + sway, p.y);
          else ctx.lineTo(p.x + sway, p.y);
        }
        ctx.stroke();
      }
      // Sunlit rim along the wall's top edge.
      ctx.strokeStyle = 'rgba(255, 225, 180, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(edgeX, HORIZON_Y - 30);
      ctx.lineTo(innerX, HORIZON_Y + 10);
      ctx.stroke();
    }
  }

  drawRunway(game) {
    const ctx = this.ctx;
    if (game.mission.def.kind !== 'landing') return;
    const runwayZ = game.mission.runwayStart - game.travelled;
    if (runwayZ > VIEW_DISTANCE || runwayZ < -700) return;
    const near = this.project(0, 0, Math.max(0, runwayZ - 620));
    const far = this.project(0, 0, Math.max(0, runwayZ));
    const nearW = 150 * near.scale + 26;
    const farW = 150 * far.scale + 10;
    // The strip itself.
    ctx.fillStyle = Palette.runway;
    ctx.beginPath();
    ctx.moveTo(near.x - nearW, near.y);
    ctx.lineTo(far.x - farW, far.y);
    ctx.lineTo(far.x + farW, far.y);
    ctx.lineTo(near.x + nearW, near.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes.
    ctx.fillStyle = Palette.runwayLine;
    for (let z = runwayZ - 600; z < runwayZ; z += 90) {
      const p = this.project(0, 0, Math.max(0, z));
      const w = 3 * p.scale + 1;
      const h = 14 * p.scale + 2;
      ctx.fillRect(p.x - w / 2, p.y - h, w, h);
    }
    // Threshold bars and edge lights.
    ctx.fillStyle = Palette.runwayLine;
    ctx.fillRect(far.x - farW * 0.8, far.y - 4, farW * 1.6, 4);
    ctx.fillStyle = '#ffdf6b';
    for (let i = -2; i <= 2; i++) {
      const p = this.project(i * 0.18, 0, Math.max(0, runwayZ - 620));
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // A windsock and a small hangar beside the strip.
    const sock = this.project(0.32, 0, Math.max(0, runwayZ - 300));
    ctx.strokeStyle = '#e8eef4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x, sock.y - 34 * sock.scale);
    ctx.stroke();
    ctx.fillStyle = '#ff7a3d';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y - 34 * sock.scale);
    ctx.lineTo(sock.x + 22 * sock.scale, sock.y - 28 * sock.scale);
    ctx.lineTo(sock.x, sock.y - 22 * sock.scale);
    ctx.closePath();
    ctx.fill();
  }

  drawRings(game) {
    const ctx = this.ctx;
    const sorted = [...game.world.rings].sort((a, b) => b.z - a.z);
    for (const ring of sorted) {
      if (ring.z < 15) continue; // A ring at the nose is past the camera.
      const p = this.project(ring.x, ring.y, ring.z);
      const radius = 62 * p.scale + 8;
      ctx.save();
      ctx.globalAlpha = Math.max(0.25, Math.min(1, p.p + 0.25));
      // Glow.
      ctx.strokeStyle = Palette.ringGlow;
      ctx.lineWidth = 10 * p.scale + 3;
      ctx.globalAlpha *= 0.4;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius, radius * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0.25, Math.min(1, p.p + 0.25));
      // The ring itself.
      ctx.strokeStyle = Palette.ring;
      ctx.lineWidth = 5 * p.scale + 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, radius, radius * 0.78, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Chevrons pointing the way through.
      ctx.fillStyle = Palette.ring;
      for (let i = -1; i <= 1; i++) {
        const cx = p.x + i * radius * 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, p.y - radius * 0.55);
        ctx.lineTo(cx + 7 * p.scale, p.y - radius * 0.35);
        ctx.lineTo(cx - 7 * p.scale, p.y - radius * 0.35);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawObstacles(game) {
    const ctx = this.ctx;
    const sorted = [...game.world.obstacles].sort((a, b) => b.z - a.z);
    for (const obstacle of sorted) {
      if (obstacle.z < 15) continue; // Passing the nose; do not let it flash huge.
      if (obstacle.kind === 'spire') {
        const base = this.project(obstacle.x, 0, obstacle.z);
        const top = this.project(obstacle.x, obstacle.top, obstacle.z);
        const width = 46 * base.scale * obstacle.size + 8;
        ctx.fillStyle = '#6e4a33';
        ctx.beginPath();
        ctx.moveTo(base.x - width / 2, base.y);
        ctx.lineTo(top.x - width * 0.18, top.y);
        ctx.lineTo(top.x + width * 0.18, top.y);
        ctx.lineTo(base.x + width / 2, base.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#8a5f42';
        ctx.beginPath();
        ctx.moveTo(base.x - width / 2, base.y);
        ctx.lineTo(top.x - width * 0.18, top.y);
        ctx.lineTo(top.x + width * 0.05, top.y);
        ctx.lineTo(base.x, base.y);
        ctx.closePath();
        ctx.fill();
        // Warning beacon on the tip.
        ctx.fillStyle = '#ff4d3d';
        ctx.beginPath();
        ctx.arc(top.x, top.y - 4, 3 + base.scale * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (obstacle.kind === 'balloon') {
        const p = this.project(obstacle.x, obstacle.y, obstacle.z);
        const r = 34 * p.scale * obstacle.size + 6;
        ctx.fillStyle = '#d94f3d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2c14e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, Math.PI * 0.15, Math.PI * 0.85);
        ctx.fill();
        ctx.strokeStyle = '#7a3b2e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.6, p.y + r * 0.7);
        ctx.lineTo(p.x, p.y + r * 1.5);
        ctx.lineTo(p.x + r * 0.6, p.y + r * 0.7);
        ctx.stroke();
        ctx.fillStyle = '#5d3a28';
        ctx.fillRect(p.x - r * 0.25, p.y + r * 1.4, r * 0.5, r * 0.4);
      } else {
        // Bird: two flapping wings.
        const p = this.project(obstacle.x, obstacle.y, obstacle.z);
        const flap = Math.sin(this.time * 14 + obstacle.x * 20) * 0.5;
        const w = 26 * p.scale + 5;
        ctx.strokeStyle = '#2c2c34';
        ctx.lineWidth = 3 * p.scale + 1;
        ctx.beginPath();
        ctx.moveTo(p.x - w, p.y - flap * w * 0.5);
        ctx.quadraticCurveTo(p.x - w * 0.4, p.y + flap * w * 0.3, p.x, p.y);
        ctx.quadraticCurveTo(p.x + w * 0.4, p.y + flap * w * 0.3, p.x + w, p.y - flap * w * 0.5);
        ctx.stroke();
      }
    }
  }

  drawCollectibles(game) {
    const ctx = this.ctx;
    for (const item of game.world.collectibles) {
      if (item.z < 15) continue;
      const p = this.project(item.x, item.y, item.z);
      const bob = Math.sin(this.time * 4 + item.x * 9) * 4;
      if (item.kind === 'fuel') {
        // A red jerry can with a white F.
        const w = 26 * p.scale + 5;
        const h = 30 * p.scale + 6;
        ctx.fillStyle = '#c23b2e';
        ctx.fillRect(p.x - w / 2, p.y - h / 2 + bob, w, h);
        ctx.fillStyle = '#8e2a20';
        ctx.fillRect(p.x - w / 2, p.y - h / 2 + bob, w, 5);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 16 * p.scale)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', p.x, p.y + bob);
      } else {
        // A spinning gold star.
        const r = 20 * p.scale + 5;
        ctx.save();
        ctx.translate(p.x, p.y + bob);
        ctx.rotate(Math.sin(this.time * 2 + item.x * 7) * 0.4);
        ctx.fillStyle = '#ffd94a';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const rad = i % 2 === 0 ? r : r * 0.45;
          const px = Math.cos(angle) * rad;
          const py = Math.sin(angle) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const particle of game.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPlane(game) {
    const ctx = this.ctx;
    const plane = game.plane;
    // The chase camera holds the Skylark in one place on the screen; the
    // valley moves around her instead. Bank and pitch still show.
    const px = VIEW_WIDTH / 2 + plane.x * VIEW_WIDTH * 0.3;
    const py = VIEW_HEIGHT * 0.6;
    const bank = (plane.bankDegrees * Math.PI) / 180;
    const pitch = (plane.pitchDegrees * Math.PI) / 180;
    const scale = 1 + plane.altitudeNorm * 0.1;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(bank * 0.55);
    ctx.scale(scale, scale * (1 - Math.abs(pitch) * 0.15));

    // Engine glow.
    const glow = ctx.createRadialGradient(0, 34, 4, 0, 34, 46);
    glow.addColorStop(0, 'rgba(255, 190, 80, 0.9)');
    glow.addColorStop(1, 'rgba(255, 120, 40, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 34, 26, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main wings, swept back.
    ctx.fillStyle = Palette.planeBody;
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-108, 34);
    ctx.lineTo(-100, 44);
    ctx.lineTo(-10, 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(108, 34);
    ctx.lineTo(100, 44);
    ctx.lineTo(10, 22);
    ctx.closePath();
    ctx.fill();
    // Red wingtip stripes.
    ctx.fillStyle = Palette.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-108, 34);
    ctx.lineTo(-100, 44);
    ctx.lineTo(-88, 40);
    ctx.lineTo(-94, 31);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(108, 34);
    ctx.lineTo(100, 44);
    ctx.lineTo(88, 40);
    ctx.lineTo(94, 31);
    ctx.closePath();
    ctx.fill();

    // Tailplane.
    ctx.fillStyle = Palette.planeBody;
    ctx.beginPath();
    ctx.moveTo(-10, 30);
    ctx.lineTo(-46, 52);
    ctx.lineTo(-40, 58);
    ctx.lineTo(-6, 40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10, 30);
    ctx.lineTo(46, 52);
    ctx.lineTo(40, 58);
    ctx.lineTo(6, 40);
    ctx.closePath();
    ctx.fill();
    // Fin.
    ctx.beginPath();
    ctx.moveTo(-6, 26);
    ctx.lineTo(-4, -6);
    ctx.lineTo(6, -2);
    ctx.lineTo(8, 26);
    ctx.closePath();
    ctx.fill();

    // Fuselage, tapered toward the nose.
    const body = ctx.createLinearGradient(-14, 0, 14, 0);
    body.addColorStop(0, '#c9d4de');
    body.addColorStop(0.5, Palette.planeBody);
    body.addColorStop(1, '#c9d4de');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.quadraticCurveTo(13, -30, 14, 6);
    ctx.quadraticCurveTo(15, 30, 9, 44);
    ctx.quadraticCurveTo(0, 50, -9, 44);
    ctx.quadraticCurveTo(-15, 30, -14, 6);
    ctx.quadraticCurveTo(-13, -30, 0, -58);
    ctx.fill();
    // Red cheatline along the fuselage.
    ctx.fillStyle = Palette.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-13, 8);
    ctx.quadraticCurveTo(0, 12, 13, 8);
    ctx.lineTo(13, 14);
    ctx.quadraticCurveTo(0, 18, -13, 14);
    ctx.closePath();
    ctx.fill();
    // Cockpit glass.
    ctx.fillStyle = Palette.planeGlass;
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(9, -34, 8, -18);
    ctx.quadraticCurveTo(0, -14, -8, -18);
    ctx.quadraticCurveTo(-9, -34, 0, -50);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-3, -36, 2.5, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Navigation lights: red left, green right, blinking white tail.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-104, 38, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#35e07a';
    ctx.beginPath();
    ctx.arc(104, 38, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (Math.floor(this.time * 2) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 48, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawHud(game) {
    const ctx = this.ctx;
    const plane = game.plane;
    const mission = game.mission;
    ctx.textBaseline = 'middle';

    // Top instrument bar.
    ctx.fillStyle = Palette.hudPanel;
    ctx.fillRect(0, 0, VIEW_WIDTH, 56);
    ctx.strokeStyle = 'rgba(216, 242, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 56.5);
    ctx.lineTo(VIEW_WIDTH, 56.5);
    ctx.stroke();

    const cell = (x, label, value, color) => {
      ctx.fillStyle = 'rgba(216, 242, 255, 0.55)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(label, x, 14);
      ctx.fillStyle = color || Palette.hudText;
      ctx.font = 'bold 22px monospace';
      ctx.fillText(value, x, 38);
    };
    cell(18, 'ALTITUDE', `${Math.round(plane.altitude * 3.28084)} FT`, plane.altitude < 60 ? Palette.hudAmber : Palette.hudText);
    cell(180, 'SPEED', `${Math.round(plane.speedKnots)} KT`, plane.speedKnots < Flight.stallSpeedKnots + 10 ? Palette.hudRed : Palette.hudText);
    const heading = ((Math.round(plane.headingDegrees) % 360) + 360) % 360;
    cell(330, 'HEADING', `${String(heading).padStart(3, '0')}°`, Palette.hudText);
    cell(470, 'SCORE', `${game.score}`, Palette.hudText);
    cell(620, 'MISSION', mission.objectiveText, Palette.hudAmber);

    // Fuel gauge, top right.
    const fuelX = 1010;
    ctx.fillStyle = 'rgba(216, 242, 255, 0.55)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', fuelX, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(fuelX, 26, 180, 14);
    const fuelColor = plane.fuel < Fuel.lowWarning ? Palette.hudRed : Palette.hudGreen;
    ctx.fillStyle = fuelColor;
    ctx.fillRect(fuelX, 26, 180 * (plane.fuel / 100), 14);
    ctx.fillStyle = Palette.hudText;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${Math.round(plane.fuel)}%`, fuelX + 186, 33);
    // Damage pips.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < plane.damage ? Palette.hudRed : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(fuelX + 8 + i * 20, 50, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(216, 242, 255, 0.55)';
    ctx.font = '11px monospace';
    ctx.fillText('HULL', fuelX + 66, 50);

    // Compass strip under the bar.
    const compassY = 76;
    ctx.fillStyle = 'rgba(8, 18, 30, 0.5)';
    ctx.fillRect(VIEW_WIDTH / 2 - 220, compassY - 12, 440, 24);
    ctx.textAlign = 'center';
    for (let d = -60; d <= 60; d += 15) {
      const deg = ((Math.round(plane.headingDegrees) + d) % 360 + 360) % 360;
      const x = VIEW_WIDTH / 2 + d * 3.2;
      ctx.fillStyle = d === 0 ? Palette.hudAmber : 'rgba(216,242,255,0.7)';
      ctx.font = d % 45 === 0 ? 'bold 12px monospace' : '10px monospace';
      const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}°`;
      ctx.fillText(label, x, compassY);
      ctx.fillRect(x, compassY + 8, 1, d % 45 === 0 ? 6 : 3);
    }

    // Attitude indicator, bottom left: a little ball that banks with us.
    const ax = 74;
    const ay = VIEW_HEIGHT - 74;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 44, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#2f6fb2';
    ctx.fillRect(ax - 44, ay - 44, 88, 44);
    ctx.fillStyle = '#8a6b46';
    ctx.fillRect(ax - 44, ay, 88, 44);
    ctx.rotate((plane.bankDegrees * Math.PI) / 180);
    ctx.translate(0, plane.pitchDegrees * 1.2);
    ctx.fillStyle = '#2f6fb2';
    ctx.fillRect(ax - 60, ay - 60, 120, 60);
    ctx.fillStyle = '#8a6b46';
    ctx.fillRect(ax - 60, ay, 120, 60);
    ctx.restore();
    ctx.strokeStyle = Palette.hudText;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = Palette.hudAmber;
    ctx.fillRect(ax - 22, ay - 2, 44, 4);
    ctx.beginPath();
    ctx.arc(ax, ay, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(216, 242, 255, 0.7)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', ax, ay + 58);

    // Mission progress bar, bottom centre.
    const barW = 320;
    const barX = VIEW_WIDTH / 2 - barW / 2;
    const barY = VIEW_HEIGHT - 34;
    ctx.fillStyle = 'rgba(8, 18, 30, 0.6)';
    ctx.fillRect(barX - 8, barY - 8, barW + 16, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW, 10);
    ctx.fillStyle = Palette.hudAmber;
    ctx.fillRect(barX, barY, barW * mission.progress, 10);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '11px monospace';
    ctx.fillText(mission.def.name.toUpperCase(), VIEW_WIDTH / 2, barY + 22);

    // Throttle lever, bottom right.
    const tx = VIEW_WIDTH - 60;
    const ty = VIEW_HEIGHT - 110;
    ctx.fillStyle = 'rgba(8, 18, 30, 0.6)';
    ctx.fillRect(tx - 26, ty - 10, 52, 110);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(tx - 4, ty, 8, 90);
    const leverY = ty + 90 - plane.throttle * 90;
    ctx.fillStyle = Palette.hudGreen;
    ctx.fillRect(tx - 12, leverY - 4, 24, 8);
    ctx.fillStyle = 'rgba(216, 242, 255, 0.7)';
    ctx.font = '11px monospace';
    ctx.fillText('THR', tx, ty + 104);
    ctx.fillText(`${Math.round(plane.throttle * 100)}%`, tx, ty - 20);

    // Centre flash messages (ring scored, low fuel, warnings).
    if (game.flashText && game.flashUntil > game.time) {
      ctx.globalAlpha = Math.min(1, (game.flashUntil - game.time) * 2);
      ctx.fillStyle = game.flashColor || Palette.hudAmber;
      ctx.font = 'bold 30px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(game.flashText, VIEW_WIDTH / 2, 150);
      ctx.globalAlpha = 1;
    }
    if (plane.fuel < Fuel.lowWarning && game.state === 'playing' && Math.floor(this.time * 2) % 2 === 0) {
      ctx.fillStyle = Palette.hudRed;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LOW FUEL — FIND A CAN', VIEW_WIDTH / 2, 186);
    }

    // Touch hint on small screens.
    if (game.isTouch) {
      ctx.fillStyle = 'rgba(216, 242, 255, 0.75)';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Drag to steer • Wheel / buttons for throttle', VIEW_WIDTH / 2, VIEW_HEIGHT - 56);
    }
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(8, 18, 30, 0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(216, 242, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  drawMenu(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 14, 24, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.panel(ctx, 190, 70, 900, 580);
    ctx.textAlign = 'center';
    ctx.fillStyle = Palette.hudAmber;
    ctx.font = 'bold 54px monospace';
    ctx.fillText('SKYLARK CANYON RUN', VIEW_WIDTH / 2, 140);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '17px monospace';
    ctx.fillText('Fly the SK-7 Skylark down the canyon. Mind the fuel, mind the rocks.', VIEW_WIDTH / 2, 176);
    ctx.fillStyle = 'rgba(216, 242, 255, 0.6)';
    ctx.font = '14px monospace';
    ctx.fillText('Pick a mission — press 1, 2 or 3, or click a card.', VIEW_WIDTH / 2, 206);

    const cards = [
      { x: 220, def: game.missionDefs[0], key: '1' },
      { x: 500, def: game.missionDefs[1], key: '2' },
      { x: 780, def: game.missionDefs[2], key: '3' },
    ];
    for (const card of cards) {
      this.panel(ctx, card.x, 232, 260, 190);
      ctx.fillStyle = Palette.hudAmber;
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`[${card.key}] ${card.def.name.toUpperCase()}`, card.x + 130, 262);
      ctx.fillStyle = Palette.hudText;
      ctx.font = '13px monospace';
      this.wrapText(ctx, card.def.brief, card.x + 130, 292, 230, 19);
    }

    ctx.fillStyle = Palette.hudText;
    ctx.font = '14px monospace';
    ctx.fillText('STEER  ← → or A / D  •  CLIMB / DIVE  ↑ ↓ or W / S  •  THROTTLE  Shift / Ctrl or wheel', VIEW_WIDTH / 2, 468);
    ctx.fillText('MOUSE / TOUCH  drag to steer  •  P pause  •  M mute  •  R restart', VIEW_WIDTH / 2, 494);
    ctx.fillStyle = 'rgba(216, 242, 255, 0.6)';
    ctx.fillText('Rings pay 100 points and fuel. Fuel cans pay 25 fuel. Three hits ends the sortie.', VIEW_WIDTH / 2, 524);
    if (game.best > 0) {
      ctx.fillStyle = Palette.hudGreen;
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`BEST SCORE  ${game.best}`, VIEW_WIDTH / 2, 566);
    }
    ctx.fillStyle = Palette.hudAmber;
    ctx.font = 'bold 18px monospace';
    ctx.fillText('CLICK A MISSION OR PRESS 1 / 2 / 3 TO FLY', VIEW_WIDTH / 2, 612);
  }

  wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, cx, ly);
        line = word;
        ly += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, ly);
  }

  drawPaused(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 14, 24, 0.6)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.panel(ctx, 440, 260, 400, 180);
    ctx.textAlign = 'center';
    ctx.fillStyle = Palette.hudText;
    ctx.font = 'bold 34px monospace';
    ctx.fillText('PAUSED', VIEW_WIDTH / 2, 320);
    ctx.font = '15px monospace';
    ctx.fillText('Press P to keep flying, or R to restart.', VIEW_WIDTH / 2, 362);
    ctx.fillText(`Score ${game.score}  •  ${game.mission.objectiveText}`, VIEW_WIDTH / 2, 392);
  }

  drawGameOver(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20, 6, 6, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.panel(ctx, 340, 190, 600, 330);
    ctx.textAlign = 'center';
    ctx.fillStyle = Palette.hudRed;
    ctx.font = 'bold 44px monospace';
    ctx.fillText('SORTIE OVER', VIEW_WIDTH / 2, 258);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '16px monospace';
    ctx.fillText(game.endReason || 'The Skylark is down.', VIEW_WIDTH / 2, 296);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = Palette.hudAmber;
    ctx.fillText(`SCORE  ${game.score}`, VIEW_WIDTH / 2, 348);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '15px monospace';
    ctx.fillText(`Rings ${game.mission.ringsPassed}  •  Stars ${game.mission.starsCollected}  •  Distance ${Math.round(game.travelled)} m`, VIEW_WIDTH / 2, 382);
    if (game.score >= game.best && game.score > 0) {
      ctx.fillStyle = Palette.hudGreen;
      ctx.font = 'bold 17px monospace';
      ctx.fillText('NEW BEST SCORE', VIEW_WIDTH / 2, 414);
    } else if (game.best > 0) {
      ctx.fillStyle = 'rgba(216, 242, 255, 0.7)';
      ctx.font = '15px monospace';
      ctx.fillText(`Best score ${game.best}`, VIEW_WIDTH / 2, 414);
    }
    ctx.fillStyle = Palette.hudAmber;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', VIEW_WIDTH / 2, 470);
  }

  drawComplete(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(6, 20, 10, 0.55)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.panel(ctx, 340, 190, 600, 330);
    ctx.textAlign = 'center';
    ctx.fillStyle = Palette.hudGreen;
    ctx.font = 'bold 44px monospace';
    ctx.fillText('MISSION COMPLETE', VIEW_WIDTH / 2, 258);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '16px monospace';
    ctx.fillText(game.endReason || 'Well flown, pilot.', VIEW_WIDTH / 2, 296);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = Palette.hudAmber;
    ctx.fillText(`SCORE  ${game.score}`, VIEW_WIDTH / 2, 348);
    ctx.fillStyle = Palette.hudText;
    ctx.font = '15px monospace';
    ctx.fillText(`Rings ${game.mission.ringsPassed}  •  Stars ${game.mission.starsCollected}  •  Distance ${Math.round(game.travelled)} m`, VIEW_WIDTH / 2, 382);
    if (game.score >= game.best && game.score > 0) {
      ctx.fillStyle = Palette.hudGreen;
      ctx.font = 'bold 17px monospace';
      ctx.fillText('NEW BEST SCORE', VIEW_WIDTH / 2, 414);
    } else if (game.best > 0) {
      ctx.fillStyle = 'rgba(216, 242, 255, 0.7)';
      ctx.font = '15px monospace';
      ctx.fillText(`Best score ${game.best}`, VIEW_WIDTH / 2, 414);
    }
    ctx.fillStyle = Palette.hudAmber;
    ctx.font = 'bold 17px monospace';
    ctx.fillText('PRESS R OR CLICK FOR ANOTHER SORTIE', VIEW_WIDTH / 2, 470);
  }
}
