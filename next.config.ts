import nextra from 'nextra';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const withNextra = nextra({
  contentDirBasePath: '/docs',
});

export default withNextra(nextConfig);
