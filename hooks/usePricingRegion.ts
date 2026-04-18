'use client';

import { useEffect, useState } from 'react';
import { detectPricingRegionClient, type PricingRegion } from '@/lib/pricingRegion';

/** Stable after mount; defaults to INTL on first paint to avoid SSR mismatch. */
export function usePricingRegion(): PricingRegion {
    const [region, setRegion] = useState<PricingRegion>('INTL');
    useEffect(() => {
        setRegion(detectPricingRegionClient());
    }, []);
    return region;
}
