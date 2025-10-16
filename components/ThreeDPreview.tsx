import React, { useRef, useEffect } from 'react';
import { createPlane } from '../utils/sceneSetup';

const ThreeDPreview: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  // FIX: Initialize useRef with null. `useRef` with a type argument requires an initial value.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const THREE = (window as any).THREE;
    if (!mountRef.current || !THREE) return;

    const currentMount = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
    camera.position.set(2.5, 1.5, 3);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const plane = createPlane(THREE);
    plane.position.set(0, 0, 0);
    plane.scale.set(1.2, 1.2, 1.2);
    scene.add(plane);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    camera.lookAt(plane.position);

    const animate = () => {
      plane.rotation.y += 0.005;
      if (plane.userData.prop) {
        plane.userData.prop.rotation.z += 0.5;
      }
      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();
    
    const handleResize = () => {
        camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    }
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(currentMount);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
};

export default ThreeDPreview;