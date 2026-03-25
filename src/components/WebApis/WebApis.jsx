import React from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import styles from './WebApis.module.css';

export default function WebApis() {
  const { currentStep } = useVisualizer();
  const webApis = currentStep?.webApis || [];

  return (
    <div className={styles.container}>
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