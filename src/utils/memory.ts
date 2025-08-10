export const getMemoryUsage = (): NodeJS.MemoryUsage => {
  const memory = process.memoryUsage();

  for (const key in memory) {
    memory[key as keyof NodeJS.MemoryUsage] =
      Math.round(
        (memory[key as keyof NodeJS.MemoryUsage] / 1024 / 1024) * 100,
      ) / 100;
  }

  return memory;
};

export const reportMemoryUsage = (interval = /** 5 min */ 300000): void => {
  setInterval(() => {
    global.gc?.();

    const { rss, heapTotal, heapUsed, arrayBuffers } = getMemoryUsage();

    console.debug(
      `rss: ${rss} MB, heap: ${heapUsed}/${heapTotal} MB, arrayBuffers: ${arrayBuffers} MB`,
    );
  }, interval);
};
