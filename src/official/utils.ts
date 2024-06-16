export const OFFICIAL_URL = "https://www.nenu.edu.cn";

export const getOfficialPageView = (
  id: string | number,
  owner: string | number,
): Promise<number> =>
  fetch(
    `${OFFICIAL_URL}/system/resource/code/news/click/dynclicks.jsp?clickid=${id}&owner=${owner}&clicktype=wbnews`,
  )
    .then((res) => res.text())
    .then((pageView) => Number(pageView));
