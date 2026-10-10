// Single place that decides how a store is named in the UI. The dataset ships names prefixed with a real
// chain brand; the product shows a generic "Retail <colonia>" instead.

export const CHAIN_NAME = "Retail";

export function displayBranchName(store: { colonia: string }): string {
  return `${CHAIN_NAME} ${store.colonia}`;
}
