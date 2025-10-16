import type * as THREE from 'three';

// FIX: Changed y to z to correctly represent a 2D vector on the XZ plane for world coordinates.
export interface Vector2D {
  x: number;
  z: number;
}

export interface PlaneState {
  velocity: THREE.Vector3 | null;
  rotation: THREE.Euler | null;
  speed: number;
  minSpeed: number;
  maxSpeed: number;
  acceleration: number;
  turnSpeed: number;
  pitchSpeed: number;
  rollSpeed: number;
  fuel: number;
  maxFuel: number;
  fuelConsumption: number;
  isGrounded: boolean;
  nearAirport: boolean;
  autoLanding: boolean;
  autoPhase: string;
  phaseTimer: number;
  hasTakenOff: boolean;
  manualAutoLandRequested: boolean;
  flightTicks: number;
  lockedYaw: number | null;
}

export interface HudData {
  speed: number;
  altitude: number;
  fuel: number;
  isGrounded: boolean;
  nearAirport: boolean;
}

export interface CompassData {
  rotation: number;
  distance: string;
}

export interface MessageData {
  text: string;
  visible: boolean;
}

export interface InputState {
  x: number;
  y: number;
  throttle: number;
}

export interface ChunkObjects {
  waterMeshes: THREE.Mesh[];
  treeIndices: number[];
  house: THREE.Group | null;
}