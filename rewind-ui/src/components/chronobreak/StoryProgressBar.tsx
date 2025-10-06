"use client";

interface StoryProgressBarProps {
  totalStories: number;
  currentStoryIndex: number;
  storyProgress: number;
  show: boolean;
}

export default function StoryProgressBar({ 
  totalStories, 
  currentStoryIndex, 
  storyProgress, 
  show, 
}: StoryProgressBarProps) {
  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] px-2 pt-2 pb-1">
      <div className="flex gap-1">
        {Array.from({ length: totalStories }).map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
          >
            <div
              className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
              style={{
                width: index < currentStoryIndex 
                  ? "100%" 
                  : index === currentStoryIndex 
                    ? `${storyProgress}%` 
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
