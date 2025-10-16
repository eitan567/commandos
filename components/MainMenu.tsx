import React from 'react';
import ThreeDPreview from './ThreeDPreview';

interface MainMenuProps {
  onStartSolo: () => void;
  onSettings: () => void;
}

const MenuItem: React.FC<{ onClick?: () => void, children: React.ReactNode, disabled?: boolean }> = ({ onClick, children, disabled }) => {
  const classes = `
    text-2xl font-bold text-gray-300 hover:text-white 
    transition-all duration-200 cursor-pointer 
    transform hover:scale-105
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
  `;
  return <div className={classes} onClick={!disabled ? onClick : undefined}>{children}</div>;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartSolo, onSettings }) => {
  return (
    <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
        {/* Left Side: Menu */}
        <div className="flex flex-col items-center md:items-start space-y-6">
          <h1 className="text-7xl font-extrabold tracking-widest text-white drop-shadow-lg" style={{ fontFamily: 'monospace' }}>
            WarriorX
          </h1>
          <div className="pl-2 space-y-4">
            <MenuItem onClick={onStartSolo}>Solo</MenuItem>
            <MenuItem disabled>Multiplayer</MenuItem>
            <MenuItem onClick={onSettings}>Settings</MenuItem>
            <MenuItem disabled>Exit</MenuItem>
          </div>
        </div>
        
        {/* Right Side: 3D Preview */}
        <div className="w-full h-96 rounded-lg overflow-hidden">
          <ThreeDPreview />
        </div>
      </div>
    </div>
  );
};

export default MainMenu;