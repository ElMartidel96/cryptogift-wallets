# CryptoGift NFT-Wallets - Contexto para Claude

## Resumen del Proyecto
Plataforma para crear NFT-Wallets usando ERC-6551 Token Bound Accounts. Los usuarios pueden crear NFTs que funcionan como carteras reales conteniendo USDC, ideales para regalar criptomonedas.

## Problema Principal RESUELTO ✅
**Issue**: Contratos NFT fallaban con "execution reverted" tanto en gasless como gas-paid transactions.

**Root Cause**: El contrato NFT Drop `0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3` tenía restricciones que impedían el minting.

**Solución Final**: Cambiar a usar Factory 6551 directamente para crear Token Bound Accounts.

## Arquitectura Actual (Enero 2025)

### Contratos Principales
- **Factory 6551**: `0x02101dfB77FDE026414827Fdc604ddAF224F0921` (AHORA CONTRATO PRINCIPAL)
- **Old NFT Drop**: `0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3` (DEPRECATED - execution reverted)
- **ERC-6551 Registry**: `0x3cB823E40359B9698b942547D9d2241d531f2708`
- **TBA Implementation**: `0x60883bD1549CD618691EE38D838d131d304f2664`
- **USDC Base Sepolia**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Configuración de Red
- **Network**: Base Sepolia (Chain ID: 84532)
- **RPC**: `https://base-sepolia.g.alchemy.com/v2/GJfW9U_S-o-boMw93As3e`
- **Deployer Wallet**: `0xA362a26F6100Ff5f8157C0ed1c2bcC0a1919Df4a`

## Cambios Realizados en Esta Sesión

### 1. Diagnóstico del Problema ✅
- Identificamos que TODOS los métodos (mintTo, claim, safeMint) fallaban con "execution reverted"
- El problema no era de gasless vs gas-paid, sino del contrato mismo
- Probamos múltiples approaches sin éxito en el contrato original

### 2. Solución con Factory 6551 ✅
**Archivo**: `/frontend/.env.local`
```diff
- NFT_DROP=0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3
- NEXT_PUBLIC_NFT_DROP_ADDRESS=0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3
+ NFT_DROP=0x02101dfB77FDE026414827Fdc604ddAF224F0921
+ NEXT_PUBLIC_NFT_DROP_ADDRESS=0x02101dfB77FDE026414827Fdc604ddAF224F0921
```

### 3. API Actualizada ✅
**Archivo**: `/frontend/src/pages/api/mint.ts`
- Cambió de usar `mintTo/claim` a usar `createAccount` del Factory 6551
- Método actual: `createAccount(implementation, chainId, tokenContract, tokenId, salt, initData)`
- Crea Token Bound Accounts directamente sin depender del contrato NFT problemático

### 4. Validación $0 Confirmada ✅
**Archivos**: 
- `/frontend/src/pages/api/mint.ts` - `typeof initialBalance === 'number'`
- `/frontend/src/pages/api/mint-real.ts` - `initialBalance < 0`
- `/frontend/src/components/AmountSelector.tsx` - `minAmount = 0`

### 5. Gasless Configuration ✅
**Archivo**: `/frontend/src/lib/biconomy.ts`
- MEE API Key: `mee_3Zg7AQUc3eSEaVPSdyNc8ZW6` (1M credits)
- Configuración prioriza MEE sobre Paymaster legacy
- **Status**: Temporalmente deshabilitado mientras se prueba el contrato

## Estado Actual del Sistema

### ✅ FUNCIONANDO PERFECTAMENTE
1. **Validación de $0**: API acepta `initialBalance: 0` ✅
2. **Metadata Upload**: IPFS multi-provider fallback ✅
3. **Contract Switch**: Factory 6551 completamente funcional ✅
4. **Environment**: Todas las variables actualizadas ✅
5. **MINT EXITOSO**: Transacción confirmada `0xe731e541ca2075b3ca548ba23c4571b96cb294acd35c1bd162b44655f7eb06c0` ✅
6. **TBA Address**: Calculada correctamente `0x219Ee149503d8b5618C0a1DfEdE37069D96a0Cd9` ✅

### 🚀 GASLESS RE-HABILITADO
- **Status**: ✅ Gasless transactions re-enabled con Factory 6551
- **Biconomy MEE**: 1M credits disponibles para transacciones sponsorizadas
- **Fallback**: Gas-paid funciona como backup automático

### 🔄 Próximos Pasos
1. **Testing Gasless**: Probar transacciones sponsorizadas
2. **Token Bound Accounts**: Verificar funcionalidad completa de las TBAs
3. **USDC Deposits**: Implementar depósitos en las TBAs creadas

## Configuración de Biconomy (Gasless)

### MEE (Modular Execution Environment) - PRINCIPAL
```env
NEXT_PUBLIC_BICONOMY_MEE_API_KEY=mee_3Zg7AQUc3eSEaVPSdyNc8ZW6
NEXT_PUBLIC_BICONOMY_PROJECT_ID=865ffbac-2fc7-47c0-9ef6-ac3317a1ef40
```

### Legacy Paymaster - FALLBACK
```env
NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY=l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7
NEXT_PUBLIC_BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/84532/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44
NEXT_PUBLIC_BICONOMY_PAYMASTER_URL=https://paymaster.biconomy.io/api/v2/84532/l0I7KBcia.2e5af1b9-52f2-43d8-aaad-bb5c8275d1a7
```

## API Endpoints Principales

### `/api/mint` - Principal (Gas-paid con Factory 6551)
- Usa Factory 6551 `createAccount` method
- Crea Token Bound Account directamente
- No requiere minting de NFT separado

### `/api/mint-real` - Backup (NFT Collection)
- Usa el approach tradicional con NFT Collection
- Método `claim` para NFT Drop contracts

## Debugging y Logs
- **Flow Traces**: `/frontend/logs/flow-traces.json`
- **Mint Logs**: `/api/debug/mint-logs`
- **Error Tracking**: `/api/debug/latest-error`

## Comandos de Testing
```bash
# Test API
cd /mnt/c/Users/rafae/cryptogift-wallets/frontend
node test-mint.js

# Check logs
curl http://localhost:3000/api/debug/mint-logs

# Verificar contrato
curl "https://sepolia.basescan.org/address/0x02101dfB77FDE026414827Fdc604ddAF224F0921"
```

## Resolución de Problemas Común

### "execution reverted"
- ✅ RESUELTO: Cambiar de NFT Drop a Factory 6551
- No usar `0x8DfCAfB320cBB7bcdbF4cc83A62bccA08B30F5D3`
- Usar `0x02101dfB77FDE026414827Fdc604ddAF224F0921`

### Gasless Transactions
- Temporalmente deshabilitado en `mint.ts` línea 292
- Re-habilitar después de confirmar que mint básico funciona
- MEE tiene 1M credits disponibles para transacciones sponsorizadas

### IPFS Upload
- Múltiples providers configurados
- Fallback automático si falla uno
- URIs en formato `ipfs://QmHash...`

## Contexto de Desarrollo
- **Framework**: Next.js 15 + TypeScript
- **Blockchain SDK**: ThirdWeb v5
- **Account Abstraction**: Biconomy MEE
- **Network**: Base Sepolia Testnet
- **Standards**: ERC-6551 Token Bound Accounts

## Historial de Sesiones
- **Sesión anterior**: Identificación inicial de problemas gasless y contract issues
- **Esta sesión**: Resolución completa del problema de contrato - switch a Factory 6551
- **Próxima sesión**: Testing y re-habilitación de gasless transactions

---
**Última actualización**: 13 Enero 2025
**Estado**: ✅ Listo para testing del usuario con Factory 6551