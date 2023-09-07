import type { AnyNode } from "cheerio/lib/slim";

import { parseHTML } from "./parser.js";
import { ALLOWED_TAGS } from "../config/allowedTags";

export const getText = (content: string | AnyNode[]): string => {
  const nodes =
    typeof content === "string" ? parseHTML(content) || [] : content;

  return nodes
    .map((node) => {
      if (node.type === "text") return node.data;
      if ("childNodes" in node) return getText(node.childNodes);

      return "";
    })
    .join("");
};

export interface GetNodeOptions {
  getLinkText?: (link: string) => Promise<string | null> | string | null;
  getImageSrc?: (src: string) => Promise<string | null> | string | null;
  getClass?: (tag: string, className: string) => string | null;
}

export interface ElementNode {
  type: "node";
  name: string;
  attrs?: Record<string, string>;
  children?: RichTextNode[];
}

export interface TextNode {
  type: "text";
  text: string;
}

export type RichTextNode = ElementNode | TextNode;

const handleNodes = (node: (RichTextNode | null)[]): RichTextNode[] => {
  const result = [...node].filter(
    (item): item is RichTextNode => item !== null
  );

  if (result.length && result[0].type === "text" && result[0].text === "\n")
    // remove first text node if it's a newline
    result.shift();
  if (
    result.length &&
    result[result.length - 1].type === "text" &&
    (<TextNode>result[result.length - 1]).text === "\n"
  )
    // remove last text node if it's a newline
    result.pop();

  return result;
};

const handleNode = async (
  node: AnyNode,
  options: GetNodeOptions
): Promise<RichTextNode | null> => {
  if (node.type === "text")
    return { type: "text", text: node.data.replace(/\r/g, "") };

  if (node.type === "tag") {
    const config = ALLOWED_TAGS.find(([tag]) => node.name === tag);

    if (config) {
      const attrs = Object.fromEntries(
        node.attributes
          .filter(
            ({ name }) =>
              ["class", "style"].includes(name) || config[1]?.includes(name)
          )
          .map<[string, string]>(({ name, value }) => [name, value])
      );
      const children = handleNodes(
        await Promise.all(
          node.children.map((node) => handleNode(node, options))
        )
      );

      if (
        children.length &&
        children[0].type === "text" &&
        !children[0].text.trim()
      )
        // remove first text node if it's a newline
        children.shift();
      if (
        children.length &&
        children[children.length - 1].type === "text" &&
        !(<TextNode>children[children.length - 1]).text.trim()
      )
        // remove last text node if it's a newline
        children.pop();

      // add node name to class
      attrs["class"] = attrs["class"]
        ? `${attrs["class"]} ${node.name}`
        : node.name;

      // append link for anchor tag
      if (node.name === "a" && node.attribs.href) {
        const text = options.getLinkText
          ? await options.getLinkText(node.attribs.href)
          : ` (${node.attribs.href})`;

        if (text && text !== getText(node.childNodes))
          children.push({ type: "text", text });
      }

      // resolve img source for img tag
      if (node.name === "img" && attrs["src"] && options.getImageSrc) {
        const result = await options.getImageSrc?.(attrs["src"]);

        if (result === null) return null;

        attrs.src = result;
      }

      // delete styles for table cell
      if (["table", "tr", "th", "td"].includes(node.name)) delete attrs.style;

      if (options.getClass) {
        const className = options.getClass(node.name, attrs["class"] || "");

        if (className === null) delete attrs["class"];
        else if (Array.isArray(className)) attrs["class"] = className.join(" ");
        else attrs["class"] = className;
      }

      return {
        type: "node",
        name: node.name,
        ...(Object.keys(attrs).length ? { attrs } : {}),
        ...(children.length ? { children } : {}),
      };
    }
  }

  return null;
};

export const getRichTextNodes = async (
  content: string | AnyNode[],
  options: GetNodeOptions = {}
): Promise<RichTextNode[]> => {
  const rootNodes = Array.isArray(content) ? content : parseHTML(content) || [];

  return handleNodes(
    await Promise.all(rootNodes.map((node) => handleNode(node, options)))
  );
};
