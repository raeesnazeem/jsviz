import { useState, useEffect, useRef } from 'react';
import { useVisualizer } from '../context/VisualizerContext';

function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

export function useExplanation() {
  const { currentStep, currentIndex, code } = useVisualizer();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cache = useRef(new Map());

  useEffect(() => {
    if (!currentStep) {
      setText('');
      return;
    }

    const codeHash = hashCode(code || '');
    const cacheKey = `${codeHash}:${currentIndex}`;

    if (cache.current.has(cacheKey)) {
      setText(cache.current.get(cacheKey));
      setLoading(false);
      setError(false);
      return;
    }

    let isMounted = true;
    let accumulatedText = '';

    const fetchExplanation = async () => {
      setLoading(true);
      setError(false);
      setText('');

      try {
        const response = await fetch('/api/explain', {
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
          })
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
                if (isMounted) {
                  cache.current.set(cacheKey, accumulatedText);
                  setLoading(false);
                }
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
        console.error('Explanation fetch error:', err);
        if (isMounted) {
          setError(true);
          setText(currentStep.description || 'Failed to load explanation.');
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [currentStep, currentIndex, code]);

  return { text, loading, error };
}