
import React from 'react';
import type { CompassData } from '../types';

const Compass: React.FC<CompassData> = ({ rotation, distance }) => {
  return (
    <div className="fixed top-2.5 right-2.5 w-20 h-20 bg-black/60 border-2 border-white/50 rounded-full z-50 flex items-center justify-center">
      <div className="absolute text-white font-bold text-xs top-1">N</div>
      <div className="w-3 h-3 bg-white rounded-full absolute"></div>
      <div 
        className="w-0 h-0 border-l-8 border-r-8 border-b-[30px] border-l-transparent border-r-transparent border-b-green-500 absolute top-1/2 left-1/2 -ml-2 -mt-[21px] origin-[50%_70%] transition-transform duration-200"
        style={{ transform: `rotate(${rotation}rad)`, filter: 'drop-shadow(0 0 3px rgba(76,175,80,.8))' }}
      ></div>
      <div className="absolute bottom-2 text-green-400 font-bold font-mono text-xs">{distance}</div>
    </div>
  );
};

export default Compass;
