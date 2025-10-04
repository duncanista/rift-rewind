'use client';

import React from 'react';
import Link from 'next/link';
import { User, History } from 'lucide-react';
import { siGithub, siX } from 'simple-icons';
import SimpleIcon from '@/components/SimpleIcon';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-md">
      <div className="w-full px-8 h-20 flex items-center">
        {/* Logo - Left Section (1/3 width) */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center space-x-3">
            <History className="w-8 h-8 text-white" />
            <span className="text-4xl font-medium text-white" style={{ fontFamily: 'var(--font-zalando-sans, "Zalando Sans Expanded", sans-serif)' }}>
              RIFT REWIND
            </span>
          </Link>
        </div>

        {/* Center Navigation - Center Section (1/3 width) */}
        <div className="flex-1 hidden md:flex justify-center items-center space-x-8">
          <Link 
            href="/features" 
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            FEATURES
          </Link>
          <Link 
            href="/games" 
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            WORLDS25
          </Link>
          <Link 
            href="/community" 
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            ABOUT
          </Link>
        </div>

        {/* Right Icons - Right Section (1/3 width) */}
        <div className="flex-1 flex items-center justify-end space-x-5">
          <a
            href="https://x.com/jordan_nebula"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
            aria-label="X (formerly Twitter)"
          >
            <SimpleIcon path={siX.path} title="X" className="w-5 h-5" />
          </a>
          <a
            href="https://github.com/duncanista/rift-rewind"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <SimpleIcon path={siGithub.path} title="GitHub" className="w-5 h-5" />
          </a>
          <button
            className="text-white/60 hover:text-white transition-colors"
            aria-label="User Profile"
          >
            <User className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}

