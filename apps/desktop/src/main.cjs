const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

if (process.platform === "win32") {
  app.setAppUserModelId("ai.forgeai.desktop");
}

const isDev = !app.isPackaged;
const rendererUrl = process.env.FORGEAI_DEV_URL || "http://127.0.0.1:5173/";

const DEV_SERVER_RETRIES = 30;
const DEV_SERVER_RETRY_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDevServer(url) {
  for (let attempt = 1; attempt <= DEV_SERVER_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Vite may still be starting. Keep polling.
    }

    await sleep(DEV_SERVER_RETRY_DELAY_MS);
  }

  throw new Error(
    `ForgeAI frontend did not become available at ${url} after ${DEV_SERVER_RETRIES} attempts.`,
  );
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#08070d",
    title: "ForgeAI",
    icon: path.join(__dirname, "../assets/forgeai.ico"),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame) {
        console.error(
          `ForgeAI failed to load ${validatedURL}: ${errorDescription} (${errorCode})`,
        );
      }
    },
  );

  if (isDev) {
    console.log(`Waiting for ForgeAI frontend at ${rendererUrl}...`);
    await waitForDevServer(rendererUrl);
    console.log("ForgeAI frontend is ready.");
    await window.loadURL(rendererUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    await window.loadFile(
      path.join(process.resourcesPath, "dist", "index.html"),
    );
  }
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
