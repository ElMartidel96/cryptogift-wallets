#!/bin/bash

# CryptoGift Wallets - Paymaster Monitor Cron Setup
# This script sets up a cron job to monitor the Paymaster balance every 10 minutes

echo "🤖 Setting up CryptoGift Wallets Paymaster Monitor..."

# Get the current directory (where the script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/scripts/pm-watch.js"

# Check if the monitor script exists
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo "❌ Monitor script not found at: $MONITOR_SCRIPT"
    exit 1
fi

# Make the monitor script executable
chmod +x "$MONITOR_SCRIPT"

# Create a temporary cron file
CRON_FILE="/tmp/cryptogift-cron"

# Get current cron jobs (if any)
crontab -l 2>/dev/null > "$CRON_FILE" || echo "# CryptoGift Wallets Cron Jobs" > "$CRON_FILE"

# Remove any existing CryptoGift monitor entries
grep -v "pm-watch.js" "$CRON_FILE" > "$CRON_FILE.tmp" && mv "$CRON_FILE.tmp" "$CRON_FILE"

# Add the new cron job (every 10 minutes)
echo "*/10 * * * * cd $SCRIPT_DIR && node scripts/pm-watch.js >> /var/log/cryptogift-monitor.log 2>&1" >> "$CRON_FILE"

# Install the new cron configuration
crontab "$CRON_FILE"

# Clean up
rm "$CRON_FILE"

echo "✅ Cron job installed successfully!"
echo "📋 Monitor will run every 10 minutes"
echo "📝 Logs will be written to: /var/log/cryptogift-monitor.log"
echo ""
echo "To check the cron job:"
echo "  crontab -l"
echo ""
echo "To remove the cron job:"
echo "  crontab -e"
echo "  (then delete the line with pm-watch.js)"
echo ""
echo "To test the monitor manually:"
echo "  node scripts/pm-watch.js"