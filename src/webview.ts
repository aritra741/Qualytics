import * as vscode from "vscode";
import { FileMetrics } from "./types";

export function showMetricsVisualization(
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

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
