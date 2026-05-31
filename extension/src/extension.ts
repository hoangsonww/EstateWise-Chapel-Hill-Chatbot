import * as vscode from "vscode";

const WEBSITE_URL = "https://estatewise.vercel.app";
const CHAT_URL = "https://estatewise.vercel.app/chat";
const DOCS_URL = "https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot";

export function activate(context: vscode.ExtensionContext) {
  const commandId = "estatewiseChat.openChat";
  const viewId = "estatewiseChat.chatView";

  const openChat = () => {
    const config = vscode.workspace.getConfiguration("estatewiseChat");
    // read settings
    const panelTitle = config.get<string>("panelTitle", "Estatewise Chat");
    const viewColumnNum = config.get<number>("viewColumn", 1);
    const retainContext = config.get<boolean>("retainContext", true);
    const enableScripts = config.get<boolean>("enableScripts", true);
    const iframeWidth = config.get<string>("iframeWidth", "100%");
    const iframeHeight = config.get<string>("iframeHeight", "100%");

    // map numeric setting → VSCode enum
    let column: vscode.ViewColumn;
    switch (viewColumnNum) {
      case 1:
        column = vscode.ViewColumn.One;
        break;
      case 2:
        column = vscode.ViewColumn.Two;
        break;
      case 3:
        column = vscode.ViewColumn.Three;
        break;
      default:
        column = vscode.ViewColumn.Active;
    }

    const panel = vscode.window.createWebviewPanel(
      "estatewiseChat",
      panelTitle,
      column,
      {
        enableScripts,
        retainContextWhenHidden: retainContext,
      },
    );

    panel.webview.html = getWebviewContent(iframeWidth, iframeHeight);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(commandId, openChat),
    vscode.window.registerWebviewViewProvider(
      viewId,
      new EstatewiseChatViewProvider(context.extensionUri),
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  if (
    vscode.workspace
      .getConfiguration("estatewiseChat")
      .get<boolean>("openOnStartup", false)
  ) {
    openChat();
  }
}

export function deactivate() {}

/**
 * Renders the branded EstateWise panel that lives in the Activity Bar sidebar.
 * Uses a Webview (instead of a TreeView) so the hero text, primary button and
 * secondary links can be styled with VS Code theme variables.
 */
class EstatewiseChatViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    const { webview } = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "images")],
    };

    webview.html = this.getSidebarHtml(webview);

    webview.onDidReceiveMessage((message: { type?: string }) => {
      switch (message?.type) {
        case "openChat":
          void vscode.commands.executeCommand("estatewiseChat.openChat");
          break;
        case "openWebsite":
          void vscode.env.openExternal(vscode.Uri.parse(WEBSITE_URL));
          break;
        case "openDocs":
          void vscode.env.openExternal(vscode.Uri.parse(DOCS_URL));
          break;
      }
    });
  }

  private getSidebarHtml(webview: vscode.Webview): string {
    const logoUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "images", "logo.png"),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; img-src ${webview.cspSource} https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Estatewise Chat</title>
  <style>
    :root {
      --ew-radius: 8px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px 14px 18px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      text-align: center;
    }
    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      object-fit: contain;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }
    .title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.2px;
      margin: 2px 0 0;
    }
    .tagline {
      margin: 0;
      max-width: 220px;
      line-height: 1.45;
      color: var(--vscode-descriptionForeground);
    }
    .primary {
      width: 100%;
      margin-top: 14px;
      padding: 9px 12px;
      border: none;
      border-radius: var(--ew-radius);
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      transition: background 0.12s ease;
    }
    .primary:hover {
      background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
    .primary:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
    .links {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.25));
    }
    .link {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      color: var(--vscode-textLink-foreground);
    }
    .link:hover {
      color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
      text-decoration: underline;
    }
    .link:focus-visible {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <div class="hero">
    <img class="logo" src="${logoUri}" alt="EstateWise logo" />
    <h1 class="title">EstateWise Chat</h1>
    <p class="tagline">Chat about Chapel Hill real estate without leaving your editor.</p>
  </div>

  <button class="primary" id="openChat">💬&nbsp; Open Chat</button>

  <div class="links">
    <button class="link" id="openWebsite">↗ Website</button>
    <button class="link" id="openDocs">↗ Docs</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const post = (type) => vscode.postMessage({ type });
    document.getElementById("openChat").addEventListener("click", () => post("openChat"));
    document.getElementById("openWebsite").addEventListener("click", () => post("openWebsite"));
    document.getElementById("openDocs").addEventListener("click", () => post("openDocs"));
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getWebviewContent(width: string, height: string): string {
  const chatUrl = CHAT_URL;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; frame-src ${chatUrl}; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Estatewise Chat</title>
  <style>
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      overflow: hidden;
    }
    iframe {
      border: none;
      width: ${width};
      height: ${height};
    }
  </style>
</head>
<body>
  <iframe src="${chatUrl}"></iframe>
</body>
</html>`;
}
