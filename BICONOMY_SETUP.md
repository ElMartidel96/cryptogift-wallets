# 🚀 Configuración de Biconomy Gasless Transactions

## Paso 1: Configurar Biconomy Dashboard

### 1.1 Crear cuenta en Biconomy
1. Ve a [Biconomy Dashboard](https://dashboard.biconomy.io/)
2. Haz clic en "Sign Up" o "Get Started"
3. Registrate con tu email
4. Verifica tu email si es necesario

### 1.2 Crear nuevo proyecto
1. Una vez dentro del dashboard, haz clic en "Create New Project"
2. Nombre del proyecto: `CryptoGift Wallets`
3. Descripción: `NFT-wallet creation platform with gasless transactions`
4. Seleccionar red: **Base Sepolia** (Chain ID: 84532)

### 1.3 Configurar Paymaster
1. En tu proyecto, ve a la sección "Paymaster"
2. Haz clic en "Create Paymaster"
3. Seleccionar tipo: **Sponsorship Paymaster**
4. Network: **Base Sepolia** (84532)
5. Depositar fondos: Mínimo 0.01 ETH en Base Sepolia (para testing)

### 1.4 Configurar Bundler
1. Ve a la sección "Bundler"
2. Haz clic en "Create Bundler"
3. Network: **Base Sepolia** (84532)
4. Configurar con las opciones por defecto

### 1.5 Obtener credenciales
Una vez configurado, obtendrás:
- **PAYMASTER_API_KEY**: `bico_xxxxx...` (empieza con "bico_")
- **BUNDLER_URL**: `https://bundler.biconomy.io/api/v2/84532/xxxxx`

## Paso 2: Configurar Variables de Entorno

### 2.1 En Vercel Dashboard
1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Busca tu proyecto `cryptogift-wallets`
3. Ve a Settings → Environment Variables
4. Añade las siguientes variables:

```bash
# Biconomy Configuration
NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY=bico_xxxxx...
NEXT_PUBLIC_BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/84532/xxxxx
```

### 2.2 Para desarrollo local
Si tienes archivo `.env.local`:
```bash
NEXT_PUBLIC_BICONOMY_PAYMASTER_API_KEY=bico_xxxxx...
NEXT_PUBLIC_BICONOMY_BUNDLER_URL=https://bundler.biconomy.io/api/v2/84532/xxxxx
```

## Paso 3: Verificar configuración

### 3.1 Después de configurar las variables:
1. Hacer redeploy en Vercel
2. Ir a la aplicación: https://cryptogift-wallets.vercel.app/
3. Abrir Developer Tools (F12)
4. Buscar en Console: `🔧 Environment Configuration:`
5. Verificar que aparezca: `biconomy: 'Configured'`

### 3.2 Test de gasless transactions
1. Intentar crear un NFT-wallet
2. En la consola debería aparecer:
   - `✅ Gasless NFT minted successfully: tx=0x...`
   - Si falla: `Gasless minting failed, using simulation:`

## Paso 4: Fondos para testing

### 4.1 Obtener ETH en Base Sepolia
1. Ve a [Base Sepolia Faucet](https://faucet.quicknode.com/ethereum/sepolia)
2. Solicita ETH para tu wallet de deploy
3. Transfiere 0.01-0.1 ETH a tu Paymaster en Biconomy

### 4.2 Monitorear gastos
1. En Biconomy Dashboard, ve a "Analytics"
2. Verifica las transacciones gasless
3. Revisa el balance del Paymaster

## Troubleshooting

### Error: "Biconomy not configured"
- Verificar que las variables de entorno estén configuradas
- Redeploy en Vercel
- Verificar que las keys no tengan espacios extra

### Error: "Insufficient funds in Paymaster"
- Depositar más ETH en el Paymaster
- Verificar que el balance sea > 0.01 ETH

### Error: "Network mismatch"
- Verificar que el Paymaster esté en Base Sepolia (84532)
- Verificar que las URLs sean correctas

## Información adicional

### Costos estimados:
- Cada transacción gasless cuesta ~0.001-0.003 ETH
- Con 0.1 ETH puedes hacer ~50-100 transacciones
- Biconomy cobra una pequeña comisión adicional

### Límites:
- Máximo 10 transacciones por minuto por IP
- Máximo 100 transacciones por día en plan gratuito
- Para más, contactar a Biconomy para plan empresarial

### Soporte:
- Documentación: https://docs.biconomy.io/
- Discord: https://discord.gg/biconomy
- Twitter: @biconomy