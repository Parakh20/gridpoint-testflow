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
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => path.join(projectRoot, 'node_modules', String(name)),
  }
);

module.exports = config;
