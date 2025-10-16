import React from 'react';
import type { PlayerTeam } from '../App';

interface UnitSelectionProps {
  onUnitSelect: (team: PlayerTeam) => void;
  onBack: () => void;
}

const TeamButton: React.FC<{ color: string, team: PlayerTeam, label: string, onClick: (team: PlayerTeam) => void }> = ({ color, team, label, onClick }) => {
  const bgClass = color === 'red' ? 'bg-red-800/70 hover:bg-red-700/90' : 'bg-green-800/70 hover:bg-green-700/90';
  const borderClass = color === 'red' ? 'border-red-500' : 'border-green-500';

  return (
    <div 
      className={`w-64 h-80 ${bgClass} border-4 ${borderClass} rounded-lg flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl`}
      onClick={() => onClick(team)}
    >
      <div className="text-4xl font-extrabold">{label}</div>
    </div>
  );
};


const UnitSelection: React.FC<UnitSelectionProps> = ({ onUnitSelect, onBack }) => {
  return (
    <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8 relative">
      <button 
        onClick={onBack} 
        className="absolute top-8 left-8 px-6 py-2 text-lg text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/80 rounded-lg transition-all"
      >
        &larr; Back
      </button>

      <h1 className="text-5xl font-extrabold mb-12">Choose a Unit</h1>
      <div className="flex space-x-12">
        <TeamButton color="red" team="red" label="Red Force" onClick={onUnitSelect} />
        <TeamButton color="green" team="green" label="Green Force" onClick={onUnitSelect} />
      </div>
      <p className="mt-12 text-gray-400">The unit you choose will fight against the opposing AI force.</p>
    </div>
  );
};

export default UnitSelection;