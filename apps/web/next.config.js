/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    transpilePackages: ['@smashit/types', '@smashit/validators'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', '@radix-ui/react-icons', 'lodash'],
    },
};

module.exports = nextConfig;
