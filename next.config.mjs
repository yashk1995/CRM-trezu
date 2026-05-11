/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Suppress the MetaMask/wallet extension "Cannot redefine property: ethereum" error
      config.infrastructureLogging = { level: "error" };
    }
    return config;
  },
};

export default nextConfig;
