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
  checkIn: string | null;
  checkOut: string | null;
  dates: string | null;
  guestCount: number | null;
  price: number | null;
  officialEmbedHtml: string | null;
};

type StructuredMetadata = {
  title: string | null;
  image: string | null;
  description: string | null;
};

type UnfurlMetadata = {
  title: string | null;
  image: string | null;
  description: string | null;
  siteName: string | null;
  sourceLabel: SourceLabel;
  checkIn: string | null;
  checkOut: string | null;
  dates: string | null;
  guestCount: number | null;
  price: number | null;
  officialEmbedHtml: string | null;
  embedUrl: string | null;
  fallback: boolean;
};

type SiteEnricher = (url: URL, html: string) => SiteEnrichment;

const emptyEnrichment: SiteEnrichment = {
  checkIn: null,
  checkOut: null,
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

function structuredTypeMatches(value: unknown) {
  const types = Array.isArray(value) ? value : [value];
  return types.some(
    (type) =>
      typeof type === "string" &&
      /^(hotel|lodgingbusiness|resort|motel|bedandbreakfast|accommodation|product)$/i.test(
        type.split(/[\/#]/).at(-1) ?? "",
      ),
  );
}

function structuredImage(value: unknown, baseUrl: URL) {
  const candidates = Array.isArray(value) ? value : [value];

  for (const candidate of candidates) {
    const source =
      typeof candidate === "string"
        ? candidate
        : candidate && typeof candidate === "object"
          ? String(
              (candidate as Record<string, unknown>).url ??
                (candidate as Record<string, unknown>).contentUrl ??
                "",
            )
          : "";
    const resolved = resolveImage(source || null, baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

function getStructuredMetadata(html: string, baseUrl: URL): StructuredMetadata {
  const scripts =
    html.match(
      /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    ) ?? [];
  const entries: Record<string, unknown>[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;

    const object = value as Record<string, unknown>;
    if (structuredTypeMatches(object["@type"])) entries.push(object);
    if (object["@graph"]) visit(object["@graph"]);
  };

  for (const script of scripts) {
    const body = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    try {
      visit(JSON.parse(body));
    } catch {
      // Invalid structured data should not prevent the generic fallback.
    }
  }

  const entry = entries.find((candidate) => candidate.name) ?? entries[0];
  if (!entry) return { title: null, image: null, description: null };

  return {
    title: typeof entry.name === "string" ? entry.name : null,
    image: structuredImage(entry.image, baseUrl),
    description:
      typeof entry.description === "string" ? entry.description : null,
  };
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
  const context = `${host} ${url.pathname.toLowerCase()} ${type}`;

  if (host === "airbnb.com" || host.endsWith(".airbnb.com")) return "AIRBNB";
  if (
    /(airline|flight|skyscanner|kayak|southwest|delta|united|jetblue)/.test(
      context,
    )
  ) {
    return "FLIGHT";
  }
  if (
    /(activity|experience|eventbrite|viator|getyourguide|ticketmaster)/.test(
      context,
    )
  ) {
    return "ACTIVITY";
  }
  if (
    /(hotel|lodging|booking\.|vrbo\.|expedia\.|marriott|hilton|hyatt|wyndham)/.test(
      context,
    )
  ) {
    return "HOTEL";
  }
  return "WEBSITE";
}

function humanizeHostname(url: URL) {
  const hostname = url.hostname.replace(/^www\./, "");
  const name = hostname.split(".")[0] || "website";
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function limitTitle(value: string, maxLength = 56) {
  if (value.length <= maxLength) return value;
  const clipped = value.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const cleanClip = lastSpace >= maxLength * 0.65
    ? clipped.slice(0, lastSpace)
    : clipped;
  return `${cleanClip.trim()}…`;
}

function cleanTitle(value: string | null, url: URL) {
  if (!value) return null;

  let title = decodeEntities(value)
    .replace(/\s*\.\s*H\d+\s*\.\s*Hotel Information.*$/i, "")
    .replace(/\s+(?:Hotel Information|Official Site)\s*$/i, "")
    .replace(/\s*[|•]\s*[^|•]+$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  const directoryPrefix = title.match(/^(.{2,40})\s+Hotels?\s+(.{8,})$/i);
  if (directoryPrefix && !/^in\b/i.test(directoryPrefix[2])) {
    title = directoryPrefix[2].trim();
  }

  if (
    !title ||
    title.length < 3 ||
    /https?:\/\/|www\.|page unavailable|access denied|captcha/i.test(title) ||
    /(?:[._]){2,}/.test(title) ||
    (title.match(/\d/g)?.length ?? 0) > title.length * 0.35
  ) {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const cleaned = title
    .replace(new RegExp(`\\s*[-|]\\s*${host.replace(/\./g, "\\.")}.*$`, "i"), "")
    .trim();
  return limitTitle(cleaned);
}

function safeFallbackTitle(url: URL, label: SourceLabel) {
  const fromPath = cleanTitle(slugTitle(url), url);
  if (fromPath) return fromPath;
  if (label === "AIRBNB") return "Airbnb listing";

  const kind =
    label === "HOTEL"
      ? "Hotel option"
      : label === "FLIGHT"
        ? "Flight option"
        : label === "ACTIVITY"
          ? "Activity option"
          : "Trip option";
  return `${kind} from ${humanizeHostname(url)}`;
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

function searchParam(url: URL, names: string[]) {
  const entries = [...url.searchParams.entries()];
  for (const name of names) {
    const match = entries.find(([key]) => key.toLowerCase() === name);
    if (match?.[1]) return match[1];
  }
  return null;
}

function genericUrlEnrichment(url: URL): SiteEnrichment {
  const checkIn = searchParam(url, [
    "check_in",
    "checkin",
    "check-in",
    "arrival",
    "arrivaldate",
    "startdate",
  ]);
  const checkOut = searchParam(url, [
    "check_out",
    "checkout",
    "check-out",
    "departure",
    "departuredate",
    "enddate",
  ]);
  const start = formatUrlDate(checkIn);
  const end = formatUrlDate(checkOut);

  const directGuests = Number(
    searchParam(url, [
      "guests",
      "guest",
      "travelers",
      "travellers",
      "occupancy",
    ]),
  );
  const adults = Number(
    searchParam(url, ["adults", "group_adults", "numadults", "adultcount"]),
  );
  const children = Number(
    searchParam(url, [
      "children",
      "group_children",
      "numchildren",
      "childcount",
    ]),
  );
  const guestCount =
    Number.isInteger(directGuests) && directGuests > 0
      ? directGuests
      : Number.isInteger(adults) && adults > 0
        ? adults + (Number.isInteger(children) && children > 0 ? children : 0)
        : null;

  return {
    checkIn: checkIn && start ? checkIn : null,
    checkOut: checkOut && end ? checkOut : null,
    dates: start && end ? `${start}–${end}` : start ?? end,
    guestCount:
      guestCount && guestCount <= 100 ? guestCount : null,
    price: null,
    officialEmbedHtml: null,
  };
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
      checkIn: checkIn && start ? checkIn : null,
      checkOut: checkOut && end ? checkOut : null,
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
  const generic = genericUrlEnrichment(url);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const entry = Object.entries(siteEnrichers).find(
    ([domain]) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
  const specific = entry ? entry[1](url, html) : emptyEnrichment;

  return {
    checkIn: specific.checkIn ?? generic.checkIn,
    checkOut: specific.checkOut ?? generic.checkOut,
    dates: specific.dates ?? generic.dates,
    guestCount: specific.guestCount ?? generic.guestCount,
    price: specific.price ?? generic.price,
    officialEmbedHtml:
      specific.officialEmbedHtml ?? generic.officialEmbedHtml,
  };
}

function allowsEmbedding(
  response: Response,
  pageUrl: URL,
  parentOrigin: string,
) {
  const frameOptions = (
    response.headers.get("x-frame-options") ?? ""
  ).toLowerCase();
  if (frameOptions.includes("deny")) return false;
  if (
    frameOptions.includes("sameorigin") &&
    pageUrl.origin !== parentOrigin
  ) {
    return false;
  }

  const policy = response.headers.get("content-security-policy") ?? "";
  const directive = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => /^frame-ancestors\b/i.test(part));
  if (!directive) return true;

  const sources = directive.split(/\s+/).slice(1);
  if (sources.includes("'none'")) return false;
  if (sources.includes("*")) return true;
  if (sources.includes("'self'") && pageUrl.origin === parentOrigin) return true;
  if (
    sources.includes("https:") &&
    parentOrigin.toLowerCase().startsWith("https:")
  ) {
    return true;
  }

  return sources.some((source) => source.replace(/\/$/, "") === parentOrigin);
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
  const label = sourceLabel(url, new Map());

  return {
    title: safeFallbackTitle(url, label),
    image: null,
    description: null,
    siteName: url.hostname.replace(/^www\./, ""),
    sourceLabel: label,
    ...enrichment,
    embedUrl: null,
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
    const structured = getStructuredMetadata(html, finalUrl);
    const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const rawImage =
      meta.get("og:image:secure_url") ??
      meta.get("og:image") ??
      meta.get("twitter:image") ??
      null;
    const image =
      structured.image ??
      resolveImage(rawImage, finalUrl) ??
      getFirstLargeImage(html, finalUrl);
    const label = sourceLabel(finalUrl, meta);
    const title =
      cleanTitle(structured.title, finalUrl) ??
      cleanTitle(meta.get("og:title") ?? null, finalUrl) ??
      cleanTitle(meta.get("twitter:title") ?? null, finalUrl) ??
      cleanTitle(titleTag ? decodeEntities(titleTag) : null, finalUrl) ??
      safeFallbackTitle(finalUrl, label);
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
          structured.description ??
          meta.get("og:description") ??
          meta.get("description") ??
          meta.get("twitter:description") ??
          null,
        siteName:
          meta.get("og:site_name") ??
          finalUrl.hostname.replace(/^www\./, ""),
        sourceLabel: label,
        ...enrichment,
        embedUrl: allowsEmbedding(
          response,
          finalUrl,
          request.nextUrl.origin,
        )
          ? finalUrl.toString()
          : null,
        fallback: !title || !image,
      } satisfies UnfurlMetadata,
    });
  } catch {
    return NextResponse.json({ ok: true, metadata: fallback });
  }
}
