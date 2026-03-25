import * as acorn from 'acorn';

export function parseCode(sourceCode) {
  try {
    const ast = acorn.parse(sourceCode, {
      ecmaVersion: 2020,
      sourceType: 'script',
      locations: true
    });
    return { ast, error: null };
  } catch (error) {
    return {
      ast: null,
      error: {
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      }
    };
  }
}

export function getLineRange(node) {
  return {
    start: node.loc.start.line,
    end: node.loc.end.line
  };
}