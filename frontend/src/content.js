import React from "react";
import Markdown from "react-markdown";
import gfm from "remark-gfm";
import math from "remark-math";
import katex from "rehype-katex";
import "katex/contrib/mhchem";
import { StudyContext, StudyProblem } from "./StudyProblem.js";
import { countRecall, humanTopic } from "./study.js";
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
function callouts(options = {}) {
  return (tree, file) => {
    let ordinal = options.offset || 0;
    const source = String(file.value);
    const kindOf = (node) =>
      node.type === "blockquote"
        ? node.children?.[0]?.children?.[0]?.value
            ?.match(/^\[!([A-Z]+)\]/i)?.[1]
            .toUpperCase()
        : null;
    const raw = (node) =>
      source
        .slice(node.position.start.offset, node.position.end.offset)
        .split("\n")
        .map((line) => line.replace(/^ {0,3}> ?/, ""))
        .join("\n")
        .replace(/^[ \t]*\[![A-Z]+\][ \t]*/i, "")
        .trim();
    function walk(parent, inheritedTopic) {
      if (!parent.children) return;
      const output = [];
      let topic = inheritedTopic;
      for (let i = 0; i < parent.children.length; i++) {
        const node = parent.children[i],
          kind = kindOf(node);
        if (node.type === "heading") {
          const text =
            node.children?.map((child) => child.value || "").join("") || "";
          topic = humanTopic(text);
          if (options.study && node.children?.[0]?.type === "text")
            node.children[0].value = humanTopic(node.children[0].value);
        }
        if (options.study && kind === "RECALL") {
          ordinal++;
          const parts = [];
          let next = i + 1;
          while (next < parent.children.length) {
            const following = parent.children[next],
              nextKind = kindOf(following);
            if (
              !["ANSWER", "HINT", "SOLUTION", "SOURCE", "EXAMPLE"].includes(
                nextKind,
              )
            )
              break;
            parts.push({ kind: nextKind, text: raw(following) });
            next++;
          }
          if (
            output.at(-1)?.type === "heading" &&
            /^Q\d+\s*[·—–:-]/i.test(topic)
          )
            output.pop();
          output.push({
            type: "paragraph",
            data: {
              hName: "study-problem",
              hProperties: {
                "data-prompt": raw(node),
                "data-parts": JSON.stringify(parts),
                "data-question-id": `q${ordinal}`,
                "data-number": (options.startNumber || 1) + ordinal - 1,
                "data-topic": topic || "Practice",
              },
            },
            children: [],
          });
          i = next - 1;
          continue;
        }
        if (kind) {
          const text = node.children[0].children[0];
          const collapsed = ["ANSWER", "HINT", "SOLUTION", "SOURCE"].includes(
            kind,
          );
          const marker = text.value.match(/^\[!([A-Z]+)\][ \t]*(.*)(?:\n|$)/i);
          // Inline answers are body content, never a visible summary/title.
          text.value = collapsed
            ? text.value.replace(/^\[![A-Z]+\][ \t]*/i, "")
            : text.value.slice(marker[0].length);
          node.data = {
            hName: collapsed ? "details" : "aside",
            hProperties: {
              className: ["callout", `callout-${kind.toLowerCase()}`],
            },
          };
          node.children.unshift({
            type: "paragraph",
            data: { hName: collapsed ? "summary" : "strong" },
            children: [
              {
                type: "text",
                value: collapsed
                  ? {
                      ANSWER: "Reveal answer",
                      HINT: "Show hint",
                      SOLUTION: "Show worked solution",
                      SOURCE: "Source details",
                    }[kind]
                  : marker[2] || kind,
              },
            ],
          });
        }
        walk(node, topic);
        output.push(node);
      }
      parent.children = output;
    }
    walk(tree, options.topic);
  };
}

function RenderContent({
  children,
  className = "",
  practice = true,
  offset = 0,
}) {
  const study = React.useContext(StudyContext);
  return React.createElement(
    "div",
    { className: `content ${className}` },
    React.createElement(
      Markdown,
      {
        remarkPlugins: [
          gfm,
          math,
          [
            callouts,
            {
              study: !!study && practice,
              offset,
              topic: study?.topic,
              startNumber: study?.startNumber,
            },
          ],
        ],
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
          "study-problem": StudyProblem,
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
export function Content({ children, className = "", study = null }) {
  const source = String(children ?? "");
  const [page, setPage] = React.useState(0);
  const generation = React.useRef({ source, version: 0 });
  if (generation.current.source !== source)
    generation.current = { source, version: generation.current.version + 1 };
  const wrap = (child) =>
    study
      ? React.createElement(
          StudyContext.Provider,
          { value: { ...study, Renderer: RenderContent } },
          child,
        )
      : child;
  React.useEffect(() => setPage(0), [source]);
  const pages = Math.max(1, Math.ceil(source.length / CONTENT_PAGE_SIZE)),
    current = Math.min(page, pages - 1);
  if (pages === 1)
    return wrap(
      React.createElement(
        RenderContent,
        { className, key: generation.current.version },
        source,
      ),
    );
  return wrap(
    React.createElement(
      "div",
      { className: "paged-content" },
      React.createElement(
        "div",
        { className: "content-page-note", role: "note" },
        `Long document · Part ${current + 1} of ${pages}. Your source is retained in full. Formatting may break where a part begins or ends.`,
      ),
      React.createElement(
        RenderContent,
        {
          className,
          key: `${generation.current.version}:${current}`,
          offset: countRecall(source.slice(0, current * CONTENT_PAGE_SIZE)),
        },
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
    ),
  );
}
