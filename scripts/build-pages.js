const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting build-pages script...');

try {
  // 1. Run opennextjs-cloudflare build
  console.log('Running opennextjs-cloudflare build...');
  execSync('npx opennextjs-cloudflare build', { stdio: 'inherit' });

  const openNextDir = path.join(__dirname, '../.open-next');
  const distDir = path.join(__dirname, '../dist');

  // 2. Re-create dist directory
  if (fs.existsSync(distDir)) {
    console.log('Cleaning existing dist directory...');
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);

  // Helper function to copy recursive (resolves symlinks using statSync)
  function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const name of entries) {
      const srcPath = path.join(src, name);
      const destPath = path.join(dest, name);
      try {
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          copyDirSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      } catch (err) {
        console.warn(`[Warning] Skip copying symlink/file: ${srcPath} (${err.message})`);
      }
    }
  }

  // 3. Copy worker.js to dist/_worker.js
  console.log('Copying worker.js to dist/_worker.js...');
  fs.copyFileSync(path.join(openNextDir, 'worker.js'), path.join(distDir, '_worker.js'));

  // 4. Copy required directories for bundling
  const dirsToCopy = ['cloudflare', 'middleware', 'server-functions', '.build'];
  for (const dir of dirsToCopy) {
    const srcDir = path.join(openNextDir, dir);
    if (fs.existsSync(srcDir)) {
      console.log(`Copying ${dir} directory...`);
      copyDirSync(srcDir, path.join(distDir, dir));
    }
  }

  // 5. Copy static assets from assets/ to the root of dist/
  const assetsDir = path.join(openNextDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    console.log('Copying static assets to dist root...');
    const entries = fs.readdirSync(assetsDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(assetsDir, entry.name);
      const destPath = path.join(distDir, entry.name);
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  console.log('Build pages completed successfully! Output is in the "dist" directory.');
} catch (error) {
  console.error('Error during build-pages execution:', error);
  process.exit(1);
}
