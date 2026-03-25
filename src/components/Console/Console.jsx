import React, { useEffect, useRef } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';

export default function Console() {
  const { currentStep } = useVisualizer();
  const { registerPanel } = useArrows();
  const containerRef = useRef(null);

  useEffect(() => {
    registerPanel('console', containerRef);
    return () => registerPanel('console', null);
  }, [registerPanel]);

  const consoleOutput = currentStep?.consoleOutput || [];

  return (
    <div ref={containerRef} style={{ background: 'var(--bg-console)', color: 'var(--text-code)', padding: '12px', height: '100%', overflowY: 'auto' }}>
      <div style={{ 
        fontSize: '11px', 
        letterSpacing: '0.08em', 
        color: 'var(--text-muted)', 
        marginBottom: '8px', 
        borderBottom: '1px solid var(--border)', 
        paddingBottom: '8px',
        fontVariant: 'small-caps'
      }}>
        CONSOLE
      </div>
      {consoleOutput.map((msg, i) => (
        <div key={i} style={{ fontFamily: 'monospace', fontSize: '13px', padding: '2px 0' }}>
          {msg}
        </div>
      ))}
    </div>
  );
}