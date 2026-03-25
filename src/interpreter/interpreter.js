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

export {};