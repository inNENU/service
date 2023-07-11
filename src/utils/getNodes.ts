import type { AnyNode } from "cheerio";
import { load } from "cheerio";

import { ALLOWED_TAGS } from "../config/allowedTags";

const $ = load("");

export interface GetNodeOptions {
  getLinkText?: (link: string) => Promise<string | null> | string | null;
  getImageSrc?: (src: string) => Promise<string | null> | string | null;
}

export interface ElementNode {
  type: "node";
  name: string;
  attrs?: Record<string, string>;
  children?: Node[];
}

export interface TextNode {
  type: "text";
  text: string;
}

export type Node = ElementNode | TextNode;

const handleNode = async (
  node: AnyNode,
  options: GetNodeOptions,
): Promise<Node | null> => {
  if (node.type === "text") return { type: "text", text: node.data };

  if (node.type === "tag") {
    const config = ALLOWED_TAGS.find(([tag]) => node.name === tag);

    if (config) {
      const attrs = Object.fromEntries(
        node.attributes
          .filter(
            ({ name }) =>
              ["class", "style"].includes(name) || config[1]?.includes(name),
          )
          .map<[string, string]>(({ name, value }) => [name, value]),
      );
      const children = (
        await Promise.all(
          node.children.map((node) => handleNode(node, options)),
        )
      ).filter((item): item is Node => item !== null);

      // append link for anchor tag
      if (node.name === "a" && node.attribs.href) {
        const text = options.getLinkText
          ? await options.getLinkText(node.attribs.href)
          : ` (${node.attribs.href})`;

        if (text)
          children.push({
            type: "text",
            text,
          });
      }

      // resolve img source for img tag
      if (node.name === "img" && attrs["src"] && options.getImageSrc) {
        const result = await options.getImageSrc?.(attrs["src"]);

        if (result === null) return null;

        attrs.src = result;
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
  content: string,
  options: GetNodeOptions,
): Promise<Node[]> => {
  const rootNodes = $.parseHTML(content) || [];

  return (
    await Promise.all(rootNodes.map((node) => handleNode(node, options)))
  ).filter((item): item is Node => item !== null);
};
