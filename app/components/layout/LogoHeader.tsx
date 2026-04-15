"use client";

import Image from "next/image";
import { useBranding } from "@/lib/hooks/useBranding";

export default function LogoHeader() {
  const { logoHeaderUrl, siteName, logoHeaderEnabled } = useBranding();
  
  if (!logoHeaderEnabled) {
    return null;
  }
  
  return (
    <div className="hidden lg:block w-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200/30">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center justify-center">
        <div className="relative h-16 w-auto">
          <Image
            src={logoHeaderUrl}
            alt={`${siteName} Logo`}
            width={200}
            height={64}
            className="h-full w-auto object-contain"
            style={{ width: 'auto' }}
            priority
          />
        </div>
      </div>
    </div>
  );
}
