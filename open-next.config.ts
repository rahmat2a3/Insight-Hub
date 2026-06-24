import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});

config.cloudflare = {
  useWorkerdCondition: true,
};

export default config;
