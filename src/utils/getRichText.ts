import type { AnyNode } from "cheerio";

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

const handleNode = async (
  node: AnyNode,
  options: GetNodeOptions
): Promise<RichTextNode | null> => {
  if (node.type === "text") return { type: "text", text: node.data };

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
      const children = (
        await Promise.all(
          node.children.map((node) => handleNode(node, options))
        )
      ).filter((item): item is RichTextNode => item !== null);

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

  return (
    await Promise.all(rootNodes.map((node) => handleNode(node, options)))
  ).filter((item): item is RichTextNode => item !== null);
};
