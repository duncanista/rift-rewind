"use client";

import React from "react";
import { siGithub } from "simple-icons";
import SimpleIcon from "@/components/SimpleIcon";

export default function Footer() {
  return (
    <footer className="relative z-10 w-full">
      <div className="w-full px-4 md:px-8 py-6 md:py-4 backdrop-blur-md bg-gradient-to-t from-black/30 to-transparent">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4">
          {/* Links Section - Shows FIRST on mobile (two columns), single row on desktop */}
          <div className="order-1 md:order-2 w-full md:w-auto">
            {/* Mobile: Two Column Layout */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:hidden">
              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/duncanista/rift-rewind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-base font-medium text-white/60 hover:text-white/90 transition-colors group"
                >
                  <SimpleIcon path={siGithub.path} title="GitHub" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>GitHub</span>
                </a>
                <a
                  href="/about"
                  className="text-base font-medium text-white/60 hover:text-white/90 transition-colors"
                >
                  About
                </a>
                <a
                  href="/legal"
                  className="text-base font-medium text-white/60 hover:text-white/90 transition-colors"
                >
                  Legal
                </a>
              </div>
              <div className="flex flex-col gap-3">
                <a
                  href="#"
                  className="text-base font-medium text-white/60 hover:text-white/90 transition-colors"
                >
                  Challenge 1
                </a>
                <span className="text-base font-medium text-white/35 cursor-not-allowed">
                  Challenge 2
                </span>
                <span className="text-base font-medium text-white/35 cursor-not-allowed">
                  Devpost
                </span>
              </div>
            </div>

            {/* Desktop: Single Row Layout */}
            <div className="hidden md:flex flex-wrap items-center gap-5">
              <a
                href="https://github.com/duncanista/rift-rewind"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white/90 transition-colors group"
              >
                <SimpleIcon path={siGithub.path} title="GitHub" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>GitHub</span>
              </a>

              <a
                href="/about"
                className="text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                About
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

              <a
                href="/legal"
                className="text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
              >
                Legal
              </a>
            </div>
          </div>

          {/* Legal Section - Shows SECOND on mobile, first on desktop */}
          <div className="order-2 md:order-1 flex-1 space-y-1">
            <p className="text-[10px] md:text-[10px] text-white/30 leading-relaxed">
              © 2025 Rift Rewind • Not endorsed by Riot Games or AWS • League of Legends™ © Riot Games, Inc. • 
              Powered by Amazon Web Services
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

