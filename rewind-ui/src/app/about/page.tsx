'use client';

import React from 'react';
import { siGithub, siX, siInstagram } from 'simple-icons';
import SimpleIcon from '@/components/SimpleIcon';
import Navbar from '@/components/Navbar';
import BlobBackground from '@/components/BlobBackground';
import Footer from '@/components/Footer';
import Image from 'next/image';

// Splash Art Gradient Configuration
const SPLASH_CONFIG = {
  // Size of the splash art container (percentage of screen)
  splashSize: 90, // 90% of screen
  
  // Gradient ellipse sizes (larger = more visible splash art)
  ellipse1: { width: 140, height: 110 }, // Primary gradient
  ellipse2: { width: 150, height: 120 }, // Secondary gradient
  ellipse3: { width: 145, height: 115 }, // Tertiary gradient
  
  // Gradient positions (0-100, where the ellipse is centered)
  position1: { x: 60, y: 50 },
  position2: { x: 40, y: 40 },
  position3: { x: 50, y: 60 },
  
  // Fade percentages (when fade starts and ends)
  transparentUntil1: 55, // Stay fully transparent until this %
  transparentUntil2: 60,
  transparentUntil3: 58,
  fadeAt: 75,            // Start fading to black at this %
  solidAt: 90,           // Fully black at this %
};

interface Developer {
  name: string;
  title: string;
  company: string;
  ign: string;
  rank: string;
  rankImage: string;
  positions: string[];
  image: string;
  championSplash: string;
  socials: {
    twitter?: string;
    instagram?: string;
    github?: string;
  };
}

const developers: Developer[] = [
  {
    name: 'Jordan González',
    title: 'Software Engineer',
    company: 'Datadog',
    ign: 'Duncanista#LAN',
    rank: 'Emerald',
    rankImage: '/images/ranks/emerald.png',
    positions: ['sup', 'mid'],
    image: 'https://via.placeholder.com/400x400',
    championSplash: '/images/champions/lux-splashart.webp',
    socials: {
      twitter: 'https://x.com/jordan_nebula',
      instagram: 'https://instagram.com/jordangonzalez.dev',
      github: 'https://github.com/duncanista',
    },
  },
  {
    name: 'Joaquín Ríos',
    title: 'Software Engineer',
    company: 'Datadog',
    ign: 'Blackstar#288',
    rank: 'Emerald',
    rankImage: '/images/ranks/emerald.png',
    positions: ['jgl', 'top'],
    image: 'https://via.placeholder.com/400x400',
    championSplash: '/images/champions/udyr-splashart.webp',
    socials: {
      twitter: 'https://x.com/janesmith',
      instagram: 'https://instagram.com/janesmith',
      github: 'https://github.com/joaquinrios',
    },
  },
  {
    name: 'Uri Elias',
    title: 'Software Engineer',
    company: 'Pinterest',
    ign: 'Stardust',
    rank: 'Master',
    rankImage: '/images/ranks/master.png',
    positions: ['mid', 'top'],
    image: 'https://via.placeholder.com/400x400',
    championSplash: '/images/champions/katarina-splashart.webp',
    socials: {
      twitter: 'https://x.com/alexjohnson',
      instagram: 'https://instagram.com/alexjohnson',
      github: 'https://github.com/urielias',
    },
  },
];

export default function AboutPage() {
  // Randomize developer order after mount to avoid hydration mismatch
  const [shuffledDevelopers, setShuffledDevelopers] = React.useState(developers);

  React.useEffect(() => {
    setShuffledDevelopers([...developers].sort(() => Math.random() - 0.5));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <BlobBackground 
        colors={['#8B5CF6', '#EC4899', '#1E40AF']}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      <Navbar />
      
      {/* Scroll Snap Container */}
      <div className="snap-y snap-mandatory h-screen overflow-y-auto pt-20">
        
        {/* Intro Section */}
        <section className="snap-start h-screen shrink-0 flex items-center justify-center px-4 md:px-8 relative">
          <div className="max-w-6xl w-full space-y-8">
            {/* Title */}
            <div className="text-center space-y-6">
              <h1 
                className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight"
                style={{ fontFamily: 'var(--font-zalando-sans, "Zalando Sans Expanded", sans-serif)' }}
              >
                RIFT REWIND
              </h1>
              <div className="flex items-center justify-center space-x-4">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-purple-500"></div>
                <p className="text-xl md:text-2xl text-purple-400 font-semibold uppercase tracking-wider">
                  About the Project
                </p>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-purple-500"></div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 text-white/90 text-lg md:text-xl leading-relaxed text-center max-w-6xl mx-auto mb-16">
              <p className="md:text-3xl font-medium pb-4">
                We&apos;re a team of passionate hackers, League of Legends players, and esports enthusiasts 
                who&apos;ve experienced the thrill of Worlds firsthand — multiple times. We know what it&apos;s 
                like to live and breathe this game.
              </p>
              <p>
                <span className="text-white font-semibold">Rift Rewind</span> was born from the{' '}
                <a 
                  href="https://riftrewind.devpost.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline decoration-purple-400/50 underline-offset-4 transition-colors"
                >
                  AWS and Riot Games Hackathon
                </a>
                , challenging developers to build AI-powered agents that transform League API match data 
                into personalized insights. Using AWS AI services like Amazon Bedrock, we&apos;re creating 
                intelligent year-end recaps that go beyond basic stats.
              </p>
            </div>

            {/* Scroll Indicator */}
            <div className="flex flex-col items-center space-y-3 absolute bottom-20 left-1/2 -translate-x-1/2 opacity-70 animate-bounce">
              <p className="text-white/90 text-lg uppercase tracking-wider font-semibold">
                Meet the Team
              </p>
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
              </svg>
            </div>
          </div>
          
          {/* Bottom Organic Gradient Fade */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-[20vh] pointer-events-none z-10"
            style={{
              background: `
                radial-gradient(ellipse 100% 100% at 20% 100%, rgba(0,0,0,0.9) 0%, transparent 50%),
                radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0,0,0,0.95) 0%, transparent 60%),
                radial-gradient(ellipse 100% 100% at 80% 100%, rgba(0,0,0,0.9) 0%, transparent 50%),
                linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)
              `,
            }}
          />
        </section>

        {/* Developer Sections */}
        {shuffledDevelopers.map((dev, index) => (
          <section
            key={index}
            className="snap-start h-screen shrink-0 flex items-center justify-center px-2 relative overflow-hidden bg-black"
          >
            {/* Champion Splash Art Background - Configurable size, centered */}
            <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
              <div 
                className="relative"
                style={{ 
                  width: `${SPLASH_CONFIG.splashSize}%`, 
                  height: `${SPLASH_CONFIG.splashSize}%` 
                }}
              >
                {/* Champion Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ 
                    backgroundImage: `url(${dev.championSplash})`,
                    filter: 'blur(0px)',
                  }}
                />
                {/* Organic Edge Fade Mask - Creates dissolving edges */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: `
                      radial-gradient(ellipse ${SPLASH_CONFIG.ellipse1.width}% ${SPLASH_CONFIG.ellipse1.height}% at ${SPLASH_CONFIG.position1.x}% ${SPLASH_CONFIG.position1.y}%, transparent 0%, transparent ${SPLASH_CONFIG.transparentUntil1}%, rgba(0,0,0,0.4) ${SPLASH_CONFIG.fadeAt}%, rgba(0,0,0,0.95) ${SPLASH_CONFIG.solidAt}%, black 100%),
                      radial-gradient(ellipse ${SPLASH_CONFIG.ellipse2.width}% ${SPLASH_CONFIG.ellipse2.height}% at ${SPLASH_CONFIG.position2.x}% ${SPLASH_CONFIG.position2.y}%, transparent 0%, transparent ${SPLASH_CONFIG.transparentUntil2}%, rgba(0,0,0,0.3) ${SPLASH_CONFIG.fadeAt}%, rgba(0,0,0,0.95) ${SPLASH_CONFIG.solidAt}%, black 100%),
                      radial-gradient(ellipse ${SPLASH_CONFIG.ellipse3.width}% ${SPLASH_CONFIG.ellipse3.height}% at ${SPLASH_CONFIG.position3.x}% ${SPLASH_CONFIG.position3.y}%, transparent 0%, transparent ${SPLASH_CONFIG.transparentUntil3}%, rgba(0,0,0,0.4) ${SPLASH_CONFIG.fadeAt}%, rgba(0,0,0,0.95) ${SPLASH_CONFIG.solidAt}%, black 100%)
                    `,
                  }}
                />
                {/* Lighter gradient overlays for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/10 to-black/30" />
              </div>
              {/* Extended fade to fill the remaining 20% - Stronger to reach full black */}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-none h-full flex items-center">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 xl:gap-20 items-center w-full">
                
                {/* Left Side - Image (1/3 width) */}
                <div className="flex items-center justify-center md:justify-end">
                  <div className="relative group/img">
                    {/* Outer Glow Ring */}
                    <div className="absolute -inset-6 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-blue-600/30 rounded-full blur-3xl opacity-40 group-hover/img:opacity-60 transition duration-700"></div>
                    
                    {/* Image Container */}
                    <div className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl transform group-hover/img:scale-105 transition-transform duration-500">
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-blue-900/50 flex items-center justify-center">
                        <span className="text-8xl text-white/30">👤</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Info (2/3 width) */}
                <div className="md:col-span-2 flex flex-col justify-center space-y-8">
                  {/* Name */}
                  <div>
                    <h2 
                      className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-none mb-4"
                      style={{ 
                        fontFamily: 'var(--font-zalando-sans, "Zalando Sans Expanded", sans-serif)',
                        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                      }}
                    >
                      {dev.name}
                    </h2>
                    <div className="h-1 w-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  </div>

                  {/* Three Column Layout: IRL | In the Rift | Empty */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 lg:gap-6">
                    {/* Left Column - IRL Info */}
                    <div className="space-y-6">
                      <h3 className="text-sm md:text-base text-purple-400 uppercase tracking-widest font-bold mb-4">
                        IRL
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Title</p>
                          <p className="text-2xl md:text-3xl text-white font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                            {dev.title}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs text-white/50 uppercase tracking-wider">At</p>
                          <p className="text-lg md:text-xl text-white/70 font-medium" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                            {dev.company}
                          </p>
                        </div>

                        {/* Social Links */}
                        <div className="pt-2">
                          <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Socials</p>
                          <div className="flex items-center space-x-3">
                            {dev.socials.twitter && (
                              <a
                                href={dev.socials.twitter}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/social relative"
                                aria-label="X (Twitter)"
                              >
                                <div className="absolute inset-0 bg-purple-500/40 rounded-xl blur-xl opacity-0 group-hover/social:opacity-100 transition-opacity duration-300" />
                                <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-black/60 border-2 border-white/20 hover:bg-black/80 hover:border-purple-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                                  <SimpleIcon path={siX.path} title="X" className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                              </a>
                            )}
                            {dev.socials.instagram && (
                              <a
                                href={dev.socials.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/social relative"
                                aria-label="Instagram"
                              >
                                <div className="absolute inset-0 bg-pink-500/40 rounded-xl blur-xl opacity-0 group-hover/social:opacity-100 transition-opacity duration-300" />
                                <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-black/60 border-2 border-white/20 hover:bg-black/80 hover:border-pink-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                                  <SimpleIcon path={siInstagram.path} title="Instagram" className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                              </a>
                            )}
                            {dev.socials.github && (
                              <a
                                href={dev.socials.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/social relative"
                                aria-label="GitHub"
                              >
                                <div className="absolute inset-0 bg-blue-500/40 rounded-xl blur-xl opacity-0 group-hover/social:opacity-100 transition-opacity duration-300" />
                                <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-xl bg-black/60 border-2 border-white/20 hover:bg-black/80 hover:border-blue-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                                  <SimpleIcon path={siGithub.path} title="GitHub" className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - In the Rift Info */}
                    <div className="space-y-6">
                      <h3 className="text-sm md:text-base text-yellow-400 uppercase tracking-widest font-bold mb-4">
                        In the Rift
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Summoner</p>
                          <p className="text-2xl md:text-3xl text-white font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                            {dev.ign}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Peak Rank</p>
                          <div className="flex items-center space-x-3">
                            <Image 
                              src={dev.rankImage} 
                              alt={dev.rank}
                              width={64}
                              height={64}
                              className="w-12 h-12 md:w-16 md:h-16 object-contain"
                            />
                            <p className="text-xl md:text-2xl text-white font-bold" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                              {dev.rank}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-white/50 uppercase tracking-wider">Positions</p>
                          <div className="flex items-center space-x-2">
                            {dev.positions.map((pos, idx) => (
                              <div key={idx} className="relative group/pos">
                                <div className="absolute inset-0 bg-white/10 rounded-lg blur-md opacity-0 group-hover/pos:opacity-100 transition-opacity" />
                                <div className="relative bg-black/40 rounded-lg p-2 hover:bg-black/50 transition-all">
                                  <Image 
                                    src={`/images/position/${pos}.svg`}
                                    alt={pos}
                                    width={32}
                                    height={32}
                                    className="w-6 h-6 md:w-8 md:h-8 object-contain brightness-0 invert"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
        
        {/* Footer Section - Inside scroll container */}
        <section className="snap-start shrink-0 bg-black">
          <Footer />
        </section>
      </div>
    </div>
  );
}
