"use client";

import Image from "next/image";
import Link from "next/link";

interface SummaryStats {
  kda: { kills: number; deaths: number; assists: number };
  kdaRatio: string;
  championsPlayed: number;
  totalDeaths: number;
  totalGames: number;
  topRoles: Array<{ name: string; icon: string; games?: number; percentage?: number }>;
  ffCount: number;
  ffText?: string;
}

interface SummarySceneProps {
  stats: SummaryStats;
  uid: string;
  onShareToTwitter: () => void;
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export default function SummaryScene({ stats, uid, onShareToTwitter }: SummarySceneProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none px-3 pt-20 sm:pt-24 md:pt-0">
      <div className="w-full max-w-3xl text-center animate-fadeIn pointer-events-auto">
        {/* Summary Title */}
        <h2 
          className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 md:mb-6"
          style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
        >
          YOUR 2024 RIFT REWIND
        </h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 md:gap-4 mb-3 sm:mb-4 md:mb-6">
          {/* Total Games */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Total Games</div>
            <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{stats.totalGames}</div>
            <div className="text-gray-500 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">ranked games played</div>
          </div>

          {/* KDA Stat */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Your Average KDA</div>
            <div className="text-sky-400 text-2xl sm:text-3xl md:text-4xl font-bold">{stats.kdaRatio} KDA</div>
            <div className="text-white text-base sm:text-lg md:text-xl font-semibold mt-0.5 sm:mt-1">
              {stats.kda.kills}/{stats.kda.deaths}/{stats.kda.assists}
            </div>
          </div>

          {/* Champions Played */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Champions Played</div>
            <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{stats.championsPlayed}</div>
            <div className="text-gray-500 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">unique champions</div>
          </div>

          {/* Deaths */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Total Deaths</div>
            <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{stats.totalDeaths}</div>
            <div className="text-red-400 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">times respawning</div>
          </div>

          {/* Top Roles */}
          <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Favorite Roles</div>
            <div className="flex items-center justify-center gap-2 sm:gap-3 my-1 sm:my-2">
              {stats.topRoles.map((role) => (
                <div key={role.name} className="flex items-center gap-1 sm:gap-2">
                  <Image
                    src={role.icon}
                    alt={role.name}
                    width={32}
                    height={32}
                    className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 opacity-90"
                  />
                  <span className="text-white text-base sm:text-lg md:text-xl font-bold">{role.name}</span>
                </div>
              ))}
            </div>
            <div className="text-gray-500 text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1">most played</div>
          </div>

          {/* FF Count - Full width */}
          <div className="md:col-span-2 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-3.5 md:p-4 lg:p-5 border border-white/20 shadow-xl">
            <div className="text-gray-400 text-xs sm:text-sm md:text-base mb-1 sm:mb-1.5 md:mb-2">Surrenders</div>
            <div className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">{stats.ffCount}</div>
            <div className={`text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 ${stats.ffCount === 0 || (stats.ffText && stats.ffText.includes("never gave up")) ? "text-green-400" : "text-yellow-400"}`}>
              {stats.ffText || "times you said \"gg go next\""}
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="flex flex-col items-center space-y-2 sm:space-y-3 mt-3 sm:mt-4 md:mt-6">
          {/* Share to X Button */}
          <button
            onClick={onShareToTwitter}
            className="group relative bg-black hover:bg-gray-900 text-white font-semibold py-2.5 px-5 sm:py-3 sm:px-6 rounded-full text-sm sm:text-base md:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 sm:space-x-3 border border-white/10"
          >
            {/* X Logo SVG */}
            <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>Share to X</span>
          </button>

          {/* Back to Home Link */}
          <Link href="/" className="text-gray-400 hover:text-white transition-colors duration-300 text-xs sm:text-sm md:text-base">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
