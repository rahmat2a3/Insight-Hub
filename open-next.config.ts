import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});

config.buildCommand = "npx next build --webpack";

config.cloudflare = {
  useWorkerdCondition: true,
};

export default config;
