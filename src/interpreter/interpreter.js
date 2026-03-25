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

function makeStep(id, type, currentLine, nextLine, callStack, webApis, callbackQueue, consoleOutput, arrows, description) {
  const cloned = deepClone({
    callStack,
    webApis,
    callbackQueue,
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
  const consoleOutput = [];

  function pushStep(type, line, nextLine, arrows, desc) {
    steps.push(makeStep(
      stepId++, 
      type, 
      line, 
      nextLine, 
      callStack, 
      webApis, 
      callbackQueue, 
      consoleOutput, 
      arrows, 
      desc
    ));
  }

  // Step 1 - Global context creation
  const globalFrame = createFrame('global', 'Global', 'global', null);
  globalFrame.isActive = true;
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
          pushStep(StepType.CONSOLE_LOG, expr.loc?.start?.line, null, [], `Logging to console: ${logOutput}`);
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
          callStack.push(fnFrame);
          
          pushStep(StepType.FN_CALL, expr.loc?.start?.line, null, [], `Calling ${callee.name}`);
          
          if (callee.body.type === 'BlockStatement') {
            for (const stmt of callee.body.body) {
              executeNode(stmt);
              if (fnFrame.hasReturned) break;
            }
          } else {
            fnFrame.returnValue = evalExpr(callee.body, fnFrame);
          }
          
          const retVal = fnFrame.returnValue;
          
          callStack.pop();
          const newCurrent = callStack[callStack.length - 1];
          if (newCurrent) newCurrent.isActive = true;
          
          pushStep(StepType.FN_RETURN, expr.loc?.start?.line, null, [], `Returning from ${callee.name}`);
          
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

  return steps;
}