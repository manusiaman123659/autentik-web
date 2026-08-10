"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  type?: "fade-up" | "stagger";
  delay?: number;
  staggerDelay?: number;
}

export default function AnimatedElement({
  children,
  className = "",
  style,
  type = "fade-up",
  delay = 0,
  staggerDelay = 0.15,
}: AnimatedProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!containerRef.current) return;

      if (type === "fade-up") {
        gsap.fromTo(
          containerRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          }
        );
      } else if (type === "stagger") {
        const childrenElements = containerRef.current.children;
        if (childrenElements.length > 0) {
          gsap.fromTo(
            childrenElements,
            { opacity: 0, y: 45, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.75,
              stagger: staggerDelay,
              ease: "power2.out",
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      }
    }, containerRef);

    return () => ctx.revert();
  }, [type, delay, staggerDelay]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
}

