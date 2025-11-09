"use client";

import Image from "next/image";

interface Champion {
  name: string;
  games: number;
  icon: string;
}

interface TopChampionsSceneProps {
  champions: Champion[];
  totalGames?: number;
}

export default function TopChampionsScene({ champions, totalGames }: TopChampionsSceneProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-4xl px-4 animate-fadeIn">
        {/* Title */}
        <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 md:mb-12" style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}>
          YOUR TOP 5 CHAMPIONS
        </h2>
        <p className="text-gray-300 text-lg md:text-xl text-center mb-8 md:mb-12">
          In your last {totalGames || 10} games
        </p>

        {/* Champions List */}
        <div className="flex flex-col items-center space-y-4 md:space-y-6">
          {/* Top Champion - Larger */}
          <div className="flex items-center space-x-4 md:space-x-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/20 shadow-2xl w-full max-w-2xl transform hover:scale-105 transition-transform duration-300">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden border-4 border-yellow-400 shadow-lg shadow-yellow-400/50">
                <Image
                  src={champions[0].icon}
                  alt={champions[0].name}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-2 -left-2 bg-yellow-400 text-black font-bold rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-base shadow-lg">
                1
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-white text-2xl md:text-3xl font-bold">{champions[0].name}</h3>
              <p className="text-gray-300 text-base md:text-lg">{champions[0].games} games</p>
            </div>
          </div>

          {/* Remaining 4 Champions - Smaller */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl">
            {champions.slice(1).map((champion, index) => (
              <div
                key={champion.name}
                className="flex items-center space-x-3 md:space-x-4 bg-white/5 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/10 shadow-lg transform hover:scale-105 transition-transform duration-300"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 border-white/30">
                    <Image
                      src={champion.icon}
                      alt={champion.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -top-1 -left-1 bg-white/90 text-black font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md">
                    {index + 2}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-lg md:text-xl font-semibold truncate">{champion.name}</h4>
                  <p className="text-gray-400 text-sm md:text-base">{champion.games} games</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
