import React from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import FrameCard from './FrameCard';
import styles from './CallStack.module.css';

export default function CallStack() {
  const { currentStep } = useVisualizer();

  const isEmpty = !currentStep || !currentStep.callStack || currentStep.callStack.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>CALL STACK</div>
      
      {isEmpty ? (
        <div className={styles.emptyState}>Stack is empty</div>
      ) : (
        <div className={styles.frameList}>
          {[...currentStep.callStack].reverse().map((frame, index) => {
            const isTop = index === 0;
            const depth = currentStep.callStack.length - 1 - index;
            return (
              <FrameCard 
                key={frame.id} 
                frame={frame} 
                isTop={isTop} 
                depth={depth} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
}