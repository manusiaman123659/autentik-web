import { NodeType, parse } from "next/dist/compiled/node-html-parser";

type HtmlNode = {
  nodeType: number;
  tagName?: string | null;
  childNodes?: HtmlNode[] | null;
  text?: string | null;
};

type Segment = string | { readonly preserved: string };

const SKIP_TAGS = new Set([
  "audio",
  "base",
  "canvas",
  "embed",
  "head",
  "iframe",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "template",
  "textarea",
  "title",
  "video",
]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "caption",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "footer",
  "li",
  "main",
  "menu",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "ul",
]);

function collect(node: HtmlNode, segments: Segment[], preserve: boolean): void {
  if (node.nodeType === NodeType.COMMENT_NODE) return;

  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = (node.text ?? "").replace(/\u00a0/g, " ");
    segments.push(preserve ? { preserved: text } : text.replace(/[ \t\r\n]+/g, " "));
    return;
  }

  if (node.nodeType !== NodeType.ELEMENT_NODE) return;

  const tag = (node.tagName ?? "").toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (tag === "br" || tag === "hr") {
    segments.push("\n");
    return;
  }

  const isBlock = BLOCK_TAGS.has(tag);
  if (isBlock) segments.push("\n");

  const keepWhitespace = preserve || tag === "pre";
  for (const child of node.childNodes ?? []) collect(child, segments, keepWhitespace);

  if (isBlock && tag !== "li") segments.push("\n");
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";

  const segments: Segment[] = [];
  const root = parse(html) as unknown as HtmlNode;
  collect(root, segments, false);

  const clean = (plain: string) => plain.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n");

  let out = "";
  let plain = "";
  for (const segment of segments) {
    if (typeof segment === "string") {
      plain += segment;
      continue;
    }
    out += clean(plain) + segment.preserved;
    plain = "";
  }
  out += clean(plain);

  return out
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+|\n+$/g, "");
}
