// IE always rounds the time to the nearest 100ms
export const getIETimeStamp = (): number => {
  const time = Date.now();

  return Math.floor(time / 100) * 100;
};
