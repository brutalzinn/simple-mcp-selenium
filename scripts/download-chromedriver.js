#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const CHROMEDRIVER_PATH = join(process.cwd(), 'node_modules', 'chromedriver', 'lib', 'chromedriver', 'chromedriver');

console.log('Checking for ChromeDriver...');

if (!existsSync(CHROMEDRIVER_PATH)) {
  console.log('ChromeDriver not found, downloading...');
  try {
    execSync('npx chromedriver --version', { stdio: 'inherit' });
    console.log('ChromeDriver downloaded successfully!');
  } catch (error) {
    console.error('Failed to download ChromeDriver:', error.message);
    process.exit(1);
  }
} else {
  console.log('ChromeDriver already exists.');
}
