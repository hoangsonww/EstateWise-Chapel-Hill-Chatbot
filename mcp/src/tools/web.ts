import { isIP } from "node:net";
import { z } from "zod";
import { config } from "../core/config.js";
import type { ToolDef } from "../core/registry.js";

type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 10;
const DEFAULT_FETCH_MAX_CHARS = 4000;
const MAX_FETCH_CHARS = 20000;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function decodeDuckDuckGoHref(rawHref: string): string {
  const href = decodeHtmlEntities(rawHref);
  try {
    const resolved = new URL(href, "https://duckduckgo.com");
    const redirect = resolved.searchParams.get("uddg");
    if (resolved.pathname === "/l/" && redirect) {
      try {
        return decodeURIComponent(redirect);
      } catch {
        return redirect;
      }
    }
    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      return resolved.toString();
    }
  } catch {
    // best effort fallback below
  }
  if (href.startsWith("//")) return `https:${href}`;
  return href;
}

function parseDuckDuckGoHtml(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const anchorRegex =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorRegex.exec(html)) && results.length < limit) {
    const decodedUrl = decodeDuckDuckGoHref(match[1] || "");
    if (
      !decodedUrl.startsWith("http://") &&
      !decodedUrl.startsWith("https://")
    ) {
      continue;
    }
    if (seen.has(decodedUrl)) continue;

    const title = normalizeWhitespace(
      decodeHtmlEntities(stripTags(match[2] || "")) || decodedUrl,
    );

    const snippetWindow = html.slice(match.index, match.index + 2500);
    const snippetMatch = snippetWindow.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/i,
    );
    const snippet = snippetMatch
      ? normalizeWhitespace(
          decodeHtmlEntities(stripTags(snippetMatch[1] || "")),
        )
      : "";

    results.push({
      title,
      url: decodedUrl,
      ...(snippet ? { snippet } : {}),
    });
    seen.add(decodedUrl);
  }

  return results;
}

function ensureSafePublicHttpUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Localhost URLs are blocked");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Local/internal hostnames are blocked");
  }

  const ipType = isIP(host);
  if (ipType === 4) {
    const octets = host.split(".").map((part) => Number(part));
    const [a, b] = octets;
    const privateV4 =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (privateV4) {
      throw new Error("Private or loopback IPv4 addresses are blocked");
    }
  }

  if (ipType === 6) {
    const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
    if (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      throw new Error("Private or loopback IPv6 addresses are blocked");
    }
  }

  return url;
}

function extractReadableText(html: string): { title?: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? normalizeWhitespace(decodeHtmlEntities(stripTags(titleMatch[1] || "")))
    : undefined;

  const body = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|section|article|h[1-6]|tr)>/gi, "\n");

  const text = normalizeWhitespace(decodeHtmlEntities(stripTags(body)));
  return { title, text };
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "EstateWise-MCP/0.1 (+https://estatewise.vercel.app)",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Web tools for internet discovery and page retrieval. */
export const webTools: ToolDef[] = [
  {
    name: "web.search",
    description:
      "Search the public web and return top result URLs with snippets.",
    schema: {
      q: z.string(),
      limit: z.number().int().min(1).max(MAX_SEARCH_LIMIT).optional(),
    },
    handler: async (args: any) => {
      const { q, limit = DEFAULT_SEARCH_LIMIT } = args as {
        q: string;
        limit?: number;
      };
      const safeLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
      const html = await fetchText(searchUrl, config.webTimeoutMs);
      const results = parseDuckDuckGoHtml(html, safeLimit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              provider: "duckduckgo-html",
              query: q,
              results,
              count: results.length,
              fetchedAt: new Date().toISOString(),
            }),
          },
        ],
      };
    },
  },
  {
    name: "web.fetch",
    description:
      "Fetch and extract readable text from a public web page (http/https only).",
    schema: {
      url: z.string().url(),
      maxChars: z.number().int().min(500).max(MAX_FETCH_CHARS).optional(),
    },
    handler: async (args: any) => {
      const { url, maxChars = DEFAULT_FETCH_MAX_CHARS } = args as {
        url: string;
        maxChars?: number;
      };
      const safeUrl = ensureSafePublicHttpUrl(url);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.webTimeoutMs);
      try {
        const response = await fetch(safeUrl.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent": "EstateWise-MCP/0.1 (+https://estatewise.vercel.app)",
            Accept:
              "text/html,application/xhtml+xml,application/json,text/plain,text/*;q=0.9,*/*;q=0.8",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = (response.headers.get("content-type") || "")
          .toLowerCase()
          .split(";")[0]
          .trim();
        const supported = [
          "text/html",
          "text/plain",
          "application/json",
          "application/xml",
          "text/xml",
        ];
        if (!supported.some((t) => contentType.includes(t))) {
          throw new Error(
            `Unsupported content-type: ${contentType || "unknown"}`,
          );
        }

        const rawText = await response.text();
        const extracted = contentType.includes("html")
          ? extractReadableText(rawText)
          : { text: normalizeWhitespace(rawText) };

        const sliced = extracted.text.slice(0, Math.max(500, maxChars));
        const truncated = extracted.text.length > sliced.length;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                url: safeUrl.toString(),
                title: extracted.title,
                contentType,
                content: sliced,
                truncated,
                fetchedAt: new Date().toISOString(),
              }),
            },
          ],
        };
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          throw new Error(`Request timed out after ${config.webTimeoutMs}ms`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  },
];
