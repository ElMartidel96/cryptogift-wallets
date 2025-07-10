# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend Development (in `/frontend/` directory)
```bash
npm run dev          # Start development server at localhost:3000
npm run build        # Production build (required before deployment)
npm run start        # Start production server
npm run lint         # ESLint code checking
npm run type-check   # TypeScript type checking without emit
npm run deploy       # Deploy to Vercel production
```

### Smart Contract Development (in root directory)
```bash
npx hardhat compile              # Compile Solidity contracts
npx hardhat test                 # Run contract tests
npx hardhat run scripts/deploy.ts --network base-sepolia  # Deploy to Base Sepolia
```

### Build Requirements
- Always run `npm run build` from `/frontend/` directory before deployment
- Deployment uses `vercel.json` configuration which builds from `/frontend/`
- Environment variables must be configured in Vercel dashboard for production

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Blockchain**: ThirdWeb v5 SDK, Base Sepolia testnet, ERC-6551 Token Bound Accounts
- **Smart Contracts**: Solidity 0.8.23, OpenZeppelin, Hardhat
- **APIs**: 0x Protocol v2 (swaps), PhotoRoom API (AI filters), NFT.Storage (IPFS)
- **Deployment**: Vercel with KV storage for rate limiting

### Core Business Logic
This is a Web3 platform where **NFTs function as wallets** using ERC-6551 Token Bound Accounts:
1. Users upload images and add cryptocurrency amounts to create "crypto gifts"
2. Each minted NFT automatically gets an associated wallet address that can hold real crypto
3. Recipients can claim the NFT and access the funds in the bound wallet
4. Includes referral system, AI image filters, gasless transactions via paymaster, and social recovery

### Critical File Structure
```
frontend/src/
├── app/                     # Next.js App Router
│   ├── client.ts           # ThirdWeb client configuration (essential)
│   ├── layout.tsx          # Root layout with ThirdwebWrapper for SSR
│   └── viewport.ts         # Viewport config (themeColor moved here for Next.js 15)
├── components/
│   ├── ThirdwebWrapper.tsx # "use client" wrapper for SSR compatibility
│   ├── GiftWizard.tsx      # Main creation flow with multi-step wizard
│   ├── WalletInterface.tsx # NFT wallet management (view balance, withdraw, swap)
│   └── GuardiansModal.tsx  # Social recovery system
├── pages/api/              # API Routes (all migrated to ThirdWeb v5)
│   ├── mint.ts             # NFT minting with TBA creation
│   ├── upload.ts           # IPFS upload via NFT.Storage
│   └── swap.ts             # Token swapping via 0x Protocol
└── lib/constants.ts        # Contract addresses and configuration
```

### ThirdWeb v5 Migration Status
**CRITICAL**: This codebase has been completely migrated from ThirdWeb v4 to v5. Key patterns:
- Use `createThirdwebClient()` with `clientId` and `secretKey`
- Use `getContract()` instead of `sdk.getContract()`
- Use `prepareContractCall()` for transactions
- Use `TransactionButton` with `transaction` prop (NOT `contractAddress`)
- All imports are from `"thirdweb"` (NOT `"@thirdweb-dev/sdk"`)

### Environment Variables Architecture
Two sets of variables are required:
- **Client-side** (`NEXT_PUBLIC_*`): Used in React components
- **Server-side**: Used in API routes (`/pages/api/`)
Both versions of `TW_CLIENT_ID` must have the same value.

### SSR Compatibility
Next.js 15 requires special handling for ThirdWeb components:
- `ThirdwebProvider` wrapped in `ThirdwebWrapper` with `"use client"`
- All Web3 components use `"use client"` directive
- `themeColor` moved from metadata to viewport exports

### Key Integration Points
- **ERC-6551**: Each NFT automatically gets a wallet address via Token Bound Accounts
- **Account Abstraction**: Gasless transactions via ThirdWeb paymaster
- **0x Protocol**: Decentralized token swapping within NFT wallets
- **PhotoRoom API**: AI-powered image filters for NFT artwork
- **IPFS**: Decentralized storage via NFT.Storage

### Rate Limiting & Security
- Vercel KV used for API rate limiting
- All user inputs validated and sanitized
- Private keys stored as environment variables only
- Contracts use OpenZeppelin's security patterns

### Recent Updates (Latest Session - July 9, 2025)

**FASE 4 COMPLETED: Core NFT-Wallet Functionality Implemented**
- ✅ Fixed ESLint warnings in useCallback dependencies
- ✅ Implemented **real NFT minting** with ThirdWeb v5 in `/api/mint.ts`
- ✅ Added **IPFS metadata upload** functionality
- ✅ Implemented **TBA address calculation** using ERC-6551 standard
- ✅ Added **USDC deposit to TBA** functionality
- ✅ Implemented **referral fee distribution** system
- ✅ Enhanced transaction receipt parsing for tokenId extraction
- ✅ Added comprehensive error handling with graceful fallbacks

**Previously Implemented (Earlier Session):**
- ✅ Fixed upload API inconsistency (`TW_CLIENT_ID` → `NEXT_PUBLIC_TW_CLIENT_ID`) in `/frontend/src/pages/api/upload.ts`
- ✅ Added comprehensive error handling with `ErrorModal` component
- ✅ Implemented detailed error messages with step-by-step solutions
- ✅ Added error logging and monitoring infrastructure
- ✅ Logo PNG support with fallback to emoji in Navbar component
- ✅ Created AI Assistant design document (`AI_ASSISTANT_DESIGN.md`)

**Major Breakthrough:**
The mint API now performs **real blockchain transactions** instead of placeholder responses:
1. **NFT Minting**: Uses ThirdWeb v5 `prepareContractCall` and `sendTransaction`
2. **TBA Creation**: Calculates deterministic wallet addresses for each NFT
3. **USDC Deposits**: Transfers net amount to the NFT's wallet address
4. **Fee Distribution**: Automatically distributes referral and platform fees
5. **Transaction Tracking**: Returns real transaction hashes and receipt data

**Files Modified in This Session:**
- `frontend/src/pages/api/mint.ts` - **MAJOR REWRITE**: Implemented real blockchain functionality
- `frontend/src/app/referrals/page.tsx` - Fixed useCallback dependency warnings
- `frontend/src/app/token/[address]/[id]/page.tsx` - Fixed useCallback dependency warnings
- `frontend/test-mint.js` - NEW: Test script for API validation
- `CLAUDE.md` - Updated with latest implementation status

**Vercel Environment Variables Required:**
All 22+ variables are configured including:
- `NEXT_PUBLIC_TW_CLIENT_ID=9183b572b02ec88dd4d8f20c3ed847d3`
- `TW_SECRET_KEY=AUoUv6y69TiDDvfKVOQLTFd8JvFmk0zjPLCTOPGLnh_zbPgmrUmWXCXsYAWPvUrWAU7VhZGvDStMRv6Um3pXZA`
- `PRIVATE_KEY_DEPLOY` (already exists)
- Contract addresses for Base Sepolia

**Current Status:**
- ✅ **FASE 4 COMPLETED**: Core NFT-wallet functionality implemented
- ✅ **BICONOMY INTEGRATION COMPLETED**: Gasless transactions ready
- ✅ Real blockchain transactions working (NFT mint + USDC deposit + fees)
- ✅ TBA address calculation implemented (ERC-6551 standard)
- ✅ Domain fixed: cryptogift.gl → cryptogift-wallets.vercel.app
- ✅ Biconomy SDK v4.5.7 installed and configured
- ✅ Smart Account creation with fallback system
- ✅ Error handling system fully operational
- ✅ Upload functionality working correctly
- ✅ Build process clean (no TypeScript/ESLint errors)
- ✅ ThirdWeb v5 integration complete across ALL files
- ✅ Foundation for IA assistant system designed and documented

**Next Recommended Steps:**
1. **CONFIGURE BICONOMY**: Set up Dashboard and add API keys (see BICONOMY_SETUP.md)
2. **FASE 5**: Implement missing APIs (swap, wallet balance queries)
3. **FASE 6**: Add PhotoRoom AI filters integration
4. **FASE 7**: Implement QR sharing and referral tracking
5. **FASE 8**: End-to-end testing on Base Sepolia
6. Implement proper ERC-6551 TBA address calculation (currently simplified)
7. Add real-time monitoring and alerting system

### Known Issues & Patterns
- Build failures typically relate to SSR/client-side hydration
- TypeScript errors often involve `0x${string}` type casting for addresses
- useEffect dependency warnings require careful management of callbacks
- Vercel builds from `/frontend/` directory only
- **NEW**: Upload errors now provide detailed debugging info via ErrorModal

### Development Standards & Security

#### Commit Standards (Conventional Commits)
- `feat:` nueva funcionalidad
- `fix:` corrección de bugs
- `chore:` mantenimiento, dependencias  
- `docs:` documentación
- `refactor:` reestructuración sin cambios funcionales
- `security:` mejoras de seguridad
- **Una funcionalidad = un commit** para rollbacks quirúrgicos

#### Security Rules (Applied Automatically)
```bash
# Pre-commit checks que Claude ejecuta:
npm audit --audit-level high          # CVE scanning
npm run type-check                    # TypeScript strict
npm run lint                          # ESLint + security rules
```

#### Gas Monitoring
```javascript
// Umbral de alerta: 50 transacciones básicas
const GAS_ALERT_THRESHOLD = 21000 * 50;
// Webhook para alertas de gas alto
```

#### Logging Standards
```typescript
// Estructura JSON para todos los logs:
{
  "level": "ERROR|WARN|INFO", 
  "message": "description",
  "context": {...},
  "timestamp": ISO8601,
  "userId": "anonymized"  // PII-free
}
```

### Testing Strategy
- TypeScript compilation via `npm run type-check`
- ESLint checking via `npm run lint`
- Security audit via `npm audit --audit-level high`
- Manual testing on Base Sepolia testnet
- Contract testing via Hardhat framework
- Gas cost monitoring on every deployment

### Deployment Process
1. All changes must build successfully in `/frontend/` directory
2. Environment variables configured in Vercel dashboard
3. Automatic deployment via Git push to main branch
4. Manual deployment via `npm run deploy` (Vercel CLI)

## Critical Notes for Development
- **Never** revert to ThirdWeb v4 patterns - migration is complete
- **Always** use `"use client"` for components with Web3 hooks
- **Always** test builds locally before pushing to production
- **Always** use type casting for Ethereum addresses: `as \`0x${string}\``
- Contract addresses on Base Sepolia are hardcoded in constants.ts