#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

async function getChromeVersion() {
  try {
    const isWindows = process.platform === 'win32';
    let output: string;

    if (isWindows) {
      // Windows: Try different Chrome installation paths
      const chromePaths = [
        'reg query "HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon" /v version',
        '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --version',
        '"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --version',
        'chrome --version'
      ];

      for (const cmd of chromePaths) {
        try {
          if (cmd.startsWith('reg query')) {
            output = execSync(cmd, { encoding: 'utf8', shell: true });
            const match = output.match(/version\s+REG_SZ\s+(\d+\.\d+\.\d+\.\d+)/i);
            if (match) {
              return match[1];
            }
          } else {
            output = execSync(cmd, { encoding: 'utf8', shell: true });
            const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (match) {
              return match[1];
            }
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error('Could not find Chrome installation');
    } else {
      output = execSync('google-chrome --version', { encoding: 'utf8' });
      const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (match) {
        return match[1];
      }
      throw new Error('Could not parse Chrome version');
    }
  } catch (error) {
    console.error('Failed to get Chrome version:', error.message);
    process.exit(1);
  }
}

async function getChromeDriverVersion(chromeVersion) {
  const majorVersion = chromeVersion.split('.')[0];

  try {
    const response = await fetch(`https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_${majorVersion}`);
    if (!response.ok) {
      throw new Error(`Failed to get ChromeDriver version for Chrome ${majorVersion}`);
    }
    const version = await response.text();
    return version.trim();
  } catch (error) {
    console.error('Failed to get ChromeDriver version:', error.message);
    // Fallback to a known working version
    return `${majorVersion}.0.6778.85`;
  }
}

async function downloadChromeDriver(version) {
  const platform = process.platform === 'linux'
    ? (process.arch === 'arm64' ? 'linux64' : 'linux64')  // Chrome for Testing doesn't have ARM64 for Linux yet
    : process.platform === 'darwin'
      ? (process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64')
      : (process.arch === 'x64' ? 'win64' : 'win32');

  const url = `https://storage.googleapis.com/chrome-for-testing-public/${version}/${platform}/chromedriver-${platform}.zip`;
  const outputPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'chromedriver.zip');

  console.log(`Downloading ChromeDriver ${version} for ${platform}...`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ChromeDriver: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
    console.log(`Downloaded to: ${outputPath}`);

    // Extract the zip file
    const extractPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'chromedriver');

    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true });
    }
    fs.mkdirSync(extractPath, { recursive: true });

    // Use platform-appropriate unzip command
    if (process.platform === 'win32') {
      // Windows: Use PowerShell or built-in extractor
      try {
        execSync(`powershell -command "Expand-Archive -Path '${outputPath}' -DestinationPath '${extractPath}' -Force"`, { shell: true });
      } catch (e) {
        // Fallback: try 7zip or other extractors
        throw new Error('Please install PowerShell or 7-Zip to extract ChromeDriver');
      }
    } else {
      execSync(`unzip -o "${outputPath}" -d "${extractPath}"`);
    }

    // Find the chromedriver executable
    const chromedriverPath = path.join(extractPath, `chromedriver-${platform}`, 'chromedriver');
    if (process.platform === 'win32') {
      chromedriverPath += '.exe';
    }

    if (fs.existsSync(chromedriverPath)) {
      // Make it executable on Unix systems
      if (process.platform !== 'win32') {
        fs.chmodSync(chromedriverPath, '755');
      }

      console.log(`ChromeDriver extracted to: ${chromedriverPath}`);
      console.log(`ChromeDriver version: ${execSync(`"${chromedriverPath}" --version`, { encoding: 'utf8' }).trim()}`);

      // Clean up zip file
      fs.unlinkSync(outputPath);

      return chromedriverPath;
    } else {
      throw new Error('ChromeDriver executable not found after extraction');
    }
  } catch (error) {
    console.error('Failed to download ChromeDriver:', error.message);
    process.exit(1);
  }
}

async function main() {
  try {
    const chromeVersion = await getChromeVersion();
    console.log(`Chrome version: ${chromeVersion}`);

    const driverVersion = await getChromeDriverVersion(chromeVersion);
    console.log(`ChromeDriver version: ${driverVersion}`);

    const chromedriverPath = await downloadChromeDriver(driverVersion);
    console.log(`✅ ChromeDriver downloaded successfully: ${chromedriverPath}`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Fetch is already imported

main();
