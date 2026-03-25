import StepType from './stepTypes';
import { parseCode } from './parser';

function createFrame(id, name, type, outerRef) {
  return {
    id,
    name,
    type,
    outerRef,
    variables: {},
    thisBinding: undefined,
    returnValue: null,
    isActive: false
  };
}

function createVariable(value, kind, hoisted, initialized) {
  return {
    value,
    kind,
    hoisted,
    initialized,
    isClosure: false
  };
}

function lookupVariable(name, frameId, frames) {
  let currentId = frameId;
  while (currentId !== null && currentId !== undefined) {
    const frame = frames.find(f => f.id === currentId);
    if (!frame) break;
    
    if (name in frame.variables) {
      return frame.variables[name];
    }
    currentId = frame.outerRef;
  }
  return undefined;
}

function setVariable(name, value, frameId, frames) {
  let currentId = frameId;
  while (currentId !== null && currentId !== undefined) {
    const frame = frames.find(f => f.id === currentId);
    if (!frame) break;
    
    if (name in frame.variables) {
      frame.variables[name].value = value;
      return;
    }
    currentId = frame.outerRef;
  }
  
  const initialFrame = frames.find(f => f.id === frameId);
  if (initialFrame) {
    initialFrame.variables[name] = createVariable(value, 'var', false, true);
  }
}

function cloneState(callStack, webApis, callbackQueue, consoleOutput) {
  return {
    callStack: JSON.parse(JSON.stringify(callStack)),
    webApis: JSON.parse(JSON.stringify(webApis)),
    callbackQueue: JSON.parse(JSON.stringify(callbackQueue)),
    consoleOutput: JSON.parse(JSON.stringify(consoleOutput))
  };
}

function makeStep(id, type, currentLine, nextLine, callStack, webApis, callbackQueue, consoleOutput, arrows, description) {
  const cloned = cloneState(callStack, webApis, callbackQueue, consoleOutput);
  
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

export function interpretAST(ast, source) {
  const steps = [];
  let stepId = 0;
  const callStack = [];
  const webApis = [];
  const callbackQueue = [];
  const consoleOutput = [];
  let timeoutId = 0;

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
  pushStep(StepType.GLOBAL_CTX_CREATE, null, null, [], 'Creating global execution context');
  const globalFrame = createFrame('global', 'Global', 'global', null);
  globalFrame.isActive = true;
  callStack.push(globalFrame);

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
        globalFrame.variables[node.id.name] = createVariable('[Function]', 'var', true, true);
        pushStep(StepType.FN_HOIST, node.loc?.start?.line, null, [], `Hoisting function ${node.id.name}`);
      }
    }
  }

  function executeNode(node) {
    if (!node) return;
    
    switch (node.type) {
      case 'VariableDeclaration':
        for (const decl of node.declarations) {
          // evaluate init expression (evalExpr to be implemented)
          // const initValue = evalExpr(decl.init, currentFrame); 
          
          if (node.kind === 'var') {
            // update hoisted variable value, set initialized=true, push ASSIGN
          } else if (node.kind === 'let' || node.kind === 'const') {
            // add to current frame, push LET_CONST_DECLARE
          }
        }
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