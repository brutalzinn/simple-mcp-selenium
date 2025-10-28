#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import fetch from 'node-fetch';

async function getChromeVersion() {
  try {
    const output = execSync('google-chrome --version', { encoding: 'utf8' });
    const match = output.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
    throw new Error('Could not parse Chrome version');
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
  const platform = process.platform === 'linux' ? 'linux64' : 
                   process.platform === 'darwin' ? 'mac-x64' : 'win64';
  
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
    
    execSync(`unzip -o "${outputPath}" -d "${extractPath}"`);
    
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
