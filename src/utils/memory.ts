export const getMemoryUsage = (): Record<string, number> =>
  Object.fromEntries(
    Object.entries(process.memoryUsage()).map(([key, value]) => {
      const memory = Math.round((value / 1024 / 1024) * 100) / 100;

      return [key, memory];
    }),
  );

export const reportMemoryUsage = (interval = /** 5 min */ 300000): void => {
  setInterval(() => {
    global.gc?.();

    const { rss, heapTotal, heapUsed, arrayBuffers } = getMemoryUsage();

    console.debug(
      `rss: ${rss} MB, heap: ${heapUsed}/${heapTotal} MB, arrayBuffers: ${arrayBuffers} MB`,
    );
  }, interval);
};
