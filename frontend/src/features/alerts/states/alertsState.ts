export const ALERTS_MIN_REFRESH_MS = 250;
export const ALERTS_AUTO_REFRESH_MS = 30_000;

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function getPreviousPage(page: number) {
  return Math.max(0, page - 1);
}

export function getNextPage(page: number, totalPages: number) {
  return Math.min(totalPages - 1, page + 1);
}
