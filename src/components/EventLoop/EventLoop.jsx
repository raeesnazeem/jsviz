import React from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import styles from './EventLoop.module.css';

export default function EventLoop() {
  const { currentStep } = useVisualizer();
  const isEmptyStack = currentStep && (!currentStep.callStack || currentStep.callStack.length === 0);

  return (
    <div className={styles.container}>
      <div className={`${styles.iconWrapper} ${isEmptyStack ? styles.glow : ''}`}>
        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className={styles.icon}>
          <path d='M12 2a10 10 0 1 0 10 10' strokeLinecap='round'/>
          <polyline points='22 2 22 12 12 12'/>
        </svg>
      </div>
      <div className={styles.label}>event loop</div>
    </div>
  );
}