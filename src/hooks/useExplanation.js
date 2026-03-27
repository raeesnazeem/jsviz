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

// Wake up the backend on first load (Render free tier cold start)
let backendWarmedUp = false;
function warmupBackend() {
  if (backendWarmedUp) return;
  backendWarmedUp = true;
  fetch(`${API_BASE_URL}/api/health`, { method: 'GET' }).catch(() => {});
}

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

    const fetchExplanation = async (retryCount = 0) => {
      setLoading(true);
      setError(false);
      if (retryCount === 0) setText('');

      // Warm up backend on first request
      warmupBackend();

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
          throw new Error(`Failed to fetch explanation: ${response.status}`);
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
        } else if (err.message.includes('Failed to fetch') && retryCount < 3) {
          // Retry on connection reset / network errors (Render cold start takes ~30-50s)
          console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
          const delay = retryCount === 0 ? 5000 : retryCount === 1 ? 10000 : 15000; // 5s, 10s, 15s
          setTimeout(() => {
            if (isMounted) fetchExplanation(retryCount + 1);
          }, delay);
          return;
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

    // Debounce the fetch to avoid spamming the backend when scrubbing the slider
    const debounceTimer = setTimeout(() => {
      fetchExplanation();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
      if (activeControllers.has(cacheKey)) {
        activeControllers.get(cacheKey).abort();
        activeControllers.delete(cacheKey);
      }
    };
  }, [currentStep, currentIndex, code]);

  return { text, loading, error };
}