import { isGameMetadata } from "../lib/catalog.ts";
import {
  GameApiError,
  validateRawgQuery,
  isGameGenre,
} from "../lib/rawg-contract.ts";
import type {
  GamePage,
  ScreenshotPage,
  GenrePage,
} from "../lib/rawg-contract.ts";
import type { Game } from "../types/index.ts";

type Entry = {
  expires: number;
  value?: unknown;
  promise: Promise<unknown>;
  controller: AbortController;
  users: number;
};
function validPayload(params: URLSearchParams, value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  if (params.get("id") && params.get("resource") !== "screenshots")
    return isGameMetadata(body.game) && body.game.id === params.get("id");
  const page = Number(params.get("page") ?? "1");
  if (body.page !== page || typeof body.hasNext !== "boolean") return false;
  if (params.get("resource") === "genres")
    return (
      Array.isArray(body.genres) &&
      body.genres.length <= 20 &&
      body.genres.every(isGameGenre) &&
      new Set(body.genres.map((genre) => genre.id)).size ===
        body.genres.length &&
      Number.isSafeInteger(body.count) &&
      (body.count as number) >= 0
    );
  if (params.get("resource") === "screenshots")
    return (
      Array.isArray(body.screenshots) &&
      body.screenshots.length <= 20 &&
      body.screenshots.every(
        (item) =>
          item &&
          typeof item.alt === "string" &&
          typeof item.url === "string" &&
          /^https:\/\//.test(item.url),
      )
    );
  return (
    Array.isArray(body.games) &&
    body.games.length <= 20 &&
    body.games.every(isGameMetadata) &&
    Number.isSafeInteger(body.count) &&
    (body.count as number) >= 0
  );
}
/** Bounded memory cache and shared flights. A canceled subscriber never cancels other readers. */
export function createRawgClient(
  fetcher: typeof fetch = fetch,
  now = () => Date.now(),
) {
  const cache = new Map<string, Entry>();
  async function request(
    params: URLSearchParams,
    ttl: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    signal?.throwIfAborted();
    validateRawgQuery(params);
    params.sort();
    const key = params.toString();
    let entry = cache.get(key);
    if (entry && entry.expires > now() && entry.value !== undefined)
      return entry.value;
    if (entry && entry.expires !== Infinity) {
      cache.delete(key);
      entry = undefined;
    }
    if (!entry) {
      // Evict completed entries first; cap active requests too.
      while (cache.size >= 64) {
        const oldest = [...cache].find(([, item]) => item.expires !== Infinity);
        if (!oldest)
          throw new GameApiError("Too many game requests. Please wait.", 429);
        cache.delete(oldest[0]);
      }
      const controller = new AbortController();
      entry = {
        expires: Infinity,
        controller,
        users: 0,
        promise: Promise.resolve(),
      };
      const current = entry;
      current.promise = (async () => {
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetcher(`/.netlify/functions/rawg?${key}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            throw new GameApiError(
              "Game proxy unavailable. Use Netlify Dev for live data.",
              response.status || 502,
            );
          }
          if (!response.ok) {
            const messages: Record<number, string> = {
              400: "The game filters or ID are invalid.",
              404: "Game or result page not found.",
              429: "RAWG request limit reached. Wait a minute before retrying.",
              503: "RAWG is not configured or credentials were rejected. Check the server environment.",
              504: "RAWG request timed out. Please retry.",
            };
            throw new GameApiError(
              messages[response.status] ??
                "RAWG is temporarily unavailable. Please retry later.",
              response.status,
            );
          }
          if (!validPayload(params, body))
            throw new GameApiError("Invalid game service response.");
          current.value = body;
          current.expires = now() + ttl;
          return body;
        } catch (error) {
          if (cache.get(key) === current) cache.delete(key);
          if (controller.signal.aborted)
            throw new GameApiError(
              "Game request canceled or timed out. Please retry.",
              504,
            );
          throw error;
        } finally {
          clearTimeout(timer);
        }
      })();
      cache.set(key, current);
    }
    const flight = entry;
    flight.users++;
    return new Promise((resolve, reject) => {
      let done = false;
      const finish = () => {
        if (done) return false;
        done = true;
        signal?.removeEventListener("abort", abort);
        flight.users--;
        return true;
      };
      const abort = () => {
        if (finish()) {
          reject(new DOMException("Canceled", "AbortError"));
          if (!flight.users && flight.expires === Infinity) {
            cache.delete(key);
            flight.controller.abort();
          }
        }
      };
      signal?.addEventListener("abort", abort, { once: true });
      flight.promise.then(
        (value) => {
          if (finish()) resolve(value);
        },
        (error) => {
          if (finish()) reject(error);
        },
      );
      if (signal?.aborted) abort();
    });
  }
  return {
    async genres(signal?: AbortSignal): Promise<GenrePage> {
      return (await request(
        new URLSearchParams({ resource: "genres", page_size: "20" }),
        600000,
        signal,
      )) as GenrePage;
    },
    async search(
      params: URLSearchParams,
      signal?: AbortSignal,
    ): Promise<GamePage> {
      const value = (await request(
        new URLSearchParams(params),
        120000,
        signal,
      )) as Partial<GamePage>;
      if (
        !Array.isArray(value.games) ||
        value.games.length > 20 ||
        !value.games.every(isGameMetadata) ||
        !Number.isSafeInteger(value.count) ||
        (value.count ?? -1) < 0 ||
        !Number.isInteger(value.page) ||
        typeof value.hasNext !== "boolean"
      )
        throw new GameApiError("Invalid game listing response.");
      return value as GamePage;
    },
    async getGame(id: string, signal?: AbortSignal): Promise<Game | null> {
      try {
        const value = (await request(
          new URLSearchParams({ id }),
          600000,
          signal,
        )) as { game?: unknown };
        if (!isGameMetadata(value.game) || value.game.id !== id)
          throw new GameApiError("Invalid game details response.");
        return value.game;
      } catch (error) {
        if (error instanceof GameApiError && error.status === 404) return null;
        throw error;
      }
    },
    async screenshots(
      id: string,
      page = 1,
      signal?: AbortSignal,
    ): Promise<ScreenshotPage> {
      const value = (await request(
        new URLSearchParams({
          id,
          resource: "screenshots",
          page: String(page),
          page_size: "6",
        }),
        600000,
        signal,
      )) as Partial<ScreenshotPage>;
      if (
        !Array.isArray(value.screenshots) ||
        value.screenshots.length > 20 ||
        !value.screenshots.every(
          (item) =>
            typeof item.alt === "string" &&
            typeof item.url === "string" &&
            /^https:\/\//.test(item.url),
        ) ||
        !Number.isInteger(value.page) ||
        typeof value.hasNext !== "boolean"
      )
        throw new GameApiError("Invalid screenshot response.");
      return value as ScreenshotPage;
    },
  };
}
// Deferred fetch lookup also makes browser tests able to mock HTTP without live requests.
export const rawgClient = createRawgClient((...args) => fetch(...args));
