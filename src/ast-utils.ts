import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/typescript-estree";
import { ASTNode } from "./types";

export function traverseAST(
  node: ASTNode,
  enter: (node: ASTNode) => void,
  leave?: (node: ASTNode) => void
) {
  enter(node);

  for (const key in node) {
    if (Object.prototype.hasOwnProperty.call(node, key)) {
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        child.forEach((item) => {
          if (isASTNode(item)) {
            traverseAST(item, enter, leave);
          }
        });
      } else if (isASTNode(child)) {
        traverseAST(child, enter, leave);
      }
    }
  }

  if (leave) {
    leave(node);
  }
}

export function isASTNode(node: any): node is ASTNode {
  return node && typeof node === "object" && "type" in node;
}

export function isExecutableNode(node: TSESTree.Node): boolean {
  return [
    AST_NODE_TYPES.ExpressionStatement,
    AST_NODE_TYPES.VariableDeclaration,
    AST_NODE_TYPES.ReturnStatement,
    AST_NODE_TYPES.IfStatement,
    AST_NODE_TYPES.ForStatement,
    AST_NODE_TYPES.ForInStatement,
    AST_NODE_TYPES.ForOfStatement,
    AST_NODE_TYPES.WhileStatement,
    AST_NODE_TYPES.DoWhileStatement,
    AST_NODE_TYPES.SwitchStatement,
    AST_NODE_TYPES.ThrowStatement,
    AST_NODE_TYPES.TryStatement,
    AST_NODE_TYPES.FunctionDeclaration,
    AST_NODE_TYPES.ClassDeclaration,
    AST_NODE_TYPES.BreakStatement,
    AST_NODE_TYPES.ContinueStatement,
    AST_NODE_TYPES.AwaitExpression,
    AST_NODE_TYPES.YieldExpression,
  ].includes(node.type as AST_NODE_TYPES);
}
