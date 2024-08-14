export const getMemoryUsage = (): Record<string, number> =>
  Object.fromEntries(
    Object.entries(process.memoryUsage()).map(([key, value]) => {
      const memory = Math.round((value / 1024 / 1024) * 100) / 100;

      return [key, memory];
    }),
  );
