import React, { useEffect, useRef } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';
import styles from './CallbackQueue.module.css';

export default function CallbackQueue() {
  const { currentStep } = useVisualizer();
  const { registerPanel } = useArrows();
  
  const macroRef = useRef(null);
  const microRef = useRef(null);
  
  const macroQueue = currentStep?.callbackQueue || [];
  const microQueue = currentStep?.microtaskQueue || [];

  useEffect(() => {
    registerPanel('callbackQueue', macroRef);
    registerPanel('microtaskQueue', microRef);
    return () => {
      registerPanel('callbackQueue', null);
      registerPanel('microtaskQueue', null);
    };
  }, [registerPanel]);

  const renderQueue = (title, queue, isMicrotask) => (
    <div className={styles.queueSection}>
      <div className={styles.header}>{title}</div>
      {queue.length === 0 ? (
        <div className={styles.emptyState}>Empty</div>
      ) : (
        <div className={styles.list}>
          {queue.map((task, index) => (
            <div key={index} className={`${styles.chip} ${isMicrotask ? styles.microChip : ''}`}>
              <span className={styles.callbackName}>{task.name || 'anonymous'}</span>
              <span className={styles.sourceApi}>{task.source || 'setTimeout'}</span>
              {task.inLabel && <span className={styles.inLabel}>{task.inLabel}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.queueWrapper} ref={microRef}>
        {renderQueue('MICROTASK QUEUE', microQueue, true)}
      </div>
      <div className={styles.queueWrapper} ref={macroRef}>
        {renderQueue('CALLBACK QUEUE', macroQueue, false)}
      </div>
    </div>
  );
}