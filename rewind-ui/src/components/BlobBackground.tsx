'use client';

import React, { useEffect, useRef } from 'react';

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  noiseOffsetX: number;
  noiseOffsetY: number;
  points: { x: number; y: number }[];
}

interface BlobBackgroundProps {
  colors?: string[];
  blobCount?: number;
  sizeMultiplier?: number; // Multiplier for blob size (default 1)
  minSizePercent?: number; // Minimum size as % of screen (default 35%)
  maxSizePercent?: number; // Maximum size as % of screen (default 50%)
  centerOffset?: number; // How far blobs can be from center as % (default 8%)
}

export default function BlobBackground({
  colors = ['#8B5CF6', '#EC4899', '#1E40AF'],
  blobCount = 3,
  sizeMultiplier = 3.5,
  minSizePercent = 40,
  maxSizePercent = 80,
  centerOffset = 0,
}: BlobBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Helper function to generate random organic blob points
    const generateBlobPoints = (numPoints: number = 8) => {
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const randomRadius = 0.7 + Math.random() * 0.6; // Random radius between 0.7 and 1.3
        points.push({
          x: Math.cos(angle) * randomRadius,
          y: Math.sin(angle) * randomRadius,
        });
      }
      return points;
    };

    // Initialize blobs near center with responsive sizing
    const initBlobs = () => {
      blobsRef.current = [];
      // Use Math.floor to ensure we're at exact pixel center
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      
      // Make blob size responsive to screen size with configurable values
      const screenSize = Math.min(canvas.width, canvas.height);
      const baseRadius = (screenSize * (minSizePercent / 100)) * sizeMultiplier;
      const maxRadius = (screenSize * (maxSizePercent / 100)) * sizeMultiplier;
      const radiusVariation = maxRadius - baseRadius;
      
      for (let i = 0; i < blobCount; i++) {
        const angle = (i / blobCount) * Math.PI * 2;
        const distance = screenSize * (centerOffset / 100);
        
        blobsRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: Math.random() * radiusVariation + baseRadius,
          color: colors[i % colors.length],
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          points: generateBlobPoints(8 + Math.floor(Math.random() * 4)),
        });
      }
      
      // Debug log to check centering
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Center point:', centerX, centerY);
      console.log('Initial blob positions:', blobsRef.current.map(b => ({ x: b.x, y: b.y })));
    };
    initBlobs();
    
    // Reinitialize on resize to maintain proper sizing
    const handleResize = () => {
      resizeCanvas();
      initBlobs();
    };
    window.removeEventListener('resize', resizeCanvas);
    window.addEventListener('resize', handleResize);

    // Simple noise function for organic movement
    const noise = (x: number) => {
      x -= Math.floor(x);
      const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
      return fade(x);
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Use exact same center calculation as initialization
      const centerX = Math.floor(canvas.width / 2);
      const centerY = Math.floor(canvas.height / 2);
      const attractionRadius = Math.min(canvas.width, canvas.height) * 0.15;

      blobsRef.current.forEach((blob) => {
        // Calculate distance from center
        const dx = centerX - blob.x;
        const dy = centerY - blob.y;

        // Strong attraction to keep blobs centered
        const pullStrength = 0.001;
        blob.vx += dx * pullStrength;
        blob.vy += dy * pullStrength;

        // Minimal randomness for very smooth movement
        blob.vx += (Math.random() - 0.5) * 0.005;
        blob.vy += (Math.random() - 0.5) * 0.005;

        // Very slow shape deformation for minimal morphing
        blob.noiseOffsetX += 0.001;
        blob.noiseOffsetY += 0.001;

        // Very strong damping for ultra-smooth movement
        blob.vx *= 0.99;
        blob.vy *= 0.99;

        // Limit speed to extremely slow movement
        const speed = Math.sqrt(blob.vx * blob.vx + blob.vy * blob.vy);
        const maxSpeed = 0.15;
        if (speed > maxSpeed) {
          blob.vx = (blob.vx / speed) * maxSpeed;
          blob.vy = (blob.vy / speed) * maxSpeed;
        }

        // Update position
        blob.x += blob.vx;
        blob.y += blob.vy;

        // Hard constraint to keep blobs very close to center
        const distFromCenterAfter = Math.sqrt(
          Math.pow(centerX - blob.x, 2) + Math.pow(centerY - blob.y, 2)
        );
        if (distFromCenterAfter > attractionRadius) {
          const angle = Math.atan2(blob.y - centerY, blob.x - centerX);
          blob.x = centerX + Math.cos(angle) * attractionRadius;
          blob.y = centerY + Math.sin(angle) * attractionRadius;
        }

        // Draw organic blob shape
        ctx.save();
        ctx.translate(blob.x, blob.y);

        // Create path for organic blob
        ctx.beginPath();
        blob.points.forEach((point, i) => {
          const angle = (i / blob.points.length) * Math.PI * 2;
          const nextAngle = ((i + 1) / blob.points.length) * Math.PI * 2;
          
          // Add very subtle noise-based variation for minimal morphing
          const radiusVariation = noise(blob.noiseOffsetX + i) * 0.08 + 1;
          const radius = blob.radius * point.x * radiusVariation;
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          const nextRadiusVariation = noise(blob.noiseOffsetY + i + 1) * 0.08 + 1;
          const nextRadius = blob.radius * blob.points[(i + 1) % blob.points.length].y * nextRadiusVariation;
          const nextX = Math.cos(nextAngle) * nextRadius;
          const nextY = Math.sin(nextAngle) * nextRadius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          }
          
          // Use quadratic curves for smooth organic shapes
          const cpX = (x + nextX) / 2;
          const cpY = (y + nextY) / 2;
          ctx.quadraticCurveTo(x, y, cpX, cpY);
        });
        ctx.closePath();

        // Create gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.radius);
        
        // Parse hex color to rgb for opacity control
        const r = parseInt(blob.color.slice(1, 3), 16);
        const g = parseInt(blob.color.slice(3, 5), 16);
        const b = parseInt(blob.color.slice(5, 7), 16);

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [colors, blobCount, sizeMultiplier, minSizePercent, maxSizePercent, centerOffset]);

  return (
    <>
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] -z-20" />
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-10"
      />
      <div className="fixed inset-0 backdrop-blur-[80px] -z-10" />
    </>
  );
}

