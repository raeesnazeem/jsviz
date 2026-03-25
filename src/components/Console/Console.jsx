import React, { useEffect, useRef } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';
import styles from './Console.module.css';

export default function Console() {
  const { currentStep, dispatch } = useVisualizer();
  const { registerPanel } = useArrows();
  const containerRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    registerPanel('console', containerRef);
    return () => registerPanel('console', null);
  }, [registerPanel]);

  const consoleOutput = currentStep?.consoleOutput;
  const displayOutput = consoleOutput || [];

  // Scroll to bottom whenever output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  const handleClear = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <span>CONSOLE</span>
        <button className={styles.clearBtn} onClick={handleClear}>clear</button>
      </div>
      
      <div className={styles.outputArea} ref={outputRef}>
        {displayOutput.length === 0 ? (
          <div className={styles.emptyState}>
            - waiting for console.log -
          </div>
        ) : (
          displayOutput.map((msg, i) => (
            <div key={i} className={styles.line}>
              <span className={styles.prefix}>&gt;</span>
              <span className={styles.text}>{msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}