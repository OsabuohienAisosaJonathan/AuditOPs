import { Request, Response, NextFunction } from "express";
import * as circuitBreaker from "./circuitBreaker";
import { probeDatabase } from "./db";

export function circuitBreakerGuard(routeId: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cbStats = circuitBreaker.getCircuitStats();
    
    if (cbStats.state === 'HALF_OPEN') {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] CIRCUIT_BREAKER_PROBE`, {
        route: routeId,
        action: 'attempting_probe_request',
      });
      
      const probeSuccess = await probeDatabase();
      if (!probeSuccess) {
        return res.status(503).json({
          message: "Service temporarily unavailable. Retrying shortly.",
          circuitBreaker: {
            state: 'OPEN',
            cooldownRemaining: circuitBreaker.getConfig().cooldownMs,
          }
        });
      }
    }
    
    if (circuitBreaker.isCircuitOpen()) {
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
    
    next();
  };
}

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
        
        circuitBreaker.recordFailure(req.path);
        
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
