"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";
import { 
  HoursPlayedScene,
  TopChampionsScene, 
  TopRolesScene,
  Top2RolesScene, 
  SummaryScene, 
  RectangleAnimation, 
  FloatingLogo, 
  StoryProgressBar, 
} from "@/components/chronobreak";

// Lambda Function URL
const LAMBDA_FUNCTION_URL = "https://4yry7prgvpiu6gralibuy5aepa0czkqp.lambda-url.us-east-1.on.aws/";

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

// Mock aggregated data from backend (fallback)
const MOCK_AGGREGATED_DATA: AggregatedData = {
  pings: {
    allInPings: 2,
    assistMePings: 41,
    basicPings: 0,
    commandPings: 150,
    dangerPings: 0,
    enemyMissingPings: 88,
    enemyVisionPings: 113,
    getBackPings: 41,
    holdPings: 0,
    needVisionPings: 17,
    onMyWayPings: 346,
    pushPings: 16,
    visionClearedPings: 0,
  },
  kills: 43,
  deaths: 63,
  assists: 96,
  cs: 1513,
  vision_score: 217,
  wards_placed: 106,
  wards_killed: 26,
  early_surrender: 0,
  first_blood: 4,
  match_duration: 17192,
  won: 8,
  lost: 2,
  champions: {
    Morgana: 7,
    Qiyana: 1,
    Lux: 1,
    Mordekaiser: 1,
  },
  positions: {
    TOP: 1,
    JUNGLE: 0,
    MIDDLE: 9,
    BOTTOM: 0,
    UTILITY: 0,
  },
};

// Animation scene configuration
type AnimationScene = "idle" | "hours" | "scene1" | "roles" | "top2roles" | "summary";

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

export default function ChronobreakPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = params.uid as string;
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
  const [showHours, setShowHours] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showTop2Roles, setShowTop2Roles] = useState(false);
  
  // Refs to track timeouts for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // Story progress management
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const totalStories = 5; // 1 hours played + 1 top champions scene + 1 top 2 roles scene + 1 top 5 roles scene + 1 summary scene
  const storyDuration = 10000; // 10 seconds per story
  
  // Use fetched data or fallback to mock data
  const dataToUse = aggregatedData || MOCK_AGGREGATED_DATA;
  
  // Transform aggregated data for components
  const totalGames = dataToUse.won + dataToUse.lost;
  
  // Calculate hours played (match_duration is in seconds, convert to hours and round up)
  const hoursPlayed = Math.ceil(dataToUse.match_duration / 3600);
  
  // Top 5 Champions - sorted by games played
  const topChampions = Object.entries(dataToUse.champions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, games]) => ({
      name,
      games,
      // Using existing placeholder images for now
      icon: name === "Lux" ? "/images/champions/lux-splashart.webp" : 
        name === "Morgana" ? "/images/champions/katarina-splashart.webp" :
          "/images/champions/udyr-splashart.webp",
    }));

  // Top 5 Roles with percentages
  const topRoles = Object.entries(dataToUse.positions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .filter(([, games]) => games > 0)
    .map(([position, games]) => ({
      name: mapPositionName(position),
      games,
      percentage: Math.round((games / totalGames) * 100),
      icon: getPositionIcon(position),
    }));

  // Top 2 Roles for separate scene and summary
  const top2Roles = topRoles.slice(0, 2);

  // Summary Stats
  const kdaRatio = dataToUse.deaths > 0 
    ? ((dataToUse.kills + dataToUse.assists) / dataToUse.deaths).toFixed(2)
    : ((dataToUse.kills + dataToUse.assists)).toFixed(2);
  
  const uniqueChampionsCount = Object.keys(dataToUse.champions).length;
  const surrenderPercentage = (dataToUse.early_surrender / totalGames) * 100;
  
  const summaryStats = {
    kda: { 
      kills: dataToUse.kills, 
      deaths: dataToUse.deaths, 
      assists: dataToUse.assists, 
    },
    kdaRatio,
    championsPlayed: uniqueChampionsCount,
    totalDeaths: dataToUse.deaths,
    topRoles: top2Roles,
    ffCount: dataToUse.early_surrender,
    ffText: surrenderPercentage < 5 ? "you never gave up!" : "times you said \"gg go next\"",
  };

  // Redirect to home if no uid is provided
  useEffect(() => {
    if (!uid || uid.trim() === "") {
      router.push("/");
    }
  }, [uid, router]);

  // Fetch aggregated data from Lambda as soon as possible
  useEffect(() => {
    if (!uid || uid.trim() === "") return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Decode the uid to get the summoner name (e.g., "GameName#TAG")
        const summonerName = decodeURIComponent(uid);
        
        console.log(`Fetching data for summoner: ${summonerName}`);
        
        const response = await fetch(LAMBDA_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summoner: summonerName
          }),
        });

        if (response.status === 200) {
          const result = await response.json();
          console.log('Data fetched successfully:', result);
          setAggregatedData(result);
          setIsLoading(false);
        } else {
          const errorData = await response.json();
          console.error('Failed to fetch data:', errorData);
          setError(errorData.error || 'Failed to fetch match data');
          setIsLoading(false);
          // Fallback to mock data
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Network error occurred');
        setIsLoading(false);
        // Fallback to mock data
      }
    };

    fetchData();
  }, [uid]);

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
    setShowHours(false);
    setShowStats(false);
    setShowRoles(false);
    setShowTop2Roles(false);
    setShowRectangles(false);
    
    setCurrentStoryIndex(index);
    setStoryProgress(0);
    setIsAnimating(true);
    
    // Scene sequence: hours -> scene1 (top champions) -> top2roles (top 2) -> roles (top 5) -> summary
    // Check if this is the summary scene (last story, index 4)
    if (index === totalStories - 1) {
      setCurrentScene("summary");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    // Check if this is the top 5 roles scene (index 3)
    else if (index === 3) {
      setCurrentScene("roles");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowRoles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    }
    // Check if this is the top 2 roles scene (index 2)
    else if (index === 2) {
      setCurrentScene("top2roles");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowTop2Roles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    // Top champions scene (index 1)
    else if (index === 1) {
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
      setShowHours(false);
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
              <span className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl"> Activated</span>
            </div>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 md:mb-8 px-4">
            {isLoading ? "Fetching your match data..." : error ? "Using sample data..." : "Your data is ready!"}
          </p>
          
          <button
            onClick={handleButtonClick}
            disabled={isLoading}
            className={`font-bold py-4 px-8 rounded-xl text-lg md:text-xl transition-all duration-300 shadow-lg ${
              isLoading 
                ? "bg-gray-500 cursor-not-allowed opacity-50" 
                : "bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 transform hover:scale-105 hover:shadow-sky-500/50"
            } text-white`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </span>
            ) : "View Your Rewind"}
          </button>
        </div>
      </main>
      
      {/* Footer - fade out during animation */}
      <div className={`transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <Footer />
      </div>

      {/* Rectangle Animation Background */}
      <RectangleAnimation show={showRectangles} />

      {/* Hours Played Scene */}
      {showHours && currentScene === "hours" && <HoursPlayedScene hours={hoursPlayed} />}

      {/* Top Champions Scene */}
      {showStats && <TopChampionsScene champions={topChampions} />}

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