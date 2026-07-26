import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const maxRedirects = 3;
const maxHtmlBytes = 1_500_000;
const fetchTimeoutMs = 5_000;

type SourceLabel =
  | "AIRBNB"
  | "HOTEL"
  | "FLIGHT"
  | "ACTIVITY"
  | "WEBSITE";

type SiteEnrichment = {
  dates: string | null;
  guestCount: number | null;
  price: number | null;
  officialEmbedHtml: string | null;
};

type UnfurlMetadata = {
  title: string | null;
  image: string | null;
  description: string | null;
  siteName: string | null;
  sourceLabel: SourceLabel;
  dates: string | null;
  guestCount: number | null;
  price: number | null;
  officialEmbedHtml: string | null;
  fallback: boolean;
};

type SiteEnricher = (url: URL, html: string) => SiteEnrichment;

const emptyEnrichment: SiteEnrichment = {
  dates: null,
  guestCount: null,
  price: null,
  officialEmbedHtml: null,
};

function decodeEntities(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => entities[name] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const pattern =
    /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attributes.set(
      match[1].toLowerCase(),
      decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""),
    );
  }

  return attributes;
}

function getMeta(html: string) {
  const values = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes = parseAttributes(tag);
    const key = (
      attributes.get("property") ??
      attributes.get("name") ??
      attributes.get("itemprop") ??
      ""
    ).toLowerCase();
    const content = attributes.get("content");
    if (key && content && !values.has(key)) values.set(key, content);
  }

  return values;
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedUrl(url: URL) {
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!["http:", "https:"].includes(url.protocol)) return true;
  if (url.username || url.password) return true;
  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:")
  ) {
    return true;
  }

  return isPrivateIpv4(hostname);
}

function resolveImage(value: string | null, baseUrl: URL) {
  if (!value) return null;

  try {
    const imageUrl = new URL(value, baseUrl);
    return imageUrl.protocol === "https:" && !isBlockedUrl(imageUrl)
      ? imageUrl.toString()
      : null;
  } catch {
    return null;
  }
}

function getFirstLargeImage(html: string, baseUrl: URL) {
  const candidates = (html.match(/<img\b[^>]*>/gi) ?? [])
    .map((tag, index) => {
      const attributes = parseAttributes(tag);
      const source =
        attributes.get("src") ??
        attributes.get("data-src") ??
        attributes.get("data-lazy-src") ??
        null;
      const resolved = resolveImage(source, baseUrl);
      if (!resolved || /logo|icon|avatar|sprite/i.test(tag)) return null;

      const width = Number(attributes.get("width")) || 0;
      const height = Number(attributes.get("height")) || 0;
      const area = width * height;
      const likelyHero = /hero|cover|gallery|listing|property/i.test(tag);

      return {
        resolved,
        score: (likelyHero ? 2_000_000 : 0) + area - index,
        large: (width >= 480 && height >= 240) || likelyHero,
      };
    })
    .filter(
      (
        candidate,
      ): candidate is { resolved: string; score: number; large: boolean } =>
        candidate !== null,
    );

  const large = candidates.filter((candidate) => candidate.large);
  const pool = large.length > 0 ? large : candidates.slice(0, 8);
  return pool.sort((a, b) => b.score - a.score)[0]?.resolved ?? null;
}

function sourceLabel(url: URL, meta: Map<string, string>): SourceLabel {
  const host = url.hostname.toLowerCase();
  const type = `${meta.get("og:type") ?? ""} ${
    meta.get("product:category") ?? ""
  }`.toLowerCase();

  if (host === "airbnb.com" || host.endsWith(".airbnb.com")) return "AIRBNB";
  if (
    /(airline|flight|skyscanner|kayak|southwest|delta|united|jetblue)/.test(
      `${host} ${type}`,
    )
  ) {
    return "FLIGHT";
  }
  if (
    /(activity|experience|eventbrite|viator|getyourguide|ticketmaster)/.test(
      `${host} ${type}`,
    )
  ) {
    return "ACTIVITY";
  }
  if (
    /(hotel|lodging|booking\.|vrbo\.|expedia\.|marriott|hilton|hyatt|wyndham)/.test(
      `${host} ${type}`,
    )
  ) {
    return "HOTEL";
  }
  return "WEBSITE";
}

function slugTitle(url: URL) {
  const ignored = new Set([
    "rooms",
    "hotel",
    "hotels",
    "property",
    "listing",
    "stays",
  ]);
  const candidate = url.pathname
    .split("/")
    .filter(Boolean)
    .reverse()
    .find(
      (segment) =>
        !ignored.has(segment.toLowerCase()) &&
        !/^\d+$/.test(segment) &&
        segment.length > 2,
    );

  if (!candidate) return null;

  try {
    return decodeURIComponent(candidate)
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[-_+]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .trim();
  } catch {
    return null;
  }
}

function formatUrlDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getAirbnbOfficialEmbed(html: string) {
  const frame = html.match(
    /<div\b[^>]*class\s*=\s*["'][^"']*\bairbnb-embed-frame\b[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
  )?.[0];
  const script = html.match(
    /<script\b[^>]*src\s*=\s*["']https:\/\/www\.airbnb\.(?:com|[a-z.]+)\/embeddable\/airbnb_jssdk["'][^>]*>\s*<\/script>/i,
  )?.[0];

  return frame && script ? `${frame}${script}` : null;
}

const siteEnrichers: Record<string, SiteEnricher> = {
  "airbnb.com": (url, html) => {
    const checkIn =
      url.searchParams.get("check_in") ?? url.searchParams.get("checkin");
    const checkOut =
      url.searchParams.get("check_out") ?? url.searchParams.get("checkout");
    const start = formatUrlDate(checkIn);
    const end = formatUrlDate(checkOut);
    const guests = Number(
      url.searchParams.get("adults") ?? url.searchParams.get("guests"),
    );

    return {
      dates: start && end ? `${start}–${end}` : start ?? end,
      guestCount:
        Number.isInteger(guests) && guests > 0 && guests <= 100
          ? guests
          : null,
      // Airbnb does not expose a trustworthy total in the URL.
      price: null,
      officialEmbedHtml: getAirbnbOfficialEmbed(html),
    };
  },
};

function getSiteEnrichment(url: URL, html: string) {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const entry = Object.entries(siteEnrichers).find(
    ([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
  return entry ? entry[1](url, html) : emptyEnrichment;
}

async function readTextLimited(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxHtmlBytes) {
      await reader.cancel();
      break;
    }
    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
}

async function fetchWithValidatedRedirects(initialUrl: URL) {
  let currentUrl = initialUrl;

  for (let attempt = 0; attempt <= maxRedirects; attempt += 1) {
    if (isBlockedUrl(currentUrl)) throw new Error("Blocked destination");

    const response = await fetch(currentUrl, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || attempt === maxRedirects) {
        throw new Error("Invalid redirect");
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error("Too many redirects");
}

function fallbackMetadata(url: URL): UnfurlMetadata {
  const enrichment = getSiteEnrichment(url, "");

  return {
    title: slugTitle(url),
    image: null,
    description: null,
    siteName: url.hostname.replace(/^www\./, ""),
    sourceLabel: sourceLabel(url, new Map()),
    ...enrichment,
    fallback: true,
  };
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("url");
  if (!value) {
    return NextResponse.json(
      { ok: false, error: "A URL is required." },
      { status: 400 },
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Enter a complete URL." },
      { status: 400 },
    );
  }

  if (isBlockedUrl(url)) {
    return NextResponse.json(
      { ok: false, error: "That URL cannot be previewed." },
      { status: 400 },
    );
  }

  const fallback = fallbackMetadata(url);

  try {
    const { response, finalUrl } = await fetchWithValidatedRedirects(url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html")) {
      return NextResponse.json({ ok: true, metadata: fallback });
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxHtmlBytes) {
      return NextResponse.json({ ok: true, metadata: fallback });
    }

    const html = await readTextLimited(response);
    const meta = getMeta(html);
    const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const rawImage =
      meta.get("og:image:secure_url") ??
      meta.get("og:image") ??
      meta.get("twitter:image") ??
      null;
    const image =
      resolveImage(rawImage, finalUrl) ?? getFirstLargeImage(html, finalUrl);
    const title =
      meta.get("og:title") ??
      meta.get("twitter:title") ??
      (titleTag ? decodeEntities(titleTag) : null) ??
      fallback.title;
    const enrichment = getSiteEnrichment(finalUrl, html);
    if (title && /\b404\b|not found|page unavailable/i.test(title)) {
      return NextResponse.json({
        ok: true,
        metadata: { ...fallback, ...enrichment, fallback: true },
      });
    }

    return NextResponse.json({
      ok: true,
      metadata: {
        title,
        image,
        description:
          meta.get("og:description") ??
          meta.get("description") ??
          meta.get("twitter:description") ??
          null,
        siteName:
          meta.get("og:site_name") ??
          finalUrl.hostname.replace(/^www\./, ""),
        sourceLabel: sourceLabel(finalUrl, meta),
        ...enrichment,
        fallback: !title || !image,
      } satisfies UnfurlMetadata,
    });
  } catch {
    return NextResponse.json({ ok: true, metadata: fallback });
  }
}
