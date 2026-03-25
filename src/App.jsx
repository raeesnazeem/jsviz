import React from 'react';
import VisualizerProvider from './context/VisualizerContext';
import { ArrowProvider } from './context/ArrowContext';
import { usePlayback } from './hooks/usePlayback';
import CallStack from './components/CallStack/CallStack';
import WebApis from './components/WebApis/WebApis';
import CallbackQueue from './components/CallbackQueue/CallbackQueue';
import EventLoop from './components/EventLoop/EventLoop';
import Editor from './components/Editor/Editor';
import Console from './components/Console/Console';
import Arrows from './components/Arrows/Arrows';
import StepSlider from './components/StepSlider/StepSlider';
import ExplanationPanel from './components/ExplanationPanel/ExplanationPanel';
import './styles/global.css';

// We create an inner component to use hooks that depend on contexts
function AppContent() {
  usePlayback(); // initialize playback timer

  return (
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', marginBottom: 'var(--slider-h)' }}>
        {/* Left Column */}
        <div style={{ 
          width: 'var(--editor-w)', 
          height: '100%', 
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor />
          </div>
          <Console />
        </div>
        
        {/* Right Column */}
        <div style={{ 
          width: 'var(--viz-w)', 
          height: '100%', 
          display: 'grid',
          gridTemplateRows: '1fr auto auto',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateAreas: `
            "callstack webapis"
            "eventloop eventloop"
            "queue queue"
          `
        }}>
          <div style={{ gridArea: 'callstack', overflow: 'hidden' }}>
            <CallStack />
          </div>
          <div style={{ gridArea: 'webapis', overflow: 'hidden', borderLeft: '1px solid var(--border)' }}>
            <WebApis />
          </div>
          <div style={{ gridArea: 'eventloop', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            <EventLoop />
          </div>
          <div style={{ gridArea: 'queue', borderTop: '1px solid var(--border)' }}>
            <CallbackQueue />
          </div>
        </div>
      </div>
      <ExplanationPanel />
      <StepSlider />
    </div>
  );
}

function App() {
  return (
    <VisualizerProvider>
      <ArrowProvider>
        <AppContent />
        <Arrows />
      </ArrowProvider>
    </VisualizerProvider>
  )
}

export default App;
