import { useState } from 'react';
import './App.css';
import GameCanvas from './GameCanvas';
function App() {
  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);
  const [restartCounter, setRestartCounter] = useState(0);

  const handleRestart = () => {
    setRestartCounter(prev => prev + 1);
  };

  return (
    <>
      <p>Last key pressed: {lastPressedKey ?? 'None'}</p>
      <button onClick={handleRestart}>Restart Game</button>
      <section id="canvas-section">
        <GameCanvas setLastPressedKey={setLastPressedKey} restartCounter={restartCounter} handleRestart={handleRestart} />
      </section>
    </>
  )
}

export default App;
