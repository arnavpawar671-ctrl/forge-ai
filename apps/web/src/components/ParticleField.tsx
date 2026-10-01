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
};

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const number = Number.parseInt(value, 16);

  return [
    ((number >> 16) & 255) / 255,
    ((number >> 8) & 255) / 255,
    (number & 255) / 255,
  ];
}

export function ParticleField({
  className = "",
  particleCount = 180,
  particleColors = ["#FF981F"],
  particleSpread = 10,
  speed = 0.1,
  moveParticlesOnHover = true,
  particleHoverFactor = 1.7,
  disableRotation = false,
  particleBaseSize = 95,
  sizeRandomness = 1.1,
  alphaParticles = true,
  cameraDistance = 20,
}: ParticleFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    });

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";
    gl.canvas.style.display = "block";
    gl.canvas.style.pointerEvents = "none";
    root.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 35 });
    camera.position.z = cameraDistance;

    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i += 1) {
      const index = i * 3;

      positions[index] = (Math.random() - 0.5) * particleSpread;
      positions[index + 1] = (Math.random() - 0.5) * particleSpread;
      positions[index + 2] = (Math.random() - 0.5) * particleSpread;
      randoms[i] = Math.random();

      const color = hexToRgb(
        particleColors[Math.floor(Math.random() * particleColors.length)] ?? "#FF981F",
      );

      colors[index] = color[0];
      colors[index + 1] = color[1];
      colors[index + 2] = color[2];
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      aRandom: { size: 1, data: randoms },
      aColor: { size: 3, data: colors },
    });

    const program = new Program(gl, {
      transparent: true,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: speed },
        uSize: { value: particleBaseSize },
        uHover: { value: [-10, -10] },
        uHoverStrength: { value: particleHoverFactor },
        uHoverEnabled: { value: moveParticlesOnHover ? 1 : 0 },
        uDisableRotation: { value: disableRotation ? 1 : 0 },
        uAlphaParticles: { value: alphaParticles ? 1 : 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.5) },
      },
      vertex: `
        attribute float aRandom;
        attribute vec3 aColor;

        uniform float uTime;
        uniform float uSpeed;
        uniform float uSize;
        uniform vec2 uHover;
        uniform float uHoverStrength;
        uniform float uHoverEnabled;
        uniform float uDisableRotation;
        uniform float uPixelRatio;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec3 p = position;
          float t = uTime * uSpeed;

          p.x += sin(t * 0.7 + aRandom * 18.0) * 0.12;
          p.y += cos(t * 0.55 + aRandom * 15.0) * 0.10;
          p.z += sin(t * 0.45 + aRandom * 13.0) * 0.08;

          vec2 delta = p.xy - uHover;
          float distanceToCursor = length(delta);
          float influence = smoothstep(2.2, 0.0, distanceToCursor) * uHoverEnabled;
          vec2 direction = distanceToCursor > 0.001 ? normalize(delta) : vec2(0.0);

          p.xy += direction * influence * 0.75 * uHoverStrength;

          if (uDisableRotation < 0.5) {
            float rotation = t * 0.12;
            float c = cos(rotation);
            float s = sin(rotation);
            p.xy = mat2(c, -s, s, c) * p.xy;
          }

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float depthScale = 1.0 / max(0.5, -mvPosition.z);
          gl_PointSize = uSize * (0.55 + aRandom * 1.1) * depthScale * uPixelRatio;

          vColor = aColor;
          vAlpha = 0.42 + aRandom * 0.58;
        }
      `,
      fragment: `
        precision highp float;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float distanceToCenter = length(uv);
          float soft = 1.0 - smoothstep(0.05, 0.5, distanceToCenter);

          if (soft <= 0.01) discard;

          float glow = pow(soft, 2.2);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
    });

    const mesh = new Mesh(gl, {
      mode: gl.POINTS,
      geometry,
      program,
    });

    const mouse = { x: -10, y: -10, active: false };

    const resize = () => {
      const rect = root.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
    };

    const moveMouse = (event: MouseEvent) => {
      const rect = root.getBoundingClientRect();

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        mouse.active = false;
        return;
      }

      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = 1 - ((event.clientY - rect.top) / rect.height) * 2;

      mouse.x = x * (particleSpread * 0.5);
      mouse.y = y * (particleSpread * 0.5);
      mouse.active = true;
    };

    const leave = () => {
      mouse.active = false;
    };

    let frame = 0;

    const render = (time: number) => {
      program.uniforms.uTime.value = time * 0.001;
      program.uniforms.uHover.value = mouse.active
        ? [mouse.x, mouse.y]
        : [-10, -10];

      renderer.render({
        scene: mesh,
        camera,
      });

      frame = requestAnimationFrame(render);
    };

    resize();
    frame = requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);

    window.addEventListener("mousemove", moveMouse);
    window.addEventListener("mouseleave", leave);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", moveMouse);
      window.removeEventListener("mouseleave", leave);
      gl.canvas.remove();
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
  ]);

  return (
    <div
      ref={rootRef}
      className={`particle-field \${className}`}
      aria-hidden="true"
    />
  );
}
