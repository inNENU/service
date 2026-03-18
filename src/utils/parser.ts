import { load } from "cheerio/slim";
import type { AnyNode } from "domhandler";

// oxlint-disable-next-line id-length
const $ = load("");

export const parseHTML = (content: string): AnyNode[] => $.parseHTML(content) ?? [];
