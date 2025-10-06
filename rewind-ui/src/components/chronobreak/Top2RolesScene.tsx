"use client";

import Image from "next/image";

interface Role {
  name: string;
  games: number;
  percentage: number;
  icon: string;
}

interface Top2RolesSceneProps {
  roles: Role[];
}

export default function Top2RolesScene({ roles }: Top2RolesSceneProps) {
  // Only show top 2 roles
  const displayRoles = roles.slice(0, 2);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none px-3 py-4">
      <div className="w-full max-w-4xl animate-fadeIn pointer-events-auto">
        {/* Title */}
        <h2 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-center mb-3 sm:mb-4 md:mb-6 lg:mb-8" style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}>
          YOUR FAVORITE ROLES
        </h2>
        <p className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl text-center mb-4 sm:mb-6 md:mb-10 lg:mb-14">
          The lanes where you shine brightest
        </p>

        {/* Two Roles Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mx-auto max-w-4xl">
          {displayRoles.map((role, index) => (
            <div
              key={role.name}
              className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 lg:p-10 border-2 border-white/30 shadow-2xl transform hover:scale-105 transition-all duration-300"
              style={{
                animationDelay: `${index * 150}ms`,
              }}
            >
              {/* Rank Badge */}
              <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-gradient-to-br from-sky-400 to-blue-500 text-white font-bold rounded-full w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center text-lg md:text-xl lg:text-2xl shadow-lg border-2 md:border-4 border-white/20">
                #{index + 1}
              </div>

              {/* Role Icon - Large and Centered */}
              <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
                <Image
                  src={role.icon}
                  alt={role.name}
                  width={160}
                  height={160}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain opacity-90"
                />
              </div>

              {/* Role Name */}
              <h3 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-1.5 sm:mb-2 md:mb-3">
                {role.name}
              </h3>

              {/* Percentage */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <div className="text-sky-400 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                  {role.percentage}%
                </div>
                <div className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg mt-0.5 sm:mt-1">
                  of your games
                </div>
              </div>

              {/* Games Count */}
              <div className="text-center pt-2 sm:pt-3 md:pt-4 border-t border-white/20">
                <div className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">
                  {role.games}
                </div>
                <div className="text-gray-400 text-xs sm:text-sm md:text-sm lg:text-base">
                  games played
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

