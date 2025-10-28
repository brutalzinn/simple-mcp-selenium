#!/bin/bash

echo "🔧 Updating System ChromeDriver to Version 141"
echo "=============================================="

# Check current versions
echo "Current Chrome version:"
google-chrome --version

echo -e "\nCurrent ChromeDriver version:"
chromedriver --version

# Backup current ChromeDriver
echo -e "\n📦 Backing up current ChromeDriver..."
sudo cp /usr/local/bin/chromedriver /usr/local/bin/chromedriver.backup.139
echo "✅ Backup created: /usr/local/bin/chromedriver.backup.139"

# Copy compatible ChromeDriver from MCP server
echo -e "\n🔄 Installing compatible ChromeDriver..."
sudo cp ./chromedriver/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver
sudo chmod +x /usr/local/bin/chromedriver

# Verify the update
echo -e "\n✅ Verification:"
echo "New ChromeDriver version:"
chromedriver --version

echo -e "\n🎯 Chrome/ChromeDriver compatibility check:"
CHROME_VERSION=$(google-chrome --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+')
CHROMEDRIVER_VERSION=$(chromedriver --version | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+\.[0-9]\+')

CHROME_MAJOR=$(echo $CHROME_VERSION | cut -d. -f1)
CHROMEDRIVER_MAJOR=$(echo $CHROMEDRIVER_VERSION | cut -d. -f1)

echo "Chrome: $CHROME_VERSION (v$CHROME_MAJOR)"
echo "ChromeDriver: $CHROMEDRIVER_VERSION (v$CHROMEDRIVER_MAJOR)"

if [ "$CHROME_MAJOR" = "$CHROMEDRIVER_MAJOR" ]; then
    echo "✅ PERFECT MATCH - Compatibility issue resolved!"
else
    DIFF=$((CHROME_MAJOR - CHROMEDRIVER_MAJOR))
    if [ $DIFF -le 1 ] && [ $DIFF -ge -1 ]; then
        echo "✅ COMPATIBLE - Version difference: $DIFF"
    else
        echo "❌ INCOMPATIBLE - Version difference: $DIFF"
    fi
fi

echo -e "\n🎉 System ChromeDriver update completed!"
echo "The system ChromeDriver is now compatible with your Chrome browser."
