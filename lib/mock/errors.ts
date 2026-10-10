// Error type of the mock "backend". Lives in its own module so handlers can throw it without importing the
// router (the router imports the handlers). `router.ts` re-exports it for the transport (`instanceof`).
export class MockHttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
