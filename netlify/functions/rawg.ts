import { createRawgHandler } from "../../server/rawg-proxy.ts";

// Secrets are read only at function execution time, never in Vite or browser code.
export default createRawgHandler({ key: () => process.env.RAWG_API_KEY });
export const config = {
  rateLimit: {
    action: "rate_limit",
    aggregateBy: "ip",
    windowSize: 60,
    windowLimit: 60,
  },
};
