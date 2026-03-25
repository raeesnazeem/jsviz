import React, { useEffect, useRef, useState } from 'react';
import styles from './FrameCard.module.css';

export default function FrameCard({ frame, isTop }) {
  const isGlobal = frame.type === 'global';
  const variables = Object.entries(frame.variables);
  
  // Keep track of previous variables to detect changes
  const prevVarsRef = useRef({});
  const [flashingVars, setFlashingVars] = useState({});
  const [closedTooltips, setClosedTooltips] = useState({});

  const closeTooltip = (e, name) => {
    e.stopPropagation();
    setClosedTooltips(prev => ({ ...prev, [name]: true }));
  };

  useEffect(() => {
    const newFlashing = {};
    let hasChanges = false;

    const currentVariables = Object.entries(frame.variables);

    for (const [name, variable] of currentVariables) {
      const prevVar = prevVarsRef.current[name];
      // Compare stringified values since that's what we display
      const currentDisplayValue = String(variable.value);
      const prevDisplayValue = prevVar ? String(prevVar.value) : undefined;

      if (prevVar && currentDisplayValue !== prevDisplayValue) {
        newFlashing[name] = true;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      // Use setTimeout to avoid synchronous setState within effect lint error
      setTimeout(() => {
        setFlashingVars(prev => ({ ...prev, ...newFlashing }));
      }, 0);
      
      // Clear flash class after animation completes (400ms)
      const timer = setTimeout(() => {
        setFlashingVars(prev => {
          const updated = { ...prev };
          for (const key in newFlashing) {
            delete updated[key];
          }
          return updated;
        });
      }, 400);

      prevVarsRef.current = frame.variables;
      return () => clearTimeout(timer);
    }

    // Update the ref for the next render
    prevVarsRef.current = frame.variables;
  }, [frame.variables]);

  return (
    <div className={`${styles.card} ${isTop ? styles.topFrame : ''}`}>
      <div className={`${styles.header} ${isGlobal ? styles.globalHeader : styles.functionHeader}`}>
        <div className={styles.headerLeft}>
          {isTop && <span className={styles.activeDot} />}
          <span className={styles.frameName}>
            {isGlobal ? 'Global Execution Context' : `${frame.name}() Execution Context`}
          </span>
        </div>
        <div className={styles.headerRight}>
          {frame.inLabel && <span className={styles.inLabel}>{frame.inLabel}</span>}
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
            const isFlashing = flashingVars[name];
            const isFunction = variable.value && typeof variable.value === 'object' && variable.value.type === 'function';
            const isTooltipClosed = closedTooltips[name];
            
            return (
              <div key={name} className={styles.varRow}>
                <span 
                  className={styles.varName} 
                  style={{ color: variable.isClosure ? 'var(--ctx-closure)' : undefined }}
                >
                  {name}
                </span>
                <span 
                  className={`${styles.varValue} ${isFlashing ? styles.flash : ''} ${isFunction ? styles.fnContainer : ''}`}
                  style={isUninitializedHoisted ? { color: 'rgba(255, 165, 0, 0.5)' } : {}}
                >
                  {isUninitializedHoisted ? 'undefined' : (isFunction ? <i>fn</i> : String(variable.value))}
                  
                  {isFunction && (
                    <div className={`${styles.tooltipBox} ${!isTooltipClosed ? styles.tooltipVisible : ''}`}>
                       <div className={styles.tooltipHeader}>
                          <button 
                            className={styles.tooltipClose} 
                            onClick={(e) => closeTooltip(e, name)}
                            title="Close Tooltip"
                          >
                            ×
                          </button>
                       </div>
                       <div className={styles.tooltipContent}>
                          function {variable.value.name || 'anonymous'}({(variable.value.params || []).join(', ')}) {'{ ... }'}
                       </div>
                    </div>
                  )}
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