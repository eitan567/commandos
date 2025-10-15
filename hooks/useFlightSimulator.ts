import { useRef, useEffect, useCallback } from 'react';
import type * as THREE from 'three';
import { createScene, createPlane, createAirport, updateChunks, findAirportLocation } from '../utils/sceneSetup';
import { getTerrainHeight, isOverRunwayXZ, clampToRunwayTopIfInside } from '../utils/terrain';
import type { PlaneState, HudData, CompassData, MessageData, InputState } from '../types';

const RUNWAY_TOP_Y = 2.5 + 0.375;
const PLANE_CLEARANCE = 0.01;

export const useFlightSimulator = (
  mountRef: React.RefObject<HTMLDivElement>,
  onStateUpdate: (data: { hud: HudData, compass: CompassData, message: MessageData, autoland: boolean }) => void
) => {
  const threeRef = useRef<any>({});
  const stateRef = useRef<PlaneState>({
    velocity: new (window as any).THREE.Vector3(0, 0, 0),
    rotation: new (window as any).THREE.Euler(0, 0, 0),
    speed: 0.15, minSpeed: 0.15, maxSpeed: 0.5,
    acceleration: 0.01, turnSpeed: 0.02, pitchSpeed: 0.015, rollSpeed: 0.03,
    fuel: 100, maxFuel: 100, fuelConsumption: 0.01,
    isGrounded: true, nearAirport: true,
    autoLanding: false, autoPhase: 'none', phaseTimer: 0,
    hasTakenOff: false, manualAutoLandRequested: false,
    flightTicks: 0, lockedYaw: null
  });
  const inputRef = useRef<InputState>({ x: 0, y: 0, throttle: 0 });
  const keysRef = useRef<Record<string, boolean>>({});

  const showMessage = useCallback((text: string, duration: number) => {
    onStateUpdate({ 
        ...threeRef.current.lastState, 
        message: { text, visible: true } 
    });
    if (duration > 0) {
      setTimeout(() => {
        onStateUpdate({ 
            ...threeRef.current.lastState, 
            message: { text: '', visible: false } 
        });
      }, duration);
    }
  }, [onStateUpdate]);

  const handleInput = useCallback((input: InputState) => {
    inputRef.current = input;
  }, []);
  
  const requestAutoLand = useCallback(() => {
    const { isGrounded, autoLanding } = stateRef.current;
    const { playerPlane, airportLocation } = threeRef.current;
    if (!playerPlane) return;
    
    const dist = playerPlane.position.distanceTo(new (window as any).THREE.Vector3(airportLocation.x, playerPlane.position.y, airportLocation.z));
    const altitude = playerPlane.position.y - RUNWAY_TOP_Y;

    if (!isGrounded && altitude > 0.8 && dist < 120 && !autoLanding) {
        stateRef.current.manualAutoLandRequested = true;
        showMessage('Autopilot engaged', 1200);
    } else if (isGrounded) {
        showMessage('On ground', 1000);
    } else if (autoLanding) {
        showMessage('Landing…', 1000);
    } else {
        showMessage('Too far', 1000);
    }
  }, [showMessage]);

  useEffect(() => {
    const THREE = (window as any).THREE as typeof import('three');
    if (!mountRef.current || !THREE) return;

    const { scene, camera, renderer, sun, dir } = createScene();
    mountRef.current.appendChild(renderer.domElement);

    const airportLocation = findAirportLocation();
    const mainAirport = createAirport(airportLocation.x, airportLocation.z, THREE);
    scene.add(mainAirport);

    const playerPlane = createPlane(THREE);
    const startY = mainAirport.userData.height + 0.15;
    playerPlane.position.set(airportLocation.x, startY, airportLocation.z - (mainAirport.userData.runwayLen / 2 - 3));
    playerPlane.rotation.y = Math.PI;
    scene.add(playerPlane);

    threeRef.current = { 
        scene, camera, renderer, sun, dir, 
        playerPlane, mainAirport, airportLocation, 
        chunks: new Map(), chunkObjects: new Map(), 
        lastChunkUpdate: 0, animationFrameId: 0, lastState: {},
        cameraViews: ['rear', 'left', 'right'],
        currentCameraViewIndex: 0,
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'l') requestAutoLand();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleWheel = (e: WheelEvent) => {
      const { cameraViews } = threeRef.current;
      if (!cameraViews) return;

      if (e.deltaY < 0) { // wheel up/forward
          threeRef.current.currentCameraViewIndex = (threeRef.current.currentCameraViewIndex + 1) % cameraViews.length;
      } else { // wheel down/backward
          threeRef.current.currentCameraViewIndex = (threeRef.current.currentCameraViewIndex - 1 + cameraViews.length) % cameraViews.length;
      }
    };
    window.addEventListener('wheel', handleWheel);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const { scene, camera, renderer, sun, dir, playerPlane, mainAirport, airportLocation, chunks, chunkObjects } = threeRef.current;
      const state = stateRef.current;
      
      const t = Date.now() * 0.0003;
      sun.position.x = Math.sin(t) * 8;
      sun.position.y = Math.cos(t) * 3 + 8;
      sun.position.z = Math.cos(t) * 5;
      dir.position.copy(sun.position);

      const keys = keysRef.current;
      let inputX = inputRef.current.x || (keys['a'] ? -1 : keys['d'] ? 1 : 0);
      let inputY = inputRef.current.y || (keys['w'] ? -1 : keys['s'] ? 1 : 0);
      let inputThr = inputRef.current.throttle || (keys['shift'] ? 1 : (keys['control'] ? -1 : 0));
      if (state.autoLanding) { inputX = 0; inputY = 0; inputThr = 0; }

      const distToAirport = playerPlane.position.distanceTo(new THREE.Vector3(airportLocation.x, playerPlane.position.y, airportLocation.z));
      state.nearAirport = distToAirport < 20;
      const terrainHeight = getTerrainHeight(playerPlane.position.x, playerPlane.position.z, airportLocation);
      const currentAltitude = playerPlane.position.y - terrainHeight;

      if (currentAltitude < 0.5 && state.nearAirport) { state.isGrounded = true; } 
      else if (currentAltitude > 1) { state.isGrounded = false; }
      
      const runwayYNow = RUNWAY_TOP_Y + PLANE_CLEARANCE;
      const altAbs = playerPlane.position.y - runwayYNow;
      if (!state.isGrounded && altAbs > 0.8) state.flightTicks++; else state.flightTicks = 0;
      if (!state.hasTakenOff && state.flightTicks > 180 && (distToAirport > 150 || altAbs > 3)) state.hasTakenOff = true;

      if (!state.isGrounded) {
        state.speed += inputThr * state.acceleration;
        state.speed = Math.max(state.minSpeed, Math.min(state.maxSpeed, state.speed));
        state.fuel -= state.fuelConsumption * state.speed;
        state.fuel = Math.max(0, state.fuel);
        if (state.fuel <= 0) { state.speed *= 0.99; if(Math.random()<0.01) showMessage('OUT OF FUEL!', 100); }
      } else {
        state.speed += inputThr * state.acceleration;
        state.speed = Math.max(0, Math.min(state.maxSpeed, state.speed));
        if (inputThr === 0) state.speed *= 0.95;
      }

      if (inputX !== 0) {
        const k = state.isGrounded ? 0.5 : 1;
        playerPlane.rotation.y -= inputX * state.turnSpeed * k;
      }
      if (!state.isGrounded) {
        if (inputY !== 0) {
          playerPlane.rotation.x += inputY * state.pitchSpeed;
          playerPlane.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, playerPlane.rotation.x));
        } else {
          playerPlane.rotation.x *= 0.95;
        }
        const targetRoll = -inputX * 0.5;
        playerPlane.rotation.z += (targetRoll - playerPlane.rotation.z) * 0.1;
      } else {
        playerPlane.rotation.x *= 0.9;
        playerPlane.rotation.z *= 0.9;
      }
      
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);
      playerPlane.position.add(fwd.multiplyScalar(state.speed));

      clampToRunwayTopIfInside(playerPlane, airportLocation, mainAirport.userData.runwayLen, THREE);
      const minY = Math.max(terrainHeight + 0.3, isOverRunwayXZ(playerPlane.position.x, playerPlane.position.z, airportLocation, mainAirport.userData.runwayLen) ? RUNWAY_TOP_Y + PLANE_CLEARANCE : -Infinity);
      if (playerPlane.position.y < minY) {
        playerPlane.position.y = minY;
        if (!state.isGrounded && state.speed < state.minSpeed * 0.7) {
            showMessage('CRASH LANDING!', 2000);
            state.speed = 0;
            state.isGrounded = true;
        }
      }

      if (playerPlane.userData.prop) playerPlane.userData.prop.rotation.z += state.speed * 50;

      const { cameraViews, currentCameraViewIndex } = threeRef.current;
      const currentView = cameraViews[currentCameraViewIndex];

      let camOffset;
      switch (currentView) {
          case 'left':
              camOffset = new THREE.Vector3(-5, 1, -2);
              break;
          case 'right':
              camOffset = new THREE.Vector3(5, 1, -2);
              break;
          case 'rear':
          default:
              camOffset = new THREE.Vector3(0, 3, 10);
              break;
      }

      const camPos = camOffset.clone().applyQuaternion(playerPlane.quaternion);
      camera.position.copy(playerPlane.position).add(camPos);
      camera.lookAt(playerPlane.position);
      
      const runwayCenter = new THREE.Vector3(airportLocation.x, RUNWAY_TOP_Y + PLANE_CLEARANCE, airportLocation.z);
      const toRunway = new THREE.Vector2(runwayCenter.x - playerPlane.position.x, runwayCenter.z - playerPlane.position.z).normalize();
      const dirPlusZ = new THREE.Vector2(0, 1), dirMinusZ = new THREE.Vector2(0, -1);
      const landingDir2 = (toRunway.dot(dirPlusZ) >= toRunway.dot(dirMinusZ)) ? dirPlusZ : dirMinusZ;
      const landingDir3 = new THREE.Vector3(0, 0, landingDir2.y);
      const approachPoint = new THREE.Vector3(runwayCenter.x, RUNWAY_TOP_Y + 1.8, runwayCenter.z).add(landingDir3.clone().multiplyScalar(-45));

      if (!state.autoLanding && state.manualAutoLandRequested) {
        state.autoLanding = true; state.autoPhase = 'intercept'; state.phaseTimer = 0; state.manualAutoLandRequested = false;
        state.lockedYaw = null;
      }
      
      if(state.autoLanding) {
        // Autoland logic here, adapted from original script
        const desiredYaw = (landingDir2.y > 0) ? Math.PI : 0;

        if (state.autoPhase !== 'rollout' && state.autoPhase !== 'turnaround' && state.autoPhase !== 'hold' && state.autoPhase !== 'done') {
            const yawErr = ((desiredYaw - playerPlane.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            playerPlane.rotation.y += yawErr * 0.06;
        } else if (state.lockedYaw != null && state.autoPhase !== 'turnaround') {
            playerPlane.rotation.y = state.lockedYaw;
        }

        playerPlane.rotation.z *= 0.8;
        playerPlane.rotation.x *= 0.9;

        switch (state.autoPhase) {
            case 'intercept': {
                const dirV = new THREE.Vector3().subVectors(approachPoint, playerPlane.position);
                const d = dirV.length();
                if (d > 0.001) dirV.normalize();
                state.speed = Math.max(0.14, state.speed - 0.0010);
                playerPlane.position.add(dirV.multiplyScalar(Math.min(d, 0.11)));
                playerPlane.position.y += (approachPoint.y - playerPlane.position.y) * 0.04;
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.045;
                if (d < 1.2) { state.autoPhase = 'glideslope'; state.phaseTimer = 0; }
                break;
            }
            case 'glideslope': {
                state.speed = Math.max(0.12, state.speed - 0.0010);
                playerPlane.position.add(landingDir3.clone().multiplyScalar(0.095));
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.035;
                const targetY = RUNWAY_TOP_Y + PLANE_CLEARANCE + 0.25;
                playerPlane.position.y += (targetY - playerPlane.position.y) * 0.035;
                state.phaseTimer++;
                const zRel = (playerPlane.position.z - airportLocation.z) * landingDir2.y;
                if (state.phaseTimer > 6 * 60 || zRel > (mainAirport.userData.runwayLen / 2 - 6)) {
                    state.autoPhase = 'flare'; state.phaseTimer = 0;
                    state.lockedYaw = desiredYaw;
                }
                break;
            }
            case 'flare': {
                const targetY = RUNWAY_TOP_Y + PLANE_CLEARANCE;
                state.speed = Math.max(0.10, state.speed - 0.001);
                playerPlane.position.y += (targetY - playerPlane.position.y) * 0.10;
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.025;
                if (Math.abs(playerPlane.position.y - targetY) < 0.01) {
                    playerPlane.position.y = targetY;
                    state.isGrounded = true;
                    state.autoPhase = 'rollout';
                    state.phaseTimer = 0;
                    if (state.lockedYaw == null) state.lockedYaw = desiredYaw;
                }
                break;
            }
            case 'rollout': {
                if (state.lockedYaw != null) playerPlane.rotation.y = state.lockedYaw;
                const brk = Math.max(0.04, 0.10 - state.phaseTimer * 0.0012);
                playerPlane.position.add(landingDir3.clone().multiplyScalar(brk));
                state.speed = Math.max(0, brk);
                playerPlane.position.y = RUNWAY_TOP_Y + PLANE_CLEARANCE;
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.04;
                state.phaseTimer++;
                const endRel = (playerPlane.position.z - airportLocation.z) * landingDir2.y;
                if (endRel >= (mainAirport.userData.runwayLen / 2 - 2) || state.phaseTimer > 7 * 60) {
                    state.autoPhase = 'turnaround';
                    state.phaseTimer = 0;
                }
                break;
            }
            case 'turnaround': {
                const targetYaw = (state.lockedYaw || desiredYaw) + Math.PI;
                const yawErr = ((targetYaw - playerPlane.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
                playerPlane.rotation.y += Math.sign(yawErr) * Math.min(Math.abs(yawErr), 0.06);
                playerPlane.position.y = RUNWAY_TOP_Y + PLANE_CLEARANCE;
                playerPlane.position.add(landingDir3.clone().multiplyScalar(0.015));
                if (Math.abs(yawErr) < 0.02 || state.phaseTimer > 3 * 60) {
                    state.autoPhase = 'hold';
                    state.phaseTimer = 0;
                    state.lockedYaw = targetYaw;
                    state.speed = 0;
                } else {
                    state.phaseTimer++;
                }
                break;
            }
            case 'hold':
                if (state.lockedYaw != null) playerPlane.rotation.y = state.lockedYaw;
                playerPlane.position.y = RUNWAY_TOP_Y + PLANE_CLEARANCE;
                state.speed = 0;
                state.phaseTimer++;
                if (state.phaseTimer > 2 * 60) {
                    state.autoPhase = 'done';
                    showMessage('Control ready', 900);
                }
                break;
            case 'done':
                state.autoLanding = false;
                state.isGrounded = true;
                state.speed = 0;
                if (state.lockedYaw != null) playerPlane.rotation.y = state.lockedYaw;
                break;
        }
      }

      const now = Date.now();
      if (now - threeRef.current.lastChunkUpdate > 500) {
        updateChunks(camera, chunks, chunkObjects, scene, airportLocation, mainAirport.userData.runwayLen, THREE);
        threeRef.current.lastChunkUpdate = now;
      }

      chunkObjects.forEach((o: any) => o.waterMeshes.forEach((w: any, i: number) => {
        const tt = Date.now() * 0.001;
        w.position.y = w.userData.baseHeight + Math.sin(tt + i) * 0.02;
        w.rotation.z = Math.sin(tt * 0.5 + i) * 0.02;
      }));

      renderer.render(scene, camera);
      
      const dx = airportLocation.x - playerPlane.position.x;
      const dz = airportLocation.z - playerPlane.position.z;
      
      const latestState = {
        hud: {
          speed: Math.round(state.speed * 200),
          altitude: Math.round(currentAltitude * 10),
          fuel: state.fuel,
          isGrounded: state.isGrounded,
          nearAirport: state.nearAirport
        },
        compass: {
          rotation: Math.atan2(dx, dz) - playerPlane.rotation.y + Math.PI,
          distance: (Math.hypot(dx, dz) / 10).toFixed(1) + 'km',
        },
        message: { text: '', visible: false }, // Will be overwritten by showMessage
        autoland: state.autoLanding,
      };
      
      onStateUpdate(latestState);
      threeRef.current.lastState = latestState;

      threeRef.current.animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(threeRef.current.animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // You would also dispose of Three.js geometries, materials, etc. here for a production app
    };
  }, [mountRef, onStateUpdate, requestAutoLand, showMessage]);

  return { handleInput, requestAutoLand };
};