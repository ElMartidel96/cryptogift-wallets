# Pasos para Crear Nuevo Contrato NFT

## Problema Actual
El contrato `0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3` falla con "execution reverted" para cualquier método.

## Solución: Nuevo NFT Collection Contract

### 1. Acceder a ThirdWeb Dashboard
- Ir a https://thirdweb.com/dashboard
- Conectar wallet: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a

### 2. Deploy NFT Collection
- Seleccionar "NFT Collection" 
- Network: Base Sepolia (Chain ID: 84532)
- Configuración:
  - Name: "CryptoGift NFT Wallets"
  - Symbol: "CGIFT"
  - Description: "NFT-Wallets with ERC-6551 Token Bound Accounts"
  - Primary Sales Recipient: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a

### 3. Configurar Permisos
- Owner: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a
- Minter Role: 0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a

### 4. Actualizar Environment Variables
```env
# Nuevo contrato NFT Collection
NEXT_PUBLIC_NFT_DROP_ADDRESS=<nueva_direccion_contrato>
NFT_DROP=<nueva_direccion_contrato>
```

### 5. Método de Minting
NFT Collection usa: `mintTo(address to, string memory uri)`

### 6. Ventajas del NFT Collection
- Minting directo sin restricciones
- Soporte nativo para mintTo
- Sin parámetros complejos como claim
- Compatible con ERC-6551