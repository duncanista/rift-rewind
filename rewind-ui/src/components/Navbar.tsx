"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, History, Menu, X, ClockFading } from "lucide-react";
import { siGithub, siX } from "simple-icons";
import SimpleIcon from "@/components/SimpleIcon";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-md">
      <div className="w-full px-4 md:px-8 h-20 flex items-center">
        {/* Logo - Left Section */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-center space-x-2 md:space-x-3">
            {/* Logo Icon with animation on mobile */}
            <div className="relative w-6 h-6 md:w-8 md:h-8">
              <History 
                className={`absolute inset-0 w-6 h-6 md:w-8 md:h-8 text-white transition-all duration-500 ease-in-out md:opacity-100 md:rotate-0 ${
                  isMenuOpen 
                    ? "opacity-0 -rotate-180 scale-50" 
                    : "opacity-100 rotate-0 scale-100"
                }`}
              />
              <ClockFading 
                className={`absolute inset-0 w-6 h-6 md:w-8 md:h-8 text-white transition-all duration-500 ease-in-out md:opacity-0 md:-rotate-180 ${
                  isMenuOpen 
                    ? "opacity-100 rotate-0 scale-100" 
                    : "opacity-0 rotate-180 scale-50"
                }`}
              />
            </div>
            <span className="text-2xl md:text-4xl font-medium text-white" style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}>
              RIFT REWIND
            </span>
          </Link>
        </div>

        {/* Center Navigation - Desktop Only */}
        <div className="flex-1 hidden md:flex justify-center items-center space-x-8">
          <a 
            href="https://builder.aws.com/content/2cL6U7m5JvOIgYbGtzZT7E0NBR0/rift-rewind-ready-for-a-chronobreak" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            BLOG
          </a>
          <Link 
            href="/chat" 
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            AI COACH
          </Link>
          <Link 
            href="/about" 
            className="text-white/70 hover:text-white text-lg font-semibold transition-colors"
          >
            ABOUT
          </Link>
        </div>

        {/* Right Icons - Desktop Only */}
        <div className="flex-1 hidden md:flex items-center justify-end space-x-5">
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
          {/* <button
            className="text-white/60 hover:text-white transition-colors"
            aria-label="User Profile"
          >
            <User className="w-6 h-6" />
          </button> */}
        </div>

        {/* Mobile Menu Button with animation */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-white p-2 relative"
          aria-label="Toggle menu"
        >
          <div className="relative w-6 h-6">
            <Menu 
              className={`absolute inset-0 w-6 h-6 transition-all duration-300 ease-in-out ${
                isMenuOpen 
                  ? "opacity-0 rotate-90 scale-75" 
                  : "opacity-100 rotate-0 scale-100"
              }`}
            />
            <X 
              className={`absolute inset-0 w-6 h-6 transition-all duration-300 ease-in-out ${
                isMenuOpen 
                  ? "opacity-100 rotate-0 scale-100" 
                  : "opacity-0 -rotate-90 scale-75"
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu with slide-in animation */}
      <div 
        className={`md:hidden absolute top-20 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 overflow-hidden transition-all duration-500 ease-in-out ${
          isMenuOpen 
            ? "max-h-[500px] opacity-100" 
            : "max-h-0 opacity-0"
        }`}
      >
        <div className={`flex flex-col px-6 py-6 space-y-6 transition-transform duration-500 ease-out ${
          isMenuOpen ? "translate-y-0" : "-translate-y-4"
        }`}>
          {/* Navigation Links */}
          <a 
            href="https://builder.aws.com/content/2cL6U7m5JvOIgYbGtzZT7E0NBR0/rift-rewind-ready-for-a-chronobreak" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white text-xl font-semibold transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            BLOG
          </a>
          <Link 
            href="/chat" 
            className="text-white/70 hover:text-white text-xl font-semibold transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            AI COACH
          </Link>
          <Link 
            href="/about" 
            className="text-white/70 hover:text-white text-xl font-semibold transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            ABOUT
          </Link>

          {/* Social Icons */}
          <div className="flex items-center space-x-6 pt-4 border-t border-white/10">
            <a
              href="https://x.com/jordan_nebula"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
              aria-label="X (formerly Twitter)"
            >
              <SimpleIcon path={siX.path} title="X" className="w-6 h-6" />
            </a>
            <a
              href="https://github.com/duncanista/rift-rewind"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <SimpleIcon path={siGithub.path} title="GitHub" className="w-6 h-6" />
            </a>
            {/* <button
              className="text-white/60 hover:text-white transition-colors"
              aria-label="User Profile"
            >
              <User className="w-7 h-7" />
            </button> */}
          </div>
        </div>
      </div>
    </nav>
  );
}

