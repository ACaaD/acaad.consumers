import portfinder from 'portfinder';

export async function getNextPortAsync(startPort?: number): Promise<number> {
  const startMs = Date.now();

  try {
    startPort ??= 3000 + Math.round(Math.random() * 50_000);
    const delayInMs = Math.random() * 2_000;

    await delay(delayInMs);
    return await portfinder.getPortPromise({ port: startPort });
  } finally {
    console.log(`Finding next port took ${Date.now() - startMs} ms.`);
  }
}

export async function delay(delayInMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayInMs));
}

export function getRandomInt(max: number, min?: number) {
  min = Math.ceil(min ?? 0);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
