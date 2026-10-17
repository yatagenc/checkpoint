import {
  GameApiError,
  MAX_PAGE,
  validateRawgQuery,
} from "../src/lib/rawg-contract.ts";
import {
  normalizeGame,
  normalizeScreenshots,
  normalizeGenres,
  record,
} from "./rawg-normalize.ts";

type Options = {
  key: () => string | undefined;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};
export function createRawgHandler({
  key,
  fetcher = fetch,
  timeoutMs = 8000,
}: Options) {
  return async (request: Request): Promise<Response> => {
    let redactedSecret: string | undefined;
    const json = (
      body: unknown,
      status = 200,
      headers: Record<string, string> = {},
    ) => {
      let encoded = JSON.stringify(body);
      if (redactedSecret)
        encoded = encoded.split(redactedSecret).join("[redacted]");
      return new Response(encoded, {
        status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          ...headers,
        },
      });
    };
    if (request.method !== "GET")
      return json({ error: "Only GET requests are supported." }, 405, {
        Allow: "GET",
      });
    try {
      const url = new URL(request.url);
      const { endpoint, params, kind, page } = validateRawgQuery(
        url.searchParams,
      );
      const secret = key()?.trim();
      if (!secret)
        throw new GameApiError(
          "RAWG is not configured. Set RAWG_API_KEY in the server environment and run Netlify Dev.",
          503,
        );
      redactedSecret = secret;
      params.set("key", secret);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        // Fixed official origin, fixed endpoint shapes and no redirects. Never log this URL.
        const response = await fetcher(
          `https://api.rawg.io/api${endpoint}?${params}`,
          {
            signal: controller.signal,
            redirect: "error",
            headers: { Accept: "application/json" },
          },
        );
        if (response.status === 404)
          throw new GameApiError("Game or result page not found.", 404);
        if (response.status === 401 || response.status === 403)
          throw new GameApiError(
            "RAWG credentials were rejected. Check server configuration.",
            503,
          );
        if (response.status === 429)
          return json(
            {
              error: "RAWG request limit reached. Please wait before retrying.",
            },
            429,
            { "Retry-After": "60" },
          );
        if (!response.ok)
          throw new GameApiError(
            "RAWG is temporarily unavailable. Try again later.",
            502,
          );
        // A page is capped at 20; cap response bytes too and never return upstream bodies/next URLs.
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty upstream response");
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 2_000_000) {
            await reader.cancel();
            throw new Error("Oversized upstream response");
          }
          chunks.push(chunk.value);
        }
        const combined = new Uint8Array(bytes);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const body: unknown = JSON.parse(new TextDecoder().decode(combined));
        const dto = record(body);
        if (kind === "detail") return json({ game: normalizeGame(body) });
        if (
          !Array.isArray(dto.results) ||
          !Number.isSafeInteger(dto.count) ||
          (dto.count as number) < 0
        )
          throw new Error("Malformed page");
        const hasNext =
          typeof dto.next === "string" &&
          dto.next.length > 0 &&
          page < MAX_PAGE;
        if (kind === "genres")
          return json({
            genres: normalizeGenres(body),
            count: dto.count,
            page,
            hasNext: hasNext && page < 5,
          });
        if (kind === "screenshots")
          return json({
            screenshots: normalizeScreenshots(body),
            page,
            hasNext,
          });
        return json({
          games: dto.results.slice(0, 20).map(normalizeGame),
          count: dto.count,
          page,
          hasNext,
        });
      } catch (error) {
        if (controller.signal.aborted)
          throw new GameApiError("RAWG request timed out. Please retry.", 504);
        throw error;
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      if (error instanceof GameApiError)
        return json({ error: error.message }, error.status);
      return json(
        {
          error:
            "The game service could not complete this request. Please retry later.",
        },
        502,
      );
    }
  };
}
