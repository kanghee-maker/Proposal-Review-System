const path = require('path');
const { randomBytes } = require('node:crypto');

// All Node.js bundles from this build share a key. A new deployment gets a new key.
const accessSigningKey = randomBytes(32).toString('base64url');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    if (isServer && nextRuntime === 'nodejs') {
      config.plugins.push(new webpack.DefinePlugin({
        __GCPRS_ACCESS_SIGNING_KEY__: JSON.stringify(accessSigningKey),
      }));
    }
    return config;
  },
};

module.exports = nextConfig;
