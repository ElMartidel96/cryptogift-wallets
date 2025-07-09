# Instrucciones de Deployment en Vercel

## Configuración Manual Requerida

Este proyecto requiere configuración manual en el dashboard de Vercel debido a que el código Next.js está en el subdirectorio `frontend/`.

### Pasos para Configurar:

1. **Ir a Project Settings** en el dashboard de Vercel
2. **En la sección "Build & Development Settings"**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (debería detectarse automáticamente)
   - **Build Command**: `pnpm install --no-frozen-lockfile && pnpm run build`
   - **Install Command**: `pnpm install --no-frozen-lockfile`
   - **Output Directory**: `.next`

3. **En la sección "Environment Variables"**:
   - `VERCEL_FORCE_NO_BUILD_CACHE=1` (ya configurado en vercel.json)

### Estructura del Proyecto:

```
cryptogift-wallets/
├── frontend/               <- Root Directory para Vercel
│   ├── src/
│   ├── public/
│   ├── package.json       <- Aquí está Next.js
│   └── ...
├── contracts/
├── vercel.json            <- Configuración mínima
└── .vercelignore          <- Ignora todo excepto frontend/
```

### Notas Importantes:

- **NO usar comandos custom** en vercel.json si se configura Root Directory manualmente
- **Vercel detectará automáticamente** Next.js una vez configurado el Root Directory
- **El lockfile se regenerará** automáticamente con --no-frozen-lockfile