import React from 'react';

interface PauseMenuProps {
  onContinue: () => void;
  onExitMission: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ onContinue, onExitMission }) => {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-gray-800/90 text-white p-8 rounded-lg shadow-2xl border border-gray-600 w-full max-w-sm flex flex-col items-center space-y-6">
        <h2 className="text-4xl font-extrabold">Paused</h2>
        <div className="w-full flex flex-col space-y-4">
          <button
            onClick={onContinue}
            className="w-full px-6 py-3 text-xl font-bold bg-green-600 hover:bg-green-500 rounded-lg transition-all transform hover:scale-105"
          >
            Continue
          </button>
          <button
            onClick={onExitMission}
            className="w-full px-6 py-3 text-xl font-bold bg-red-700 hover:bg-red-600 rounded-lg transition-all transform hover:scale-105"
          >
            Exit Mission
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu;
