"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./MaskedHeading.css";

interface MaskedHeadingProps {
  text?: string;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  mediaType?: "image" | "video";
  src?: string;
  poster?: string;
  brightness?: number;
  saturation?: number;
  reveal?: "rise" | "wipe" | "fade" | "none";
  duration?: number;
  trigger?: "view" | "hover" | "immediate";
  align?: "left" | "center" | "right";
  weight?: number;
  tracking?: number;
  lineHeight?: number;
  textScale?: number;
  className?: string;
  style?: React.CSSProperties;
}

const MaskedHeading = ({
  text = "Designed in the details",
  tag = "h2",
  mediaType = "image",
  src = "",
  brightness = 1,
  saturation = 1,
  reveal = "rise",
  duration = 1.1,
  trigger = "view",
  align = "center",
  weight = 700,
  tracking = -0.03,
  lineHeight = 1.15,
  textScale = 0.115,
  className = "",
  style,
  ...rest
}: MaskedHeadingProps) => {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reveal === "none" || reduce) return;

    const play = () => {
      if (reveal === "rise") {
        gsap.fromTo(
          root,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration, ease: "power4.out", overwrite: "auto" }
        );
      } else if (reveal === "fade") {
        gsap.fromTo(
          root,
          { opacity: 0, scale: 1.05 },
          { opacity: 1, scale: 1, duration, ease: "power3.out", overwrite: "auto" }
        );
      }
    };

    const rest_ = () => {
      if (reveal === "rise") gsap.set(root, { opacity: 0, y: 30 });
      else if (reveal === "fade") gsap.set(root, { opacity: 0, scale: 1.05 });
    };

    if (trigger === "hover") {
      rest_();
      root.addEventListener("pointerenter", play);
      return () => root.removeEventListener("pointerenter", play);
    }

    if (trigger === "view") {
      rest_();
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            play();
            io.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      io.observe(root);
      return () => io.disconnect();
    }

    play();
  }, [reveal, trigger, duration, text]);

  const Tag = tag;

  return (
    <Tag
      ref={rootRef as React.RefObject<HTMLHeadingElement>}
      className={`masked-heading ${className}`.trim()}
      style={{
        textAlign: align,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        backgroundImage: mediaType === "video" ? undefined : `url(${src})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: `brightness(${brightness}) saturate(${saturation})`,
        ...style,
      }}
      {...rest}
    >
      {text}
    </Tag>
  );
};

export default MaskedHeading;
