import React from 'react';
import type { ArrowData } from '../types';

const Arrow: React.FC<{ arrow: ArrowData }> = ({ arrow }) => {
  // We only show arrows for off-screen targets as requested.
  if (arrow.onScreen) {
    return null;
  }
  
  const distanceKm = (arrow.distance / 10).toFixed(1);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${arrow.screenX}px`,
    top: `${arrow.screenY}px`,
    transform: `translate(-50%, -50%) rotate(${arrow.rotation}rad)`,
    color: arrow.color,
    textShadow: '0 0 5px black',
    transition: 'left 0.05s linear, top 0.05s linear',
    willChange: 'transform, left, top',
  };

  return (
    <div style={style} className="z-[60] flex flex-col items-center pointer-events-none">
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)', filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.7))' }}>
        <path d="M12 2L2 22h20L12 2z" fill={arrow.color} stroke="red" strokeWidth="1.5" />
      </svg>
      <span className="text-white font-mono text-xs mt-0.5">{distanceKm}km</span>
    </div>
  );
};

const DirectionalArrows: React.FC<{ arrows: ArrowData[] }> = ({ arrows = [] }) => {
  return (
    <>
      {arrows.map(arrow => <Arrow key={arrow.id} arrow={arrow} />)}
    </>
  );
};

export default DirectionalArrows;