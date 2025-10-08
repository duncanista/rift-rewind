"use client";

import { useState } from "react";
import Image from "next/image";

// Pro player data
const PRO_PLAYERS = [
  { id: "faker", name: "Faker", riotId: "Hide on bush#KR1", region: "kr", image: "/images/players/faker.webp" },
  { id: "zeus", name: "Zeus", riotId: "우제초이#Kr2", region: "kr", image: "/images/players/zeus.webp" },
  { id: "oner", name: "Oner", riotId: "오 너#111", region: "kr", image: "/images/players/oner.webp" },
  { id: "gumayusi", name: "Gumayusi", riotId: "제우스#녹서스", region: "kr", image: "/images/players/gumayusi.webp" },
  { id: "keria", name: "Keria", riotId: "역천괴#ker3", region: "kr", image: "/images/players/keria.webp" },
  { id: "rekkles", name: "Rekkles", riotId: "LR Rekkles#SUP", region: "euw1", image: "/images/players/rekkles.webp" },
];

interface ProPlayerCarouselProps {
  // eslint-disable-next-line no-unused-vars
  onPlayerSelect: (riotId: string, region: string) => void;
}

export default function ProPlayerCarousel({ onPlayerSelect }: ProPlayerCarouselProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const anglePerPlayer = 360 / PRO_PLAYERS.length;
  const minSwipeDistance = 50; // Minimum distance for a swipe

  const goToPrevious = () => {
    const newIndex = (currentPlayerIndex - 1 + PRO_PLAYERS.length) % PRO_PLAYERS.length;
    setCurrentPlayerIndex(newIndex);
    setRotationAngle((prev) => prev + anglePerPlayer);
    setSelectedPlayerIndex(newIndex);
    const player = PRO_PLAYERS[newIndex];
    onPlayerSelect(player.riotId, player.region);
  };

  const goToNext = () => {
    const newIndex = (currentPlayerIndex + 1) % PRO_PLAYERS.length;
    setCurrentPlayerIndex(newIndex);
    setRotationAngle((prev) => prev - anglePerPlayer);
    setSelectedPlayerIndex(newIndex);
    const player = PRO_PLAYERS[newIndex];
    onPlayerSelect(player.riotId, player.region);
  };

  const selectCurrentPlayer = () => {
    setSelectedPlayerIndex(currentPlayerIndex);
    const player = PRO_PLAYERS[currentPlayerIndex];
    onPlayerSelect(player.riotId, player.region);
  };

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Mouse handlers for drag (desktop)
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setTouchEnd(null);
    setTouchStart(e.clientX);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const onMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <div className="mt-4 md:mt-6 relative z-10 px-2">
      <p className="text-center text-xs text-gray-400 mb-3 md:mb-4">or try a pro player</p>
      <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
        {/* Left Chevron */}
        <button
          onClick={goToPrevious}
          className="p-1.5 sm:p-2 md:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-110 z-20 relative flex-shrink-0"
          aria-label="Previous player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-white">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* 3D Carousel */}
        <div 
          className="relative flex-shrink-0 touch-pan-y select-none cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        >
          <div className="carousel-3d-container">
            <div
              className="carousel-3d-scene"
              style={{
                transform: `rotateY(${rotationAngle}deg)`,
              }}
            >
              {PRO_PLAYERS.map((player, index) => {
                const angle = (index * 360) / PRO_PLAYERS.length;
                const radius = 125;

                // Calculate which positions are visible (previous, current, next)
                const diff = (index - currentPlayerIndex + PRO_PLAYERS.length) % PRO_PLAYERS.length;
                const isVisible = diff === 0 || diff === 1 || diff === PRO_PLAYERS.length - 1;
                const isCurrent = diff === 0;
                const isSelected = selectedPlayerIndex === index;

                return (
                <div
                  key={`${player.id}-${index}`}
                  className="carousel-3d-item"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${radius}px)${isCurrent ? " scale(1.15)" : " scale(0.85)"}`,
                    opacity: isVisible ? (isCurrent ? 1 : 0.6) : 0,
                    pointerEvents: isVisible ? "auto" : "none",
                    zIndex: isCurrent ? 10 : isVisible ? 5 : 0,
                  }}
                >
                    <button
                      onClick={isCurrent ? selectCurrentPlayer : undefined}
                      disabled={!isCurrent}
                      className={`relative w-full h-full rounded-lg overflow-hidden border transition-all duration-300 ${
                        isSelected ? "border-purple-500 shadow-lg shadow-purple-500/50" : "border-white/20"
                      } ${isCurrent ? "cursor-pointer hover:border-purple-400" : ""}`}
                    >
                      <Image src={player.image} alt={player.name} width={112} height={112} className="w-full h-full object-cover" />
                    
                      {/* Shadow overlay on previous/next players */}
                      {!isCurrent && (
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
                      )}
                    
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent py-1 sm:py-1.5 z-10">
                        <p
                          className={`text-white text-center transition-all ${
                            isCurrent ? "text-[10px] sm:text-xs font-medium" : "text-[8px] sm:text-[10px] font-normal"
                          }`}
                        >
                          {player.name}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Chevron */}
        <button
          onClick={goToNext}
          className="p-1.5 sm:p-2 md:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-110 z-20 relative flex-shrink-0"
          aria-label="Next player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-white">
            <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

