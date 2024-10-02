import {
  TSESTree,
  parse,
  AST_NODE_TYPES,
} from "@typescript-eslint/typescript-estree";
import { traverseAST, isExecutableNode } from "./ast-utils";
import { CodeMetrics, HalsteadMetrics } from "./types";

export function calculateMetrics(code: string, filePath: string): CodeMetrics {
  let ast: TSESTree.Program;

  try {
    ast = parse(code, {
      loc: true,
      range: true,
      comment: true,
      tokens: true,
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    });
  } catch (error: any) {
    console.error(`Failed to parse ${filePath}: ${error.message}`);
    // Return default values if parsing fails
    return {
      linesOfCode: 0,
      cyclomaticComplexity: 0,
      maintainabilityIndex: 0,
      depthOfInheritance: 0,
      classCount: 0,
      methodCount: 0,
      averageMethodComplexity: 0,
    };
  }

  const linesOfCode = countLogicalLinesOfCode(ast);
  const cyclomaticComplexity = calculateCyclomaticComplexity(ast);
  const halsteadMetrics = calculateHalsteadMetrics(ast);
  const maintainabilityIndex = calculateMaintainabilityIndex(
    halsteadMetrics.volume,
    cyclomaticComplexity,
    linesOfCode
  );
  const classStructure = analyzeClassStructure(ast);
  const functionMetrics = analyzeFunctionStructure(ast);
  const averageMethodComplexity =
    functionMetrics.functionCount > 0
      ? cyclomaticComplexity / functionMetrics.functionCount
      : 0;

  // Ensure no NaN or Infinity values are returned
  return {
    linesOfCode: isFinite(linesOfCode) ? linesOfCode : 0,
    cyclomaticComplexity: isFinite(cyclomaticComplexity)
      ? cyclomaticComplexity
      : 0,
    maintainabilityIndex: isFinite(maintainabilityIndex)
      ? maintainabilityIndex
      : 0,
    depthOfInheritance: isFinite(classStructure.maxInheritanceDepth)
      ? classStructure.maxInheritanceDepth
      : 0,
    classCount: isFinite(classStructure.classCount)
      ? classStructure.classCount
      : 0,
    methodCount: isFinite(functionMetrics.functionCount)
      ? functionMetrics.functionCount
      : 0,
    averageMethodComplexity: isFinite(averageMethodComplexity)
      ? averageMethodComplexity
      : 0,
  };
}

export function countLogicalLinesOfCode(ast: TSESTree.Program): number {
  let loc = 0;
  traverseAST(ast, (node) => {
    if (isExecutableNode(node)) {
      loc++;
    }
  });
  return loc;
}

export function calculateCyclomaticComplexity(ast: TSESTree.Program): number {
  let complexity = 0;
  traverseAST(ast, (node) => {
    switch (node.type) {
      case AST_NODE_TYPES.IfStatement:
      case AST_NODE_TYPES.ForStatement:
      case AST_NODE_TYPES.ForInStatement:
      case AST_NODE_TYPES.ForOfStatement:
      case AST_NODE_TYPES.WhileStatement:
      case AST_NODE_TYPES.DoWhileStatement:
      case AST_NODE_TYPES.CatchClause:
      case AST_NODE_TYPES.ConditionalExpression:
        complexity++;
        break;
      case AST_NODE_TYPES.SwitchCase:
        if ((node as TSESTree.SwitchCase).test !== null) {
          complexity++;
        }
        break;
      case AST_NODE_TYPES.LogicalExpression:
        if (
          ["&&", "||", "??"].includes(
            (node as TSESTree.LogicalExpression).operator
          )
        ) {
          complexity++;
        }
        break;
      case AST_NODE_TYPES.TryStatement:
      case AST_NODE_TYPES.ThrowStatement:
        complexity++;
        break;
    }
  });
  return complexity + 1; // Adding 1 for the default path
}

export function calculateHalsteadMetrics(
  ast: TSESTree.Program
): HalsteadMetrics {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let operatorCount = 0;
  let operandCount = 0;

  traverseAST(ast, (node) => {
    switch (node.type) {
      case AST_NODE_TYPES.BinaryExpression:
      case AST_NODE_TYPES.LogicalExpression:
      case AST_NODE_TYPES.AssignmentExpression:
      case AST_NODE_TYPES.UpdateExpression:
      case AST_NODE_TYPES.UnaryExpression:
        const operatorNode = node as
          | TSESTree.BinaryExpression
          | TSESTree.LogicalExpression
          | TSESTree.AssignmentExpression
          | TSESTree.UpdateExpression
          | TSESTree.UnaryExpression;
        operators.add(operatorNode.operator);
        operatorCount++;
        break;
      case AST_NODE_TYPES.Identifier:
        const identifierNode = node as TSESTree.Identifier;
        operands.add(identifierNode.name);
        operandCount++;
        break;
      case AST_NODE_TYPES.Literal:
        const literalNode = node as TSESTree.Literal;
        operands.add(String(literalNode.value));
        operandCount++;
        break;
      case AST_NODE_TYPES.CallExpression:
        const callNode = node as TSESTree.CallExpression;
        if (callNode.callee.type === AST_NODE_TYPES.Identifier) {
          operators.add(`${callNode.callee.name}()`);
          operatorCount++;
        }
        break;
      case AST_NODE_TYPES.MemberExpression:
        const memberNode = node as TSESTree.MemberExpression;
        if (memberNode.property.type === AST_NODE_TYPES.Identifier) {
          operands.add(memberNode.property.name);
          operandCount++;
        }
        break;
      case AST_NODE_TYPES.ConditionalExpression:
        operators.add("?:");
        operatorCount++;
        break;
      case AST_NODE_TYPES.NewExpression:
        operators.add("new");
        operatorCount++;
        break;
    }
  });

  const n1 = operators.size;
  const n2 = operands.size;
  const N1 = operatorCount;
  const N2 = operandCount;
  const vocabulary = n1 + n2;
  const length = N1 + N2;
  const volume = vocabulary > 0 ? length * Math.log2(vocabulary) : 0;

  return { volume };
}

export function calculateMaintainabilityIndex(
  volume: number,
  complexity: number,
  linesOfCode: number
): number {
  const volumeLog = volume > 0 ? Math.log(volume) : 0;
  const locLog = linesOfCode > 0 ? Math.log(linesOfCode) : 0;

  const mi = 171 - 5.2 * volumeLog - 0.23 * complexity - 16.2 * locLog;
  return Math.max(0, (mi * 100) / 171);
}

export function analyzeClassStructure(ast: TSESTree.Program): {
  classCount: number;
  maxInheritanceDepth: number;
} {
  const inheritanceMap = new Map<string, number>();
  let classCount = 0;

  traverseAST(ast, (node) => {
    if (node.type === AST_NODE_TYPES.ClassDeclaration && node.id) {
      classCount++;
      let depth = 1;

      if (
        node.superClass &&
        node.superClass.type === AST_NODE_TYPES.Identifier
      ) {
        const superClassName = node.superClass.name;
        depth = (inheritanceMap.get(superClassName) || 1) + 1;
      }

      inheritanceMap.set(node.id.name, depth);
    }
  });

  const maxInheritanceDepth = Math.max(...inheritanceMap.values(), 0);
  return { classCount, maxInheritanceDepth };
}

export function analyzeFunctionStructure(ast: TSESTree.Program): {
  functionCount: number;
} {
  let functionCount = 0;

  traverseAST(ast, (node) => {
    if (
      node.type === AST_NODE_TYPES.FunctionDeclaration ||
      node.type === AST_NODE_TYPES.FunctionExpression ||
      node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      node.type === AST_NODE_TYPES.MethodDefinition
    ) {
      functionCount++;
    }
  });

  return { functionCount };
}
