type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  queryTimeoutMs: number;
  requestTimeoutMs: number;
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  openedAt: number;
  lastStateChange: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 10000,
  queryTimeoutMs: 5000,
  requestTimeoutMs: 8000,
};

let state: CircuitBreakerState = {
  state: 'CLOSED',
  failureCount: 0,
  lastFailureTime: 0,
  openedAt: 0,
  lastStateChange: Date.now(),
};

let config: CircuitBreakerConfig = { ...DEFAULT_CONFIG };

let halfOpenFailures = 0;
const HALF_OPEN_FAILURE_THRESHOLD = 2;

function logStateTransition(fromState: CircuitState, toState: CircuitState, route?: string) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event: `CIRCUIT_BREAKER_${toState}`,
    fromState,
    toState,
    failureCount: state.failureCount,
    route: route || 'global',
  };
  
  if (toState === 'OPEN') {
    console.error(`[${timestamp}] CIRCUIT_BREAKER_OPEN`, logEntry);
  } else if (toState === 'HALF_OPEN') {
    console.warn(`[${timestamp}] CIRCUIT_BREAKER_HALF_OPEN`, logEntry);
  } else {
    console.info(`[${timestamp}] CIRCUIT_BREAKER_CLOSED`, logEntry);
  }
}

export function getCircuitState(): CircuitState {
  return state.state;
}

export function getCircuitStats(): {
  state: CircuitState;
  failureCount: number;
  isOpen: boolean;
  cooldownRemaining: number;
} {
  const now = Date.now();
  let cooldownRemaining = 0;
  
  if (state.state === 'OPEN') {
    cooldownRemaining = Math.max(0, config.cooldownMs - (now - state.openedAt));
  }
  
  return {
    state: state.state,
    failureCount: state.failureCount,
    isOpen: state.state === 'OPEN',
    cooldownRemaining,
  };
}

export function isCircuitOpen(): boolean {
  const now = Date.now();
  
  if (state.state === 'CLOSED') {
    return false;
  }
  
  if (state.state === 'OPEN') {
    if (now - state.openedAt >= config.cooldownMs) {
      const prevState = state.state;
      state.state = 'HALF_OPEN';
      state.lastStateChange = now;
      logStateTransition(prevState, 'HALF_OPEN');
      return false;
    }
    return true;
  }
  
  return false;
}

export function recordSuccess(route?: string): void {
  if (state.state === 'HALF_OPEN') {
    const prevState = state.state;
    state.state = 'CLOSED';
    state.failureCount = 0;
    halfOpenFailures = 0;
    state.lastStateChange = Date.now();
    logStateTransition(prevState, 'CLOSED', route);
  } else if (state.failureCount > 0) {
    state.failureCount = Math.max(0, state.failureCount - 1);
  }
}

export function recordFailure(route?: string): void {
  state.failureCount++;
  state.lastFailureTime = Date.now();
  
  const timestamp = new Date().toISOString();
  console.warn(`[${timestamp}] CIRCUIT_BREAKER_FAILURE`, {
    timestamp,
    route: route || 'unknown',
    failureCount: state.failureCount,
    threshold: config.failureThreshold,
    currentState: state.state,
  });
  
  if (state.state === 'HALF_OPEN') {
    halfOpenFailures++;
    if (halfOpenFailures >= HALF_OPEN_FAILURE_THRESHOLD) {
      const prevState = state.state;
      state.state = 'OPEN';
      state.openedAt = Date.now();
      state.lastStateChange = Date.now();
      halfOpenFailures = 0;
      logStateTransition(prevState, 'OPEN', route);
    }
  } else if (state.state === 'CLOSED' && state.failureCount >= config.failureThreshold) {
    const prevState = state.state;
    state.state = 'OPEN';
    state.openedAt = Date.now();
    state.lastStateChange = Date.now();
    logStateTransition(prevState, 'OPEN', route);
  }
}

export function resetCircuit(): void {
  const prevState = state.state;
  state = {
    state: 'CLOSED',
    failureCount: 0,
    lastFailureTime: 0,
    openedAt: 0,
    lastStateChange: Date.now(),
  };
  halfOpenFailures = 0;
  if (prevState !== 'CLOSED') {
    logStateTransition(prevState, 'CLOSED', 'manual_reset');
  }
}

export function getConfig(): CircuitBreakerConfig {
  return { ...config };
}

export function updateConfig(newConfig: Partial<CircuitBreakerConfig>): void {
  config = { ...config, ...newConfig };
}

export async function withQueryTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = config.queryTimeoutMs
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    ),
  ]);
}

export async function withRequestTimeout<T>(
  requestFn: () => Promise<T>,
  timeoutMs: number = config.requestTimeoutMs
): Promise<T> {
  return Promise.race([
    requestFn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

export async function withCircuitBreaker<T>(
  route: string,
  operation: () => Promise<T>
): Promise<T> {
  if (isCircuitOpen()) {
    throw new CircuitBreakerOpenError(route);
  }
  
  try {
    const result = await withQueryTimeout(operation);
    recordSuccess(route);
    return result;
  } catch (error) {
    recordFailure(route);
    throw error;
  }
}

export class CircuitBreakerOpenError extends Error {
  public readonly route: string;
  public readonly isCircuitBreakerError = true;
  
  constructor(route: string) {
    super('Service temporarily unavailable. Retrying shortly.');
    this.name = 'CircuitBreakerOpenError';
    this.route = route;
  }
}

export function isCircuitBreakerError(error: unknown): error is CircuitBreakerOpenError {
  return error instanceof CircuitBreakerOpenError || 
    (typeof error === 'object' && error !== null && 'isCircuitBreakerError' in error);
}
