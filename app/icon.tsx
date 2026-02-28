// OECS Virtual Campus favicon
import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#2563eb',
          borderRadius: '6px'
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          VC
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
