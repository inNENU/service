export const patchFetch = (): void => {
  const originalFetch = fetch;

  global.fetch = async (url, options): Promise<globalThis.Response> => {
    const response = await originalFetch(url, options);

    console.debug("Fetching", url, `with ${response.status}`);

    return response;
  };
};
