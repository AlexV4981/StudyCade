import React from "react";
import Markdown from "react-markdown";
import gfm from "remark-gfm";
import math from "remark-math";
import katex from "rehype-katex";
import "katex/contrib/mhchem";
// Protect fenced and inline code before normalizing the legacy math delimiters.
export function normalize(source = "") {
  // A short answer such as "1789." is a date, not an empty Markdown list.
  if (/^\s*\d+\.\s*$/.test(String(source)))
    return String(source).replace(".", "\\.");
  const lines = String(source).split(/(?<=\n)/);
  let fence = null,
    buffer = "",
    out = "";
  const convert = (part) =>
    part
      .split(/(`+[^`]*`+)/g)
      .map((chunk, i) =>
        i % 2
          ? chunk
          : chunk
              .replace(/(^[ \t]*>[ \t]*\[![A-Z]+\])/gm, "\n$1")
              .replace(
                /\\\[([\s\S]*?)\\\]/g,
                (_, body) => "\n$$\n" + body + "\n$$\n",
              )
              .replace(/\\\(([\s\S]*?)\\\)/g, (_, body) => "$" + body + "$"),
      )
      .join("");
  for (const line of lines) {
    const marker = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);
    if (!fence && marker) {
      out += convert(buffer);
      buffer = "";
      fence = marker[1];
      out += line;
    } else if (fence) {
      out += line;
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        line.slice(marker[0].length).trim() === ""
      )
        fence = null;
    } else buffer += line;
  }
  return out + convert(buffer);
}
export function safeUrl(url) {
  return /^(?:https?:|mailto:|\/[^/]|#)/i.test(url) ? url : "";
}
function callouts() {
  return (tree) => {
    function walk(node) {
      if (
        node.type === "blockquote" &&
        node.children?.[0]?.type === "paragraph"
      ) {
        const text = node.children[0].children?.[0];
        const m = text?.value?.match(/^\[!([A-Z]+)\][ \t]*(.*)(?:\n|$)/i);
        if (m) {
          text.value = text.value.slice(m[0].length);
          node.data = {
            hName: m[1].toUpperCase() === "ANSWER" ? "details" : "aside",
            hProperties: {
              className: ["callout", `callout-${m[1].toLowerCase()}`],
            },
          };
          node.children.unshift({
            type: "paragraph",
            data: {
              hName: m[1].toUpperCase() === "ANSWER" ? "summary" : "strong",
            },
            children: [
              {
                type: "text",
                value:
                  m[2] ||
                  (m[1].toUpperCase() === "ANSWER" ? "Reveal answer" : m[1]),
              },
            ],
          });
        }
      }
      node.children?.forEach(walk);
    }
    walk(tree);
  };
}
function RenderContent({ children, className = "" }) {
  return React.createElement(
    "div",
    { className: `content ${className}` },
    React.createElement(
      Markdown,
      {
        remarkPlugins: [gfm, math, callouts],
        rehypePlugins: [
          [
            katex,
            {
              trust: false,
              throwOnError: false,
              strict: "warn",
              maxExpand: 1000,
              maxSize: 10,
            },
          ],
        ],
        urlTransform: safeUrl,
        components: {
          img: ({ alt }) =>
            React.createElement(
              "span",
              { className: "muted" },
              alt ? `[Image: ${alt}]` : "[Image]",
            ),
          a: ({ children, ...props }) =>
            React.createElement(
              "a",
              { ...props, rel: "noopener noreferrer" },
              children,
            ),
        },
      },
      normalize(children),
    ),
  );
}

export const CONTENT_PAGE_SIZE = 50000;
export function Content({ children, className = "" }) {
  const source = String(children ?? "");
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(0), [source]);
  const pages = Math.max(1, Math.ceil(source.length / CONTENT_PAGE_SIZE)),
    current = Math.min(page, pages - 1);
  if (pages === 1)
    return React.createElement(RenderContent, { className }, source);
  return React.createElement(
    "div",
    { className: "paged-content" },
    React.createElement(
      "div",
      { className: "content-page-note", role: "note" },
      `Long document · Part ${current + 1} of ${pages}. Your source is retained in full. Formatting may break where a part begins or ends.`,
    ),
    React.createElement(
      RenderContent,
      { className },
      source.slice(
        current * CONTENT_PAGE_SIZE,
        (current + 1) * CONTENT_PAGE_SIZE,
      ),
    ),
    React.createElement(
      "nav",
      {
        className: "controls content-pagination",
        "aria-label": "Long document parts",
      },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: current === 0,
          onClick: () => setPage(current - 1),
        },
        "← Previous part",
      ),
      React.createElement(
        "span",
        { "aria-live": "polite", className: "small muted" },
        `Part ${current + 1} of ${pages}`,
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: current === pages - 1,
          onClick: () => setPage(current + 1),
        },
        "Next part →",
      ),
    ),
  );
}
