import type { Vector2D } from '../types';

const AIRPORT_FLATTEN_RADIUS = 25;
const AIRPORT_HEIGHT = 2.5;
const RUNWAY_TOP_Y = AIRPORT_HEIGHT + 0.375;
const PLANE_CLEARANCE = 0.01;

export function seededRandom(x: number, y: number, seed = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 45.164) * 43758.5453;
  return n - Math.floor(n);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function noise2D(x: number, y: number): number {
  const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y;
  const a = seededRandom(X, Y, 123.456), b = seededRandom(X + 1, Y, 123.456),
        c = seededRandom(X, Y + 1, 123.456), d = seededRandom(X + 1, Y + 1, 123.456);
  const u = smoothstep(xf), v = smoothstep(yf);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x: number, y: number, oct = 4): number {
  let v = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < oct; i++) {
    v += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= .5;
    freq *= 2;
  }
  return v / max;
}

export function getTerrainHeight(x: number, z: number, airportLocation: Vector2D): number {
  const d = Math.hypot(x - airportLocation.x, z - airportLocation.z);
  if (d < AIRPORT_FLATTEN_RADIUS) {
    if (d > AIRPORT_FLATTEN_RADIUS - 5) {
      const t = (d - (AIRPORT_FLATTEN_RADIUS - 5)) / 5;
      const nat = fbm(x * .05, z * .05, 4) * 8 - 2;
      return RUNWAY_TOP_Y - 0.375 * (1 - t) + nat * t;
    }
    return AIRPORT_HEIGHT;
  }
  return fbm(x * .05, z * .05, 4) * 8 - 2;
}

export function isWater(x: number, z: number, airportLocation: Vector2D): boolean {
  return getTerrainHeight(x, z, airportLocation) < 0.5;
}

export function isOverRunwayXZ(x: number, z: number, airportLocation: Vector2D, runwayLen: number): boolean {
  const halfW = 2.5 - 0.1; 
  const halfL = runwayLen / 2 - 0.5;
  return Math.abs(x - airportLocation.x) <= halfW && Math.abs(z - airportLocation.z) <= halfL;
}

export function clampToRunwayTopIfInside(plane: any, airportLocation: Vector2D, runwayLen: number, THREE: any): void {
  if (isOverRunwayXZ(plane.position.x, plane.position.z, airportLocation, runwayLen)) {
    const top = RUNWAY_TOP_Y + PLANE_CLEARANCE;
    if (plane.position.y < top) plane.position.y = top;
  }
}