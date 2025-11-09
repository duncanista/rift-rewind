"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";
import { 
  FavoriteChampionScene,
  HoursPlayedScene,
  WinLossScene,
  TopChampionsScene, 
  TopRolesScene,
  Top2RolesScene, 
  SummaryScene, 
  RectangleAnimation, 
  FloatingLogo, 
  StoryProgressBar, 
} from "@/components/chronobreak";

// Lambda Function URL - Check User Status endpoint
const CHECK_USER_STATUS_URL = "https://nbmemmnatn3kxri3sf7yccqn5e0uxglu.lambda-url.us-east-1.on.aws/";

// Type for aggregated data from backend
interface AggregatedData {
  pings: {
    allInPings: number;
    assistMePings: number;
    basicPings: number;
    commandPings: number;
    dangerPings: number;
    enemyMissingPings: number;
    enemyVisionPings: number;
    getBackPings: number;
    holdPings: number;
    needVisionPings: number;
    onMyWayPings: number;
    pushPings: number;
    visionClearedPings: number;
  };
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision_score: number;
  wards_placed: number;
  wards_killed: number;
  early_surrender: number;
  first_blood: number;
  match_duration: number;
  won: number;
  lost: number;
  champions: Record<string, number>;
  positions: {
    TOP: number;
    JUNGLE: number;
    MIDDLE: number;
    BOTTOM: number;
    UTILITY: number;
  };
}

// No mock data - we only show real data

// Animation scene configuration
type AnimationScene = "idle" | "favorite" | "hours" | "winloss" | "scene1" | "roles" | "top2roles" | "summary";

// Helper function to map API position names to UI display names
function mapPositionName(position: string): string {
  const mapping: Record<string, string> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "ADC",
    UTILITY: "Support",
  };
  return mapping[position] || position;
}

// Helper function to get position icon path
function getPositionIcon(position: string): string {
  const iconMapping: Record<string, string> = {
    TOP: "/images/position/top.svg",
    JUNGLE: "/images/position/jgl.svg",
    MIDDLE: "/images/position/mid.svg",
    BOTTOM: "/images/position/adc.svg",
    UTILITY: "/images/position/sup.svg",
  };
  return iconMapping[position] || "/images/position/mid.svg";
}

// Processing status component with rotating messages
function ProcessingStatus() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const messages = [
    "Analyzing your matches...",
    "Counting how many wards you placed",
    "Watching you die over and over",
    "Verifying Teemo plays...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      // Start fade out
      setIsTransitioning(true);
      
      // After fade out completes, change message and fade in
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setIsTransitioning(false);
      }, 300); // Half of the transition duration
    }, 5000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Styled warning box similar to legal page */}
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-yellow-500"></div>
        <p className="text-xl md:text-2xl text-yellow-400 font-semibold uppercase tracking-wider">
          Processing Your Data
        </p>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-yellow-500"></div>
      </div>

      {/* Rotating message with spinner */}
      <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-yellow-500/30">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <svg 
            className="animate-spin h-12 w-12 text-yellow-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            ></circle>
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>

          {/* Rotating message with smooth fade animation */}
          <div className="min-h-[2rem] flex items-center justify-center">
            <p 
              className={`text-white text-lg md:text-xl font-medium text-center transition-all duration-600 ${
                isTransitioning 
                  ? 'opacity-0 transform translate-y-2' 
                  : 'opacity-100 transform translate-y-0'
              }`}
            >
              {messages[messageIndex]}
            </p>
          </div>

          {/* Subtitle */}
          <p className="text-gray-400 text-sm md:text-base text-center">
            Please come back in a couple minutes, our servers are busy processing your montages
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ChronobreakPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = params.uid as string;
  const region = searchParams.get("region") || "na1"; // Default to na1 if not provided
  const hasTransition = searchParams.get("transition") === "true";
  const [showTransition, setShowTransition] = useState(hasTransition);
  
  // Data fetching state
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation state management
  const [currentScene, setCurrentScene] = useState<AnimationScene>("idle");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRectangles, setShowRectangles] = useState(false);
  const [showFavorite, setShowFavorite] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [showWinLoss, setShowWinLoss] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showTop2Roles, setShowTop2Roles] = useState(false);
  
  // Refs to track timeouts for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // Story progress management
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const totalStories = 7; // 1 hours + 1 favorite + 1 win/loss + 1 top champions + 1 top 2 roles + 1 top 5 roles + 1 summary
  const storyDuration = 10000; // 10 seconds per story
  
  // Only use real fetched data - no mock fallback
  const dataToUse = aggregatedData;
  
  // Transform aggregated data for components (only if data exists)
  const totalGames = dataToUse ? dataToUse.won + dataToUse.lost : 0;
  
  // Favorite (most played) champion
  const favoriteChampionEntry = dataToUse ? Object.entries(dataToUse.champions)
    .sort(([, a], [, b]) => b - a)[0] : null;
  const favoriteChampion = favoriteChampionEntry ? {
    name: favoriteChampionEntry[0],
    games: favoriteChampionEntry[1],
  } : { name: "Unknown", games: 0 };
  
  // Calculate hours played (match_duration is in seconds, convert to hours and round up)
  const hoursPlayed = dataToUse ? Math.ceil(dataToUse.match_duration / 3600) : 0;
  
  // Top 5 Champions - sorted by games played
  // Using Riot Data Dragon CDN for champion images
  const topChampions = dataToUse ? Object.entries(dataToUse.champions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, games]) => ({
      name,
      games,
      icon: `https://ddragon.leagueoflegends.com/cdn/15.19.1/img/champion/${name}.png`,
    })) : [];

  // Top 5 Roles with percentages
  const topRoles = dataToUse ? Object.entries(dataToUse.positions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .filter(([, games]) => games > 0)
    .map(([position, games]) => ({
      name: mapPositionName(position),
      games,
      percentage: Math.round((games / totalGames) * 100),
      icon: getPositionIcon(position),
    })) : [];

  // Top 2 Roles for separate scene and summary
  const top2Roles = topRoles.slice(0, 2);

  // Summary Stats
  const kdaRatio = dataToUse && dataToUse.deaths > 0 
    ? ((dataToUse.kills + dataToUse.assists) / dataToUse.deaths).toFixed(2)
    : dataToUse ? ((dataToUse.kills + dataToUse.assists)).toFixed(2) : "0.00";
  
  const uniqueChampionsCount = dataToUse ? Object.keys(dataToUse.champions).length : 0;
  const surrenderPercentage = dataToUse && totalGames > 0 ? (dataToUse.early_surrender / totalGames) * 100 : 0;
  
  const summaryStats = {
    kda: { 
      kills: dataToUse?.kills || 0, 
      deaths: dataToUse?.deaths || 0, 
      assists: dataToUse?.assists || 0, 
    },
    kdaRatio,
    championsPlayed: uniqueChampionsCount,
    totalDeaths: dataToUse?.deaths || 0,
    totalGames,
    topRoles: top2Roles,
    ffCount: dataToUse?.early_surrender || 0,
    ffText: surrenderPercentage < 5 ? "you never gave up!" : "times you said \"gg go next\"",
  };

  // Redirect to home if no uid is provided
  useEffect(() => {
    if (!uid || uid.trim() === "") {
      router.push("/");
    }
  }, [uid, router]);

  // Fetch aggregated data from Lambda - single check, no polling
  useEffect(() => {
    if (!uid || uid.trim() === "") return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Decode the uid to get the summoner name (e.g., "GameName#TAG")
        const summonerName = decodeURIComponent(uid);
        
        console.log(`Fetching data for summoner: ${summonerName} in region: ${region}`);
        
        const response = await fetch(CHECK_USER_STATUS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summoner: summonerName,
            region: region,
          }),
        });

        if (response.status === 200) {
          // Data is ready!
          const result = await response.json();
          console.log("Data fetched successfully:", result);
          setAggregatedData(result);
          setIsLoading(false);
          setError(null);
        } else if (response.status === 202) {
          // Data is being processed
          const result = await response.json();
          console.log("Data is being processed:", result);
          setError("Your matches are being processed! This usually takes 3-5 minutes. Come back soon to see your Rewind!");
          setIsLoading(false);
        } else {
          // Error occurred
          const errorData = await response.json();
          console.error("Failed to fetch data:", errorData);
          setError(errorData.error || "Failed to fetch match data");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Network error occurred");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [uid, region]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    if (hasTransition) {
      // Hide the transition overlay after animation completes
      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasTransition]);

  const startStory = (index: number) => {
    if (index < 0 || index >= totalStories) return;
    
    // Clear all pending timeouts to prevent race conditions
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
    
    // Immediately clear all scene states to prevent overlap
    setShowFavorite(false);
    setShowHours(false);
    setShowWinLoss(false);
    setShowStats(false);
    setShowRoles(false);
    setShowTop2Roles(false);
    setShowRectangles(false);
    
    setCurrentStoryIndex(index);
    setStoryProgress(0);
    setIsAnimating(true);
    
    // Scene sequence: hours -> favorite -> winloss -> scene1 (top champions) -> top2roles (top 2) -> roles (top 5) -> summary
    // Check if this is the summary scene (last story, index 6)
    if (index === totalStories - 1) {
      setCurrentScene("summary");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    // Check if this is the top 5 roles scene (index 5)
    else if (index === 5) {
      setCurrentScene("roles");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowRoles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    }
    // Check if this is the top 2 roles scene (index 4)
    else if (index === 4) {
      setCurrentScene("top2roles");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowTop2Roles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    // Top champions scene (index 3)
    else if (index === 3) {
      setCurrentScene("scene1");
      
      // Wait 700ms for content to fade out, then show rectangles
      const timeout1 = setTimeout(() => {
        setShowRectangles(true);
      }, 700);
      timeoutRefs.current.push(timeout1);
      
      // Wait 2200ms (700ms fade + 1500ms rectangles), then show stats
      const timeout2 = setTimeout(() => {
        setShowStats(true);
      }, 2200);
      timeoutRefs.current.push(timeout2);
    }
    // Win/Loss scene (index 2)
    else if (index === 2) {
      setCurrentScene("winloss");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowWinLoss(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    }
    // Favorite champion scene (index 1)
    else if (index === 1) {
      setCurrentScene("favorite");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowFavorite(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    }
    // Hours played scene (index 0)
    else {
      setCurrentScene("hours");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowHours(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    }
  };

  const handleButtonClick = () => {
    startStory(0);
  };

  const goToNextStory = () => {
    if (currentStoryIndex < totalStories - 1) {
      startStory(currentStoryIndex + 1);
    } else {
      // All stories completed
      console.log("All stories completed");
      setIsAnimating(false);
      setShowRectangles(false);
      setShowFavorite(false);
      setShowHours(false);
      setShowWinLoss(false);
      setShowStats(false);
      setShowRoles(false);
      setShowTop2Roles(false);
      setCurrentScene("idle");
    }
  };

  const goToPreviousStory = () => {
    if (currentStoryIndex > 0) {
      startStory(currentStoryIndex - 1);
    }
  };

  const handleShareToTwitter = () => {
    const rewindUrl = `https://riftrewind.lol/chronobreak/${uid}`;
    const tweetText = "Check out my League of Legends Rift Rewind! 🎮✨";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(rewindUrl)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
  };

  const handleStoryTap = (side: "left" | "right") => {
    if (side === "left") {
      goToPreviousStory();
    } else {
      goToNextStory();
    }
  };

  // Animation sequence controller - auto-advance to next scene after duration
  useEffect(() => {
    if (!isAnimating) return;

    // Auto-advance all scenes except the last one (summary)
    if (currentScene !== "idle" && currentStoryIndex < totalStories - 1) {
      const timer = setTimeout(() => {
        goToNextStory();
      }, storyDuration);

      return () => clearTimeout(timer);
    }

    // For the summary scene (last one), don't auto-advance
    // User can manually close or stay on it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, isAnimating, currentStoryIndex, storyDuration]);

  // Progress bar animation
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        const increment = (100 / storyDuration) * 50; // Update every 50ms
        const newProgress = prev + increment;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating, currentStoryIndex, storyDuration]);

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Story Progress Bar */}
      <StoryProgressBar 
        totalStories={totalStories}
        currentStoryIndex={currentStoryIndex}
        storyProgress={storyProgress}
        show={isAnimating}
      />

      {/* Tap areas for navigation - 1/4 on each side */}
      {isAnimating && (
        <>
          {/* Left tap area - go back (1/4 of screen) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleStoryTap("left");
            }}
            className="fixed left-0 top-0 bottom-0 w-1/4 z-[9999] cursor-pointer"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
          {/* Right tap area - go forward (1/4 of screen) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleStoryTap("right");
            }}
            className="fixed right-0 top-0 bottom-0 w-1/4 z-[9999] cursor-pointer"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
        </>
      )}

      {/* BlobBackground - fade out during animation */}
      <div className={`transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <BlobBackground 
          colors={["#4A90E2", "#5CA9E8", "#87CEEB"]}
          blobCount={3}
          minSizePercent={35}
          maxSizePercent={50}
          centerOffset={8}
        />
      </div>
      
      {/* Navbar - fade out during animation */}
      <div className={`transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <Navbar />
      </div>
      
      {/* Floating Logo during animation */}
      <FloatingLogo show={showRectangles} />
      
      <main className={`flex-1 flex items-center justify-center px-4 py-12 overflow-hidden transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <div className="w-full max-w-4xl text-center px-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mb-4 md:mb-6">
            <div className="break-words">
              <span 
                className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
                style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
              >
                CHRONOBREAK
              </span>
              <span className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                {!aggregatedData && !isLoading ? " Not Ready Yet" : " Activated"}
              </span>
            </div>
          </h1>
          
          {aggregatedData && (
            <>
              <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 md:mb-8 px-4">
                Your data is ready!
              </p>
              <button
                onClick={handleButtonClick}
                className="font-bold py-4 px-8 rounded-xl text-lg md:text-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transform hover:scale-105 hover:shadow-sky-500/50 text-white"
              >
                View Your Rewind
              </button>
            </>
          )}
          
          {!aggregatedData && !isLoading && error && (
            <ProcessingStatus />
          )}
          
          {isLoading && (
            <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 md:mb-8 px-4">
              Fetching your match data...
            </p>
          )}
        </div>
      </main>
      
      {/* Footer - fade out during animation */}
      <div className={`transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <Footer />
      </div>

      {/* Rectangle Animation Background */}
      <RectangleAnimation show={showRectangles} />

      {/* Favorite Champion Scene */}
      {showFavorite && currentScene === "favorite" && (
        <FavoriteChampionScene 
          championName={favoriteChampion.name} 
          gamesPlayed={favoriteChampion.games} 
        />
      )}

      {/* Hours Played Scene */}
      {showHours && currentScene === "hours" && <HoursPlayedScene hours={hoursPlayed} />}

      {/* Win/Loss Scene */}
      {showWinLoss && currentScene === "winloss" && (
        <WinLossScene 
          totalGames={totalGames} 
          wins={dataToUse?.won || 0} 
          losses={dataToUse?.lost || 0} 
        />
      )}

      {/* Top Champions Scene */}
      {showStats && <TopChampionsScene champions={topChampions} totalGames={totalGames} />}

      {/* White fade out overlay - opposite of main page */}
      {showTransition && (
        <div 
          className="fixed inset-0 z-[9998] pointer-events-none animate-fadeOut"
          style={{
            background: "radial-gradient(circle, white 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 60%, transparent 100%)",
          }}
        />
      )}

      {/* Top Roles Scene (Top 5) */}
      {showRoles && currentScene === "roles" && <TopRolesScene roles={topRoles} />}

      {/* Top 2 Roles Scene */}
      {showTop2Roles && currentScene === "top2roles" && <Top2RolesScene roles={top2Roles} />}

      {/* Summary Scene */}
      {currentScene === "summary" && (
        <SummaryScene 
          stats={summaryStats}
          uid={uid}
          onShareToTwitter={handleShareToTwitter}
        />
      )}
    </div>
  );
}