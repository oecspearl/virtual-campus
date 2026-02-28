// Never use @iconify/react inside this file.
import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563eb',
        borderRadius: '24px'
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: '48px',
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif'
        }}
      >
        VC
      </div>
    </div>,
    {
      ...size
    }
  );
}
