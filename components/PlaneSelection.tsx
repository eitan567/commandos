import React, { useState } from 'react';
import ThreeDPreview from './ThreeDPreview';

interface PlaneSelectionProps {
  onStartMission: () => void;
  onBack: () => void;
}

const SelectionBox: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg h-full flex flex-col items-center">
    <h3 className="text-xl font-bold text-white border-b border-gray-600 mb-4 pb-2 w-full text-center">{title}</h3>
    <div className="text-gray-400 flex-grow flex items-center justify-center">
      [Coming Soon]
    </div>
  </div>
);

const PlaneSelection: React.FC<PlaneSelectionProps> = ({ onStartMission, onBack }) => {
  const [planeSelected, setPlaneSelected] = useState(true); // Default to true for now

  const startButtonClasses = `
    mt-8 px-12 py-4 text-2xl font-bold rounded-lg
    transition-all duration-300 transform 
    ${planeSelected 
      ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer hover:scale-105' 
      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
    }
  `;

  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8 relative">
       <button 
        onClick={onBack} 
        className="absolute top-8 left-8 px-6 py-2 text-lg text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/80 rounded-lg transition-all"
      >
        &larr; Back
      </button>

      <h1 className="text-5xl font-extrabold mb-8">Choose a Plane</h1>
      <div className="w-full max-w-7xl mx-auto grid grid-cols-3 gap-8 items-center flex-grow">
        {/* Left: Plane Selection */}
        <SelectionBox title="Planes" />
        
        {/* Center: 3D Preview */}
        <div className="w-full h-full rounded-lg overflow-hidden">
          <ThreeDPreview />
        </div>
        
        {/* Right: Armament Selection */}
        <SelectionBox title="Armament" />
      </div>

      <button
        onClick={onStartMission}
        disabled={!planeSelected}
        className={startButtonClasses}
      >
        Start Mission
      </button>
    </div>
  );
};

export default PlaneSelection;