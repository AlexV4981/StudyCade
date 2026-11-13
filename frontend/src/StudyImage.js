import React, { useState } from "react";
import { CHEMISTRY_TOPICS, CHEMISTRY_ELEMENT_ASSETS } from "./chemistry-library.js";
import { periodicHref, diagramHref } from "./interactive-chemistry.js";

const LINK_BY_ASSET = new Map([
  ...CHEMISTRY_TOPICS.map((asset) => [
    asset.path,
    asset.id === "periodic-table" ? periodicHref() : diagramHref(asset.id),
  ]),
  ...CHEMISTRY_ELEMENT_ASSETS.map((asset) => [
    asset.path, periodicHref({ element: asset.symbol }),
  ]),
]);

// A Markdown image is untrusted study material, not a fetch instruction.
// Only public HTTPS image URLs and known same-origin asset paths are eligible.
export function resolveStudyImageUrl(input) {
  if (typeof input !== "string" || input.length > 2048) return null;
  const value = input.trim();
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return null;

  if (value.startsWith("/") && !value.startsWith("//")) {
    if (
      !/^\/(?:assets|subjects|mathlive)\/[A-Za-z0-9._/-]+$/.test(value) ||
      value.split("/").some((part) => part === "." || part === "..") ||
      value.includes("//")
    ) return null;
    return { src: value, external: false, host: null };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.username || url.password ||
    (url.port && url.port !== "443")
  ) return null;
  const host = url.hostname.toLowerCase();
  if (
    !host.includes(".") ||
    host.startsWith("[") ||
    /^\d+(?:\.\d+){3}$/.test(host) ||
    /\.(?:localhost|local|internal|lan|test|invalid|example|onion)$/.test(host) ||
    host.endsWith(".home.arpa")
  ) return null;
  return { src: url.href, external: true, host };
}

export default function StudyImage({ src, alt = "", title = "" }) {
  const [approved, setApproved] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = resolveStudyImageUrl(src);
  const description = String(alt || title || "Study illustration").slice(0, 300);
  const interactive = source && !source.external ? LINK_BY_ASSET.get(source.src) : null;

  if (!source)
    return React.createElement(
      "span",
      { className: "study-image study-image-unavailable", role: "note" },
      "Image unavailable: unsupported or unsafe source",
      description ? ` — ${description}` : "",
    );

  const showImage = !source.external || approved;
  return React.createElement(
    "span",
    {
      className: "study-image",
      role: "group",
      "aria-label": `Study image: ${description}`,
    },
    React.createElement(
      "span",
      { className: "study-image-label" },
      description,
    ),
    showImage && !failed
      ? React.createElement("img", {
          src: source.src,
          alt: description,
          loading: "lazy",
          decoding: "async",
          referrerPolicy: "no-referrer",
          onError: () => setFailed(true),
        })
      : failed
        ? React.createElement(
            "span",
            { className: "study-image-help", role: "status" },
            "Image could not be displayed. The link may have expired or disallow embedding.",
          )
        : React.createElement(
            "button",
            {
              type: "button",
              className: "study-image-load",
              onClick: () => setApproved(true),
            },
            `Load image from ${source.host}`,
          ),
    interactive &&
      React.createElement(
        "a",
        {
          href: interactive,
          className: "study-image-interactive",
          target: "_blank",
          rel: "noopener noreferrer",
          referrerPolicy: "no-referrer",
        },
        "Explore interactively ↗",
      ),
    source.external &&
      React.createElement(
        "span",
        { className: "study-image-help" },
        "External images contact their host only after you choose Load image.",
      ),
    source.external &&
      React.createElement(
        "a",
        {
          href: source.src,
          target: "_blank",
          rel: "noopener noreferrer",
          referrerPolicy: "no-referrer",
          className: "study-image-source",
        },
        "Open image source",
      ),
  );
}
