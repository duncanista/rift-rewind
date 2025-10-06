"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

interface FavoriteChampionSceneProps {
  championName: string;
  gamesPlayed: number;
}

export default function FavoriteChampionScene({ championName, gamesPlayed }: FavoriteChampionSceneProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  // Pick one random splash art index (0-2) and stick with it
  const splashIndex = useMemo(() => Math.floor(Math.random() * 3), []);
  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championName}_${splashIndex}.jpg`;

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background splash art with overlay */}
      <div className="absolute inset-0">
        <Image
          src={splashUrl}
          alt={`${championName} splash art`}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <div className="space-y-6">
          {/* Title */}
          <h2 className="text-white/80 text-2xl sm:text-3xl md:text-4xl font-light tracking-wide">
            Your Favorite Champion
          </h2>
          
          {/* Champion Name */}
          <h1 
            className="text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-zalando-sans, 'Zalando Sans Expanded', sans-serif)" }}
          >
            {championName.toUpperCase()}
          </h1>
          
          {/* Games Played */}
          <p className="text-white/90 text-xl sm:text-2xl md:text-3xl font-medium">
            {gamesPlayed} {gamesPlayed === 1 ? "game" : "games"} played
          </p>
        </div>
      </div>
    </div>
  );
}

