"use client";

import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, FormEvent, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("na1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Memoize colors array to prevent BlobBackground from re-initializing on every render
  const blobColors = useMemo(() => ["#8B5CF6", "#EC4899", "#1E40AF"], []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate Riot ID format (GameName#TAG)
    if (!riotId.includes("#")) {
      alert("Please enter a valid Riot ID in the format: GameName#TAG");
      return;
    }

    // Use the Riot ID as the identifier (encode for URL safety)
    const encodedRiotId = encodeURIComponent(riotId);
    setPendingUid(encodedRiotId);
    
    // Start fade to black animation
    setIsFading(true);
    
    // After fade completes (1 second), start video
    setTimeout(() => {
      setIsPlaying(true);
    }, 1000);
  };

  // Play video when isPlaying becomes true
  useEffect(() => {
    if (isPlaying && videoRef.current && pendingUid) {
      const video = videoRef.current;
      video.play().catch((error) => {
        console.error("Error playing video:", error);
        // If video fails to play, redirect immediately
        router.push(`/chronobreak/${pendingUid}?region=${region}`);
      });
      
      // Wait for video to end, then redirect with transition flag
      const handleEnded = () => {
        router.push(`/chronobreak/${pendingUid}?transition=true&region=${region}`);
      };
      
      video.addEventListener("ended", handleEnded);
      
      return () => {
        video.removeEventListener("ended", handleEnded);
      };
    }
  }, [isPlaying, pendingUid, region, router]);

  return (
    <div className="flex flex-col h-screen">
      <BlobBackground 
        colors={blobColors}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 overflow-hidden relative">
        {/* Heimerdinger Emote - Top Left */}
        <div className="absolute pointer-events-none left-4 top-24 sm:left-8 sm:top-28 z-0 lg:left-[calc(50%_-_580px)] lg:top-1/2 lg:-translate-y-1/2 xl:left-[calc(50%_-_650px)]">
          <Image
            src="/images/emotes/heimerdinger-think.webp"
            alt="Heimerdinger thinking"
            width={300}
            height={300}
            className="w-32 h-32 sm:w-40 sm:h-40 opacity-60 lg:w-56 lg:h-56 lg:opacity-80 lg:hover:opacity-100 xl:w-64 xl:h-64 transition-opacity duration-300"
            priority
          />
        </div>

        {/* Zilean Emote - Bottom Right */}
        <div className="absolute pointer-events-none right-4 bottom-8 sm:right-8 sm:bottom-12 z-0 lg:right-[calc(50%_-_580px)] lg:bottom-24 xl:right-[calc(50%_-_650px)] xl:bottom-28">
          <Image
            src="/images/emotes/zilean-giveit.png"
            alt="Zilean emote"
            width={300}
            height={300}
            className="w-32 h-36 sm:w-40 sm:h-44 opacity-60 lg:w-56 lg:h-64 lg:opacity-80 lg:hover:opacity-100 xl:w-64 xl:h-72 transition-opacity duration-300"
            priority
          />
        </div>

        <div className="text-center mb-6 md:mb-12 max-w-full relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-medium mb-3 md:mb-4 px-2">
            <div className="text-white mb-1 md:mb-2">Ready for a</div>
            <div className="break-words">
              <span 
                className="text-white text-3xl sm:text-5xl md:text-7xl font-bold leading-tight"
                style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}
              >
                CHRONOBREAK
              </span>
              <span className="text-white text-2xl sm:text-4xl md:text-6xl font-bold">?</span>
            </div>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg px-4">
            Enter your Riot ID and region to begin your journey
          </p>
        </div>

        <div className="w-full max-w-2xl px-2 relative z-10">
          <form 
            onSubmit={handleSubmit} 
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 md:p-10 shadow-2xl shadow-black/50 hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="space-y-4 md:space-y-6">
              <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
                <Input
                  id="riot-id"
                  name="riot-id"
                  value={riotId}
                  onChange={(e) => setRiotId(e.target.value)}
                  placeholder="GameName#TAG"
                  required
                  className="flex-1 border-0 bg-transparent focus:ring-0 rounded-none text-sm sm:text-base"
                />
                <div className="w-px bg-white/10"></div>
                <Select
                  id="region"
                  name="region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-[80px] sm:w-[100px] border-0 bg-transparent focus:ring-0 rounded-none text-sm sm:text-base"
                >
                  <option value="na1">NA</option>
                  <option value="euw1">EUW</option>
                  <option value="eun1">EUNE</option>
                  <option value="kr">KR</option>
                  <option value="br1">BR</option>
                  <option value="la1">LAN</option>
                  <option value="la2">LAS</option>
                  <option value="oc1">OCE</option>
                  <option value="tr1">TR</option>
                  <option value="ru">RU</option>
                  <option value="jp1">JP</option>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full py-3 md:py-4 text-base md:text-lg"
              >
                REWIND
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />

      {/* Fade to black overlay with radial gradient */}
      {isFading && (
        <div 
          className="fixed inset-0 z-[9998] pointer-events-none animate-fadeIn"
          style={{
            background: "radial-gradient(circle, transparent 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.7) 60%, black 100%)",
            animationDuration: "2s",
            animationTimingFunction: "ease-in",
            animationFillMode: "forwards",
          }}
        />
      )}

      {/* Full-screen video overlay */}
      {isPlaying && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            preload="auto"
            playsInline
            muted={false}
          >
            <source src="/videos/ekko-chronobreak.mp4" type="video/mp4" />
          </video>
        </div>
      )}
    </div>
  );
}
