# ForgeAI Desktop

ForgeAI Desktop wraps the existing React/Vite application in a native Electron window.

## Development

From the repository root:

```powershell
pnpm install
pnpm build:web
pnpm --filter @forgeai/desktop dev
```

For live frontend development, start Vite separately with:

```powershell
pnpm dev:web
```

Then launch the desktop shell with:

```powershell
$env:FORGEAI_DEV_URL="http://127.0.0.1:5173"
pnpm --filter @forgeai/desktop dev
```

## Packaging

Build the web app first, then create the desktop distributables:

```powershell
pnpm build:web
pnpm --filter @forgeai/desktop make
```

The generated installers/archives are placed in the repository's `apps/desktop/out` directory.
