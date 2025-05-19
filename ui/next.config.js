/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*", // フロント側のパス
        destination: "http://backend:4000/api/:path*", // コンテナ名:ポート
      },
    ];
  },
};

export default nextConfig;
