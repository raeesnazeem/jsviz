import { useEffect } from 'react';
import { useVisualizer } from '../context/VisualizerContext';

export function usePlayback() {
  const { isPlaying, playbackSpeed, steps, currentIndex, dispatch } = useVisualizer();

  useEffect(() => {
    if (!isPlaying) return;

    const intervals = { slow: 2000, normal: 1200, fast: 500 };
    const ms = intervals[playbackSpeed] || 1200;

    const timer = setInterval(() => {
      if (currentIndex >= steps.length - 1) {
        dispatch({ type: 'SET_PLAYING', payload: false });
        return;
      }
      dispatch({ type: 'STEP_FORWARD' });
    }, ms);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, currentIndex, steps.length, dispatch]);
}