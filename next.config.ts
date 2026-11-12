import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/share/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    }, {
      source: "/share/:token/embed",
      headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
    }];
  },
  async redirects() {
    return [
      {
        source: "/waitlist",
        destination: "/signup",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
