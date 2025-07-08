#!/bin/bash

# CryptoGift Wallets - Deployment Script
echo "🚀 Deploying CryptoGift Wallets to Vercel..."

# Install Vercel CLI if not present
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to frontend directory
cd frontend

# Login to Vercel (you may need to authenticate)
echo "🔐 Setting up Vercel authentication..."
vercel login

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

echo "✅ Deployment completed!"
echo "🌐 Your CryptoGift Wallets application should now be live!"
echo ""
echo "📝 Don't forget to:"
echo "  1. Set up environment variables in Vercel dashboard"
echo "  2. Configure custom domain if needed"
echo "  3. Test all functionality"
echo ""
echo "🎉 Happy gifting crypto!"