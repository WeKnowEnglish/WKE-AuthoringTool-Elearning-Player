export function readWorkerConfig(environment?: NodeJS.ProcessEnv): { configured: boolean; secret?: string };
export function workerRequestAuthorized(authorizationHeader: string | null, secret: string): boolean;
