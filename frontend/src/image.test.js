import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StudyImage, { resolveStudyImageUrl } from "./StudyImage.js";
import { Content } from "./content.js";

test("allow only bounded public HTTPS and known bundled asset paths", () => {
  assert.deepEqual(resolveStudyImageUrl("https://upload.wikimedia.org/wikipedia/commons/a/a0/Example.jpg"), {
    src: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Example.jpg",
    external: true,
    host: "upload.wikimedia.org",
  });
  assert.deepEqual(resolveStudyImageUrl("/subjects/biology.svg"), {
    src: "/subjects/biology.svg", external: false, host: null,
  });
  assert.ok(resolveStudyImageUrl("https://images.nasa.gov/some-image.png?size=large"));
  for (const url of [
    "http://upload.wikimedia.org/example.jpg",
    "file:///etc/passwd",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "javascript:alert(1)",
    "//example.org/image.png",
    "https://localhost/image.png",
    "https://127.0.0.1/image.png",
    "https://[::1]/image.png",
    "https://10.0.0.1/image.png",
    "https://admin:password" + "@images.example.org/image.png",
    "https://images.example.org:8080/image.png",
    "https://files.internal/image.png",
    "/private/file.png",
    "/subjects/../notes/private.png",
    "/subjects/%2e%2e/sneaky.svg",
    "https://upload.wikimedia.org/hello\\evil.png",
    "https://upload.wikimedia.org/" + "x".repeat(2100),
  ]) {
    assert.equal(resolveStudyImageUrl(url), null, `Should block: ${url.slice(0, 80)}`);
  }
});

test("external markdown image is opt-in, never an automatic third-party image request", () => {
  const md = "![Labeled cell diagram](https://upload.wikimedia.org/wikipedia/commons/a/a0/Example.jpg)";
  const html = renderToStaticMarkup(React.createElement(Content, null, md));
  assert.match(html, /Load image from upload\.wikimedia\.org/);
  assert.match(html, /Open image source/);
  assert.match(html, /noopener noreferrer/);
  assert.doesNotMatch(html, /<img\b/);
  assert.match(html, /Labeled cell diagram/);
});

test("same-origin public asset can render inline without external consent", () => {
  const html = renderToStaticMarkup(
    React.createElement(Content, null, "![Cell structure](/subjects/biology.svg)"),
  );
  assert.match(html, /<img\b/);
  assert.match(html, /src="\/subjects\/biology\.svg"/);
  assert.match(html, /alt="Cell structure"/);
  assert.doesNotMatch(html, /Load image from/);
});

test("unsupported markdown resource remains visible but never becomes a loadable img", () => {
  const html = renderToStaticMarkup(
    React.createElement(Content, null, "![Diagram](javascript:alert%281%29)"),
  );
  assert.match(html, /Image unavailable/);
  assert.doesNotMatch(html, /<img\b/);
});

test("Markdown image inside a RECALL question uses the same safe renderer", () => {
  const md = [
    "# [BIO] Review",
    "## [BIO] Anatomy",
    "### [BIO] Q1 · Identify organ",
    "> [!RECALL]",
    "> Name the organ from the fully described source.",
    "> ![Labeled anatomy figure](https://upload.wikimedia.org/wikipedia/commons/a/a0/Example.jpg)",
    "",
    "> [!ANSWER]",
    "> Heart",
  ].join("\n");
  const html = renderToStaticMarkup(
    React.createElement(Content, {
      study: { topic: "Anatomy", sectionId: "section-1", reviews: [], questionCount: 1 },
    }, md),
  );
  assert.match(html, /study-problem/);
  assert.match(html, /Labeled anatomy figure/);
  assert.match(html, /Load image from upload\.wikimedia\.org/);
  assert.doesNotMatch(html, /<img\b/);
});

test("unsafe text in alt is escaped by React", () => {
  const html = renderToStaticMarkup(
    React.createElement(StudyImage, {
      src: "/subjects/biology.svg",
      alt: '<img src=x onerror="bad()">',
    }),
  );
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /&lt;img/);
});

test("bundled chemistry images provide a separate safe interactive-view link", () => {
  const periodic = renderToStaticMarkup(React.createElement(Content, null,
    "![Periodic table](/assets/chemistry/periodic-table.svg)"));
  assert.match(periodic, /<img\\b/);
  assert.match(periodic, /href="\\/interactive\\/periodic-table"/);
  assert.match(periodic, /Explore interactively/);
  const titration = renderToStaticMarkup(React.createElement(Content, null,
    "![Titration](/assets/chemistry/titration-setup.svg)"));
  assert.match(titration, /href="\\/interactive\\/diagram\\?id=titration-setup"/);
  const element = renderToStaticMarkup(React.createElement(Content, null,
    "![Oxygen](/assets/chemistry/elements/008-o.svg)"));
  assert.match(element, /href="\\/interactive\\/periodic-table\\?element=O"/);
  const unrelated = renderToStaticMarkup(React.createElement(Content, null,
    "![Biology](/subjects/biology.svg)"));
  assert.doesNotMatch(unrelated, /Explore interactively/);
});
