const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to follow imports into packages/shared/ outside the mobile/ root.
config.watchFolders = [path.resolve(workspaceRoot, 'packages', 'shared')];

// Files in packages/shared/ have no local node_modules — point them at mobile's
// so transient runtime deps like @babel/runtime resolve correctly.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
// @opentelemetry/api uses dynamic import() with webpack magic comments that
// Hermes cannot parse. Point it at an empty shim — not used in the mobile app.
const SHIMS = {
  '@opentelemetry/api': path.resolve(projectRoot, 'shims/opentelemetry-api.js'),
};

config.resolver.extraNodeModules = new Proxy(SHIMS, {
  get: (target, name) => {
    const key = String(name);
    return key in target ? target[key] : path.join(projectRoot, 'node_modules', key);
  },
});

module.exports = config;
