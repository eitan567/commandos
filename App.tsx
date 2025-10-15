
import React, { useRef, useState, useCallback } from 'react';
import { useFlightSimulator } from './hooks/useFlightSimulator';
import { HudData, CompassData, MessageData, InputState } from './types';
import Hud from './components/Hud';
import Compass from './components/Compass';
import Message from './components/Message';
import ControlsBar from './components/ControlsBar';

const App: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hudData, setHudData] = useState<HudData>({ speed: 0, altitude: 0, fuel: 100, isGrounded: true, nearAirport: true });
  const [compassData, setCompassData] = useState<CompassData>({ rotation: 0, distance: '0.0km' });
  const [message, setMessage] = useState<MessageData>({ text: '', visible: false });
  const [isAutolandActive, setAutolandActive] = useState(false);

  const onStateUpdate = useCallback((data: { hud: HudData, compass: CompassData, message: MessageData, autoland: boolean }) => {
    setHudData(data.hud);
    setCompassData(data.compass);
    setMessage(data.message);
    setAutolandActive(data.autoland);
  }, []);

  const { handleInput, requestAutoLand } = useFlightSimulator(mountRef, onStateUpdate);

  return (
    <div className="w-screen h-screen relative bg-black select-none">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      <Hud {...hudData} />
      <Compass {...compassData} />
      <Message text={message.text} visible={message.visible} />
      <ControlsBar 
        onInputUpdate={handleInput} 
        onAutoLandClick={requestAutoLand}
        isAutolandActive={isAutolandActive} 
      />
    </div>
  );
};

export default App;
