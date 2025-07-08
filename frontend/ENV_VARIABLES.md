# Variables de Entorno Requeridas

## ThirdWeb Configuration
Necesitas configurar estas variables en Vercel Dashboard:

### Para el Cliente (Frontend)
```
NEXT_PUBLIC_TW_CLIENT_ID=9183b572b02ec88dd4d8f20c3ed847d3
```

### Para APIs de Servidor (Backend)
```
TW_CLIENT_ID=9183b572b02ec88dd4d8f20c3ed847d3
TW_SECRET_KEY=AUoUv6y69TiDDvfKVOQLTFd8JvFmk0zjPLCTOPGLnh_zbPgmrUmWXCXsYAWPvUrWAU7VhZGvDStMRv6Um3pXZA
```

## Otras Variables Necesarias
```
NEXT_PUBLIC_NFT_DROP_ADDRESS=0xYourNFTDropAddress
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_REF_TREASURY_ADDRESS=0xYourTreasuryAddress
NEXT_PUBLIC_CREATION_FEE_PERCENT=4
PRIVATE_KEY_DEPLOY=YourPrivateKeyForDeployments
```

## Importante
- Las variables `NEXT_PUBLIC_*` se usan en el cliente (components, pages)
- Las variables sin prefijo se usan en APIs de servidor (páginas en `/api/`)
- Ambas versiones del CLIENT_ID deben tener el mismo valor