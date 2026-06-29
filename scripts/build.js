import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const manifestJsonPath = path.join(rootDir, 'manifest.json');
const distDir = path.join(rootDir, 'dist');
const sharedDir = path.join(distDir, 'shared');
const chromeDir = path.join(distDir, 'chrome');
const firefoxDir = path.join(distDir, 'firefox');
const releasesDir = path.join(rootDir, 'releases');

// 1. Read metadata
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));

console.log(`Building YouTube Hover Actions v${version}...`);

// 2. Run tsup to build files into dist/shared
console.log('Running tsup bundler...');
try {
  execSync('npx tsup --outDir dist/shared', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('tsup build failed:', error);
  process.exit(1);
}

// 3. Ensure clean target directories (done after tsup to avoid directory clean conflicts)
function resetDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

resetDir(chromeDir);
resetDir(firefoxDir);
resetDir(releasesDir);

// 4. Copy files to targets
function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function copyToTargets(srcFile, destName) {
  const name = destName || path.basename(srcFile);
  fs.copyFileSync(srcFile, path.join(chromeDir, name));
  fs.copyFileSync(srcFile, path.join(firefoxDir, name));
}

console.log('Copying shared assets...');
// Copy compiled JS/CSS from dist/shared
const compiledFiles = fs.readdirSync(sharedDir);
for (const file of compiledFiles) {
  const filePath = path.join(sharedDir, file);
  const stat = fs.statSync(filePath);
  if (stat.isFile()) {
    copyToTargets(filePath);
  }
}

// Copy static assets
fs.copyFileSync(path.join(rootDir, 'popup.html'), path.join(chromeDir, 'popup.html'));
fs.copyFileSync(path.join(rootDir, 'popup.html'), path.join(firefoxDir, 'popup.html'));
copyDir(path.join(rootDir, 'icons'), path.join(chromeDir, 'icons'));
copyDir(path.join(rootDir, 'icons'), path.join(firefoxDir, 'icons'));

// Cleanup temporary shared dir
fs.rmSync(sharedDir, { recursive: true, force: true });

// 5. Generate manifest.json for Chrome
console.log('Generating Chrome manifest...');
fs.writeFileSync(
  path.join(chromeDir, 'manifest.json'),
  JSON.stringify(manifestJson, null, 2),
  'utf8'
);

// 6. Generate manifest.json for Firefox
console.log('Generating Firefox manifest...');
const firefoxManifest = {
  ...manifestJson,
  browser_specific_settings: {
    gecko: {
      id: 'youtube-hover-actions@picky',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none'],
      },
    },
  },
};
fs.writeFileSync(
  path.join(firefoxDir, 'manifest.json'),
  JSON.stringify(firefoxManifest, null, 2),
  'utf8'
);

// 7. Packaging/Zipping
const arg = process.argv[2];
const packChrome = !arg || arg === '--chrome' || arg === '--all';
const packFirefox = !arg || arg === '--firefox' || arg === '--all';

function createZip(sourceDir, destFile) {
  console.log(`Packaging ${path.basename(destFile)}...`);
  try {
    // Run zip command on Linux
    execSync(`zip -r "${destFile}" .`, { cwd: sourceDir, stdio: 'ignore' });
  } catch (error) {
    console.error(`Failed to package ${destFile}. Make sure 'zip' command is installed.`, error);
    process.exit(1);
  }
}

if (packChrome) {
  const zipPath = path.join(releasesDir, `picky-chrome-v${version}.zip`);
  createZip(chromeDir, zipPath);
}

if (packFirefox) {
  const xpiPath = path.join(releasesDir, `picky-firefox-v${version}.xpi`);
  createZip(firefoxDir, xpiPath);
}

console.log('Build and packaging completed successfully.');
