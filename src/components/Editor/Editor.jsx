import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, Decoration } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import { useVisualizer } from '../../context/VisualizerContext';
import { runInterpreter } from '../../interpreter/interpreter';
import styles from './Editor.module.css';

const defaultCode = `var count = 0;

function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

var add5 = makeAdder(5);
count += add5(2);`;

const currentLineMark = Decoration.line({
  attributes: { style: 'background-color: var(--line-current)' }
});

const nextLineMark = Decoration.line({
  attributes: { style: 'background-color: var(--line-next)' }
});

export default function Editor() {
  const editor = useRef(null);
  const viewRef = useRef(null);
  const { code, dispatch, isRunning, currentStep } = useVisualizer();

  useEffect(() => {
    if (!code) {
      dispatch({ type: 'SET_CODE', payload: defaultCode });
    }
  }, [code, dispatch]);

  useEffect(() => {
    if (!editor.current) return;

    const startState = EditorState.create({
      doc: code || defaultCode,
      extensions: [
        basicSetup,
        javascript(),
        oneDark,
        lineNumbers(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !viewRef.current?.state.readOnly) {
            dispatch({ type: 'SET_CODE', payload: update.state.doc.toString() });
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editor.current
    });
    
    viewRef.current = view;

    return () => {
      view.destroy();
    };
    // Initialize once on mount. Future state updates (like decorations and read-only) 
    // are handled in the subsequent effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (viewRef.current) {
      // Create a completely new state instead of dispatching to read-only EditorView
      // This is a more reliable way to update CodeMirror 6 with readOnly and highlights
      
      const extensions = [
        basicSetup,
        javascript(),
        oneDark,
        lineNumbers(),
        EditorState.readOnly.of(isRunning),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isRunning) {
            dispatch({ type: 'SET_CODE', payload: update.state.doc.toString() });
          }
        })
      ];

      // Add highlighters
      if (currentStep?.currentLine || currentStep?.nextLine) {
        extensions.push(
          EditorView.decorations.of((view) => {
            const decorations = [];
            
            if (currentStep.currentLine && currentStep.currentLine <= view.state.doc.lines) {
              decorations.push(currentLineMark.range(view.state.doc.line(currentStep.currentLine).from));
            }
            
            if (currentStep.nextLine && currentStep.nextLine <= view.state.doc.lines && currentStep.nextLine !== currentStep.currentLine) {
              decorations.push(nextLineMark.range(view.state.doc.line(currentStep.nextLine).from));
            }
            
            return Decoration.set(decorations, true);
          })
        );
      }

      viewRef.current.setState(EditorState.create({
        doc: isRunning ? viewRef.current.state.doc.toString() : code,
        extensions
      }));
    }
  }, [isRunning, currentStep, code, dispatch]);

  const handleRun = () => {
    try {
      const steps = runInterpreter(code);
      dispatch({ type: 'SET_STEPS', payload: steps });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
    }
  };

  const handleEdit = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {!isRunning ? (
          <button className={styles.runButton} onClick={handleRun}>Run</button>
        ) : (
          <button className={styles.editButton} onClick={handleEdit}>Edit</button>
        )}
      </div>
      <div className={styles.editorWrapper} ref={editor} />
    </div>
  );
}