/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  steps: [],
  currentIndex: 0,
  isPlaying: false,
  speed: 'normal',
  code: '',
  isRunning: false,
  error: null,
};

function visualizerReducer(state, action) {
  switch (action.type) {
    case 'SET_STEPS':
      return {
        ...state,
        steps: action.payload,
        currentIndex: 0,
        isRunning: true,
        error: null,
      };
    case 'SET_INDEX':
      return {
        ...state,
        currentIndex: Math.max(0, Math.min(action.payload, state.steps.length - 1)),
      };
    case 'STEP_FORWARD':
      return {
        ...state,
        currentIndex: state.currentIndex < state.steps.length - 1 ? state.currentIndex + 1 : state.currentIndex,
      };
    case 'STEP_BACKWARD':
      return {
        ...state,
        currentIndex: state.currentIndex > 0 ? state.currentIndex - 1 : state.currentIndex,
      };
    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload,
      };
    case 'SET_SPEED':
      return {
        ...state,
        speed: action.payload,
      };
    case 'SET_CODE':
      return {
        ...state,
        code: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isRunning: false,
      };
    case 'RESET':
      return {
        ...state,
        currentIndex: 0,
        isPlaying: false,
      };
    default:
      return state;
  }
}

export const VisualizerContext = createContext(null);

export default function VisualizerProvider({ children }) {
  const [state, dispatch] = useReducer(visualizerReducer, initialState);

  const contextValue = {
    ...state,
    dispatch,
    currentStep: state.steps[state.currentIndex] || null,
  };

  return (
    <VisualizerContext.Provider value={contextValue}>
      {children}
    </VisualizerContext.Provider>
  );
}

export function useVisualizer() {
  const context = useContext(VisualizerContext);
  if (!context) {
    throw new Error('useVisualizer must be used within a VisualizerProvider');
  }
  return context;
}
