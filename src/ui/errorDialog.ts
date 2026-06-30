import type { ExtensionContext } from "@ableton-extensions/sdk";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function showErrorDialog(
  context: ExtensionContext<"1.0.0">,
  title: string,
  message: string,
): Promise<void> {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
      }

      body {
        margin: 0;
        padding: 18px;
      }

      h1 {
        font-size: 17px;
        font-weight: 650;
        margin: 0 0 12px;
      }

      p {
        line-height: 1.45;
        margin: 0 0 18px;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }

      button {
        min-width: 88px;
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <div class="actions">
      <button id="ok" type="button">OK</button>
    </div>
    <script>
      function closeDialog() {
        const message = { method: "close_and_send", params: ["ok"] };
        if (window.webkit?.messageHandlers?.live) {
          window.webkit.messageHandlers.live.postMessage(message);
          return;
        }
        if (window.chrome?.webview) {
          window.chrome.webview.postMessage(message);
        }
      }

      document.getElementById("ok").addEventListener("click", closeDialog);
    </script>
  </body>
</html>`;

  await context.ui.showModalDialog(`data:text/html,${encodeURIComponent(html)}`, 420, 220);
}
