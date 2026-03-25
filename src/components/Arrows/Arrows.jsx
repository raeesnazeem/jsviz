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

  // Get unique colors for arrow markers
  const uniqueColors = [...new Set(arrows.map(a => a.color || 'var(--orange)'))];

  return (
    <svg className={styles.svgContainer}>
      <defs>
        {uniqueColors.map(color => {
          const idColor = color.replace(/[^a-zA-Z0-9]/g, '');
          return (
            <marker 
              key={idColor}
              id={`arrowhead-${idColor}`} 
              markerWidth="8" 
              markerHeight="6" 
              refX="7" 
              refY="3" 
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={color} />
            </marker>
          );
        })}
      </defs>
      {arrows.map((arrow, index) => (
        <ArrowPath 
          key={`${currentIndex}-${arrow.id || index}`} 
          arrow={arrow} 
          getPanelRect={getPanelRect} 
          tick={tick}
          description={currentStep.description}
        />
      ))}
    </svg>
  );
}

function getAttachPoint(rect, otherRect) {
  const cx1 = rect.left + rect.width / 2;
  const cy1 = rect.top + rect.height / 2;
  const cx2 = otherRect.left + otherRect.width / 2;
  const cy2 = otherRect.top + otherRect.height / 2;

  const dx = cx2 - cx1;
  const dy = cy2 - cy1;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { x: rect.right, y: cy1, face: 'right' } : { x: rect.left, y: cy1, face: 'left' };
  } else {
    return dy > 0 ? { x: cx1, y: rect.bottom, face: 'bottom' } : { x: cx1, y: rect.top, face: 'top' };
  }
}

function ArrowPath({ arrow, getPanelRect, tick, description }) {
  const pathRef = useRef(null);
  const [length, setLength] = useState(0);
  const [midPoint, setMidPoint] = useState({ x: 0, y: 0 });

  const sourceRect = getPanelRect(arrow.from?.panel);
  const targetRect = getPanelRect(arrow.to?.panel);

  useEffect(() => {
    if (pathRef.current) {
      const totalLen = pathRef.current.getTotalLength();
      setLength(totalLen);
      if (totalLen > 0) {
        const pt = pathRef.current.getPointAtLength(totalLen / 2);
        setMidPoint({ x: pt.x, y: pt.y });
      }
    }
  }, [sourceRect, targetRect, tick]);

  if (!sourceRect || !targetRect) return null;

  const p1 = getAttachPoint(sourceRect, targetRect);
  const p2 = getAttachPoint(targetRect, sourceRect);

  const cx1 = p1.face === 'right' ? p1.x + 60 : p1.face === 'left' ? p1.x - 60 : p1.x;
  const cy1 = p1.face === 'bottom' ? p1.y + 60 : p1.face === 'top' ? p1.y - 60 : p1.y;

  const cx2 = p2.face === 'right' ? p2.x + 60 : p2.face === 'left' ? p2.x - 60 : p2.x;
  const cy2 = p2.face === 'bottom' ? p2.y + 60 : p2.face === 'top' ? p2.y - 60 : p2.y;

  const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
  const isDashed = arrow.style === 'dashed';
  const dashArray = isDashed ? '6 4' : length;
  const color = arrow.color || 'var(--orange)';
  const idColor = color.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <g>
      <path
        ref={pathRef}
        d={d}
        stroke={color}
        strokeDasharray={dashArray}
        markerEnd={`url(#arrowhead-${idColor})`}
        style={{ '--path-length': length }}
        className={`${styles.path} ${length > 0 ? styles.animatePath : ''}`}
      />
      <circle
        cx="0"
        cy="0"
        r="5"
        fill={color}
        className={`${styles.circle} ${length > 0 ? styles.animateCircle : ''}`}
        style={{ offsetPath: `path('${d}')` }}
      />
      {midPoint.x !== 0 && (
        <foreignObject x={midPoint.x} y={midPoint.y} width="1" height="1" style={{ overflow: 'visible' }}>
           <div className={styles.toastLabel} style={{ backgroundColor: color }}>
             {arrow.label || description}
           </div>
        </foreignObject>
      )}
    </g>
  );
}