export const SERVER = "https://dsjx.webvpn.nenu.edu.cn";

// IE always rounds the time to the nearest 100ms
export const getTimeStamp = (): number => {
  const time = new Date().getMilliseconds();

  return Math.floor(time / 100) * 100;
};
