import type { HealthAdapter } from './types';

/** No health store on web. iOS and Android pick up adapter.ios.ts / adapter.android.ts. */
export const healthAdapter: HealthAdapter | null = null;
