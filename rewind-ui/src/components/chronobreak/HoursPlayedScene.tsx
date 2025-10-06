"use client";

import { useEffect, useState } from "react";

interface HoursPlayedSceneProps {
  hours: number;
}

export default function HoursPlayedScene({ hours }: HoursPlayedSceneProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 3000; // 3 seconds
    const steps = 60; // Number of updates for smooth animation
    const increment = hours / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayValue(hours);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(increment * currentStep));
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [hours]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-4xl px-4 animate-fadeIn text-center">
        {/* Title */}
        <h2 
          className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12" 
          style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
        >
          TIME ON THE RIFT
        </h2>

        {/* Animated Counter */}
        <div className="relative">
          {/* Glow effect behind number */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 md:w-80 md:h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
          
          {/* Main number */}
          <div className="relative">
            <div 
              className="text-[120px] md:text-[180px] lg:text-[220px] font-black text-transparent bg-clip-text bg-gradient-to-b from-sky-300 via-sky-400 to-blue-500 leading-none mb-4 transition-all duration-100"
              style={{ 
                fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)",
                textShadow: "0 0 80px rgba(56, 189, 248, 0.3)",
              }}
            >
              {displayValue}
            </div>
            
            {/* Hours label */}
            <div className="text-white text-3xl md:text-4xl lg:text-5xl font-bold">
              {hours === 1 ? "HOUR" : "HOURS"}
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-gray-300 text-lg md:text-xl lg:text-2xl mt-8 md:mt-12">
          of epic battles and legendary plays
        </p>
      </div>
    </div>
  );
}

