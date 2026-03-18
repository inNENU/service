export const generateRandomString = (length: number, dic = [..."0123456789"]): string => {
  const result = [];

  for (let i = 0; i < length; i++) result.push(dic[Math.floor(Math.random() * dic.length)]);

  return result.join("");
};
