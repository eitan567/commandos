import React from 'react';

interface SettingsScreenProps {
  isFogEnabled: boolean;
  onFogToggle: (enabled: boolean) => void;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ isFogEnabled, onFogToggle, onBack }) => {
    const switchBaseClasses = "w-14 h-8 flex items-center bg-gray-600 rounded-full p-1 cursor-pointer duration-300 ease-in-out";
    const switchToggleClasses = "bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ease-in-out";

    return (
        <div className="w-full h-full bg-gray-900 text-white flex flex-col items-center justify-center p-8 relative">
            <button 
                onClick={onBack} 
                className="absolute top-8 left-8 px-6 py-2 text-lg text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/80 rounded-lg transition-all"
            >
                &larr; Back
            </button>
            <div className="w-full max-w-2xl bg-black/50 p-8 rounded-lg">
                <h1 className="text-5xl font-extrabold mb-8 text-center border-b border-gray-600 pb-4">Settings</h1>
                <div className="flex items-center justify-between mt-8">
                    <label htmlFor="fog-toggle" className="text-2xl">Enable Fog</label>
                    <div
                        className={`${switchBaseClasses} ${isFogEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                        onClick={() => onFogToggle(!isFogEnabled)}
                    >
                        <div className={`${switchToggleClasses} ${isFogEnabled ? 'translate-x-6' : ''}`}></div>
                    </div>
                </div>
                <p className="text-lg text-gray-400 mt-4">
                    Disabling fog may impact performance but allows you to see the entire generated world.
                </p>
            </div>
        </div>
    );
};

export default SettingsScreen;
