import { ACTIVATE_PREFIX } from "./utils.js";

// Note: getUuid:
export const getActivateUUID = async (
  cookieHeader: string,
  sign: string,
): Promise<string> => {
  const response = await fetch(
    `${ACTIVATE_PREFIX}/realPersonAuth/getUuid?authScenes=0&sign=${sign}`,
    {
      headers: {
        Cookie: cookieHeader,
      },
    },
  );

  return await response.text();
};
