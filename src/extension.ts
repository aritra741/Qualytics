import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { calculateMetrics } from "./metrics";
import { getTypeScriptFiles } from "./file-utils";
import { showMetricsVisualization } from "./webview";
import { FileMetrics } from "./types";
import { EXTENSION_NAME, OUTPUT_CHANNEL_NAME, COMMAND_NAME } from "./constants";

export function activate(context: vscode.ExtensionContext) {
  console.log(`${EXTENSION_NAME} is now active!`);

  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

  let disposable = vscode.commands.registerCommand(COMMAND_NAME, async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders) {
      const metrics: FileMetrics = await analyzeWorkspace(
        workspaceFolders,
        outputChannel
      );
      console.log("Calculated metrics:", JSON.stringify(metrics, null, 2));
      showMetricsVisualization(metrics, context.extensionUri);
    } else {
      vscode.window.showInformationMessage("No workspace folder found");
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
}

async function analyzeWorkspace(
  workspaceFolders: readonly vscode.WorkspaceFolder[],
  outputChannel: vscode.OutputChannel
): Promise<FileMetrics> {
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
              const fullPath = path.join(workspaceFolders[0].uri.fsPath, file);
              const content = await fs.promises.readFile(fullPath, "utf-8");
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

  return metrics;
}
