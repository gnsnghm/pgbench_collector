/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:4000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
