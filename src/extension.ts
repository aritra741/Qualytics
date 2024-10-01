import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  parse,
  TSESTree,
  AST_NODE_TYPES,
} from "@typescript-eslint/typescript-estree";

interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  depthOfInheritance: number;
  classCount: number;
  methodCount: number;
  averageMethodComplexity: number;
}

interface FileMetrics {
  [filename: string]: CodeMetrics;
}

interface HalsteadMetrics {
  volume: number;
}

type ASTNode = TSESTree.Node;

function isASTNode(node: any): node is ASTNode {
  return node && typeof node === "object" && "type" in node;
}

function traverseAST(
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

export function activate(context: vscode.ExtensionContext) {
  console.log("Advanced Code Metric Visualization extension is now active!");

  const outputChannel = vscode.window.createOutputChannel(
    "Code Metric Visualization"
  );

  let disposable = vscode.commands.registerCommand(
    "qualytics.showMetrics",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;

      if (workspaceFolders) {
        const metrics: FileMetrics = {};

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Codebase",
            cancellable: false,
          },
          async (progress) => {
            let totalFiles = 0;
            let processedFiles = 0;

            // Collect all TypeScript files from all workspace folders
            const allFiles: string[] = [];
            for (const folder of workspaceFolders) {
              const rootPath = folder.uri.fsPath;
              const files = await getTypeScriptFiles(rootPath, rootPath);
              allFiles.push(...files);
            }

            totalFiles = allFiles.length;

            // Process files in batches to avoid overwhelming the system
            const batchSize = 10; // Adjust as needed
            for (let i = 0; i < totalFiles; i += batchSize) {
              const batch = allFiles.slice(i, i + batchSize);
              await Promise.all(
                batch.map(async (file) => {
                  try {
                    const fullPath = path.join(
                      workspaceFolders[0].uri.fsPath,
                      file
                    );
                    const content = await fs.promises.readFile(
                      fullPath,
                      "utf-8"
                    );
                    const fileMetrics = calculateMetrics(content, file);
                    metrics[file] = fileMetrics;
                  } catch (error: any) {
                    outputChannel.appendLine(
                      `Error processing file ${file}: ${error.message}`
                    );
                  } finally {
                    processedFiles++;
                    progress.report({
                      increment: (processedFiles / totalFiles) * 100,
                      message: `Processing ${file}`,
                    });
                  }
                })
              );
            }
          }
        );

        console.log("Calculated metrics:", JSON.stringify(metrics, null, 2));

        showMetricsVisualization(metrics, context.extensionUri);
      } else {
        vscode.window.showInformationMessage("No workspace folder found");
      }
    }
  );

  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
}

/**
 * Recursively retrieves all TypeScript files in the given directory.
 * @param dir The directory to search.
 * @returns A promise that resolves to an array of file paths.
 */
async function getTypeScriptFiles(
  dir: string,
  baseDir: string
): Promise<string[]> {
  const config = vscode.workspace.getConfiguration("qualytics");
  const excludedDirs = config.get<string[]>("excludedDirectories", [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
  ]);

  let results: string[] = [];
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (entry.isDirectory()) {
        if (!excludedDirs.includes(entry.name)) {
          results = results.concat(await getTypeScriptFiles(fullPath, baseDir));
        }
      } else if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
        results.push(relativePath);
      }
    }
  } catch (error: any) {
    console.error(`Error reading directory ${dir}: ${error.message}`);
  }
  return results;
}

/**
 * Calculates various code metrics for the given code.
 * @param code The code content.
 * @param filePath The path to the file (for error messages).
 * @returns An object containing code metrics.
 */
function calculateMetrics(code: string, filePath: string): CodeMetrics {
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

/**
 * Counts the logical lines of code in the AST by counting executable statements.
 * @param ast The abstract syntax tree of the code.
 * @returns The number of logical lines of code.
 */
function countLogicalLinesOfCode(ast: TSESTree.Program): number {
  let loc = 0;
  traverseAST(ast, (node) => {
    if (isExecutableNode(node)) {
      loc++;
    }
  });
  return loc;
}

/**
 * Determines if a node is an executable statement.
 * @param node The AST node.
 * @returns True if the node is executable; false otherwise.
 */
function isExecutableNode(node: TSESTree.Node): boolean {
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

function calculateCyclomaticComplexity(ast: TSESTree.Program): number {
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

/**
 * Calculates Halstead metrics for the given AST.
 * @param ast The abstract syntax tree of the code.
 * @returns An object containing the Halstead volume.
 */
function calculateHalsteadMetrics(ast: TSESTree.Program): HalsteadMetrics {
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

/**
 * Calculates the maintainability index based on volume, complexity, and lines of code.
 * @param volume The Halstead volume.
 * @param complexity The cyclomatic complexity.
 * @param linesOfCode The number of logical lines of code.
 * @returns The maintainability index.
 */
function calculateMaintainabilityIndex(
  volume: number,
  complexity: number,
  linesOfCode: number
): number {
  const volumeLog = volume > 0 ? Math.log(volume) : 0;
  const locLog = linesOfCode > 0 ? Math.log(linesOfCode) : 0;

  const mi = 171 - 5.2 * volumeLog - 0.23 * complexity - 16.2 * locLog;
  return Math.max(0, (mi * 100) / 171);
}

/**
 * Analyzes the class structure in the AST to determine class count and inheritance depth.
 * @param ast The abstract syntax tree of the code.
 * @returns An object containing class count and maximum inheritance depth.
 */
function analyzeClassStructure(ast: TSESTree.Program): {
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

/**
 * Analyzes the function structure in the AST to determine function count.
 * @param ast The abstract syntax tree of the code.
 * @returns An object containing the function count.
 */
function analyzeFunctionStructure(ast: TSESTree.Program): {
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

/**
 * Displays the code metrics visualization in a webview.
 * @param metrics The code metrics to visualize.
 * @param extensionUri The URI of the extension.
 */
function showMetricsVisualization(
  metrics: FileMetrics,
  extensionUri: vscode.Uri
) {
  const panel = vscode.window.createWebviewPanel(
    "codeMetricVisualization",
    "Code Metrics Visualization",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(extensionUri, "media"),
        vscode.Uri.joinPath(extensionUri, "node_modules"),
      ],
    }
  );

  panel.webview.html = getWebviewContent(metrics, panel.webview, extensionUri);
}

/**
 * Generates the HTML content for the webview.
 * @param metrics The code metrics to include in the webview.
 * @param webview The webview instance.
 * @param extensionUri The URI of the extension.
 * @returns The HTML content as a string.
 */
function getWebviewContent(
  metrics: FileMetrics,
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "main.js")
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "media", "style.css")
  );
  const chartjsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      "node_modules",
      "chart.js",
      "dist",
      "chart.min.js"
    )
  );

  const nonce = getNonce();

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${
          webview.cspSource
        } data:; script-src 'nonce-${nonce}' ${webview.cspSource}; style-src ${
    webview.cspSource
  } 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Metrics Visualization</title>
        <link href="${styleUri}" rel="stylesheet">
    </head>
    <body>
        <h1>Code Metrics Visualization</h1>
        <div id="metrics-summary"></div>
        <div id="charts">
            <canvas id="cyclomatic-complexity-chart"></canvas>
            <canvas id="maintainability-index-chart"></canvas>
            <canvas id="loc-vs-complexity-chart"></canvas>
        </div>
        <script nonce="${nonce}">
            const metrics = ${JSON.stringify(metrics)};
        </script>
        <script nonce="${nonce}" src="${chartjsUri}"></script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

/**
 * Generates a nonce for Content Security Policy.
 * @returns A random string.
 */
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Deactivates the extension.
 */
export function deactivate() {
  // Clean up resources if needed
}
