"use client";

interface RectangleAnimationProps {
  show: boolean;
}

export default function RectangleAnimation({ show }: RectangleAnimationProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9997] pointer-events-none">
      {/* Top rectangles - coming down */}
      <div className="absolute top-0 left-0 right-0 h-1/2 flex">
        {Array.from({ length: 16 }).map((_, index) => {
          // Calculate delay: 1 and 16 first (0ms), then 2 and 15 (100ms), etc.
          const pairIndex = Math.min(index, 15 - index);
          const delay = pairIndex * 100;
          
          return (
            <div
              key={`top-${index}`}
              className="flex-1 animate-slideDownToMiddle"
              style={{
                background: 'linear-gradient(to bottom, #1E40AF 0%, #1E3A8A 20%, #1E293B 40%, #0F172A 60%, #020617 80%, #000000 100%)',
                animationDelay: `${delay}ms`,
                animationDuration: '1500ms',
                animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                animationFillMode: 'forwards',
              }}
            />
          );
        })}
      </div>

      {/* Bottom rectangles - coming up */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 flex">
        {Array.from({ length: 16 }).map((_, index) => {
          // Same delay pattern as top
          const pairIndex = Math.min(index, 15 - index);
          const delay = pairIndex * 100;
          
          return (
            <div
              key={`bottom-${index}`}
              className="flex-1 animate-slideUpToMiddle"
              style={{
                background: 'linear-gradient(to top, #1E40AF 0%, #1E3A8A 20%, #1E293B 40%, #0F172A 60%, #020617 80%, #000000 100%)',
                animationDelay: `${delay}ms`,
                animationDuration: '1500ms',
                animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                animationFillMode: 'forwards',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
