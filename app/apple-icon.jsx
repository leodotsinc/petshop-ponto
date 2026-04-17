import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: 'white',
            lineHeight: 1,
            fontFamily: 'sans-serif',
          }}
        >
          P
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 2,
            fontFamily: 'sans-serif',
          }}
        >
          PONTO
        </div>
      </div>
    ),
    { ...size }
  );
}
