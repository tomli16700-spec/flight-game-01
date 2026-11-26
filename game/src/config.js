// Skylark Canyon Run — shared tuning numbers and mission definitions.
// One place for every magic number so the flight model, the world and the
// renderer all agree on what "fast", "high" and "far" mean.

export const GAME_TITLE = 'Skylark Canyon Run';
export const PLANE_NAME = 'SK-7 Skylark';

// Logical canvas size. The page scales the canvas with CSS; the game always
// draws at this resolution so screenshots come out identical every time.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HORIZON_Y = 300;

// How far ahead the camera can see, in metres.
export const VIEW_DISTANCE = 1400;

// Flight envelope.
export const Flight = {
  minSpeedKnots: 80,
  maxSpeedKnots: 420,
  cruiseSpeedKnots: 210,
  // Metres of altitude the aircraft can use, 0 is the valley floor.
  maxAltitudeMetres: 600,
  // Lateral limits of the valley, -1 is the left wall, 1 the right wall.
  lateralLimit: 1,
  // How fast the nose answers the stick, in radians per second.
  bankRate: 2.4,
  maxBankDegrees: 42,
  // Climb and descent rates, metres per second at full stick.
  climbRate: 95,
  diveRate: 130,
  // Knots gained or lost per second when diving or climbing hard.
  diveSpeedGain: 26,
  climbSpeedLoss: 30,
  // Below this speed the wing stops flying and the aircraft sinks.
  stallSpeedKnots: 95,
  stallSinkRate: 60,
};

// Fuel is a percentage. Rings and fuel cans put some back.
export const Fuel = {
  start: 100,
  burnPerSecond: 0.55,
  burnPerThrottle: 1.15,
  ringBonus: 8,
  canBonus: 25,
  lowWarning: 25,
};

// Damage: three hard hits and the sortie is over.
export const Damage = {
  maxHits: 3,
  hitSpeedLoss: 55,
  hitShakeSeconds: 0.6,
};

// Scoring.
export const Score = {
  ringPoints: 100,
  starPoints: 50,
  canPoints: 25,
  ringComboStep: 25,
  landingBonus: 500,
  stormSurviveBonus: 300,
};

// World generation.
export const World = {
  // Metres between ring spawns on a ring-run mission.
  ringSpacingMetres: 420,
  // Metres between obstacle spawns; storm missions shrink this.
  obstacleSpacingMetres: 520,
  collectibleSpacingMetres: 640,
  // A ring or obstacle is drawn while its distance ahead is under this.
  spawnAheadMetres: 1350,
  // Collision tolerances, in valley units.
  ringPassRadius: 0.30,
  obstacleHitRadius: 0.20,
  collectibleHitRadius: 0.24,
};

// The three missions. Each one is a different way to fly the same valley.
export const Missions = [
  {
    id: 'rings',
    name: 'Ring Runner',
    short: 'Thread 12 rings before the fuel runs dry.',
    brief:
      'Twelve glowing rings hang over the canyon. Fly through every one. ' +
      'Each ring pays 100 points and a splash of fuel. Miss one and it is gone.',
    target: 12,
    kind: 'rings',
  },
  {
    id: 'courier',
    name: 'Courier Run',
    short: 'Carry the mail 3,200 m and put her down on the strip.',
    brief:
      'The island airstrip waits 3,200 metres down the valley. Get there, ' +
      'slow below 130 knots, line up on the centreline and land. ' +
      'A fast or crooked arrival is a crash, not a delivery.',
    target: 3200,
    kind: 'landing',
  },
  {
    id: 'storm',
    name: 'Storm Dash',
    short: 'Survive 90 seconds of storm and grab 8 stars.',
    brief:
      'A storm cell sits over the canyon. Obstacles come thick and fast, ' +
      'the wind shoves the Skylark sideways, and eight stars are scattered ' +
      'through the murk. Last 90 seconds and bring the stars home.',
    target: 90,
    kind: 'storm',
  },
];

// Colours, one palette for sky, ground and instruments.
export const Palette = {
  skyTop: '#1c4d7a',
  skyMid: '#5f9cc4',
  skyHorizon: '#cfe8f2',
  sunCore: '#fff3c4',
  sunGlow: '#ffd76a',
  mountainFar: '#7d9bb5',
  mountainNear: '#4d6f8e',
  canyonLeft: '#8a5a3c',
  canyonRight: '#7a4f36',
  groundLight: '#7fae62',
  groundDark: '#5d8f4c',
  fieldTan: '#c2a55e',
  river: '#3f8fb5',
  runway: '#3a3f46',
  runwayLine: '#f2f2e8',
  ring: '#ffd94a',
  ringGlow: '#ffb400',
  hudPanel: 'rgba(8, 18, 30, 0.72)',
  hudText: '#d8f2ff',
  hudAmber: '#ffc857',
  hudGreen: '#7dffa8',
  hudRed: '#ff6b5e',
  planeBody: '#e8eef4',
  planeTrim: '#e2483d',
  planeGlass: '#16324a',
};
