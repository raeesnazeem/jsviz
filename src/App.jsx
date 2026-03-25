import React from 'react';
import VisualizerProvider from './context/VisualizerContext';
import CallStack from './components/CallStack/CallStack';
import Editor from './components/Editor/Editor';
import './styles/global.css';

function App() {
  return (
    <VisualizerProvider>
      <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
        <div style={{ width: '40%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <Editor />
        </div>
        <div style={{ width: '60%', backgroundColor: 'var(--bg-panel)' }}>
          <CallStack />
        </div>
      </div>
    </VisualizerProvider>
  )
}

export default App;
