/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@smashit/types', '@smashit/validators'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
        ],
    },
};

module.exports = nextConfig;
