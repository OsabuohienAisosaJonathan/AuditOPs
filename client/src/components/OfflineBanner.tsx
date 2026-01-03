import { useNetworkStatus } from '@/lib/network-status';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
      data-testid="offline-banner"
    >
      <WifiOff className="h-4 w-4" />
      <span>Offline — showing last saved data. Some actions are disabled.</span>
    </div>
  );
}

export function OfflineIndicator({ className }: { className?: string }) {
  const { isOnline } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-1 text-amber-600 text-xs ${className || ''}`}>
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}
