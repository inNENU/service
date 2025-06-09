import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { request, splitWords } from "../utils/index.js";

export type SearchType = "all" | "guide" | "intro" | "function";

export interface SearchOptions {
  word: string;
  scope?: SearchType;
  type?: "word" | "result";
}

const enum SearchItemType {
  Page = 0,
  ID = 1,
}

const enum SearchIndexType {
  Title = 1,
  Heading = 2,
  Text = 3,
  Image = 4,
  Card = 5,
  Doc = 6,
}

export type TitleSearchIndex = [SearchIndexType.Title, string];
export type HeadingSearchIndex = [SearchIndexType.Heading, string];
export type TextSearchIndex = [SearchIndexType.Text, string];
export type ImageSearchIndex = [
  SearchIndexType.Image,
  { desc: string; icon: string },
];
export type CardSearchIndex = [
  SearchIndexType.Card,
  { title: string; desc: string },
];
export type DocSearchIndex = [
  SearchIndexType.Doc,
  { name: string; icon: string },
];
export type SearchIndex =
  | TitleSearchIndex
  | HeadingSearchIndex
  | TextSearchIndex
  | ImageSearchIndex
  | DocSearchIndex
  | CardSearchIndex;

export type IDContentIndex = [
  type: SearchItemType.ID,
  /** 页面名称 */
  name: string,
  /** 搜索索引 */
  indexes: SearchIndex[],
];

export type PageIndex = [
  type: SearchItemType.Page,
  /** 页面名称 */
  name: string,
  /** 页面图标 */
  icon: string,
  /** 页面标签 */
  tags?: string[],
];

export type SearchMap = Record<
  // 页面 ID 或 路径
  string,
  // 页面内容
  IDContentIndex | PageIndex
>;

let versionInfo: Record<string, number> = {
  apartment: 0,
  function: 0,
  guide: 0,
  intro: 0,
  school: 0,
  newcomer: 0,
};

let guideIndex: SearchMap;
let introIndex: SearchMap;
let functionIndex: SearchMap;

const getIndex = (type: SearchType): SearchMap => {
  switch (type) {
    case "guide":
      return guideIndex;
    case "intro":
      return introIndex;
    case "function":
      return functionIndex;
    case "all":
      return {
        ...guideIndex,
        ...introIndex,
        ...functionIndex,
      };
  }
};

const VERSION_URL = "https://res.innenu.com/service/version.php";
const SEARCH_DATA_URL = "https://res.innenu.com/service/search-data.php";

const updateIndex = async (): Promise<void> => {
  const versionResponse = await fetch(VERSION_URL);

  let changed = false;

  const version = (await versionResponse.json()) as Record<string, number>;

  if (
    versionInfo.guide !== version.guide ||
    versionInfo.newcomer !== version.newcomer
  ) {
    const guideResponse = await fetch(SEARCH_DATA_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "guide",
      }),
    });

    guideIndex = (await guideResponse.json()) as SearchMap;
    changed = true;
  }

  if (
    versionInfo.apartment !== version.apartment ||
    versionInfo.intro !== version.intro ||
    versionInfo.school !== version.school
  ) {
    const introResponse = await fetch(SEARCH_DATA_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "intro",
      }),
    });

    introIndex = (await introResponse.json()) as SearchMap;

    changed = true;
  }

  if (versionInfo.function !== version.function) {
    const functionResponse = await fetch(SEARCH_DATA_URL, {
      method: "POST",
      body: JSON.stringify({
        type: "function",
      }),
    });

    functionIndex = (await functionResponse.json()) as SearchMap;

    changed = true;
  }

  if (changed) {
    versionInfo = version;
  }
};

if (
  process.env.NODE_ENV !== "development" &&
  process.env.NODE_ENV !== "debug"
) {
  await updateIndex();

  setInterval(
    () => {
      void updateIndex();
    },
    1000 * 60 * 5,
  );
}

export const getSearchWord = async (
  searchWord: string,
  scope: SearchType,
): Promise<string[]> => {
  const words = (await splitWords(searchWord)).sort(
    (a, b) => a.length - b.length,
  );
  const searchIndex = getIndex(scope);
  const suggestions = new Map<string, number>();

  for (const idOrUrl in searchIndex) {
    const indexContent = searchIndex[idOrUrl];

    words: for (const word of words)
      if (indexContent[0] === SearchItemType.Page) {
        const [, title, , tags] = indexContent;

        if (title.includes(word)) {
          suggestions.set(title, word.length);
          continue words;
        }

        if (tags)
          for (const tag of tags)
            if (tag.includes(word)) {
              suggestions.set(tag, word.length);
              continue words;
            }
      } else {
        const [, title, indexes] = indexContent;

        if (title.includes(word)) suggestions.set(title, word.length);

        indexes.forEach(([type, text]) => {
          if (
            (type === SearchIndexType.Title ||
              type === SearchIndexType.Heading) &&
            text.includes(word)
          )
            suggestions.set(text, word.length);
        });
      }
  }

  return Array.from(suggestions.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
};

type Result =
  | {
      title: string;
      weight: number;
      icon: string;
      url: string;
    }
  | {
      weight: number;
      title: string;
      path: string;
      indexes: [type: string, config: unknown][];
    };

export const getSearchResult = async (
  searchWord: string,
  scope: SearchType,
): Promise<unknown[]> => {
  const words = (await splitWords(searchWord)).sort(
    (a, b) => a.length - b.length,
  );
  const searchIndex = getIndex(scope);
  const results = [] as Result[];

  for (const idOrUrl in searchIndex) {
    const indexContent = searchIndex[idOrUrl];
    let matchedWords = 0;

    if (indexContent[0] === SearchItemType.Page) {
      const [, title, icon, tags] = indexContent;

      for (const word of words)
        if (title.includes(word) || tags?.some((tag) => tag.includes(word)))
          matchedWords++;

      if (matchedWords)
        results.push({
          title,
          weight: 1024 * searchWord.length * matchedWords,
          icon,
          url: idOrUrl,
        });
    } else {
      const [, title, indexes] = indexContent;

      const indexedContent = new Map<string, number>();
      const record = {
        title,
        weight: 0,
        path: idOrUrl,
        indexes: [] as [string, unknown][],
      };

      for (const word of words) {
        let isMatched = false;

        if (title.includes(word)) {
          const id = `Page:${title}`;

          isMatched = true;
          if (!indexedContent.has(id)) {
            record.weight += word.length * 8;
            indexedContent.set(id, word.length * 8);
          }
        }

        indexes.forEach(([type, config]) => {
          if (type === SearchIndexType.Title) {
            if (config.includes(word)) {
              const id = `Title:${config}`;

              isMatched = true;
              if (!indexedContent.has(id)) {
                record.indexes.push(["heading", config]);
                record.weight += word.length * 4;
              }
              indexedContent.set(id, word.length * 4);
            }
          } else if (type === SearchIndexType.Heading) {
            if (config.includes(word)) {
              const id = `Heading:${config}`;

              isMatched = true;
              if (!indexedContent.has(id)) {
                record.indexes.push(["heading", config]);
                record.weight += word.length * 2;
              }
              indexedContent.set(id, word.length * 2);
            }
          } else if (type === SearchIndexType.Doc) {
            if (config.name.includes(word)) {
              const id = `Doc:${config.name}`;

              isMatched = true;
              if (!indexedContent.has(id)) {
                record.indexes.push(["doc", config]);
                record.weight += word.length * 2;
              }
              indexedContent.set(id, word.length * 2);
            }
          } else if (type === SearchIndexType.Card) {
            if (config.title.includes(word) || config.desc.includes(word)) {
              const id = `Card:${config.title}`;

              isMatched = true;
              if (!indexedContent.has(id)) {
                record.indexes.push(["card", config]);
                record.weight += word.length * 2;
              }
              indexedContent.set(id, word.length * 2);
            }
          } else if (type === SearchIndexType.Text) {
            const index = config.indexOf(word);

            if (index >= 0) {
              const id = `Text:${config}`;
              const startIndex = Math.max(index - 8, 0);
              const endIndex = Math.min(index + 8, config.length);

              isMatched = true;
              record.indexes.push([
                "text",
                {
                  word,
                  before:
                    (startIndex === 0 ? "" : "...") +
                    config.substring(startIndex, index),
                  after:
                    config.substring(index + word.length, endIndex) +
                    (endIndex === config.length ? "" : "..."),
                },
              ]);

              if (!indexedContent.has(id)) record.weight += word.length * 1;

              indexedContent.set(id, word.length * 1);
            }
          } else if (type === SearchIndexType.Image) {
            if (config.desc.includes(word)) {
              const id = `Image:${config.desc}`;

              isMatched = true;
              if (!indexedContent.has(id)) {
                record.indexes.push(["image", config]);
                record.weight += word.length * 1;
              }
              indexedContent.set(id, word.length * 1);
            }
          }
        });

        if (isMatched) matchedWords++;
      }

      if (matchedWords) {
        record.weight =
          Array.from(indexedContent.values()).reduce(
            (prev, current) => prev + current,
            0,
          ) * Math.pow(4, matchedWords - 1);
        results.push(record);
      }
    }
  }

  return results.sort((a, b) => b.weight - a.weight);
};

export type SearchResponse =
  // TODO: Improve types
  CommonSuccessResponse<unknown[]> | CommonFailedResponse;

export const mpSearchHandler = request<SearchResponse, SearchOptions>(
  async (req, res) => {
    const { scope = "all", type = "result", word } = req.body;

    if (!word) return res.json({ success: true, data: [] });

    const result =
      type === "word"
        ? await getSearchWord(word, scope)
        : await getSearchResult(word, scope);

    return res.json({
      success: true,
      data: result,
    });
  },
);
