"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BlobBackground from "@/components/BlobBackground";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Trash2, Sparkles, ArrowLeft } from "lucide-react";
import { siGithub, siX } from "simple-icons";
import SimpleIcon from "@/components/SimpleIcon";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

const CHAT_URL = "https://ytnsvw2ozdgewpleglwnyvn3gy0cpvvr.lambda-url.us-east-1.on.aws";
const CHECK_USER_STATUS_URL = "https://nbmemmnatn3kxri3sf7yccqn5e0uxglu.lambda-url.us-east-1.on.aws/";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("na1");
  const [chatActive, setChatActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyingData, setVerifyingData] = useState(false);
  const [dataAvailable, setDataAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const blobColors = useMemo(() => ["#8B5CF6", "#EC4899", "#1E40AF"], []);

  // Function to verify user has aggregated data
  const verifyUserData = async (summonerName: string, region: string) => {
    setVerifyingData(true);
    try {
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
      const data = await response.json();

      if (response.status === 200) {
        // Data is available
        setDataAvailable(true);
        return true;
      } else if (response.status === 202) {
        // Data is being processed
        setDataAvailable(false);
        setMessages(prev => [...prev, {
          role: "system",
          content: "Your data is currently being processed. Please check back in a few moments.",
          timestamp: new Date(),
        }]);
        return false;
      } else {
        // Error or not found
        setDataAvailable(false);
        setMessages(prev => [...prev, {
          role: "system",
          content: data.error || "Unable to verify your data. Please try again.",
          timestamp: new Date(),
        }]);
        return false;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error verifying user data:", error);
      setDataAvailable(false);
      setMessages(prev => [...prev, {
        role: "system",
        content: "Error verifying your data. Please try again.",
        timestamp: new Date(),
      }]);
      return false;
    } finally {
      setVerifyingData(false);
    }
  };

  // Auto-start chat if coming from chronobreak
  useEffect(() => {
    const uid = searchParams.get("uid");
    const autostart = searchParams.get("autostart");
    const urlRegion = searchParams.get("region");
    
    if (uid && autostart === "true" && !chatActive) {
      // Decode the Riot ID from URL
      const decodedUid = decodeURIComponent(uid);
      setRiotId(decodedUid);
      
      // Set region if provided (or use default)
      const finalRegion = urlRegion || "na1";
      setRegion(finalRegion);
      
      // Auto-start the chat
      setChatActive(true);
      
      // Show loading message
      setMessages([{
        role: "system",
        content: "Loading your AI-powered insights...",
        timestamp: new Date(),
      }]);
      
      // Verify user data
      verifyUserData(decodedUid, finalRegion);
    }
     
  }, [searchParams, chatActive]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Riot ID format (GameName#TAG)
    if (!riotId.includes("#")) {
      alert("Please enter a valid Riot ID in the format: GameName#TAG");
      return;
    }

    setChatActive(true);
    
    // Show loading message
    setMessages([{
      role: "system",
      content: "Loading your AI-powered insights...",
      timestamp: new Date(),
    }]);
    
    // Verify user data
    await verifyUserData(riotId, region);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !chatActive || !dataAvailable) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Create abort controller with 120 second timeout (longer than Lambda's 90s timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summoner: riotId,
          region: region,
          message: input,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.status === 404) {
        setMessages(prev => [...prev, {
          role: "system",
          content: data.message || "No data found. Please process your matches first.",
          timestamp: new Date(),
        }]);
      } else if (response.ok) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        }]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error:", error);
      const errorMessage = (error as Error).name === "AbortError" 
        ? "Request timed out. Claude is taking longer than expected. Please try again or ask a simpler question."
        : "Error: Failed to get response. Please try again.";
      setMessages(prev => [...prev, {
        role: "system",
        content: errorMessage,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setChatActive(false);
    setRiotId("");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <BlobBackground 
        colors={blobColors}
        blobCount={3}
        minSizePercent={35}
        maxSizePercent={50}
        centerOffset={8}
      />
      
      {/* Conditional Navbar - Show minimal version when chat is active */}
      {chatActive ? (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-md">
          <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">
            {/* Back button */}
            <Link 
              href="/" 
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm md:text-base font-medium">Back to Rewind</span>
            </Link>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://x.com/jordan_nebula"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
                aria-label="X (formerly Twitter)"
              >
                <SimpleIcon path={siX.path} title="X" className="w-5 h-5" />
              </a>
              <a
                href="https://github.com/duncanista/rift-rewind"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <SimpleIcon path={siGithub.path} title="GitHub" className="w-5 h-5" />
              </a>
            </div>
          </div>
        </nav>
      ) : (
        <Navbar />
      )}
      
      <main className={`flex-1 flex flex-col items-center justify-center px-4 relative ${
        chatActive ? "pt-20 pb-6" : "py-6 md:py-12 min-h-[calc(100vh-64px)]"
      }`}>
        <div className="w-full max-w-5xl relative z-10">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 text-white flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
              <span style={{ fontFamily: "var(--font-zalando-sans, \"Zalando Sans Expanded\", sans-serif)" }}>
                AI COACH
              </span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base md:text-lg">
              Get personalized insights about your League of Legends performance
            </p>
          </div>

          {!chatActive ? (
            // Start Chat Form - Matching main page style
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 md:p-10 shadow-2xl shadow-black/50 hover:shadow-purple-500/20 transition-all duration-300 hover:-translate-y-1">
              <form onSubmit={handleStartChat} className="space-y-4 md:space-y-6">
                <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
                  <Input
                    id="riot-id"
                    name="riot-id"
                    value={riotId}
                    onChange={(e) => setRiotId(e.target.value)}
                    placeholder="Hide on bush#KR1"
                    required
                    className="flex-1 border-0 bg-transparent focus:ring-0 rounded-none text-sm sm:text-base"
                  />
                  <div className="w-px bg-white/10"></div>
                  <Select
                    id="region"
                    name="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required
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
                  className={`w-full py-3 md:py-4 text-base md:text-lg transition-all ${
                    riotId ? "animate-breathe" : ""
                  }`}
                >
                  START CHAT
                </Button>
              </form>

              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong className="text-purple-400">Tip:</strong> Ask about your win rates, best champions, performance trends, or get personalized recommendations!
                </p>
              </div>
            </div>
          ) : (
            // Chat Interface
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col h-[600px] md:h-[700px]">
              {/* Chat Header */}
              <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">{riotId}</h2>
                    <p className="text-sm text-gray-400">{region.toUpperCase()} • AI Coach</p>
                  </div>
                </div>
                <button
                  onClick={handleClearChat}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-sm transition-all duration-300 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">End Chat</span>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                          : message.role === "system"
                            ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-200"
                            : "bg-white/10 border border-white/10 text-white"
                      }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: message.content.trim() }} />
                      <p className="text-xs text-gray-300 mt-2 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {(loading || verifyingData) && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      verifyingData 
                        ? "Verifying your data..." 
                        : !dataAvailable 
                          ? "Data not available yet..." 
                          : "Ask about your stats, champions, performance..."
                    }
                    className="flex-1 bg-white/5 border-white/10 focus:border-purple-500"
                    disabled={loading || verifyingData || !dataAvailable}
                  />
                  <Button
                    type="submit"
                    disabled={loading || verifyingData || !dataAvailable || !input.trim()}
                    className="px-6"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                {verifyingData ? (
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                    Verifying your data...
                  </p>
                ) : !dataAvailable ? (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Your data is still being processed. Please wait a few moments and refresh the page.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">
                    Example: &quot;What&apos;s my win rate?&quot; or &quot;Which champion should I focus on?&quot;
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-center">
          <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
