import { config } from "dotenv";

// Load .env from monorepo root
config({ path: "../../.env", override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/ui-ds"],
};

export default nextConfig;
