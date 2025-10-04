'use client';

import React from 'react';
import { siGithub } from 'simple-icons';
import SimpleIcon from '@/components/SimpleIcon';

export default function Footer() {
  return (
    <footer className="relative z-10 mt-auto w-full">
      <div className="w-full px-8 py-4 backdrop-blur-md bg-gradient-to-t from-black/30 to-transparent">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Legal Section - Compact inline */}
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-white/30 leading-relaxed">
              © 2025 Rift Rewind • Not endorsed by Riot Games or AWS • League of Legends™ © Riot Games, Inc. • 
              Powered by Amazon Web Services
            </p>
          </div>

          {/* Links Section - Horizontal compact */}
          <div className="flex items-center gap-5">
            <a
              href="https://github.com/duncanista/rift-rewind"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white/90 transition-colors group"
            >
              <SimpleIcon path={siGithub.path} title="GitHub" className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <a
              href="#"
              className="text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
            >
              Challenge 1
            </a>

            <span className="text-sm font-medium text-white/35 cursor-not-allowed">
              Challenge 2
            </span>

            <span className="text-sm font-medium text-white/35 cursor-not-allowed">
              Devpost
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

