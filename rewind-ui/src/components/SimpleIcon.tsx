'use client';

import React from 'react';

interface SimpleIconProps {
  path: string;
  title?: string;
  className?: string;
}

export default function SimpleIcon({ path, title, className = "w-6 h-6" }: SimpleIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  );
}

