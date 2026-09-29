export const SESSION_COOKIE_NAME: string;
export function verifyPassword(candidate: unknown, expected: unknown): boolean;
export function createSessionToken(secret: string, now?: number): string;
export function verifySessionToken(token: string | undefined, secret: string | undefined, now?: number): boolean;
export function getRequestOrigin(request: Request): string;
export function assertSameOrigin(request: Request): void;
