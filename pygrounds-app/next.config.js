/** @type {import('next').NextConfig} */
const { patchWebpackConfig } = require('next-global-css')
const webpackNodeExternals = require('webpack-node-externals')

const nextConfig = {
  reactStrictMode: true,
}

const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
// Specify separate paths
// const path = require('path');
// const MONACO_DIR = path.resolve(__dirname, './node_modules/monaco-editor');

module.exports = {
  webpack: (
    nextConfig,
    options
  ) => {
    patchWebpackConfig(nextConfig, options)
    if (options.isServer) {
      nextConfig.externals = webpackNodeExternals({
        // Uses list to add this modules for server bundle and process.
        allowlist: [/test/],
      })
    }

    // Important: return the modified config
    nextConfig.plugins.push(new MonacoWebpackPlugin({
      // available options are documented at https://github.com/microsoft/monaco-editor/blob/main/webpack-plugin/README.md#options
      languages: ['json']
    }))

    // console.log(nextConfig.module.rules)
    nextConfig.module.rules.push({
      // test: /actionbar\.css$/,
      // include: MONACO_DIR,
      // use: ['style-loader', 'css-loader'],
    })
    return nextConfig
  },
}

