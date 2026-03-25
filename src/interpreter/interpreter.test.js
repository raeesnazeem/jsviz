import { runInterpreter } from './interpreter.js';

let passCount = 0;
let failCount = 0;

function logResult(testName, passed, reason) {
  if (passed) {
    console.log(`PASS: ${testName} - ${reason}`);
    passCount++;
  } else {
    console.log(`FAIL: ${testName} - ${reason}`);
    failCount++;
  }
}

// Test 1 - Variable assignment
try {
  const code1 = 'var x = 5;';
  const steps1 = runInterpreter(code1);

  if (steps1.length < 3) throw new Error('steps array has fewer than 3 steps');
  
  const hasGlobalCtxCreate = steps1.some(s => s.type === 'GLOBAL_CTX_CREATE');
  if (!hasGlobalCtxCreate) throw new Error('missing GLOBAL_CTX_CREATE step');

  const hasVarHoist = steps1.some(s => s.type === 'VAR_HOIST');
  if (!hasVarHoist) throw new Error('missing VAR_HOIST step');

  const assignStep = steps1.find(s => s.type === 'ASSIGN');
  if (!assignStep) throw new Error('missing ASSIGN step');

  if (assignStep.callStack[0].variables.x.value !== 5) {
    throw new Error('ASSIGN step callStack[0].variables.x.value is not 5');
  }

  logResult('Test 1 - Variable assignment', true, 'All expectations met');
} catch (e) {
  logResult('Test 1 - Variable assignment', false, e.message);
}

// Test 2 - Function call
try {
  const code2 = `
function greet(name) {
  return 'hello ' + name;
}
var result = greet('world');
`;
  const steps2 = runInterpreter(code2);

  const hasFnHoist = steps2.some(s => s.type === 'FN_HOIST');
  if (!hasFnHoist) throw new Error('missing FN_HOIST step');

  const hasFnCall = steps2.some(s => s.type === 'FN_CALL');
  if (!hasFnCall) throw new Error('missing FN_CALL step');

  const hasFnReturn = steps2.some(s => s.type === 'FN_RETURN');
  if (!hasFnReturn) throw new Error('missing FN_RETURN step');

  // find the final ASSIGN step
  const assignSteps = steps2.filter(s => s.type === 'ASSIGN');
  if (assignSteps.length === 0) throw new Error('missing ASSIGN step');
  const finalAssignStep = assignSteps[assignSteps.length - 1];

  if (finalAssignStep.callStack[0].variables.result.value !== 'hello world') {
    throw new Error("final ASSIGN step callStack[0].variables.result.value is not 'hello world'");
  }

  logResult('Test 2 - Function call', true, 'All expectations met');
} catch (e) {
  logResult('Test 2 - Function call', false, e.message);
}

// Test 3 - Closure
try {
  const code3 = `
function makeAdder(x) {
  return function(y) { return x + y; };
}
var add5 = makeAdder(5);
var result = add5(2);
`;
  const steps3 = runInterpreter(code3);

  if (steps3.length <= 5) throw new Error('steps array length is not > 5');

  const hasClosureCapture = steps3.some(s => s.type === 'CLOSURE_CAPTURE');
  if (!hasClosureCapture) throw new Error('missing CLOSURE_CAPTURE step');

  // check result variable in global frame
  const finalStep = steps3[steps3.length - 1];
  const globalFrame = finalStep.callStack.find(f => f.type === 'global');
  if (!globalFrame) throw new Error('missing global frame in final step');
  if (globalFrame.variables.result.value !== 7) {
    throw new Error('result variable in global frame is not 7');
  }

  logResult('Test 3 - Closure', true, 'All expectations met');
} catch (e) {
  logResult('Test 3 - Closure', false, e.message);
}

console.log(`\nTotal: ${passCount} passed, ${failCount} failed.`);
process.exit(failCount > 0 ? 1 : 0);
