import React from 'react';
import type { HudData } from '../types';

const Hud: React.FC<HudData> = ({ speed, altitude, fuel, isGrounded, nearAirport }) => {
  const fuelBarClass = `h-full transition-all duration-300 ${
    fuel < 20 ? 'bg-gradient-to-r from-red-600 to-red-500' :
    fuel < 40 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
    'bg-gradient-to-r from-green-600 to-green-400'
  }`;

  const getAirportStatus = () => {
    if (isGrounded && nearAirport) {
      if (fuel < 100) {
        return <div className="text-green-400 font-bold text-xs mt-1">Refueling...</div>;
      }
      return <div className="text-green-400 font-bold text-xs mt-1">Airport: Fueled</div>;
    }
    if (nearAirport) {
      return <div className="text-orange-400 font-bold text-xs mt-1">Near Airport</div>;
    }
    return null;
  };

  return (
    <div className="fixed top-2.5 left-2.5 text-white font-mono text-sm bg-black/60 p-2 rounded-lg z-50 max-w-[150px]">
      <div className="whitespace-nowrap">SPD: <span>{speed}</span></div>
      <div className="whitespace-nowrap">ALT: <span>{altitude}</span>m</div>
      <div className="whitespace-nowrap">FUEL: <span>{Math.round(fuel)}</span>%</div>
      <div className="w-[120px] h-3 bg-white/20 border border-white rounded-sm overflow-hidden mt-1">
        <div className={fuelBarClass} style={{ width: `${fuel}%` }}></div>
      </div>
      {getAirportStatus()}
    </div>
  );
};

export default Hud;