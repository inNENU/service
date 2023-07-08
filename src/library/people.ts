import type { RequestHandler } from "express";

export interface LibraryPeopleReponse {
  benbu: number;
  jingyue: number;
}

export const libraryPeopleHandler: RequestHandler = async (_, res) => {
  try {
    const response = await fetch("http://www.library.nenu.edu.cn");

    const responseText = await response.text();

    console.log(responseText);

    const [, benbu, jingyue] = responseText.match(
      /<p><span>本部<\/span><span>(\d+)<\/span><\/p>\s+<p><span>净月<\/span><span>(\d+)<\/span><\/p>/,
    )!;

    res.json({
      benbu,
      jingyue,
    });
  } catch (err) {
    console.error(err);

    res.status(500).end();
  }
};
