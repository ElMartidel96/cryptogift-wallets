#!/usr/bin/env node

import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import { config } from "dotenv";

// Load environment variables
config();

const PAYMASTER_THRESHOLD = 0.05; // ETH threshold for alerts

async function checkPaymasterBalance() {
  try {
    console.log("🔍 Checking Paymaster balance...");
    
    if (!process.env.TW_KEY) {
      throw new Error("TW_KEY not found in environment variables");
    }
    
    const url = `https://paymaster.thirdweb.com/v1/balance?key=${process.env.TW_KEY}&chain=base-sepolia`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Paymaster API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const balance = parseFloat(data.balanceEth || 0);
    
    console.log(`💰 Current Paymaster balance: ${balance} ETH`);
    
    if (balance < PAYMASTER_THRESHOLD) {
      await sendTelegramAlert(balance);
    } else {
      console.log("✅ Paymaster balance is sufficient");
    }
    
    return balance;
    
  } catch (error) {
    console.error("❌ Error checking Paymaster balance:", error.message);
    
    // Send error alert
    await sendTelegramAlert(null, error.message);
    
    process.exit(1);
  }
}

async function sendTelegramAlert(balance, error = null) {
  try {
    if (!process.env.TELEGRAM_TOKEN || !process.env.TG_CHAT) {
      console.warn("⚠️  Telegram credentials not configured. Skipping alert.");
      return;
    }
    
    const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: false });
    
    let message;
    if (error) {
      message = `🚨 CryptoGift Wallets - Paymaster Monitor Error\n\n` +
               `Error: ${error}\n` +
               `Time: ${new Date().toISOString()}\n\n` +
               `Please check the Paymaster configuration.`;
    } else {
      message = `⚠️ CryptoGift Wallets - Low Paymaster Balance\n\n` +
               `Current Balance: ${balance} ETH\n` +
               `Threshold: ${PAYMASTER_THRESHOLD} ETH\n` +
               `Time: ${new Date().toISOString()}\n\n` +
               `Please top up the Paymaster to avoid service interruption.`;
    }
    
    await bot.sendMessage(process.env.TG_CHAT, message);
    console.log("📱 Telegram alert sent successfully");
    
  } catch (telegramError) {
    console.error("❌ Failed to send Telegram alert:", telegramError.message);
  }
}

async function main() {
  console.log("🤖 CryptoGift Wallets Paymaster Monitor");
  console.log("=====================================");
  
  await checkPaymasterBalance();
  
  console.log("✅ Monitor check completed");
}

// Run the monitor
main().catch(console.error);