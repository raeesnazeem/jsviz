import { parseCode } from './parser';
import StepType from './stepTypes';

// Deep clone helper for state immutability
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    const arrCopy = [];
    for (let i = 0; i < obj.length; i++) {
      arrCopy[i] = deepClone(obj[i]);
    }
    return arrCopy;
  }

  const objCopy = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      objCopy[key] = deepClone(obj[key]);
    }
  }
  return objCopy;
}

function createFrame(id, name, type, outerRef) {
  return {
    id,
    name,
    type,
    outerRef,
    variables: {},
    isActive: false,
    returnValue: undefined,
    currentLine: null,
    hasReturned: false
  };
}

function createVariable(value, type, hoisted, initialized) {
  return {
    value,
    type,
    hoisted,
    initialized,
    isClosure: false
  };
}

function lookupVariable(name, frameId, allFrames) {
  let currentId = frameId;
  while (currentId !== null) {
    const frame = allFrames.find(f => f.id === currentId);
    if (!frame) break;
    
    if (name in frame.variables) {
      if (frameId !== currentId) {
        frame.variables[name].isClosure = true;
      }
      return frame.variables[name];
    }
    currentId = frame.outerRef;
  }
  return null;
}

function setVariable(name, value, frameId, allFrames) {
  let currentId = frameId;
  while (currentId !== null) {
    const frame = allFrames.find(f => f.id === currentId);
    if (!frame) break;
    
    if (name in frame.variables) {
      frame.variables[name].value = value;
      frame.variables[name].initialized = true;
      return true;
    }
    currentId = frame.outerRef;
  }
  
  // If not found in any scope, create in global scope (non-strict mode behavior)
  const globalFrame = allFrames.find(f => f.type === 'global');
  if (globalFrame) {
    globalFrame.variables[name] = createVariable(value, 'var', false, true);
    return true;
  }
  
  return false;
}

function makeStep(id, type, currentLine, nextLine, callStack, webApis, callbackQueue, microtaskQueue, consoleOutput, arrows, description) {
  const cloned = deepClone({
    callStack,
    webApis,
    callbackQueue,
    microtaskQueue,
    consoleOutput
  });

  if (currentLine !== null && cloned.callStack.length > 0) {
    cloned.callStack[cloned.callStack.length - 1].currentLine = currentLine;
  }

  return {
    id,
    type,
    currentLine,
    nextLine,
    callStack: cloned.callStack,
    webApis: cloned.webApis,
    callbackQueue: cloned.callbackQueue,
    microtaskQueue: cloned.microtaskQueue,
    consoleOutput: cloned.consoleOutput,
    arrows,
    description
  };
}

export function runInterpreter(sourceCode) {
  const { ast, error } = parseCode(sourceCode);
  if (error) {
    throw new Error(`Parse error: ${error.message}`);
  }
  return interpretAST(ast, sourceCode);
}

export function interpretAST(ast) {
  const steps = [];
  let stepId = 0;
  const callStack = [];
  const allFrames = [];
  const webApis = [];
  const callbackQueue = [];
  const microtaskQueue = [];
  const consoleOutput = [];
  const pendingTimers = [];

  let callStackInCount = 0;
  let callStackOutCount = 0;
  let macrotaskInCount = 0;
  let macrotaskOutCount = 0;
  let microtaskInCount = 0;
  let microtaskOutCount = 0;

  function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function pushStep(type, line, nextLine, arrows, desc) {
    steps.push(makeStep(
      stepId++, 
      type, 
      line, 
      nextLine, 
      callStack, 
      webApis, 
      callbackQueue, 
      microtaskQueue,
      consoleOutput, 
      arrows, 
      desc
    ));
  }

  // Step 1 - Global context creation
  const globalFrame = createFrame('global', 'Global', 'global', null);
  globalFrame.isActive = true;
  callStackInCount++;
  globalFrame.inLabel = `${getOrdinal(callStackInCount)} in`;
  callStack.push(globalFrame);
  allFrames.push(globalFrame);
  pushStep(StepType.GLOBAL_CTX_CREATE, null, null, [], 'Creating global execution context');
  
  // Step 2 - Hoisting pass over the top-level body
  if (ast && ast.body) {
    for (const node of ast.body) {
      if (node.type === 'VariableDeclaration' && node.kind === 'var') {
        for (const decl of node.declarations) {
          if (decl.id.type === 'Identifier') {
            globalFrame.variables[decl.id.name] = createVariable(undefined, 'var', true, false);
            pushStep(StepType.VAR_HOIST, node.loc?.start?.line, null, [], `Hoisting var ${decl.id.name}`);
          }
        }
      } else if (node.type === 'FunctionDeclaration' && node.id) {
        globalFrame.variables[node.id.name] = createVariable({
          type: 'function',
          name: node.id.name,
          params: node.params.map(p => p.name),
          body: node.body,
          outerRef: 'global'
        }, 'var', true, true);
        pushStep(StepType.FN_HOIST, node.loc?.start?.line, null, [], `Hoisting function ${node.id.name}`);
      }
    }
  }

  function evalExpr(expr, currentFrame) {
    if (!expr) return undefined;
    
    switch (expr.type) {
      case 'Literal':
        return expr.value;
        
      case 'Identifier': {
        const variable = lookupVariable(expr.name, currentFrame.id, allFrames);
        return variable ? variable.value : undefined;
      }
        
      case 'BinaryExpression': {
        const left = evalExpr(expr.left, currentFrame);
        const right = evalExpr(expr.right, currentFrame);
        if (expr.operator === '+') return left + right;
        if (expr.operator === '-') return left - right;
        if (expr.operator === '*') return left * right;
        if (expr.operator === '/') return left / right;
        return undefined;
      }
        
      case 'FunctionExpression':
      case 'ArrowFunctionExpression': {
        pushStep(StepType.CLOSURE_CAPTURE, expr.loc?.start?.line, null, [], `Capturing closure`);
        return {
          type: 'function',
          name: expr.id ? expr.id.name : 'anonymous',
          params: expr.params.map(p => p.name),
          body: expr.body,
          outerRef: currentFrame.id
        };
      }
        
      case 'CallExpression': {
        const calleeNode = expr.callee;
        
        // Handle console.log
        if (calleeNode.type === 'MemberExpression' && 
            calleeNode.object.name === 'console' && 
            calleeNode.property.name === 'log') {
          const args = expr.arguments.map(arg => evalExpr(arg, currentFrame));
          const logOutput = args.join(' ');
          consoleOutput.push(logOutput);
          pushStep(StepType.CONSOLE_LOG, expr.loc?.start?.line, null, [
            { id: `arrow_${stepId}`, from: { panel: 'callStack' }, to: { panel: 'console' }, color: 'var(--arrow-log)' }
          ], `Logging to console: ${logOutput}`);
          return undefined;
        }

        // Handle setTimeout
        if (calleeNode.type === 'Identifier' && calleeNode.name === 'setTimeout') {
          const args = expr.arguments.map(arg => evalExpr(arg, currentFrame));
          const callback = args[0];
          
          const timerId = `timer_${stepId}`;
          webApis.push({ id: timerId, name: callback?.name || 'anonymous', source: 'setTimeout', callback });
          pendingTimers.push({ id: timerId, callback });
          
          pushStep(StepType.TIMEOUT_REGISTER, expr.loc?.start?.line, null, [
            { id: `arrow_${stepId}`, from: { panel: 'callStack' }, to: { panel: 'webApis' }, color: 'var(--arrow-async)' }
          ], `Registering setTimeout in Web API`);
          
          return timerId;
        }

        // Handle Promise.resolve().then
        if (calleeNode.type === 'MemberExpression' &&
            calleeNode.property.name === 'then' &&
            calleeNode.object.type === 'CallExpression' &&
            calleeNode.object.callee.type === 'MemberExpression' &&
            calleeNode.object.callee.object.name === 'Promise' &&
            calleeNode.object.callee.property.name === 'resolve') {
          const args = expr.arguments.map(arg => evalExpr(arg, currentFrame));
          const callback = args[0];
          
          microtaskInCount++;
          const inLabel = `${getOrdinal(microtaskInCount)} in`;
          microtaskQueue.push({ id: `micro_${stepId}`, name: callback?.name || 'anonymous', source: 'Promise', callback, inLabel });
          
          pushStep(StepType.TIMEOUT_REGISTER, expr.loc?.start?.line, null, [
            { id: `arrow_${stepId}`, from: { panel: 'callStack' }, to: { panel: 'microtaskQueue' }, color: 'var(--arrow-async)', label: `Queueing (${inLabel})` }
          ], `Queueing Promise microtask`);
          
          return undefined;
        }

        const callee = evalExpr(calleeNode, currentFrame);
        const args = expr.arguments.map(arg => evalExpr(arg, currentFrame));
        
        if (callee && callee.type === 'function') {
          const frameId = 'frame_' + stepId;
          const fnFrame = createFrame(frameId, callee.name, 'function', callee.outerRef);
          fnFrame.isActive = true;
          allFrames.push(fnFrame);
          
          callee.params.forEach((paramName, i) => {
            fnFrame.variables[paramName] = createVariable(args[i], 'var', false, true);
          });
          
          currentFrame.isActive = false;
          callStackInCount++;
          fnFrame.inLabel = `${getOrdinal(callStackInCount)} in`;
          callStack.push(fnFrame);
          
          pushStep(StepType.FN_CALL, expr.loc?.start?.line, null, [
            { id: `arrow_${stepId}`, from: { panel: 'editor' }, to: { panel: 'callStack' }, color: 'var(--arrow-call)', label: `Call (${fnFrame.inLabel})` }
          ], `Calling ${callee.name}`);
          
          if (callee.body.type === 'BlockStatement') {
            for (const stmt of callee.body.body) {
              executeNode(stmt);
              if (fnFrame.hasReturned) break;
            }
          } else {
            fnFrame.returnValue = evalExpr(callee.body, fnFrame);
          }
          
          const retVal = fnFrame.returnValue;
          
          callStackOutCount++;
          const outLabel = `${getOrdinal(callStackOutCount)} out`;
          callStack.pop();
          const newCurrent = callStack[callStack.length - 1];
          if (newCurrent) newCurrent.isActive = true;
          
          pushStep(StepType.FN_RETURN, expr.loc?.start?.line, null, [
            { id: `arrow_${stepId}`, from: { panel: 'callStack' }, to: { panel: 'editor' }, color: 'var(--arrow-return)', label: `Returned (${outLabel})` },
            { id: `arrow2_${stepId}`, style: 'dashed', from: { panel: 'callStack' }, to: { panel: 'callStack' }, color: 'var(--arrow-return)' }
          ], `Returning from ${callee.name}`);
          
          return retVal;
        }
        return undefined;
      }
      default:
        return undefined;
    }
  }

  function executeNode(node) {
    if (!node) return;
    const currentFrame = callStack[callStack.length - 1];
    
    switch (node.type) {
      case 'VariableDeclaration':
        for (const decl of node.declarations) {
          const initValue = evalExpr(decl.init, currentFrame);
          
          if (node.kind === 'var') {
            setVariable(decl.id.name, initValue, currentFrame.id, allFrames);
            pushStep(StepType.ASSIGN, node.loc?.start?.line, null, [], `Assigning to ${decl.id.name}`);
          } else if (node.kind === 'let' || node.kind === 'const') {
            currentFrame.variables[decl.id.name] = createVariable(initValue, node.kind, false, true);
            pushStep(StepType.LET_CONST_DECLARE, node.loc?.start?.line, null, [], `Declaring ${decl.id.name}`);
          }
        }
        break;
        
      case 'ExpressionStatement':
        if (node.expression.type === 'AssignmentExpression') {
          const left = node.expression.left;
          if (left.type === 'Identifier') {
            const rightValue = evalExpr(node.expression.right, currentFrame);
            setVariable(left.name, rightValue, currentFrame.id, allFrames);
            pushStep(StepType.ASSIGN, node.loc?.start?.line, null, [], `Assigning to ${left.name}`);
          }
        } else {
          evalExpr(node.expression, currentFrame);
        }
        break;
        
      case 'ReturnStatement':
        currentFrame.returnValue = evalExpr(node.argument, currentFrame);
        currentFrame.hasReturned = true;
        break;
        
      case 'FunctionDeclaration':
        // already hoisted
        break;
    }
  }

  // Step 3 - Execute statements in order
  if (ast && ast.body) {
    for (const node of ast.body) {
      executeNode(node);
    }
  }

  // Step 4 - Event Loop processing
  
  // 4a. Move Web API timers to callback queue
  while (pendingTimers.length > 0) {
    const timer = pendingTimers.shift();
    const idx = webApis.findIndex(w => w.id === timer.id);
    if (idx !== -1) webApis.splice(idx, 1);
    
    macrotaskInCount++;
    const inLabel = `${getOrdinal(macrotaskInCount)} in`;
    callbackQueue.push({ id: timer.id, name: timer.callback?.name || 'anonymous', source: 'setTimeout', callback: timer.callback, inLabel });
    
    pushStep(StepType.TIMEOUT_FIRE, null, null, [
      { id: `arrow_mv_${stepId}`, from: { panel: 'webApis' }, to: { panel: 'callbackQueue' }, color: 'var(--arrow-queue)', label: `Queueing (${inLabel})` }
    ], `Timer finished, moving to Callback Queue`);
  }

  // 4b. Event Loop execution
  function executeEventLoopTask(task, queueName) {
    if (!task.callback) return;
    
    let queueOutLabel = '';
    if (queueName === 'microtaskQueue') {
      microtaskOutCount++;
      queueOutLabel = `${getOrdinal(microtaskOutCount)} out`;
    } else {
      macrotaskOutCount++;
      queueOutLabel = `${getOrdinal(macrotaskOutCount)} out`;
    }
    
    pushStep(StepType.CB_DEQUEUE, null, null, [
      { id: `arrow_dq_${stepId}`, from: { panel: queueName }, to: { panel: 'callStack' }, color: 'var(--arrow-return)', label: `Dequeue (${queueOutLabel})` },
      { id: `arrow_loop_${stepId}`, from: { panel: queueName }, to: { panel: 'eventLoop' }, color: 'var(--arrow-return)' }
    ], `Event loop picks up ${task.name} from ${queueName === 'microtaskQueue' ? 'Microtask Queue' : 'Callback Queue'}`);
    
    const frameId = 'cb_frame_' + stepId;
    const fnFrame = createFrame(frameId, task.name, 'function', task.callback.outerRef);
    fnFrame.isActive = true;
    allFrames.push(fnFrame);
    
    callStackInCount++;
    fnFrame.inLabel = `${getOrdinal(callStackInCount)} in`;
    callStack.push(fnFrame);
    pushStep(StepType.FN_CALL, null, null, [
      { id: `arrow_ev_${stepId}`, from: { panel: 'eventLoop' }, to: { panel: 'callStack' }, color: 'var(--arrow-return)', label: `Call (${fnFrame.inLabel})` }
    ], `Executing callback ${task.name}`);
    
    if (task.callback.body && task.callback.body.type === 'BlockStatement') {
      for (const stmt of task.callback.body.body) {
        executeNode(stmt);
        if (fnFrame.hasReturned) break;
      }
    } else if (task.callback.body) {
      fnFrame.returnValue = evalExpr(task.callback.body, fnFrame);
    }
    
    callStackOutCount++;
    const outLabel = `${getOrdinal(callStackOutCount)} out`;
    callStack.pop();
    pushStep(StepType.FN_RETURN, null, null, [
       { id: `arrow_rt_${stepId}`, from: { panel: 'callStack' }, to: { panel: 'editor' }, color: 'var(--arrow-return)', label: `Returned (${outLabel})` }
    ], `Finished callback ${task.name}`);
  }

  // Exhaust microtasks, then macrotasks
  while (microtaskQueue.length > 0 || callbackQueue.length > 0) {
    if (microtaskQueue.length > 0) {
      executeEventLoopTask(microtaskQueue.shift(), 'microtaskQueue');
    } else if (callbackQueue.length > 0) {
      executeEventLoopTask(callbackQueue.shift(), 'callbackQueue');
    }
  }

  pushStep(StepType.PROGRAM_END, null, null, [], 'Program execution completed');

  return steps;
}