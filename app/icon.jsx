import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          borderRadius: 128,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 220,
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
            fontSize: 72,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 4,
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
