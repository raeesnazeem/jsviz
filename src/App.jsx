import React from 'react';
import VisualizerProvider from './context/VisualizerContext';
import CallStack from './components/CallStack/CallStack';
import Editor from './components/Editor/Editor';
import './styles/global.css';

function App() {
  return (
    <VisualizerProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
        {/* Header Bar */}
        <div style={{
          height: 'var(--header-h)',
          backgroundColor: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          <div style={{ color: 'var(--orange)', fontFamily: 'Outfit, sans-serif', fontWeight: 'bold', fontSize: '20px' }}>
            JSViz
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            JavaScript Execution Visualizer
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Column */}
          <div style={{ width: 'var(--editor-w)', height: '100%', borderRight: '1px solid var(--border)' }}>
            <Editor />
          </div>
          
          {/* Right Column */}
          <div style={{ width: 'var(--viz-w)', height: '100%', backgroundColor: 'var(--bg-panel)' }}>
            <CallStack />
          </div>
        </div>
      </div>
    </VisualizerProvider>
  )
}

export default App;
