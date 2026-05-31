# Estatewise Chat – VS Code Extension

Embed the Estatewise chatbot directly into your VS Code editor and get instant property insights without ever leaving your workspace!

## Features

- **One‑click access** to your Estatewise chatbot via the Command Palette.
- **Branded Activity Bar sidebar** — a styled Home view with a logo, tagline, a primary **Open Chat** button, and quick links to the website and docs.
- **Persistent Webview panel** with retained context when hidden or reopened.
- **Sandboxed iframe** for secure, CSP‑compliant loading of `https://estatewise.vercel.app/chat`.
- **Customizable Webview options** (scripts enabled, context retention).
- **Zero backend code** in the extension — all logic lives in the Estatewise app itself.

## VS Code Marketplace

Don't want to build it yourself? Search for "Estatewise Chat" in the [VS Code Marketplace](https://marketplace.visualstudio.com/vscode) and install it directly!

**Here is the link to it, directly: [Estatewise Chat Extension](https://marketplace.visualstudio.com/items?itemName=hoangsonw.estatewise-chat).**

## Launch with VS Code

We also provide a `.vscode/launch.json` configuration to easily run and debug the extension in a new Extension Development Host instance. This allows you to test changes live without needing to repackage every time.

To use it:

1. Open the extension folder in VS Code.
2. Press `F5` to launch the Extension Development Host. Alternatively, open the **Run and Debug** sidebar and select the "Run Extension" configuration.
3. In the new host, open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P) and run **Estatewise Chat: Open Chat**.
4. The Estatewise chatbot will load in a side panel, ready for your queries.
5. You can keep the panel open permanently or hide it; your chat context will be preserved.

This setup allows you to develop and test the extension interactively, making it easy to iterate on features and fixes.

## Prerequisites

- **VS Code** v1.50.0 or later  
- **Node.js** & **npm**  
- **vsce** packaging tool (install with `npm install ‑g vsce`)

## VSIX Installation

1. **Clone this repo** and navigate into the extension folder:
  ```bash
   git clone https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git
   cd EstateWise-Chapel-Hill-Chatbot/extension
  ```

2. **Install dependencies**:

  ```bash
  npm install
  ```

3. **Compile** the TypeScript sources:

  ```bash
  npm run compile
  ```

4. **Package** as a VSIX:

  ```bash
  vsce package
  ```

   This generates `estatewise-chat-0.0.1.vsix`.

5. **Install the VSIX**:

   * **CLI**:

     ```bash
     code --install-extension estatewise-chat-0.0.1.vsix
     ```
   * **VS Code UI**:
     Open the Extensions view → click the “...” menu → **Install from VSIX** → select the generated `.vsix` file.

## Usage

1. Click the **Estatewise Chat** icon in the VS Code Activity Bar.
2. In the **Home** sidebar view, click **Open Chat** to launch the chat as an editor panel (or use the **Website** / **Docs** links). You can also open the **Command Palette** (Ctrl+Shift+P / Cmd+Shift+P) and run **Estatewise Chat: Open Chat**.
3. Start typing your queries—everything runs through the hosted app at `https://estatewise.vercel.app/chat`.

> **Tip:** You can keep the panel open permanently or hide it; your chat context will be preserved.

## Development

* **Watch mode**

  ```bash
  npm run watch
  ```

  Recompiles on file changes.

* **Debug in VS Code**

  1. Press F5 to launch a new Extension Development Host.
  2. In that host, open the Command Palette and run your command.

* **Re‑package**

  ```bash
  npm run package
  ```

## Extension Settings

Open **Settings** → **Extensions** → **Estatewise Chat** to configure:

| Setting                       | Type     | Default       | Description                                                      |
|-------------------------------|----------|---------------|------------------------------------------------------------------|
| `estatewiseChat.panelTitle`   | string   | `Estatewise Chat`   | Title of the chat panel.                             |
| `estatewiseChat.viewColumn`   | number   | `1`           | Which editor column to open the panel in (0=Active, 1–3).        |
| `estatewiseChat.retainContext`| boolean  | `true`        | Keep chat context alive when the panel is hidden.               |
| `estatewiseChat.enableScripts`| boolean  | `true`        | Allow scripts to run inside the Webview.                       |
| `estatewiseChat.iframeWidth`  | string   | `100%`        | CSS width of the embedded chat iframe (e.g. `80%` or `600px`).  |
| `estatewiseChat.iframeHeight` | string   | `100%`        | CSS height of the embedded chat iframe (e.g. `80%` or `500px`). |
| `estatewiseChat.openOnStartup`| boolean  | `false`       | Open the chat panel automatically when VS Code starts.          |

## Troubleshooting

* **Blank panel**: ensure you’re online and that `https://estatewise.vercel.app/chat` is reachable.
* **CSP errors**: check that the URL in `getWebviewContent()` matches exactly the iframe `src` and the CSP frame‑src directive.

## License

This extension is MIT‑licensed. See [LICENSE](../LICENSE) for details.

---

## About EstateWise

EstateWise is a full‑stack AI/ML chatbot and data analytics platform for Chapel Hill real estate. To learn more about the underlying app—its architecture, AI techniques (RAG, Mixture‑of‑Experts, etc.), data analytics pipelines, and deployment—visit the main repo:

👉 [hoangsonww/EstateWise‑Chapel‑Hill‑Chatbot](https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot)
