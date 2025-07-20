# Variables de Entorno Adicionales Requeridas

## CRÍTICAS - Agregar en Vercel Dashboard:

### Contratos Desplegados
```bash
NEXT_PUBLIC_CRYPTOGIFT_NFT_ADDRESS=0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3
NEXT_PUBLIC_REF_TREASURY_ADDRESS=0x75341Ce1E98c24F33b0AB0e5ABE3AaaC5b0A8f01
NEXT_PUBLIC_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x000000006551c19487814612e58FE06813775758
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x2D25602551487C3f3354dD80D76D54383A243358
```

### Private Key para Deployments (Server-only)
```bash
PRIVATE_KEY_DEPLOY=tu_private_key_aqui
```

### APIs Externas (Opcionales por ahora)
```bash
PHOTOROOM_API_KEY=tu_photoroom_key
PINATA_JWT=tu_pinata_jwt
```

## INSTRUCCIONES:

1. Ve a Vercel Dashboard → tu proyecto → Settings → Environment Variables
2. Agrega cada variable con Environment: Production, Preview, Development
3. Para PRIVATE_KEY_DEPLOY usa tu private key de ThirdWeb
4. Haz redeploy después de agregar todas