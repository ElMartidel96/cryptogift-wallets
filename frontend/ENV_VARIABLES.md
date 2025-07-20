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
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0xYourCryptoGiftNFTAddress
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_REF_TREASURY_ADDRESS=0xYourTreasuryAddress
NEXT_PUBLIC_CREATION_FEE_PERCENT=4
PRIVATE_KEY_DEPLOY=YourPrivateKeyForDeployments

# ERC-6551 Configuration
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x000000006551c19487814612e58FE06813775758
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x2d25602551487c3f3354dd80d76d54383a243358
```

**IMPORTANTE**: Se cambió `NEXT_PUBLIC_NFT_DROP_ADDRESS` por `NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS` para unificar las direcciones de contrato y evitar inconsistencias en metadata.

## Importante
- Las variables `NEXT_PUBLIC_*` se usan en el cliente (components, pages)
- Las variables sin prefijo se usan en APIs de servidor (páginas en `/api/`)
- Ambas versiones del CLIENT_ID deben tener el mismo valor