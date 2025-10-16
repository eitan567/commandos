import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useFlightSimulator } from './hooks/useFlightSimulator';
import { HudData, CompassData, MessageData } from './types';
import Hud from './components/Hud';
import Compass from './components/Compass';
import Message from './components/Message';
import ControlsBar from './components/ControlsBar';
import SettingsPanel from './components/SettingsPanel';
import MainMenu from './components/MainMenu';
import UnitSelection from './components/UnitSelection';
import PlaneSelection from './components/PlaneSelection';
import SettingsScreen from './components/SettingsScreen';
import PauseMenu from './components/PauseMenu';

type GameState = 'main-menu' | 'unit-selection' | 'plane-selection' | 'settings' | 'in-game';
export type PlayerTeam = 'red' | 'green';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hudData, setHudData] = useState<HudData>({ speed: 0, altitude: 0, fuel: 100, isGrounded: true, nearAirport: true });
  const [compassData, setCompassData] = useState<CompassData>({ rotation: 0, distance: '0.0km' });
  const [message, setMessage] = useState<MessageData>({ text: '', visible: false });
  const [isAutolandActive, setAutolandActive] = useState(false);
  const [isFogEnabled, setIsFogEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const [gameState, setGameState] = useState<GameState>('main-menu');
  const [playerTeam, setPlayerTeam] = useState<PlayerTeam | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'in-game') {
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState]);

  const onStateUpdate = useCallback((data: { hud: HudData, compass: CompassData, message: MessageData, autoland: boolean }) => {
    setHudData(data.hud);
    setCompassData(data.compass);
    setMessage(data.message);
    setAutolandActive(data.autoland);
  }, []);

  const { handleInput, requestAutoLand } = useFlightSimulator(mountRef, onStateUpdate, isFogEnabled, gameState === 'in-game' && !isPaused);

  const handleStartSolo = () => setGameState('unit-selection');
  const handleSettings = () => setGameState('settings');
  const handleUnitSelect = (team: PlayerTeam) => {
    setPlayerTeam(team);
    setGameState('plane-selection');
  };
  const handleStartMission = () => {
    setIsPaused(false);
    setGameState('in-game');
  };
  
  const handleGoBack = () => {
    if (gameState === 'in-game') {
      setIsPaused(false);
      setGameState('plane-selection');
    }
    if (gameState === 'plane-selection') setGameState('unit-selection');
    if (gameState === 'unit-selection') setGameState('main-menu');
    if (gameState === 'settings') setGameState('main-menu');
  };
  
  const handleContinue = () => {
    setIsPaused(false);
  };

  const renderGameState = () => {
    switch (gameState) {
      case 'main-menu':
        return <MainMenu onStartSolo={handleStartSolo} onSettings={handleSettings} />;
      case 'settings':
        return <SettingsScreen isFogEnabled={isFogEnabled} onFogToggle={setIsFogEnabled} onBack={handleGoBack} />;
      case 'unit-selection':
        return <UnitSelection onUnitSelect={handleUnitSelect} onBack={handleGoBack} />;
      case 'plane-selection':
        return <PlaneSelection onStartMission={handleStartMission} onBack={handleGoBack} />;
      case 'in-game':
        return (
          <>
            <div ref={mountRef} className="absolute inset-0 w-full h-full" />
            
            <Hud {...hudData} />
            <Compass {...compassData} />
            <Message text={message.text} visible={message.visible} />
            
            {/* The empty settings panel is now hidden but remains in the code */}
            {false && <SettingsPanel 
              isOpen={false}
              isFogEnabled={isFogEnabled}
              onFogToggle={setIsFogEnabled}
              onToggle={() => {}}
            />}

            {isPaused && <PauseMenu onContinue={handleContinue} onExitMission={handleGoBack} />}

            <ControlsBar 
              onInputUpdate={handleInput} 
              onAutoLandClick={requestAutoLand}
              isAutolandActive={isAutolandActive} 
            />
          </>
        );
      default:
        return <MainMenu onStartSolo={handleStartSolo} onSettings={handleSettings} />;
    }
  };

  return (
    <div className="w-screen h-screen relative bg-black select-none">
      {renderGameState()}
    </div>
  );
};

export default App;
