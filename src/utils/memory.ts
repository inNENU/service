export const getMemoryUsage = (): Record<string, number> => {
  const used = process.memoryUsage();

  return Object.fromEntries(
    Object.entries(used).map(([key, value]) => {
      const memory = Math.round((value / 1024 / 1024) * 100) / 100;

      console.log(`${key}: ${memory} MB`);

      return [key, memory];
    }),
  );
};
