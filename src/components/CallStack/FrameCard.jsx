import React from 'react';
import styles from './FrameCard.module.css';

export default function FrameCard({ frame, isTop, depth }) {
  const isGlobal = frame.type === 'global';
  const variables = Object.entries(frame.variables);

  return (
    <div className={`${styles.card} ${isTop ? styles.topFrame : ''}`}>
      <div className={`${styles.header} ${isGlobal ? styles.globalHeader : styles.functionHeader}`}>
        <div className={styles.headerLeft}>
          {isTop && <span className={styles.activeDot} />}
          <span className={styles.frameName}>{frame.name}</span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.lineNumber}>
            Line: {frame.currentLine || '-'}
          </span>
        </div>
      </div>

      <div className={styles.variableList}>
        {variables.length === 0 ? (
          <div className={styles.emptyVars}>- no variables -</div>
        ) : (
          variables.map(([name, variable]) => {
            const isUninitializedHoisted = variable.hoisted && !variable.initialized;
            
            return (
              <div key={name} className={styles.varRow}>
                <span 
                  className={styles.varName} 
                  style={{ color: variable.isClosure ? 'var(--ctx-closure)' : undefined }}
                >
                  {name}
                </span>
                <span 
                  className={styles.varValue}
                  style={isUninitializedHoisted ? { color: 'rgba(255, 165, 0, 0.5)' } : {}}
                >
                  {isUninitializedHoisted ? 'undefined' : String(variable.value)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {frame.outerRef !== null && (
        <div className={styles.outerScope}>
          <span className={styles.outerIcon}>⬆️</span> outer: {frame.outerRef}
        </div>
      )}
    </div>
  );
}