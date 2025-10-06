"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";
import { 
  TopChampionsScene, 
  TopRolesScene, 
  SummaryScene, 
  RectangleAnimation, 
  FloatingLogo, 
  StoryProgressBar, 
} from "@/components/chronobreak";

// Animation scene configuration
type AnimationScene = "idle" | "scene1" | "roles" | "summary";

export default function ChronobreakPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = params.uid as string;
  const hasTransition = searchParams.get("transition") === "true";
  const [showTransition, setShowTransition] = useState(hasTransition);
  
  // Animation state management
  const [currentScene, setCurrentScene] = useState<AnimationScene>("idle");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRectangles, setShowRectangles] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  
  // Refs to track timeouts for cleanup
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  
  // Story progress management
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const totalStories = 3; // 1 story scene + 1 roles scene + 1 summary scene
  const storyDuration = 10000; // 10 seconds per story
  
  // TODO: Replace with real data from API
  const topChampions = [
    { name: "Katarina", games: 15, icon: "/images/champions/katarina-splashart.webp" },
    { name: "Lux", games: 12, icon: "/images/champions/lux-splashart.webp" },
    { name: "Udyr", games: 10, icon: "/images/champions/udyr-splashart.webp" },
    { name: "Yasuo", games: 8, icon: "/images/champions/katarina-splashart.webp" },
    { name: "Zed", games: 7, icon: "/images/champions/lux-splashart.webp" },
  ];

  // TODO: Replace with real data from API
  const summaryStats = {
    kda: { kills: 156, deaths: 142, assists: 312 },
    kdaRatio: "3.29",
    championsPlayed: 23,
    totalDeaths: 142,
    topRoles: [
      { name: "Top", icon: "/images/position/top.svg" },
      { name: "Support", icon: "/images/position/sup.svg" },
    ],
    ffCount: 12,
  };

  // TODO: Replace with real data from API
  const topRoles = [
    { name: "Top", games: 45, percentage: 32, icon: "/images/position/top.svg" },
    { name: "Support", games: 38, percentage: 27, icon: "/images/position/sup.svg" },
    { name: "Mid", games: 28, percentage: 20, icon: "/images/position/mid.svg" },
    { name: "ADC", games: 15, percentage: 11, icon: "/images/position/adc.svg" },
    { name: "Jungle", games: 12, percentage: 10, icon: "/images/position/jgl.svg" },
  ];

  // Redirect to home if no uid is provided
  useEffect(() => {
    if (!uid || uid.trim() === "") {
      router.push("/");
    }
  }, [uid, router]);

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
    setShowStats(false);
    setShowRoles(false);
    setShowRectangles(false);
    
    setCurrentStoryIndex(index);
    setStoryProgress(0);
    setIsAnimating(true);
    
    // Check if this is the summary scene (last story)
    if (index === totalStories - 1) {
      setCurrentScene("summary");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    // Check if this is the roles scene (second to last story)
    else if (index === totalStories - 2) {
      setCurrentScene("roles");
      // Use setTimeout to ensure state is cleared first
      const timeout = setTimeout(() => {
        setShowRectangles(true);
        setShowRoles(true);
      }, 0);
      timeoutRefs.current.push(timeout);
    } 
    else {
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
      setShowStats(false);
      setShowRoles(false);
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

  // Animation sequence controller
  useEffect(() => {
    if (!isAnimating) return;

    if (currentScene === "scene1") {
      // Scene 1 lasts 10 seconds total
      const timer = setTimeout(() => {
        goToNextStory();
      }, storyDuration);

      return () => clearTimeout(timer);
    }

    // Future scenes will be handled here
    // Example:
    // if (currentScene === 'scene2') {
    //   const timer = setTimeout(() => {
    //     setCurrentScene('scene3');
    //   }, SCENE2_DURATION);
    //   return () => clearTimeout(timer);
    // }
  }, [currentScene, isAnimating, currentStoryIndex]);

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
                className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight"
                style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
              >
                CHRONOBREAK
              </span>
              <span className="text-white text-3xl sm:text-4xl md:text-5xl"> Activated</span>
            </div>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-6 md:mb-8 px-4">
            Analyzing your Rift journey...
          </p>
          
          <button
            onClick={handleButtonClick}
            className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-bold py-4 px-8 rounded-xl text-lg md:text-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-sky-500/50"
          >
            View Your Rewind
          </button>
        </div>
      </main>
      
      {/* Footer - fade out during animation */}
      <div className={`transition-opacity duration-700 ${isAnimating ? "opacity-0" : "opacity-100"}`}>
        <Footer />
      </div>

      {/* Rectangle Animation Background */}
      <RectangleAnimation show={showRectangles} />

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

      {/* Top Roles Scene */}
      {showRoles && currentScene === "roles" && <TopRolesScene roles={topRoles} />}

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