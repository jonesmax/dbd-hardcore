import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // For GitHub Pages at https://<user>.github.io/<repo>/, set BASE_PATH=/<repo> in env
  basePath: process.env.BASE_PATH || "",
  assetPrefix: process.env.BASE_PATH ? `${process.env.BASE_PATH}/` : undefined,
};

export default nextConfig;
