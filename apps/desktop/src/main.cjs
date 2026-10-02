const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const isDev = !app.isPackaged;
const rendererUrl = process.env.FORGEAI_DEV_URL || "http://127.0.0.1:5173";

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#08070d",
    title: "ForgeAI",
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

  if (isDev) {
    window.loadURL(rendererUrl);
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    window.loadFile(path.join(process.resourcesPath, "web", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
