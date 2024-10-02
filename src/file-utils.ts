import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { getExcludedDirectories } from "./config";

export async function getTypeScriptFiles(
  dir: string,
  baseDir: string
): Promise<string[]> {
  const excludedDirs = getExcludedDirectories();

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
