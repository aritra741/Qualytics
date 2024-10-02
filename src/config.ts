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
