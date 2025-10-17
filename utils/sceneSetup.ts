import type { ChunkObjects, Vector2D } from '../types';
import { getTerrainHeight, isWater, fbm, seededRandom, isOverRunwayXZ, AIRPORT_HEIGHT } from './terrain';

const CHUNK_SIZE = 20, SEGMENTS = 20, RENDER_DISTANCE = 15;
const AIRPORT_FLATTEN_RADIUS = 25;
const MAX_TREES = 15000;

export function createScene() {
  const THREE = (window as any).THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 150, 250);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(5, 8, 5);
  dir.castShadow = true;
  dir.shadow.mapSize.width = 2048;
  dir.shadow.mapSize.height = 2048;
  dir.shadow.camera.left = -80;
  dir.shadow.camera.right = 80;
  dir.shadow.camera.top = 80;
  dir.shadow.camera.bottom = -80;
  dir.shadow.camera.near = 0.5;
  dir.shadow.camera.far = 500;
  scene.add(dir);
  
  const sun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
  sun.position.set(5, 8, 5);
  scene.add(sun);
  
  const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 32, 32), new THREE.MeshBasicMaterial({ color: 0xe0e0e0 }));
  scene.add(moon);

  // Instanced rendering for trees
  const trunkGeo = new THREE.CylinderGeometry(.15, .15, 1, 6);
  const foliageGeo = new THREE.ConeGeometry(.8, 1.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x795548, flatShading: true });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, flatShading: true });

  const instancedTreeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, MAX_TREES);
  const instancedTreeFoliage = new THREE.InstancedMesh(foliageGeo, foliageMat, MAX_TREES);
  instancedTreeTrunks.castShadow = true;
  instancedTreeFoliage.castShadow = true;
  scene.add(instancedTreeTrunks, instancedTreeFoliage);
  
  const freeTreeIndices = Array.from({ length: MAX_TREES }, (_, i) => i).reverse();

  return { scene, camera, renderer, sun, dir, ambient, moon, instancedTreeTrunks, instancedTreeFoliage, freeTreeIndices };
}

function createHouse(x: number, z: number, airportLocation: Vector2D, THREE: any) {
  const h = new THREE.Group();
  const y = getTerrainHeight(x, z, airportLocation);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), new THREE.MeshStandardMaterial({ color: 0x8d6e63, flatShading: true }));
  base.position.set(x, y + .5, z);
  base.castShadow = true;
  h.add(base);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2, .8, 4), new THREE.MeshStandardMaterial({ color: 0xd32f2f, flatShading: true }));
  roof.position.set(x, y + 1.3, z);
  roof.castShadow = true;
  h.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(.4, .6, .05), new THREE.MeshStandardMaterial({ color: 0x5d4037 }));
  door.position.set(x, y + .3, z + .76);
  door.castShadow = true;
  h.add(door);
  return h;
}

function createChunk(cx: number, cz: number, threeState: any, scene: any, airportLocation: Vector2D, runwayLen: number, THREE: any) {
    const { chunks, chunkObjects, instancedTreeTrunks, instancedTreeFoliage, freeTreeIndices } = threeState;
    const key = `${cx},${cz}`;
    if (chunks.has(key)) return;

    const geometry = new THREE.BufferGeometry();
    const vertices = [], indices = [], colors = [];
    const step = CHUNK_SIZE / SEGMENTS;

    for (let z = 0; z <= SEGMENTS; z++) {
        for (let x = 0; x <= SEGMENTS; x++) {
            const wx = cx * CHUNK_SIZE + x * step, wz = cz * CHUNK_SIZE + z * step;
            const h = getTerrainHeight(wx, wz, airportLocation);
            vertices.push(wx, h, wz);
            
            const col = new THREE.Color();
            const onRunway = isOverRunwayXZ(wx, wz, airportLocation, runwayLen);

            const isMarking = (() => {
                if (!onRunway) return false;
                const localZ = wz - airportLocation.z;
                const halfMarkingWidth = 0.25;
                const halfMarkingLength = 1.0;
                
                if (Math.abs(wx - airportLocation.x) > halfMarkingWidth) return false;

                const startZ = -Math.floor((runwayLen / 2) - 3);
                const endZ = Math.floor((runwayLen / 2) - 3);
                for (let i = startZ; i <= endZ; i += 4) {
                    if (localZ >= i - halfMarkingLength && localZ <= i + halfMarkingLength) {
                        return true;
                    }
                }
                return false;
            })();

            if (isMarking) {
                col.setHex(0xe0e0e0);
            } else if (onRunway) {
                col.setHex(0x424242);
            } else if (isWater(wx, wz, airportLocation)) {
                col.setHex(0x4fc3f7);
            } else if (h < 1) {
                col.setHex(0x9e9d24);
            } else if (h < 2) {
                col.setHex(0x7cb342);
            } else if (h < 3.5) {
                col.setHex(0x8bc34a);
            } else if (h < 5) {
                col.setHex(0x9ccc65);
            } else {
                col.setHex(0xaed581);
            }
            colors.push(col.r, col.g, col.b);
        }
    }
    for (let z = 0; z < SEGMENTS; z++) {
        for (let x = 0; x < SEGMENTS; x++) {
            const a = x + z * (SEGMENTS + 1), b = x + 1 + z * (SEGMENTS + 1), c = x + (z + 1) * (SEGMENTS + 1), d = x + 1 + (z + 1) * (SEGMENTS + 1);
            indices.push(a, c, b, b, c, d);
        }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
    chunks.set(key, mesh);

    const waterMeshes: any[] = [];
    const treeIndices: number[] = [];
    let house = null;

    for (let i = 0; i < 3; i++) {
        const wx = cx * CHUNK_SIZE + seededRandom(cx, cz, i) * CHUNK_SIZE;
        const wz = cz * CHUNK_SIZE + seededRandom(cx, cz, i + 100) * CHUNK_SIZE;
        if (isWater(wx, wz, airportLocation)) {
            const wg = new THREE.CircleGeometry(2.5, 8);
            const wm = new THREE.MeshStandardMaterial({ color: 0x2196f3, transparent: true, opacity: .6, metalness: .8, roughness: .2 });
            const w = new THREE.Mesh(wg, wm);
            w.rotation.x = -Math.PI / 2;
            const h = getTerrainHeight(wx, wz, airportLocation);
            w.position.set(wx, h + .1, wz);
            w.userData.baseHeight = h + .1;
            scene.add(w);
            waterMeshes.push(w);
        }
    }
    
    const treeCount = Math.floor(seededRandom(cx, cz, 200) * 6) + 3;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < treeCount; i++) {
        const tx = cx * CHUNK_SIZE + seededRandom(cx, cz, i + 300) * CHUNK_SIZE;
        const tz = cz * CHUNK_SIZE + seededRandom(cx, cz, i + 400) * CHUNK_SIZE;
        const onRunway = isOverRunwayXZ(tx, tz, airportLocation, runwayLen);

        if (!isWater(tx, tz, airportLocation) && getTerrainHeight(tx, tz, airportLocation) > 1 && !onRunway) {
            const index = freeTreeIndices.pop();
            if (index === undefined) continue;

            treeIndices.push(index);
            const h = getTerrainHeight(tx, tz, airportLocation);
            
            dummy.position.set(tx, h + 0.5, tz);
            dummy.updateMatrix();
            instancedTreeTrunks.setMatrixAt(index, dummy.matrix);

            dummy.position.set(tx, h + 1.5, tz);
            dummy.updateMatrix();
            instancedTreeFoliage.setMatrixAt(index, dummy.matrix);
        }
    }

    if (seededRandom(cx, cz, 500) > .75) {
        const hx = cx * CHUNK_SIZE + CHUNK_SIZE / 2, hz = cz * CHUNK_SIZE + CHUNK_SIZE / 2;
        if (!isWater(hx, hz, airportLocation) && getTerrainHeight(hx, hz, airportLocation) > 1) {
            house = createHouse(hx, hz, airportLocation, THREE);
            scene.add(house);
        }
    }
    
    chunkObjects.set(key, { waterMeshes, treeIndices, house });
}

// FIX: Added THREE as a parameter to provide access to THREE.Object3D.
function removeChunk(cx: number, cz: number, threeState: any, scene: any, THREE: any) {
    const { chunks, chunkObjects, instancedTreeTrunks, instancedTreeFoliage, freeTreeIndices } = threeState;
    const key = `${cx},${cz}`;
    const mesh = chunks.get(key);
    if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if(mesh.material.dispose) mesh.material.dispose();
        chunks.delete(key);
    }
    const objects = chunkObjects.get(key);
    if (objects) {
        objects.waterMeshes.forEach((w: any) => { scene.remove(w); w.geometry.dispose(); w.material.dispose(); });
        
        const dummy = new THREE.Object3D();
        dummy.scale.set(0,0,0);
        dummy.updateMatrix();
        objects.treeIndices.forEach(index => {
            freeTreeIndices.push(index);
            instancedTreeTrunks.setMatrixAt(index, dummy.matrix);
            instancedTreeFoliage.setMatrixAt(index, dummy.matrix);
        });

        if (objects.house) { scene.remove(objects.house); objects.house.traverse((c: any) => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); }
        chunkObjects.delete(key);
    }
}

export function updateChunks(threeState: any, scene: any, airportLocation: Vector2D, runwayLen: number, THREE: any) {
  const { camera, chunks } = threeState;
  const pos = new THREE.Vector3();
  camera.getWorldPosition(pos);
  const chunkX = Math.floor(pos.x / CHUNK_SIZE);
  const chunkZ = Math.floor(pos.z / CHUNK_SIZE);
  const needed = new Set<string>();

  for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
    for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
      const cx = chunkX + x, cz = chunkZ + z;
      needed.add(`${cx},${cz}`);
      createChunk(cx, cz, threeState, scene, airportLocation, runwayLen, THREE);
    }
  }

  for (const key of chunks.keys()) {
    if (!needed.has(key)) {
      const [cx, cz] = key.split(',').map(Number);
      // FIX: Passed THREE to removeChunk.
      removeChunk(cx, cz, threeState, scene, THREE);
    }
  }
}

export function createPlane(THREE: any) {
 const p = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.3, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xe53935, flatShading: true })
  );
  body.castShadow = true;
  p.add(body);

  // פירמידה שמתאימה לגוף המטוס
  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 0.2135, 0.65, 4), // radiusTop=0, radiusBottom=0.15 (=0.3/2), height=0.6
    new THREE.MeshStandardMaterial({ color: 0xe53935, flatShading: true })
  );

  nose.rotation.x = Math.PI * 1.5; // נשאר כמו בקוד שלך
  nose.position.z = -0.92; // מצמיד לחרטום הגוף
  nose.rotation.y = Math.PI / 4; // מיישר את הפאות לריבוע הגוף
  nose.castShadow = true;
  p.add(nose);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.5, .05, .5), new THREE.MeshStandardMaterial({ color: 0xffeb3b, flatShading: true }));
  wing.position.z = 0.1;
  wing.castShadow = true;
  p.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.8, .05, .3), new THREE.MeshStandardMaterial({ color: 0xffeb3b, flatShading: true }));
  tail.position.set(0, 0, 0.65);
  tail.castShadow = true;
  p.add(tail);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(.05, .4, .3), new THREE.MeshStandardMaterial({ color: 0xffeb3b, flatShading: true }));
  stab.position.set(0, .2, 0.65);
  stab.castShadow = true;
  p.add(stab);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, .05), new THREE.MeshStandardMaterial({ color: 0x424242, flatShading: true }));
  prop.position.z = -1.25;
  prop.castShadow = true;
  p.add(prop);
  p.userData.prop = prop;

  const strutMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, flatShading: true });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, flatShading: true });
  const wheel = (r = .11, w = .055) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 10), wheelMat);
      m.rotation.z = Math.PI / 2; m.castShadow = true; return m;
  };
  const strut = (len = .28, t = .04) => { const m = new THREE.Mesh(new THREE.BoxGeometry(t, len, t), strutMat); m.castShadow = true; return m; };
  const noseStrut = strut(.32, .04); noseStrut.position.set(0, -.05, -.52); noseStrut.rotation.x = Math.PI * .16; p.add(noseStrut);
  const noseWheel = wheel(.08, .045); noseWheel.position.set(0, -.23, -.60); p.add(noseWheel);
  const ml = wheel(); ml.position.set(-.35, -.20, .42); p.add(ml);
  const mr = wheel(); mr.position.set(.35, -.20, .42); p.add(mr);

  p.position.set(0, 8, 0);
  return p;
}

export function createAirport(x: number, z: number, THREE: any) {
  const airport = new THREE.Group();
  const h = AIRPORT_HEIGHT;
  const runwayLen = 30 * 1.5;

  airport.userData.runwayLen = runwayLen;
  
  // Control Tower
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2), new THREE.MeshStandardMaterial({ color: 0xbdbdbd, flatShading: true }));
  base.position.set(x - 6, h + 1.5, z - (runwayLen / 2 - 3));
  base.castShadow = true;
  airport.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2.5), new THREE.MeshStandardMaterial({ color: 0x2196f3, flatShading: true, transparent: true, opacity: .7 }));
  top.position.set(x - 6, h + 3.0 + 0.5, z - (runwayLen / 2 - 3));
  top.castShadow = true;
  airport.add(top);

  // Runway Flags
  const createFlag = (colorHex: number, THREE: any) => {
    const flag = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading: true });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), poleMat);
    pole.position.y = 1;
    flag.add(pole);
    
    const flagMat = new THREE.MeshStandardMaterial({ color: colorHex, flatShading: true, side: THREE.DoubleSide });
    const flagCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), flagMat);
    flagCloth.position.set(0.4, 1.7, 0);
    flag.add(flagCloth);
    
    return flag;
  };

  const runwayWidthOffset = 3;
  const runwayHalfLen = runwayLen / 2;

  // Green flags at start
  const greenFlag1 = createFlag(0x4caf50, THREE);
  greenFlag1.position.set(x - runwayWidthOffset, h, z - runwayHalfLen);
  airport.add(greenFlag1);

  const greenFlag2 = createFlag(0x4caf50, THREE);
  greenFlag2.position.set(x + runwayWidthOffset, h, z - runwayHalfLen);
  airport.add(greenFlag2);

  // Red flags at end
  const redFlag1 = createFlag(0xf44336, THREE);
  redFlag1.position.set(x - runwayWidthOffset, h, z + runwayHalfLen);
  airport.add(redFlag1);

  const redFlag2 = createFlag(0xf44336, THREE);
  redFlag2.position.set(x + runwayWidthOffset, h, z + runwayHalfLen);
  airport.add(redFlag2);
  
  airport.userData.position = { x, z };
  airport.userData.height = h;
  return airport;
}

export function findAirportLocation(): Vector2D {
  let bestX = 0, bestZ = 0, best = -Infinity;
  for (let ox = -40; ox <= 40; ox += 15) {
      for (let oz = -40; oz <= 40; oz += 15) {
          const tx = ox, tz = oz;
          let score = 0, suitable = true;
          for (let dx = -30; dx <= 30; dx += 5) {
              for (let dz = -30; dz <= 30; dz += 5) {
                  const dist = Math.hypot(dx, dz);
                  if (dist > AIRPORT_FLATTEN_RADIUS + 10) continue;
                  const h = fbm((tx + dx) * .05, (tz + dz) * .05, 4) * 8 - 2;
                  if (h < .8) {
                      suitable = false;
                      break;
                  }
                  score += h;
              }
              if (!suitable) break;
          }
          if (!suitable) continue;
          if (score > best) {
              best = score;
              bestX = tx;
              bestZ = tz;
          }
      }
  }
  return { x: bestX, z: bestZ };
}