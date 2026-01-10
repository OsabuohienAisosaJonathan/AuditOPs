import { Request, Response, NextFunction } from "express";
import * as circuitBreaker from "./circuitBreaker";
import { probeDatabase } from "./db";

export function circuitBreakerGuard(routeId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First call isCircuitOpen() to trigger any state transitions (OPEN→HALF_OPEN after cooldown)
    const isOpen = circuitBreaker.isCircuitOpen();
    
    // Now get fresh stats AFTER state transitions
    const cbStats = circuitBreaker.getCircuitStats();
    
    // If circuit is fully OPEN (not transitioned to HALF_OPEN), reject immediately
    if (isOpen) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] CIRCUIT_BREAKER_REJECTED`, {
        route: routeId,
        path: req.path,
        state: cbStats.state,
        cooldownRemaining: cbStats.cooldownRemaining,
      });
      
      return res.status(503).json({
        message: "Service temporarily unavailable. Retrying shortly.",
        circuitBreaker: {
          state: cbStats.state,
          cooldownRemaining: cbStats.cooldownRemaining,
        }
      });
    }
    
    // If state is HALF_OPEN, we're in probe mode - test with a database probe
    if (cbStats.state === 'HALF_OPEN') {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] CIRCUIT_BREAKER_PROBE`, {
        route: routeId,
        action: 'attempting_probe_request',
      });
      
      const probeSuccess = await probeDatabase();
      if (!probeSuccess) {
        // Probe failed - record failure to reopen circuit
        circuitBreaker.recordFailure(routeId);
        
        return res.status(503).json({
          message: "Service temporarily unavailable. Retrying shortly.",
          circuitBreaker: {
            state: 'OPEN',
            cooldownRemaining: circuitBreaker.getConfig().cooldownMs,
          }
        });
      }
      // Probe succeeded - continue with request (success will be recorded by route handler)
    }
    
    next();
  };
}

const CIRCUIT_BREAKER_EXEMPT_PATHS = ['/api/auth', '/api/organization', '/api/billing', '/api/subscription', '/api/user', '/api/health'];

export function requestTimeoutWrapper(timeoutMs: number = 3000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] REQUEST_TIMEOUT`, {
          route: req.path,
          method: req.method,
          timeoutMs,
        });
        
        const isExempt = CIRCUIT_BREAKER_EXEMPT_PATHS.some(p => req.path.startsWith(p));
        if (!isExempt) {
          circuitBreaker.recordFailure(req.path);
        }
        
        res.status(503).json({
          message: "Service temporarily unavailable. Retrying shortly.",
          error: "Request timeout",
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    res.on('close', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
}

export function protectedRouteMiddleware(routeId: string) {
  return [
    requestTimeoutWrapper(3000),
    circuitBreakerGuard(routeId),
  ];
}

export function handleCircuitBreakerError(error: unknown, res: Response, route: string): boolean {
  if (circuitBreaker.isCircuitBreakerError(error)) {
    const cbStats = circuitBreaker.getCircuitStats();
    res.status(503).json({
      message: "Service temporarily unavailable. Retrying shortly.",
      circuitBreaker: {
        state: cbStats.state,
        cooldownRemaining: cbStats.cooldownRemaining,
      }
    });
    return true;
  }
  
  if (error instanceof Error) {
    if (error.message.includes('timeout') || 
        error.message.includes('ETIMEDOUT') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Connection acquisition')) {
      circuitBreaker.recordFailure(route);
      
      const cbStats = circuitBreaker.getCircuitStats();
      if (cbStats.isOpen) {
        res.status(503).json({
          message: "Service temporarily unavailable. Retrying shortly.",
          circuitBreaker: {
            state: cbStats.state,
            cooldownRemaining: cbStats.cooldownRemaining,
          }
        });
        return true;
      }
    }
  }
  
  return false;
}
