"use client";

import { useEffect, useState } from "react";

interface WinLossSceneProps {
  totalGames: number;
  wins: number;
  losses: number;
}

export default function WinLossScene({ totalGames, wins, losses }: WinLossSceneProps) {
  const [displayWins, setDisplayWins] = useState(0);
  const [displayLosses, setDisplayLosses] = useState(0);
  const [showWinLoss, setShowWinLoss] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  const hasMoreWins = wins > losses;
  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  
  useEffect(() => {
    // Wait 1 second before starting the win/loss count
    const startDelay = setTimeout(() => {
      setShowWinLoss(true);
      
      const duration = 3000; // 3 seconds for counting
      const steps = 60;
      const winsIncrement = wins / steps;
      const lossesIncrement = losses / steps;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep >= steps) {
          setDisplayWins(wins);
          setDisplayLosses(losses);
          clearInterval(interval);
          // Show result animation after counting completes
          setTimeout(() => setShowResult(true), 500);
        } else {
          setDisplayWins(Math.floor(winsIncrement * currentStep));
          setDisplayLosses(Math.floor(lossesIncrement * currentStep));
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }, 1000);
    
    return () => clearTimeout(startDelay);
  }, [wins, losses]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      {/* Full screen glowing border - only shows after result */}
      {showResult && (
        <div 
          className="absolute inset-0 pointer-events-none animate-fadeIn"
          style={{
            boxShadow: hasMoreWins 
              ? "inset 0 0 100px 20px rgba(34, 197, 94, 0.4), inset 0 0 200px 40px rgba(34, 197, 94, 0.2)"
              : "inset 0 0 100px 20px rgba(239, 68, 68, 0.4), inset 0 0 200px 40px rgba(239, 68, 68, 0.2)",
            border: hasMoreWins 
              ? "4px solid rgba(34, 197, 94, 0.3)" 
              : "4px solid rgba(239, 68, 68, 0.3)",
            animation: "pulse 2s ease-in-out infinite",
          }}
        />
      )}
      
      <div className="w-full max-w-4xl px-4 animate-fadeIn text-center relative z-10">
        {/* Title */}
        <h2 
          className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-8 md:mb-12" 
          style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
        >
          YOUR BATTLE RECORD
        </h2>

        {/* Win Rate - Appears at top after result */}
        {showResult && (
          <div className="animate-fadeIn mb-8 md:mb-12">
            <div 
              className={`text-5xl md:text-6xl lg:text-7xl font-black mb-2 transition-all duration-1000 ${
                hasMoreWins 
                  ? "text-transparent bg-clip-text bg-gradient-to-b from-green-300 via-green-400 to-green-600"
                  : "text-transparent bg-clip-text bg-gradient-to-b from-red-300 via-red-400 to-red-600"
              }`}
              style={{ 
                fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)",
                textShadow: hasMoreWins 
                  ? "0 0 40px rgba(34, 197, 94, 0.4)" 
                  : "0 0 40px rgba(239, 68, 68, 0.4)",
              }}
            >
              {winRate.toFixed(1)}%
            </div>
            <p className={`text-2xl md:text-3xl font-semibold uppercase tracking-wider ${
              hasMoreWins ? "text-green-400" : "text-red-400"
            }`}>
              Win Rate
            </p>
          </div>
        )}

        {/* Win/Loss Counter - Appears after 1 second */}
        {showWinLoss && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12 animate-fadeIn">
          {/* Wins */}
          <div 
            className={`relative transition-all duration-1000 ${
              showResult && hasMoreWins 
                ? "scale-125" 
                : showResult 
                ? "scale-50 opacity-40" 
                : "scale-100"
            }`}
          >
            {/* Glow effect for winner */}
            {showResult && hasMoreWins && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 md:w-64 md:h-64 bg-green-500/30 rounded-full blur-3xl animate-pulse"></div>
              </div>
            )}
            
            <div className="relative">
              <div 
                className={`text-7xl md:text-8xl lg:text-9xl font-black leading-none mb-2 transition-all duration-1000 ${
                  showResult && hasMoreWins
                    ? "text-transparent bg-clip-text bg-gradient-to-b from-green-300 via-green-400 to-green-600"
                    : "text-green-400"
                }`}
                style={{ 
                  fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)",
                  textShadow: showResult && hasMoreWins ? "0 0 60px rgba(34, 197, 94, 0.5)" : "none",
                }}
              >
                {displayWins}
              </div>
              <div 
                className={`text-xl md:text-2xl font-bold uppercase tracking-wider transition-all duration-1000 ${
                  showResult && hasMoreWins ? "text-green-400" : "text-gray-400"
                }`}
              >
                Wins
              </div>
            </div>
          </div>

          {/* Separator - horizontal on mobile, dash on desktop */}
          <div className="text-4xl md:text-5xl text-gray-600 font-bold rotate-90 md:rotate-0">-</div>

          {/* Losses */}
          <div 
            className={`relative transition-all duration-1000 ${
              showResult && !hasMoreWins 
                ? "scale-125" 
                : showResult 
                ? "scale-50 opacity-40" 
                : "scale-100"
            }`}
          >
            {/* Glow effect for "winner" (more losses) */}
            {showResult && !hasMoreWins && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 md:w-64 md:h-64 bg-red-500/30 rounded-full blur-3xl animate-pulse"></div>
              </div>
            )}
            
            <div className="relative">
              <div 
                className={`text-7xl md:text-8xl lg:text-9xl font-black leading-none mb-2 transition-all duration-1000 ${
                  showResult && !hasMoreWins
                    ? "text-transparent bg-clip-text bg-gradient-to-b from-red-300 via-red-400 to-red-600"
                    : "text-red-400"
                }`}
                style={{ 
                  fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)",
                  textShadow: showResult && !hasMoreWins ? "0 0 60px rgba(239, 68, 68, 0.5)" : "none",
                }}
              >
                {displayLosses}
              </div>
              <div 
                className={`text-xl md:text-2xl font-bold uppercase tracking-wider transition-all duration-1000 ${
                  showResult && !hasMoreWins ? "text-red-400" : "text-gray-400"
                }`}
              >
                Losses
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Total Games - At the bottom, gets smaller after win/loss appears */}
        <div className={`transition-all duration-1000 ${showWinLoss ? "scale-75" : "scale-100"}`}>
          <div 
            className={`font-black text-white leading-none mb-2 transition-all duration-1000 ${
              showWinLoss 
                ? "text-5xl md:text-6xl lg:text-7xl" 
                : "text-8xl md:text-9xl lg:text-[180px]"
            }`}
            style={{ 
              fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)",
            }}
          >
            {totalGames}
          </div>
          <div className={`text-gray-400 font-semibold uppercase tracking-wider transition-all duration-1000 ${
            showWinLoss ? "text-lg md:text-xl" : "text-2xl md:text-3xl"
          }`}>
            Total Games
          </div>
        </div>
      </div>
    </div>
  );
}
