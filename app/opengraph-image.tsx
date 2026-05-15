import { ImageResponse } from 'next/og';
import {
  SITE_BRAND,
  SITE_HERO_H1,
  SITE_META_DESCRIPTION,
  SITE_ORG,
} from '@/lib/siteSeo';

export const runtime = 'edge';

export const alt = `${SITE_BRAND} · ${SITE_HERO_H1}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #0a0a0c 0%, #1a1428 42%, #0c0c0e 100%)',
          padding: 64,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#9d88ff',
          }}
        >
          {SITE_ORG}
        </p>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            maxWidth: 980,
          }}
        >
          {SITE_HERO_H1}
        </p>
        <p
          style={{
            margin: '28px 0 0',
            fontSize: 26,
            lineHeight: 1.45,
            color: '#c4c4c4',
            maxWidth: 900,
          }}
        >
          {SITE_META_DESCRIPTION.slice(0, 200)}
          {SITE_META_DESCRIPTION.length > 200 ? '…' : ''}
        </p>
        <p
          style={{
            margin: '40px 0 0',
            fontSize: 22,
            fontWeight: 600,
            color: '#7456ff',
          }}
        >
          {SITE_BRAND}
        </p>
      </div>
    ),
    { ...size },
  );
}
