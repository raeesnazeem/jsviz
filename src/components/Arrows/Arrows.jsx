import React, { useEffect, useRef, useState } from 'react';
import { useVisualizer } from '../../context/VisualizerContext';
import { useArrows } from '../../context/ArrowContext';
import styles from './Arrows.module.css';

export default function Arrows() {
  const { currentStep, currentIndex } = useVisualizer();
  const { getPanelRect } = useArrows();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleResize = () => setTick(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setTick(t => t + 1), 50);
    return () => clearTimeout(timer);
  }, [currentIndex, currentStep]);

  const arrows = currentStep?.arrows || [];

  return (
    <svg className={styles.svgContainer}>
      {arrows.map((arrow, index) => (
        <ArrowPath 
          key={`${currentIndex}-${arrow.id || index}`} 
          arrow={arrow} 
          getPanelRect={getPanelRect} 
          tick={tick}
        />
      ))}
    </svg>
  );
}

function ArrowPath({ arrow, getPanelRect, tick }) {
  const pathRef = useRef(null);
  const [length, setLength] = useState(0);

  const sourceRect = getPanelRect(arrow.from?.panel);
  const targetRect = getPanelRect(arrow.to?.panel);

  useEffect(() => {
    if (pathRef.current) {
      setLength(pathRef.current.getTotalLength());
    }
  }, [sourceRect, targetRect, tick]);

  if (!sourceRect || !targetRect) return null;

  const srcX = sourceRect.right;
  const srcY = sourceRect.top + sourceRect.height / 2;

  const targetX = targetRect.left;
  const targetY = targetRect.top + targetRect.height / 2;

  const midX = (srcX + targetX) / 2;

  const d = `M ${srcX} ${srcY} C ${midX} ${srcY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
  const isDashed = arrow.style === 'dashed';
  const dashArray = isDashed ? '6 4' : length;

  return (
    <g>
      <path
        ref={pathRef}
        d={d}
        stroke={arrow.color || 'var(--orange)'}
        strokeDasharray={dashArray}
        style={{ '--path-length': length }}
        className={`${styles.path} ${length > 0 ? styles.animatePath : ''}`}
      />
      <circle
        cx="0"
        cy="0"
        r="6"
        fill={arrow.color || 'var(--orange)'}
        className={`${styles.circle} ${length > 0 ? styles.animateCircle : ''}`}
        style={{ offsetPath: `path('${d}')` }}
      />
    </g>
  );
}