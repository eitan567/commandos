import React, { useRef, useState, useCallback } from 'react';
import type { InputState } from '../types';

interface ControlsBarProps {
  onInputUpdate: (input: InputState) => void;
  onAutoLandClick: () => void;
  isAutolandActive: boolean;
}

const Joystick: React.FC<{ onMove: (delta: { x: number, y: number }) => void }> = ({ onMove }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const handleStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch && handleRef.current) {
      activeTouchId.current = touch.identifier;
      const rect = e.currentTarget.getBoundingClientRect();
      center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  };

  const handleMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activeTouchId.current === null || !handleRef.current) return;
    
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId.current) {
        const dx = touch.clientX - center.current.x;
        const dy = touch.clientY - center.current.y;
        const max = 35;
        const dist = Math.hypot(dx, dy);
        let x = dx, y = dy;
        if (dist > max) {
          x = (dx / dist) * max;
          y = (dy / dist) * max;
        }
        handleRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        onMove({ x: x / max, y: y / max });
        break; // Found the active touch, no need to continue
      }
    }
  };
  
  const handleEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (activeTouchId.current === null) return;

    let touchReleased = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId.current) {
            touchReleased = true;
            break;
        }
    }
    
    if(touchReleased && handleRef.current){
        activeTouchId.current = null;
        handleRef.current.style.transform = 'translate(-50%, -50%)';
        onMove({ x: 0, y: 0 });
    }
  };

  return (
    <div 
      className="w-32 h-32 bg-white/30 border-2 border-white/50 rounded-full relative touch-none"
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
    >
      <div 
        ref={handleRef}
        className="w-12 h-12 bg-white/70 border border-white/90 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      ></div>
    </div>
  );
};

const ControlsBar: React.FC<ControlsBarProps> = ({ onInputUpdate, onAutoLandClick, isAutolandActive }) => {
  const [thrUp, setThrUp] = useState(false);
  const [thrDn, setThrDn] = useState(false);
  const joyDelta = useRef({ x: 0, y: 0 });

  const handleJoystickMove = useCallback((delta: { x: number, y: number }) => {
    joyDelta.current = delta;
    onInputUpdate({ x: joyDelta.current.x, y: joyDelta.current.y, throttle: (thrUp ? 1 : 0) - (thrDn ? 1 : 0) });
  }, [onInputUpdate, thrUp, thrDn]);

  const handleThrottleChange = useCallback((up: boolean, down: boolean) => {
    setThrUp(up);
    setThrDn(down);
    onInputUpdate({ x: joyDelta.current.x, y: joyDelta.current.y, throttle: (up ? 1 : 0) - (down ? 1 : 0) });
  }, [onInputUpdate]);

  const autoLandBtnClass = `w-16 h-16 leading-[64px] text-center font-sans font-extrabold text-2xl text-white rounded-full shadow-lg cursor-pointer backdrop-blur-sm transition-all duration-200 active:translate-y-px active:scale-95 ${
    isAutolandActive 
      ? 'bg-green-700/65 border-green-400/95 shadow-[0_0_12px_rgba(76,175,80,.9)]' 
      : 'bg-white/25 border-2 border-white/60'
  }`;

  return (
    <div className="md:hidden fixed left-1/2 bottom-5 -translate-x-1/2 flex items-center gap-4 z-50">
      <Joystick onMove={handleJoystickMove} />
      <div className={autoLandBtnClass} onClick={onAutoLandClick}>AL</div>
      <div className="flex flex-col gap-2.5">
        <div 
          className="w-12 h-12 bg-white/30 border border-white/50 rounded-lg text-white text-2xl font-bold flex items-center justify-center touch-none active:bg-white/50"
          onTouchStart={(e) => { e.preventDefault(); handleThrottleChange(true, false); }}
          onTouchEnd={(e) => { e.preventDefault(); handleThrottleChange(false, false); }}
        >▲</div>
        <div 
          className="w-12 h-12 bg-white/30 border border-white/50 rounded-lg text-white text-2xl font-bold flex items-center justify-center touch-none active:bg-white/50"
          onTouchStart={(e) => { e.preventDefault(); handleThrottleChange(false, true); }}
          onTouchEnd={(e) => { e.preventDefault(); handleThrottleChange(false, false); }}
        >▼</div>
      </div>
    </div>
  );
};

export default ControlsBar;