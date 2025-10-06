'use client';

import Image from 'next/image';

interface Role {
  name: string;
  games: number;
  percentage: number;
  icon: string;
}

interface TopRolesSceneProps {
  roles: Role[];
}

export default function TopRolesScene({ roles }: TopRolesSceneProps) {
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
      <div className="w-full max-w-3xl px-4 animate-fadeIn pointer-events-auto">
        {/* Title */}
        <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 md:mb-12" style={{ fontFamily: 'var(--font-zalando-sans, "Zalando Sans Expanded", sans-serif)' }}>
          YOUR TOP ROLES
        </h2>
        <p className="text-gray-300 text-lg md:text-xl text-center mb-8 md:mb-12">
          Where you dominated the Rift
        </p>

        {/* Roles List - Single Column with decreasing sizes */}
        <div className="flex flex-col items-center space-y-3 md:space-y-4 mx-auto">
          {roles.map((role, index) => {
            // Calculate size scale - first is largest, then decreases
            const sizeScale = index === 0 ? 1.0 : index === 1 ? 0.9 : index === 2 ? 0.8 : 0.7;
            const maxWidth = index === 0 ? 'max-w-3xl' : index === 1 ? 'max-w-2xl' : index === 2 ? 'max-w-xl' : 'max-w-lg';
            
            return (
              <div
                key={role.name}
                className={`w-full ${maxWidth} flex items-center justify-between bg-gradient-to-r from-white/20 via-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl transform hover:scale-105 transition-all duration-300`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  padding: `${sizeScale * 1.25}rem ${sizeScale * 1.5}rem`,
                }}
              >
                {/* Left side - Rank and Icon */}
                <div className="flex items-center space-x-3 md:space-x-4">
                  {/* Rank Number */}
                  <div 
                    className="flex-shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center"
                    style={{
                      width: `${sizeScale * 2.5}rem`,
                      height: `${sizeScale * 2.5}rem`,
                    }}
                  >
                    <span 
                      className="text-white font-bold"
                      style={{ fontSize: `${sizeScale * 1.125}rem` }}
                    >
                      {index + 1}
                    </span>
                  </div>
                  
                  {/* Role Icon */}
                  <div 
                    className="flex-shrink-0 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
                    style={{
                      width: `${sizeScale * 4}rem`,
                      height: `${sizeScale * 4}rem`,
                      padding: `${sizeScale * 0.75}rem`,
                    }}
                  >
                    <Image
                      src={role.icon}
                      alt={role.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain opacity-90"
                    />
                  </div>
                  
                  {/* Role Name */}
                  <div>
                    <h3 
                      className="text-white font-bold"
                      style={{ fontSize: `${sizeScale * 1.5}rem` }}
                    >
                      {role.name}
                    </h3>
                    <p 
                      className="text-gray-400"
                      style={{ fontSize: `${sizeScale * 0.875}rem` }}
                    >
                      {role.percentage}% of games
                    </p>
                  </div>
                </div>

                {/* Right side - Games count */}
                <div className="text-right">
                  <div 
                    className="text-white font-bold"
                    style={{ fontSize: `${sizeScale * 1.875}rem` }}
                  >
                    {role.games}
                  </div>
                  <div 
                    className="text-gray-400"
                    style={{ fontSize: `${sizeScale * 0.875}rem` }}
                  >
                    games
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
