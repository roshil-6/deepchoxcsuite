import { PA_RELAY_NAV_HINT } from '@/lib/paBuddy';

/** Short line under the cofounder in the nav — plain text, no badge. */
export function RelayNavHint({ className = '' }: { className?: string }) {
    return <span className={`block text-[11px] font-normal leading-snug text-zinc-500 ${className}`}>{PA_RELAY_NAV_HINT}</span>;
}
