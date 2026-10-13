"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import type { TeamMember } from "@/types";

export default function TeamCarousel({ members, labels = { previous: "Sebelumnya", next: "Selanjutnya" } }: {
  members: TeamMember[]; labels?: { previous: string; next: string };
}) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 320;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const autoScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
    if (atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else {
      el.scrollBy({ left: 320, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(autoScroll, 3500);
    return () => clearInterval(id);
  }, [isPaused, autoScroll]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel track */}
      <div
        ref={carouselRef}
        className="no-scrollbar flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-16 px-4 sm:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        {members.map((member) => (
          <div
            key={member.id}
            className="flex-shrink-0 snap-start w-[260px] sm:w-[280px] h-[380px] sm:h-[420px] rounded-2xl overflow-hidden relative group"
          >
            {/* Photo */}
            {member.imageUrl ? (
              <Image
                src={member.imageUrl}
                alt={member.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="280px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                <User size={64} className="text-slate-300 dark:text-slate-600" />
              </div>
            )}

            {/* Bottom overlay */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5">
              <h3 className="text-white font-bold text-base leading-tight">
                {member.name}
              </h3>
              <p className="text-white/80 text-xs uppercase tracking-wider mt-1">
                {member.role}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-3">
        <button
          onClick={() => scroll("left")}
          className="w-10 h-10 rounded-full bg-[#0B1F3A] hover:bg-[#0e2a4d] text-white flex items-center justify-center transition-colors"
          aria-label={labels.previous}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="w-10 h-10 rounded-full bg-[#0B1F3A] hover:bg-[#0e2a4d] text-white flex items-center justify-center transition-colors"
          aria-label={labels.next}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
