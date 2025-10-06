"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";

export default function ChronobreakPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const uid = params.uid as string;
  const hasTransition = searchParams.get("transition") === "true";
  const [showTransition, setShowTransition] = useState(hasTransition);

  useEffect(() => {
    if (hasTransition) {
      // Hide the transition overlay after animation completes
      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasTransition]);

  return (
    <div className="flex flex-col min-h-screen">
      <BlobBackground 
        colors={["#3B82F6", "#10B981", "#FCD34D"]}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-12 overflow-hidden">
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
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 md:p-8 backdrop-blur-sm">
            <p className="text-gray-300 mb-3 md:mb-4 text-sm sm:text-base">Session ID:</p>
            <code className="text-emerald-400 text-xs sm:text-sm bg-black/30 px-3 sm:px-4 py-2 rounded break-all inline-block max-w-full">
              {uid}
            </code>
            <div className="mt-6 md:mt-8">
              <div className="animate-pulse text-gray-500 text-sm sm:text-base">
                Loading your stats...
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* White fade out overlay - opposite of main page */}
      {showTransition && (
        <div 
          className="fixed inset-0 z-[9998] pointer-events-none animate-fadeOut"
          style={{
            background: "radial-gradient(circle, white 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 60%, transparent 100%)",
          }}
        />
      )}
    </div>
  );
}