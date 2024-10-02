import * as vscode from "vscode";

export function getExcludedDirectories(): string[] {
  const config = vscode.workspace.getConfiguration("qualytics");
  return config.get<string[]>("excludedDirectories", [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
  ]);
}

export const EXTENSION_NAME = "Advanced Code Metric Visualization";
export const OUTPUT_CHANNEL_NAME = "Code Metric Visualization";
export const COMMAND_NAME = "qualytics.showMetrics";
