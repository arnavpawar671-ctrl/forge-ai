import React, { useEffect, useRef } from "react";

type ParticleFieldProps = {
  className?: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
};

export function ParticleField({ className = "" }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(150, Math.max(55, Math.floor((width * height) / 12500)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        size: Math.random() * 1.25 + 0.45,
      }));
    };

    const moveMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
      mouse.active = true;
    };

    const leave = () => {
      mouse.active = false;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -5 || particle.x > width + 5) particle.vx *= -1;
        if (particle.y < -5 || particle.y > height + 5) particle.vy *= -1;

        const dx = particle.x - mouse.x;
        const dy = particle.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = 145;
        const influence = mouse.active ? Math.max(0, 1 - distance / radius) : 0;

        const alpha = 0.18 + influence * 0.72;
        const size = particle.size + influence * 1.7;

        context.beginPath();
        context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 152, 31, ${alpha})`;
        context.fill();
      }

      if (mouse.active) {
        for (const particle of particles) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 125) continue;

          context.beginPath();
          context.moveTo(mouse.x, mouse.y);
          context.lineTo(particle.x, particle.y);
          context.strokeStyle = `rgba(255, 152, 31, ${Math.max(0, 0.16 - distance / 900)})`;
          context.lineWidth = 0.55;
          context.stroke();
        }
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", moveMouse);
    canvas.addEventListener("mouseleave", leave);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", moveMouse);
      canvas.removeEventListener("mouseleave", leave);
    };
  }, []);

  return <canvas ref={canvasRef} className={`particle-field ${className}`} aria-hidden="true" />;
}
