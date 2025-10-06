'use client';

import Link from 'next/link';
import { History } from 'lucide-react';

interface FloatingLogoProps {
  show: boolean;
}

export default function FloatingLogo({ show }: FloatingLogoProps) {
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10001] px-4 md:px-8 h-20 flex items-center animate-fadeIn pointer-events-none">
      <Link href="/" className="flex items-center space-x-2 md:space-x-3 pointer-events-auto">
        <div className="relative w-6 h-6 md:w-8 md:h-8">
          <History className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>
        <span className="text-2xl md:text-4xl font-medium text-white" style={{ fontFamily: 'var(--font-zalando-sans, "Zalando Sans Expanded", sans-serif)' }}>
          RIFT REWIND
        </span>
      </Link>
    </div>
  );
}
