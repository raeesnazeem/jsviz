import React, { useEffect, useRef } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';
import styles from './CallbackQueue.module.css';

export default function CallbackQueue() {
  const { currentStep } = useVisualizer();
  const { registerPanel } = useArrows();
  const containerRef = useRef(null);
  
  const queue = currentStep?.callbackQueue || [];

  useEffect(() => {
    registerPanel('callbackQueue', containerRef);
    return () => registerPanel('callbackQueue', null);
  }, [registerPanel]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>CALLBACK QUEUE</div>
      
      {queue.length === 0 ? (
        <div className={styles.emptyState}>Queue is empty</div>
      ) : (
        <div className={styles.list}>
          {queue.map((callback, index) => (
            <div key={index} className={styles.chip}>
              <span className={styles.callbackName}>{callback.name || 'anonymous'}</span>
              <span className={styles.sourceApi}>{callback.source || 'setTimeout'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}