import React, { useRef, useEffect, useCallback } from 'react';
import type * as THREE from 'three';
import { createScene, createPlane, createAirport, updateChunks, findAirportLocation } from '../utils/sceneSetup';
import { getTerrainHeight, AIRPORT_HEIGHT } from '../utils/terrain';
import type { PlaneState, HudData, CompassData, MessageData, InputState, ArrowData } from '../types';

const PLANE_GROUND_CLEARANCE = 0.3; // Distance from plane center to bottom of wheels

export const useFlightSimulator = (
  mountRef: React.RefObject<HTMLDivElement>,
  onStateUpdate: (data: { hud: HudData, compass: CompassData, message: MessageData, autoland: boolean, arrows: ArrowData[] }) => void,
  isFogEnabled: boolean,
  isActive: boolean
) => {
  const threeRef = useRef<any>({});
  const stateRef = useRef<PlaneState>({
    velocity: null,
    rotation: null,
    speed: 0.15, minSpeed: 0.15, maxSpeed: 0.5,
    acceleration: 0.01, turnSpeed: 0.02, pitchSpeed: 0.015, rollSpeed: 0.03,
    fuel: 100, maxFuel: 100, fuelConsumption: 0.01,
    isGrounded: true, nearAirport: true,
    autoLanding: false, autoPhase: 'none', phaseTimer: 0,
    hasTakenOff: false, manualAutoLandRequested: false,
    flightTicks: 0, lockedYaw: null,
    landingDirection: null,
    targetYaw: null,
    // New state for rollout and effects
    rolloutStartZ: null, rolloutInitialSpeed: null, targetStopZ: null, cameraShakeTimer: 0,
  });
  const inputRef = useRef<InputState>({ x: 0, y: 0, throttle: 0 });
  const keysRef = useRef<Record<string, boolean>>({});
  const gameStartTimeRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  const isDraggingForZoomRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

  const showMessage = useCallback((text: string, duration: number) => {
    if (threeRef.current.lastState) {
        onStateUpdate({ 
            ...threeRef.current.lastState, 
            message: { text, visible: true } 
        });
    }
    if (duration > 0) {
      setTimeout(() => {
        if (threeRef.current.lastState) {
            onStateUpdate({ 
                ...threeRef.current.lastState, 
                message: { text: '', visible: false } 
            });
        }
      }, duration);
    }
  }, [onStateUpdate]);

  const handleInput = useCallback((input: InputState) => {
    inputRef.current = input;
  }, []);
  
  const requestAutoLand = useCallback(() => {
    const { isGrounded, autoLanding } = stateRef.current;
    const { playerPlane, airportLocation } = threeRef.current;
    if (!playerPlane || !airportLocation) return;
    
    const dist = playerPlane.position.distanceTo(new (window as any).THREE.Vector3(airportLocation.x, playerPlane.position.y, airportLocation.z));
    const altitude = playerPlane.position.y - (getTerrainHeight(playerPlane.position.x, playerPlane.position.z, airportLocation) + PLANE_GROUND_CLEARANCE);

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
    
    gameStartTimeRef.current = Date.now();

    if (!stateRef.current.velocity) {
      stateRef.current.velocity = new THREE.Vector3(0, 0, 0);
      stateRef.current.rotation = new THREE.Euler(0, 0, 0);
    }

    const { scene, camera, renderer, sun, dir, ambient, moon, instancedTreeTrunks, instancedTreeFoliage, freeTreeIndices } = createScene();
    mountRef.current.appendChild(renderer.domElement);

    const airportLocation = findAirportLocation();
    const mainAirport = createAirport(airportLocation.x, airportLocation.z, THREE);
    scene.add(mainAirport);

    const playerPlane = createPlane(THREE);
    playerPlane.rotation.order = 'YXZ';
    const startY = getTerrainHeight(airportLocation.x, airportLocation.z - (mainAirport.userData.runwayLen / 2 - 3), airportLocation) + PLANE_GROUND_CLEARANCE;
    playerPlane.position.set(airportLocation.x, startY, airportLocation.z - (mainAirport.userData.runwayLen / 2 - 3));
    playerPlane.rotation.y = Math.PI;
    scene.add(playerPlane);

    dir.target = playerPlane;

    threeRef.current = { 
        scene, camera, renderer, sun, dir, ambient, moon,
        playerPlane, mainAirport, airportLocation, 
        chunks: new Map(), chunkObjects: new Map(), 
        instancedTreeTrunks, instancedTreeFoliage, freeTreeIndices,
        lastChunkUpdate: 0, animationFrameId: 0,
        originalFog: scene.fog,
        defaultFov: camera.fov,
        lastState: {
          hud: { speed: 0, altitude: 0, fuel: 100, isGrounded: true, nearAirport: true },
          compass: { rotation: 0, distance: '0.0km' },
          message: { text: '', visible: false },
          autoland: false,
          arrows: [],
        },
        cameraViews: ['rear', 'left', 'right'],
        currentCameraViewIndex: 0,
        needsInstanceUpdate: false,
    };
    
    updateChunks(threeRef.current, scene, airportLocation, mainAirport.userData.runwayLen, THREE);
    threeRef.current.needsInstanceUpdate = true;


    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'l') requestAutoLand();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const handleWheel = (e: WheelEvent) => {
      const { camera, cameraViews, defaultFov } = threeRef.current;
      if (!cameraViews) return;

      if (e.deltaY < 0) {
          threeRef.current.currentCameraViewIndex = (threeRef.current.currentCameraViewIndex + 1) % cameraViews.length;
      } else {
          threeRef.current.currentCameraViewIndex = (threeRef.current.currentCameraViewIndex - 1 + cameraViews.length) % cameraViews.length;
      }
      
      camera.fov = defaultFov;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('wheel', handleWheel);

    const handleMouseDown = (e: MouseEvent) => {
        isDraggingForZoomRef.current = true;
        lastMouseXRef.current = e.clientX;
    };
    const handleMouseUp = () => {
        isDraggingForZoomRef.current = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
        if (isDraggingForZoomRef.current) {
            const { camera } = threeRef.current;
            const deltaX = e.clientX - lastMouseXRef.current;
            
            camera.fov -= deltaX * 0.1;
            camera.fov = THREE.MathUtils.clamp(camera.fov, 10, 80);
            camera.updateProjectionMatrix();

            lastMouseXRef.current = e.clientX;
        }
    };
    mountRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);


    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const { scene, camera, renderer, sun, dir, ambient, playerPlane, mainAirport, airportLocation, moon, instancedTreeTrunks, instancedTreeFoliage } = threeRef.current;
      if(!scene) return;
      const state = stateRef.current;
      if (!state.velocity || !state.rotation) return;
      
      const elapsedTime = Date.now() - gameStartTimeRef.current;
      const time = (Math.PI / 2) + elapsedTime * 0.000002618; // Start at noon, ~40min cycle
      
      const sunAngle = time;
      const sunDirection = new THREE.Vector3(
        Math.cos(sunAngle),
        Math.sin(sunAngle),
        0.2
      ).normalize();

      dir.position.copy(playerPlane.position).add(sunDirection.clone().multiplyScalar(50));
      dir.target.updateMatrixWorld();

      const visualDistance = 200;
      sun.position.copy(camera.position).add(sunDirection.clone().multiplyScalar(visualDistance));
      moon.position.copy(camera.position).add(sunDirection.clone().negate().multiplyScalar(visualDistance));

      const sunY = sunDirection.y;
      
      sun.visible = sunY >= -0.1;
      moon.visible = sunY < 0.1;
      
      if (sunY < -0.1) { // Night
          dir.intensity = 0;
          const moonYNormalized = -sunY;
          ambient.intensity = THREE.MathUtils.lerp(0.1, 0.25, moonYNormalized);
          const nightColor = new THREE.Color(0x050510);
          if (scene.fog && !scene.background.equals(nightColor)) {
              scene.background.copy(nightColor);
              scene.fog.color.copy(nightColor);
          } else if (!scene.fog && !scene.background.equals(nightColor)) {
              scene.background.copy(nightColor);
          }
      } else if (sunY < 0.15) { // Dawn / Dusk
          const factor = (sunY + 0.1) / 0.25;
          dir.intensity = THREE.MathUtils.lerp(0, 1, factor);
          ambient.intensity = THREE.MathUtils.lerp(0.25, 0.5, factor);
          const dawnColor = new THREE.Color(0xffa500);
          const dayColor = new THREE.Color(0x87ceeb);
          const currentColor = new THREE.Color().lerpColors(dawnColor, dayColor, factor);
          if (scene.fog) {
            scene.background.copy(currentColor);
            scene.fog.color.copy(currentColor);
          } else {
            scene.background.copy(currentColor);
          }
      } else { // Day
          dir.intensity = 1;
          ambient.intensity = 0.5;
          const dayColor = new THREE.Color(0x87ceeb);
           if (scene.fog && !scene.background.equals(dayColor)) {
              scene.background.copy(dayColor);
              scene.fog.color.copy(dayColor);
          } else if (!scene.fog && !scene.background.equals(dayColor)) {
            scene.background.copy(dayColor);
          }
      }

      if (isActive) {
        const keys = keysRef.current;
        const inputX = inputRef.current.x || (keys['a'] || keys['arrowleft'] ? 1 : (keys['d'] || keys['arrowright'] ? -1 : 0));
        const inputY = inputRef.current.y || (keys['s'] || keys['arrowdown'] ? 1 : (keys['w'] || keys['arrowup'] ? -1 : 0));
        const inputThr = inputRef.current.throttle || (keys['shift'] ? 1 : (keys['control'] ? -1 : 0));
        
        if (state.autoLanding) {
          // No manual input during autoland
        } else {
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
              playerPlane.rotation.y += inputX * state.turnSpeed * k;
          }

          if (!state.isGrounded) {
              if (inputY !== 0) {
                  playerPlane.rotation.x += inputY * state.pitchSpeed;
                  playerPlane.rotation.x = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, playerPlane.rotation.x));
              } else {
                  playerPlane.rotation.x *= 0.95;
              }
              const targetRoll = inputX * 0.5;
              playerPlane.rotation.z += (targetRoll - playerPlane.rotation.z) * 0.1;
          } else {
              playerPlane.rotation.x *= 0.9;
              playerPlane.rotation.z *= 0.9;
          }
        }
      }
      
      const distToAirport = playerPlane.position.distanceTo(new THREE.Vector3(airportLocation.x, playerPlane.position.y, airportLocation.z));
      state.nearAirport = distToAirport < 20;
      const terrainHeight = getTerrainHeight(playerPlane.position.x, playerPlane.position.z, airportLocation);
      const currentAltitude = playerPlane.position.y - terrainHeight;

      if (currentAltitude < 0.5 && state.nearAirport) { state.isGrounded = true; } 
      else if (currentAltitude > 1) { state.isGrounded = false; }
      
      // Automatic refueling when grounded at the airport
      if (isActive && state.isGrounded && state.nearAirport && state.fuel < state.maxFuel) {
        // Refuel rate: maxFuel over 5 seconds. Assuming ~60fps animation rate.
        // maxFuel / (5 seconds * 60 frames/second)
        state.fuel += state.maxFuel / 300;
        if (state.fuel > state.maxFuel) {
          state.fuel = state.maxFuel;
        }
      }

      const runwayYNow = AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE;
      const altAbs = playerPlane.position.y - runwayYNow;
      if (!state.isGrounded && altAbs > 0.8) state.flightTicks++; else state.flightTicks = 0;
      if (!state.hasTakenOff && state.flightTicks > 180 && (distToAirport > 150 || altAbs > 3)) state.hasTakenOff = true;
      
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(playerPlane.quaternion);
      playerPlane.position.add(fwd.multiplyScalar(state.speed));

      if (!state.isGrounded) {
          playerPlane.position.y -= 0.004;
          const stallSpeed = state.minSpeed * 1.2;
          if (state.speed < stallSpeed) {
              const stallEffect = (stallSpeed - state.speed) * 0.05;
              playerPlane.position.y -= stallEffect;
          }
      }

      const minY = terrainHeight + PLANE_GROUND_CLEARANCE;
      if (playerPlane.position.y < minY) {
        playerPlane.position.y = minY;
        if (!state.isGrounded && state.speed < state.minSpeed * 0.7) {
            showMessage('CRASH LANDING!', 2000);
            state.speed = 0;
            state.isGrounded = true;
        }
      }

      if (playerPlane.userData.prop) {
        const engineOn = state.speed > 0.01 || (state.autoLanding && (state.autoPhase === 'rollout' || state.autoPhase === 'turnaround'));
        if (engineOn) {
          const normalizedSpeed = Math.max(0, (state.speed - state.minSpeed)) / (state.maxSpeed - state.minSpeed);
          const spinRate = state.speed > 0.01 ? (normalizedSpeed * 1.0 + 0.1) * 75 : 10;
          playerPlane.userData.prop.rotation.z += spinRate;
        }
      }

      const { cameraViews, currentCameraViewIndex } = threeRef.current;
      const currentView = cameraViews[currentCameraViewIndex];

      let camOffset;
      switch (currentView) {
          case 'left': camOffset = new THREE.Vector3(-5, 1, -2); break;
          case 'right': camOffset = new THREE.Vector3(5, 1, -2); break;
          case 'rear': default: camOffset = new THREE.Vector3(0, 3, 10); break;
      }

      const camPos = camOffset.clone().applyQuaternion(playerPlane.quaternion);
      camera.position.copy(playerPlane.position).add(camPos);
      
      if (state.cameraShakeTimer > 0) {
        const shakeAmount = (state.cameraShakeTimer / 30) * 0.08;
        camera.position.x += (Math.random() - 0.5) * shakeAmount;
        camera.position.y += (Math.random() - 0.5) * shakeAmount;
        state.cameraShakeTimer--;
      }
      
      camera.lookAt(playerPlane.position);
      
      const runwayCenter = new THREE.Vector3(airportLocation.x, AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE, airportLocation.z);

      // Calculate and store landing direction when autoland is requested
      if (!state.autoLanding && state.manualAutoLandRequested) {
        const toRunway = new THREE.Vector2(runwayCenter.x - playerPlane.position.x, runwayCenter.z - playerPlane.position.z).normalize();
        const dirPlusZ = new THREE.Vector2(0, 1), dirMinusZ = new THREE.Vector2(0, -1);
        const landingDir2 = (toRunway.dot(dirPlusZ) >= toRunway.dot(dirMinusZ)) ? dirPlusZ : dirMinusZ;
        state.landingDirection = landingDir2.y;
        
        state.autoLanding = true;
        state.autoPhase = 'intercept';
        state.phaseTimer = 0;
        state.manualAutoLandRequested = false;
        state.lockedYaw = null;
      }
      
      if(state.autoLanding) {
        const landingDirY = state.landingDirection || 1;
        const landingDir3 = new THREE.Vector3(0, 0, landingDirY);
        const desiredYaw = (landingDirY > 0) ? Math.PI : 0;
        const approachPoint = new THREE.Vector3(runwayCenter.x, runwayCenter.y + 10, runwayCenter.z).add(landingDir3.clone().multiplyScalar(-50));
        const touchdownPoint = new THREE.Vector3(runwayCenter.x, runwayCenter.y, runwayCenter.z).add(landingDir3.clone().multiplyScalar(-mainAirport.userData.runwayLen / 2 + 5));

        if (state.autoPhase !== 'rollout' && state.autoPhase !== 'turnaround' && state.autoPhase !== 'hold') {
            const yawErr = ((desiredYaw - playerPlane.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            playerPlane.rotation.y += yawErr * 0.06;
        } else if (state.autoPhase !== 'turnaround' && state.lockedYaw != null) {
            playerPlane.rotation.y = state.lockedYaw;
        }

        playerPlane.rotation.z *= 0.8;
        playerPlane.rotation.x *= 0.9;

        switch (state.autoPhase) {
            case 'intercept': {
                const dirV = new THREE.Vector3().subVectors(approachPoint, playerPlane.position);
                const d = dirV.length();
                if (d > 0.001) dirV.normalize();
                
                state.speed = Math.max(0.2, state.speed - 0.0010);
                
                const approachSpeed = 0.25;
                playerPlane.position.add(dirV.multiplyScalar(Math.min(d, approachSpeed)));

                if (d < 1.5) { state.autoPhase = 'glideslope'; state.phaseTimer = 0; }
                break;
            }
            case 'glideslope': {
                state.speed = Math.max(0.12, state.speed - 0.0012);
                playerPlane.position.add(landingDir3.clone().multiplyScalar(state.speed));
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.035;

                const totalGlidePath = new THREE.Vector3().subVectors(approachPoint, touchdownPoint);
                const currentPath = new THREE.Vector3().subVectors(playerPlane.position, touchdownPoint);
                
                const progress = 1 - (currentPath.dot(totalGlidePath) / totalGlidePath.lengthSq());
                const clampedProgress = Math.max(0, Math.min(1, progress));

                const correctAltitude = THREE.MathUtils.lerp(approachPoint.y, touchdownPoint.y, clampedProgress);
                playerPlane.position.y = correctAltitude;

                const distToTouchdown = playerPlane.position.distanceTo(touchdownPoint);
                if (distToTouchdown < 1) {
                    state.autoPhase = 'flare';
                    state.phaseTimer = 0;
                    state.lockedYaw = desiredYaw;
                }
                break;
            }
            case 'flare': {
                const targetY = AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE;
                state.speed = Math.max(0.08, state.speed - 0.0015);
                
                playerPlane.position.add(landingDir3.clone().multiplyScalar(state.speed));
                playerPlane.position.y += (targetY - playerPlane.position.y) * 0.10;
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.025;

                if (playerPlane.position.y <= targetY + 0.02) {
                    playerPlane.position.y = targetY;
                    state.isGrounded = true;
                    state.autoPhase = 'rollout';
                    state.phaseTimer = 0;
                    if (state.lockedYaw == null) state.lockedYaw = desiredYaw;
                    
                    state.rolloutInitialSpeed = state.speed;
                    state.rolloutStartZ = playerPlane.position.z;
                    state.targetStopZ = airportLocation.z + (landingDirY * (mainAirport.userData.runwayLen / 2 - 3));
                    state.cameraShakeTimer = 30;
                }
                break;
            }
            case 'rollout': {
                if (state.lockedYaw != null) playerPlane.rotation.y = state.lockedYaw;
                
                if (state.rolloutStartZ !== null && state.targetStopZ !== null && state.rolloutInitialSpeed !== null) {
                    const totalDistance = Math.abs(state.targetStopZ - state.rolloutStartZ);
                    const distanceCovered = Math.abs(playerPlane.position.z - state.rolloutStartZ);
                    const progress = Math.min(1, distanceCovered / totalDistance);
                    
                    state.speed = THREE.MathUtils.lerp(state.rolloutInitialSpeed, 0, progress);

                    if (progress >= 0.99 || state.speed <= 0.001) {
                        state.speed = 0;
                        state.autoPhase = 'turnaround';
                        state.phaseTimer = 0;
                        state.rolloutInitialSpeed = null;
                        state.rolloutStartZ = null;
                        state.targetStopZ = null;
                        if (state.lockedYaw !== null) {
                           state.targetYaw = state.lockedYaw + Math.PI;
                        }
                    }
                } else {
                    state.speed = Math.max(0, state.speed - 0.001);
                    if (state.speed === 0) {
                        state.autoPhase = 'turnaround';
                    }
                }
                
                playerPlane.position.add(landingDir3.clone().multiplyScalar(state.speed));
                playerPlane.position.y = AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE;
                playerPlane.position.x += (airportLocation.x - playerPlane.position.x) * 0.04;
                break;
            }
            case 'turnaround': {
                state.speed = 0;
                playerPlane.position.y = AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE;
                
                if (state.targetYaw !== null) {
                    const yawError = state.targetYaw - playerPlane.rotation.y;
                    const normalizedYawError = ((yawError + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            
                    playerPlane.rotation.y += normalizedYawError * 0.02;
            
                    if (Math.abs(normalizedYawError) < 0.01) {
                        playerPlane.rotation.y = state.targetYaw;
                        state.lockedYaw = state.targetYaw;
                        state.targetYaw = null;
                        state.autoPhase = 'hold';
                        state.phaseTimer = 0;
                    }
                } else {
                    state.autoPhase = 'hold'; // Fallback
                }
                break;
            }
            case 'hold':
                if (state.lockedYaw != null) playerPlane.rotation.y = state.lockedYaw;
                playerPlane.position.y = AIRPORT_HEIGHT + PLANE_GROUND_CLEARANCE;
                state.speed = 0;
                state.phaseTimer++;
                if (state.phaseTimer > 1 * 60) {
                    state.autoLanding = false;
                    state.autoPhase = 'none';
                    state.isGrounded = true;
                    state.landingDirection = null;
                    showMessage('Ready for takeoff', 1500);
                }
                break;
        }
      }

      const now = Date.now();
      if (now - threeRef.current.lastChunkUpdate > 500) {
        updateChunks(threeRef.current, scene, airportLocation, mainAirport.userData.runwayLen, THREE);
        threeRef.current.lastChunkUpdate = now;
        threeRef.current.needsInstanceUpdate = true;
      }
      
      if(threeRef.current.needsInstanceUpdate) {
        instancedTreeTrunks.instanceMatrix.needsUpdate = true;
        instancedTreeFoliage.instanceMatrix.needsUpdate = true;
        threeRef.current.needsInstanceUpdate = false;
      }

      threeRef.current.chunkObjects.forEach((o: any) => o.waterMeshes.forEach((w: any, i: number) => {
        const tt = Date.now() * 0.001;
        w.position.y = w.userData.baseHeight + Math.sin(tt + i) * 0.02;
        w.rotation.z = Math.sin(tt * 0.5 + i) * 0.02;
      }));

      renderer.render(scene, camera);
      
      const dx = airportLocation.x - playerPlane.position.x;
      const dz = airportLocation.z - playerPlane.position.z;

      let newArrowData: ArrowData[] = [];
      frameCounterRef.current++;

      if (frameCounterRef.current % 2 === 0 && camera.projectionMatrix) {
          const frustum = new THREE.Frustum();
          frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));

          const targets = [{
              id: 'airport',
              position: runwayCenter,
              color: 'orange',
          }];

          for (const target of targets) {
              const onScreen = frustum.containsPoint(target.position);
              if (onScreen) continue;

              const distance = playerPlane.position.distanceTo(target.position);
              const screenPos = target.position.clone().project(camera);
              const posInCamera = target.position.clone().applyMatrix4(camera.matrixWorldInverse);

              if (posInCamera.z > 0) {
                  screenPos.x *= -1;
                  screenPos.y *= -1;
              }

              const rotation = Math.atan2(screenPos.y, screenPos.x);
              let { x: ndcX, y: ndcY } = screenPos;

              const max = Math.max(Math.abs(ndcX), Math.abs(ndcY));
              ndcX /= max;
              ndcY /= max;

              const PADDING_NDC = 0.05;
              ndcX = Math.max(-1 + PADDING_NDC, Math.min(1 - PADDING_NDC, ndcX));
              ndcY = Math.max(-1 + PADDING_NDC, Math.min(1 - PADDING_NDC, ndcY));

              const screenX = (ndcX + 1) / 2 * window.innerWidth;
              const screenY = (-ndcY + 1) / 2 * window.innerHeight;
              
              newArrowData.push({
                  id: target.id, screenX, screenY, rotation, distance, color: target.color, onScreen
              });
          }
      } else {
        newArrowData = threeRef.current.lastState.arrows;
      }
      
      const latestState = {
        hud: {
          speed: Math.round(state.speed * 200),
          altitude: Math.round(Math.max(0, currentAltitude - PLANE_GROUND_CLEARANCE)),
          fuel: state.fuel,
          isGrounded: state.isGrounded,
          nearAirport: state.nearAirport
        },
        compass: {
          rotation: Math.atan2(dx, dz) - playerPlane.rotation.y + Math.PI,
          distance: (Math.hypot(dx, dz) / 10).toFixed(1) + 'km',
        },
        message: threeRef.current.lastState.message,
        autoland: state.autoLanding,
        arrows: newArrowData,
      };
      
      onStateUpdate(latestState);
      threeRef.current.lastState = latestState;

      threeRef.current.animationFrameId = requestAnimationFrame(animate);
    };

    if (mountRef.current.children.length === 1) {
        animate();
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleWheel);
      if (mountRef.current) {
        mountRef.current.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(threeRef.current.animationFrameId);
      if (mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [mountRef, onStateUpdate, requestAutoLand, showMessage, isActive]);

  useEffect(() => {
    const { scene, originalFog } = threeRef.current;
    if (scene) {
      if (isFogEnabled) {
        scene.fog = originalFog;
      } else {
        scene.fog = null;
      }
    }
  }, [isFogEnabled]);

  return { handleInput, requestAutoLand };
};