import React, { useEffect, useCallback } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import styles from './StepSlider.module.css';

export default function StepSlider() {
  const { 
    steps, 
    currentIndex, 
    isPlaying, 
    playbackSpeed, 
    dispatch,
    isRunning
  } = useVisualizer();

  const handleKeyDown = useCallback((e) => {
    // Prevent keyboard shortcuts when focused on inputs (like the editor)
    if (document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' || 
        document.activeElement.isContentEditable || 
        document.activeElement.classList.contains('cm-content')) {
      return;
    }

    if (!isRunning || steps.length === 0) return;

    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        dispatch({ type: 'STEP_BACKWARD' });
        break;
      case 'ArrowRight':
        e.preventDefault();
        dispatch({ type: 'STEP_FORWARD' });
        break;
      case 'Space':
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', payload: !isPlaying });
        break;
      case 'Home':
        e.preventDefault();
        dispatch({ type: 'SET_INDEX', payload: 0 });
        break;
      case 'End':
        e.preventDefault();
        dispatch({ type: 'SET_INDEX', payload: steps.length - 1 });
        break;
      default:
        break;
    }
  }, [dispatch, isPlaying, steps.length, isRunning]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const isEmpty = !isRunning || steps.length === 0;

  const handleSliderChange = (e) => {
    dispatch({ type: 'SET_INDEX', payload: parseInt(e.target.value, 10) });
  };

  const progressPercentage = steps.length > 1 
    ? (currentIndex / (steps.length - 1)) * 100 
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.topRow}>
        <div className={styles.stepCounter}>
          {isEmpty ? 'Ready' : `Step ${currentIndex + 1} of ${steps.length}`}
        </div>
        
        <div className={styles.controls}>
          <button 
            className={styles.button} 
            onClick={() => dispatch({ type: 'RESET' })}
            title="Reset"
            disabled={isEmpty}
          >
            |&lt;
          </button>
          <button 
            className={styles.button} 
            onClick={() => dispatch({ type: 'STEP_BACKWARD' })}
            disabled={isEmpty || currentIndex === 0}
            title="Step Backward"
          >
            &lt;
          </button>
          <button 
            className={`${styles.button} ${styles.playButton}`} 
            onClick={() => dispatch({ type: 'SET_PLAYING', payload: !isPlaying })}
            title={isPlaying ? "Pause" : "Play"}
            disabled={isEmpty}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className={styles.button} 
            onClick={() => dispatch({ type: 'STEP_FORWARD' })}
            disabled={isEmpty || currentIndex >= steps.length - 1}
            title="Step Forward"
          >
            &gt;
          </button>
        </div>

        <div className={styles.speedSelector}>
          {['slow', 'normal', 'fast'].map(speed => (
            <button
              key={speed}
              className={`${styles.speedButton} ${playbackSpeed === speed ? styles.activeSpeed : ''}`}
              onClick={() => dispatch({ type: 'SET_SPEED', payload: speed })}
            >
              {speed.charAt(0).toUpperCase() + speed.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min="0"
        max={Math.max(0, steps.length - 1)}
        value={currentIndex}
        onChange={handleSliderChange}
        className={styles.slider}
        disabled={isEmpty}
        style={{
          background: `linear-gradient(to right, var(--orange) ${progressPercentage}%, var(--border) ${progressPercentage}%)`
        }}
      />
    </div>
  );
}