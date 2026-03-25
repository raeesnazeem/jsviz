import React, { useEffect, useRef } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';
import styles from './WebApis.module.css';

export default function WebApis() {
  const { currentStep } = useVisualizer();
  const { registerPanel } = useArrows();
  const containerRef = useRef(null);
  
  const webApis = currentStep?.webApis || [];

  useEffect(() => {
    registerPanel('webApis', containerRef);
    return () => registerPanel('webApis', null);
  }, [registerPanel]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>WEB APIS</div>
      
      {webApis.length === 0 ? (
        <div className={styles.emptyState}>No active timers or APIs</div>
      ) : (
        <div className={styles.list}>
          {webApis.map((api, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.apiName}>{api.name || 'setTimeout'}</span>
                <span className={styles.callbackName}>{api.callbackName || 'anonymous'}</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: '50%' }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}