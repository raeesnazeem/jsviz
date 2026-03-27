import { useState, useEffect } from 'react';
import { useVisualizer } from '../context/VisualizerContext';

function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// Global cache exists outside the component lifecycle to survive remounts
const explanationCache = new Map();
const activeControllers = new Map();

// Determine the API base URL based on environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jsviz.onrender.com';

export function useExplanation() {
  const { currentStep, currentIndex, code } = useVisualizer();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!currentStep) {
      setText('');
      return;
    }

    const codeHash = hashCode(code || '');
    const cacheKey = `${codeHash}:${currentIndex}`;

    if (explanationCache.has(cacheKey)) {
      setText(explanationCache.get(cacheKey));
      setLoading(false);
      setError(false);
      return;
    }

    // Cancel any existing request for this exact component instance if scrubbing fast
    // Actually, we'll just track by cacheKey to ensure we don't make parallel exact overlapping calls
    if (activeControllers.has(cacheKey)) {
      activeControllers.get(cacheKey).abort();
    }

    const controller = new AbortController();
    activeControllers.set(cacheKey, controller);

    let isMounted = true;
    let accumulatedText = '';

    const fetchExplanation = async () => {
      setLoading(true);
      setError(false);
      setText('');

      try {
        const response = await fetch(`${API_BASE_URL}/api/explain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stepType: currentStep.type,
            stepDescription: currentStep.description,
            currentLine: currentStep.currentLine,
            callStackDepth: currentStep.callStack ? currentStep.callStack.length : 0,
            code: code
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to fetch explanation');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                explanationCache.set(cacheKey, accumulatedText);
                activeControllers.delete(cacheKey);
                if (isMounted) setLoading(false);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  if (isMounted) {
                    setText(accumulatedText);
                  }
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          // It was manually cancelled, do not write error states!
          console.log('AI fetch aborted for cache key:', cacheKey);
        } else {
          console.error('Explanation fetch error:', err);
          if (isMounted) {
            setError(true);
            setText(currentStep.description || 'Failed to load explanation.');
            setLoading(false);
          }
        }
        activeControllers.delete(cacheKey);
      }
    };

    fetchExplanation();

    return () => {
      isMounted = false;
      if (activeControllers.has(cacheKey)) {
        activeControllers.get(cacheKey).abort();
        activeControllers.delete(cacheKey);
      }
    };
  }, [currentStep, currentIndex, code]);

  return { text, loading, error };
}