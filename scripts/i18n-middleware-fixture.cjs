/* eslint-disable @typescript-eslint/no-require-imports -- Real middleware bundled for Node's extension-strict ESM loader; no behavior mock. */
const path = require('node:path');
const Module = require('node:module');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const middleware = new Module(path.join(__dirname, 'bundled-i18n-middleware.cjs'));
middleware.filename = middleware.id;
middleware.paths = Module._nodeModulePaths(root);
middleware._compile(esbuild.buildSync({ entryPoints:[require.resolve('next-intl/middleware')], bundle:true, write:false,
  platform:'node', format:'cjs', external:['next/server','next/navigation','react'] }).outputFiles[0].text, middleware.filename);
module.exports = middleware.exports;
