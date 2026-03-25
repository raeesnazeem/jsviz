import React from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import styles from './CallbackQueue.module.css';

export default function CallbackQueue() {
  const { currentStep } = useVisualizer();
  const queue = currentStep?.callbackQueue || [];

  return (
    <div className={styles.container}>
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