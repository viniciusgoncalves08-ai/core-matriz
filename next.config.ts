import type { NextConfig } from "next";
const config: NextConfig = { serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"] };
export default config;
