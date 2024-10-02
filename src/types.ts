import { TSESTree } from "@typescript-eslint/typescript-estree";

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  depthOfInheritance: number;
  classCount: number;
  methodCount: number;
  averageMethodComplexity: number;
}

export interface FileMetrics {
  [filename: string]: CodeMetrics;
}

export interface HalsteadMetrics {
  volume: number;
}

export type ASTNode = TSESTree.Node;
