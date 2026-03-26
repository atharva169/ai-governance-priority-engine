"use client";

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const FRAME_COUNT = 153;

interface HeroSequenceProps {
  children?: React.ReactNode;
}

export default function HeroSequence({ children }: HeroSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loginWrapperRef = useRef<HTMLDivElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  
  // Store images in a ref to avoid recreation
  const imagesRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    let tl: gsap.core.Timeline;
    let currentFrame = 0;

    // 2. Render Frame Math - Object Fit Cover with 15% bottom crop
    const renderFrame = (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = imagesRef.current[index];
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Object-fit Cover to fill the screen
      // Multiply scale by 1.15 to zoom in and aggressively crop out any baked-in black bars from the video file
      const baseScale = Math.max(cw / img.width, ch / img.height);
      const scale = baseScale * 1.15;
      
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      
      // Perfectly center horizontally and vertically
      const dx = (cw - drawWidth) / 2;
      const dy = (ch - drawHeight) / 2;

      // Clear the canvas explicitly to pure black to frame the 16:9 aspect ratio neatly
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, cw, ch);
      
      ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
    };

    // 3. Initialize GSAP Sequence
    const initAnimation = () => {
      if (!canvasRef.current || !containerRef.current || !loginWrapperRef.current) return;

      // Draw the first frame immediately
      renderFrame(0);

      const frameObj = { current: 0 };

      // Set up the ScrollTrigger Timeline mapped to the 500vh container
      tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5, // 0.5 momentum scroll for cinematic easing
        }
      });

      // Animate the frame sequence over the duration of the timeline
      tl.to(frameObj, {
        current: FRAME_COUNT - 1,
        snap: "current",
        ease: "none",
        duration: FRAME_COUNT,
        onUpdate: () => {
          currentFrame = Math.round(frameObj.current);
          renderFrame(currentFrame);
        },
      }, 0);

      // 5. Cinematic Handoff: The Login Integration
      // Make the login page pop out seamlessly and immersively directly from the center with premium finishing
      // Trigger "just before the circle appears" - roughly frame 110-120
      tl.fromTo(loginWrapperRef.current, 
        { 
          opacity: 0, 
          y: 0, 
          scale: 0.5, 
          pointerEvents: 'none'
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          pointerEvents: 'auto',
          duration: 35, // Smooth pop out
          ease: "back.out(1.1)"
        },
        115 // Hardcode the start frame so it appears right before the circle finishes resolving
      );
    };

    // 1. Preload Images
    const preloadImages = () => {
      let loadedCount = 0;
      const images: HTMLImageElement[] = [];

      for (let i = 1; i <= FRAME_COUNT; i++) {
        const img = new Image();
        // Zero-pad the image index (e.g., 001)
        const indexStr = String(i).padStart(3, '0');
        img.src = `/frames_landing_page/ezgif-frame-${indexStr}.jpg`;

        img.onload = () => {
          loadedCount++;
          setImagesLoaded(loadedCount);
          if (loadedCount === FRAME_COUNT) {
            initAnimation();
          }
        };
        // Also increment on error to prevent eternal loading if one frame is missing
        img.onerror = () => {
          loadedCount++;
          setImagesLoaded(loadedCount);
          if (loadedCount === FRAME_COUNT) {
            initAnimation();
          }
        };
        images.push(img);
      }
      imagesRef.current = images;
    };

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Redraw current frame smoothly on resize
        if (imagesRef.current.length === FRAME_COUNT) {
          renderFrame(currentFrame);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initialization sizing
    preloadImages();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: "500vh" }}>
      {/* Fixed Canvas Container */}
      <div className="sticky top-0 left-0 w-full h-[100vh] overflow-hidden bg-black">
        
        {/* Hardware accelerated canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
        />

        {/* Loading Spinner / State */}
        {imagesLoaded < FRAME_COUNT && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 transition-opacity duration-500">
            <div className="w-48 h-[2px] bg-white/10 rounded overflow-hidden mb-4">
              <div 
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${(imagesLoaded / FRAME_COUNT) * 100}%` }}
              />
            </div>
            <p className="text-white/60 font-mono text-xs uppercase tracking-[0.2em]">
              Initializing Cinematic Engine {Math.round((imagesLoaded / FRAME_COUNT) * 100)}%
            </p>
          </div>
        )}

        {/* Cinematic Login Wrapper Integration */}
        <div
          id="login-wrapper"
          ref={loginWrapperRef}
          className="absolute inset-0 w-full h-full z-10 overflow-y-auto"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          {children}
        </div>
        
      </div>
    </div>
  );
}
