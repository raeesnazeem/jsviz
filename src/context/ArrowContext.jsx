/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';

const ArrowContext = createContext(null);

export function ArrowProvider({ children }) {
  // Use useState to hold a stable reference to the Map without triggering 
  // "Cannot access refs during render" lint errors.
  const [panelRefs] = useState(() => new Map());

  const registerPanel = useCallback((panelId, ref) => {
    if (ref) {
      panelRefs.set(panelId, ref);
    } else {
      panelRefs.delete(panelId);
    }
  }, [panelRefs]);

  const getPanelRect = useCallback((panelId) => {
    const ref = panelRefs.get(panelId);
    if (ref && ref.current) {
      return ref.current.getBoundingClientRect();
    }
    return null;
  }, [panelRefs]);

  const value = useMemo(() => ({
    panelRefs,
    registerPanel,
    getPanelRect
  }), [panelRefs, registerPanel, getPanelRect]);

  return (
    <ArrowContext.Provider value={value}>
      {children}
    </ArrowContext.Provider>
  );
}

export function useArrows() {
  const context = useContext(ArrowContext);
  if (!context) {
    throw new Error('useArrows must be used within an ArrowProvider');
  }
  return context;
}
