import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  isFogEnabled: boolean;
  onFogToggle: (enabled: boolean) => void;
  onToggle: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, isFogEnabled, onFogToggle, onToggle }) => {
  const handleHeight = '2rem'; // Corresponds to h-8 in Tailwind

  // This container is a full-width flex parent to reliably handle centering.
  const panelContainerClasses = `
    fixed top-0 left-0 right-0
    z-[100]
    flex justify-center
    pointer-events-none
  `;

  // This is the actual sliding panel with the fixed width.
  const panelWrapperClasses = `
    w-[32rem] max-w-full
    flex flex-col items-center
    transition-transform duration-300 ease-in-out
    pointer-events-auto
  `;
  
  const panelStyle = {
    transform: isOpen ? 'translateY(0)' : `translateY(calc(-100% + ${handleHeight}))`
  };

  const switchBaseClasses = "w-14 h-8 flex items-center bg-gray-600 rounded-full p-1 cursor-pointer duration-300 ease-in-out";
  const switchToggleClasses = "bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out";

  return (
    <div 
      className={panelContainerClasses}
    >
      <div
        className={panelWrapperClasses}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full bg-black/80 backdrop-blur-sm text-white font-mono p-4 rounded-b-lg rounded-t-none">
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center border-b border-gray-500 pb-2">Settings</h2>
            <div className="flex items-center justify-between">
              <label htmlFor="fog-toggle" className="text-lg">Enable Fog</label>
              <div
                className={`${switchBaseClasses} ${isFogEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                onClick={() => onFogToggle(!isFogEnabled)}
              >
                <div className={`${switchToggleClasses} ${isFogEnabled ? 'translate-x-6' : ''}`}></div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Disabling fog may impact performance but allows you to see the entire generated world.
            </p>
          </div>
        </div>
        <div 
          className="w-96 max-w-full h-8 bg-black/80 hover:bg-black/90 text-white font-mono rounded-b-lg flex items-center justify-center cursor-pointer transition-colors"
          onClick={onToggle}
        >
          Settings
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
