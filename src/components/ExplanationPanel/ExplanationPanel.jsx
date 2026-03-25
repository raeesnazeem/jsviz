import React from 'react';
import styles from './ExplanationPanel.module.css';
import { useExplanation } from '../../hooks/useExplanation';

const ExplanationPanel = () => {
  const { text, loading, error } = useExplanation();

  const handleSpeak = () => {
    if (!text || loading) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const renderText = () => {
    if (!text) return null;
    return (
      <div 
        className={styles.textHTML} 
        key={text}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.left}>
        {loading ? (
          <div className={styles.dots}>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
            <span className={styles.dot}></span>
          </div>
        ) : error ? (
          <div className={styles.error}>{text || 'Failed to load explanation.'}</div>
        ) : (
          renderText()
        )}
      </div>
      <div className={styles.right}>
        <button
          className={styles.speakerButton}
          onClick={handleSpeak}
          disabled={!text || loading}
        >
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5' />
            <path d='M15.54 8.46a5 5 0 0 1 0 7.07' />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ExplanationPanel;
