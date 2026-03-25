import { describe, it, expect } from 'vitest';
import { runInterpreter } from './interpreter.js';

describe('Interpreter', () => {
  it('handles variable assignment', () => {
    const code = 'var x = 5;';
    const steps = runInterpreter(code);
    
    expect(steps.length).toBeGreaterThanOrEqual(3);
    
    const hasGlobalCtxCreate = steps.some(s => s.type === 'GLOBAL_CTX_CREATE');
    expect(hasGlobalCtxCreate).toBe(true);
    
    const hasVarHoist = steps.some(s => s.type === 'VAR_HOIST');
    expect(hasVarHoist).toBe(true);
    
    const assignStep = steps.find(s => s.type === 'ASSIGN');
    expect(assignStep).toBeDefined();
    
    expect(assignStep.callStack[0].variables.x.value).toBe(5);
  });

  it('handles function calls', () => {
    const code = `
function greet(name) {
  return 'hello ' + name;
}
var result = greet('world');
`;
    const steps = runInterpreter(code);
    
    const hasFnHoist = steps.some(s => s.type === 'FN_HOIST');
    expect(hasFnHoist).toBe(true);
    
    const hasFnCall = steps.some(s => s.type === 'FN_CALL');
    expect(hasFnCall).toBe(true);
    
    const hasFnReturn = steps.some(s => s.type === 'FN_RETURN');
    expect(hasFnReturn).toBe(true);
    
    const assignSteps = steps.filter(s => s.type === 'ASSIGN');
    expect(assignSteps.length).toBeGreaterThan(0);
    
    const finalAssignStep = assignSteps[assignSteps.length - 1];
    expect(finalAssignStep.callStack[0].variables.result.value).toBe('hello world');
  });

  it('handles closures', () => {
    const code = `
function makeAdder(x) {
  return function(y) { return x + y; };
}
var add5 = makeAdder(5);
var result = add5(2);
`;
    const steps = runInterpreter(code);
    
    expect(steps.length).toBeGreaterThan(5);
    
    const hasClosureCapture = steps.some(s => s.type === 'CLOSURE_CAPTURE');
    expect(hasClosureCapture).toBe(true);
    
    const finalStep = steps[steps.length - 1];
    const globalFrame = finalStep.callStack.find(f => f.type === 'global');
    
    expect(globalFrame).toBeDefined();
    expect(globalFrame.variables.result.value).toBe(7);
  });
});
