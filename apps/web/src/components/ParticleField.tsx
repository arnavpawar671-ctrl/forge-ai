import React, { useEffect, useRef } from "react";
import { Camera, Geometry, Mesh, Program, Renderer } from "ogl";

type ParticleFieldProps = {
  className?: string;
  particleCount?: number;
  particleColors?: string[];
  particleSpread?: number;
  speed?: number;
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  disableRotation?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  alphaParticles?: boolean;
  cameraDistance?: number;
  pixelRatio?: number;
};

type RGB = [number, number, number];

const DEFAULT_COLORS = ["#C084FC", "#A78BFA", "#E9D5FF", "#8B5CF6", "#DDD6FE"];

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace(/^#/, "");
  const value =
    normalized.length === 3
      ? normalized.split("").map((char) => char + char).join("")
      : normalized;
  const number = Number.parseInt(value.slice(0, 6), 16);

  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ];
}

const vertexShader = `
  attribute vec4 aRandom;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    vRandom = aRandom;
    vColor = aColor;

    vec3 pos = position * uSpread;
    pos.z *= 7.0;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    float t = uTime;

    // Each particle gets its own slow orbit and vertical drift so the
    // background feels alive instead of moving as one rigid cloud.
    float phase = 6.28318 * aRandom.x;
    float drift = sin(t * (0.22 + aRandom.z * 0.38) + phase) * (0.55 + aRandom.w * 1.25);
    float sway = sin(t * (0.18 + aRandom.y * 0.28) + phase * 1.7) * (0.25 + aRandom.x * 0.9);

    modelPosition.x += sway;
    modelPosition.y += drift;
    modelPosition.z += sin(t * (0.16 + aRandom.w * 0.24) + phase) * 0.7;

    // A second, slower motion layer creates the floating/dreamy depth.
    modelPosition.x += sin(t * 0.07 + phase * 2.0) * aRandom.y * 0.55;
    modelPosition.y += cos(t * 0.055 + phase * 1.4) * aRandom.z * 0.7;

    vec4 viewPosition = viewMatrix * modelPosition;

    float depthScale = clamp(18.0 / max(4.0, -viewPosition.z), 0.65, 2.8);
    gl_PointSize = max(
      1.8,
      uBaseSize * depthScale *
      (1.0 + uSizeRandomness * (aRandom.x - 0.5))
    );

    gl_Position = projectionMatrix * viewPosition;
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uAlphaParticles;

  varying vec4 vRandom;
  varying vec3 vColor;

  void main() {
    float distanceFromCenter = length(gl_PointCoord - vec2(0.5));

    if (distanceFromCenter > 0.5) discard;

    float core = smoothstep(0.48, 0.04, distanceFromCenter);
    float glow = smoothstep(0.5, 0.0, distanceFromCenter);

    // Slow individual twinkle keeps the field organic without flashing.
    float twinkle = 0.78 + 0.22 * sin(uTime * (0.7 + vRandom.z * 1.1) + vRandom.x * 6.28318);
    vec3 shimmer = vColor + 0.08 * sin(gl_PointCoord.yxx + uTime * 0.7 + vRandom.y * 6.28);
    float alpha = mix(0.72, 1.0, core) * twinkle * (uAlphaParticles > 0.5 ? 0.9 : 1.0);

    gl_FragColor = vec4(shimmer, alpha * glow);
  }
`;

export function ParticleField({
  className = "",
  particleCount = 1200,
  particleColors = DEFAULT_COLORS,
  particleSpread = 14,
  speed = 0.22,
  moveParticlesOnHover = true,
  particleHoverFactor = 1.1,
  disableRotation = false,
  particleBaseSize = 5.8,
  sizeRandomness = 0.85,
  alphaParticles = true,
  cameraDistance = 20,
  pixelRatio = 1.5,
}: ParticleFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, pixelRatio),
      depth: false,
      alpha: true,
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";
    gl.canvas.style.position = "absolute";
    gl.canvas.style.inset = "0";
    gl.canvas.style.pointerEvents = "none";
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 18 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
    };

    resize();
    window.addEventListener("resize", resize);

    const count = Math.max(1, particleCount);
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count * 4);
    const colors = new Float32Array(count * 3);
    const palette = particleColors.length > 0 ? particleColors : DEFAULT_COLORS;

    for (let i = 0; i < count; i += 1) {
      let x = 0;
      let y = 0;
      let z = 0;
      let lengthSquared = 2;

      while (lengthSquared > 1 || lengthSquared === 0) {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        lengthSquared = x * x + y * y + z * z;
      }

      const radius = Math.cbrt(Math.random());
      positions.set([x * radius, y * radius, z * radius], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);

      const color = hexToRgb(
        palette[Math.floor(Math.random() * palette.length)] ?? DEFAULT_COLORS[0],
      );
      colors.set(color, i * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      aRandom: { size: 4, data: randoms },
      aColor: { size: 3, data: colors },
    });

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: particleSpread },
        uBaseSize: { value: particleBaseSize * Math.min(window.devicePixelRatio || 1, pixelRatio) },
        uSizeRandomness: { value: sizeRandomness },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const particles = new Mesh(gl, {
      mode: gl.POINTS,
      geometry,
      program,
    });

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    if (moveParticlesOnHover) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    let animationFrame = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const update = (time: number) => {
      animationFrame = requestAnimationFrame(update);

      const delta = time - lastTime;
      lastTime = time;
      elapsed += delta * speed;

      program.uniforms.uTime.value = elapsed * 0.001;

      if (moveParticlesOnHover) {
        particles.position.x = -mouse.x * particleHoverFactor;
        particles.position.y = -mouse.y * particleHoverFactor;
      } else {
        particles.position.x = 0;
        particles.position.y = 0;
      }

      if (!disableRotation) {
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.08;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.12;
        particles.rotation.z += 0.004 * speed;
      }

      renderer.render({ scene: particles, camera });
    };

    animationFrame = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);

      if (moveParticlesOnHover) {
        container.removeEventListener("mousemove", handleMouseMove);
      }

      if (container.contains(gl.canvas)) {
        container.removeChild(gl.canvas);
      }

      renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    particleCount,
    particleColors.join(","),
    particleSpread,
    speed,
    moveParticlesOnHover,
    particleHoverFactor,
    disableRotation,
    particleBaseSize,
    sizeRandomness,
    alphaParticles,
    cameraDistance,
    pixelRatio,
  ]);

  return (
    <div
      ref={containerRef}
      className={`particle-field ${className}`}
      aria-hidden="true"
    />
  );
}
