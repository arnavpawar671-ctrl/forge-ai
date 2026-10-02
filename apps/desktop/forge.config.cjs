module.exports = {
  packagerConfig: {
    name: "ForgeAI",
    executableName: "ForgeAI",
    appBundleId: "ai.forgeai.desktop",
    asar: true,
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "forgeai",
        setupExe: "ForgeAI-Setup.exe",
        authors: "ForgeAI",
        description: "ForgeAI — AI software engineer for developers.",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "darwin", "linux"],
    },
  ],
};
