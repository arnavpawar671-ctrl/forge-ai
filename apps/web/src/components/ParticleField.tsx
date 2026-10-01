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

const DEFAULT_COLORS = ["#FF981F", "#FFAA3D", "#D96F0B"];

function hexToRgb(hex: string): RGB {
  const normalized = hex.replace(/^#/, "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
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
    pos.z *= 10.0;

    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    float t = uTime;

    modelPosition.x += sin(t * aRandom.z + 6.28 * aRandom.w)
      * mix(0.1, 1.5, aRandom.x);
    modelPosition.y += sin(t * aRandom.y + 6.28 * aRandom.x)
      * mix(0.1, 1.5, aRandom.w);
    modelPosition.z += sin(t * aRandom.w + 6.28 * aRandom.y)
      * mix(0.1, 1.5, aRandom.z);

    vec4 viewPosition = viewMatrix * modelPosition;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize =
        (uBaseSize * (1.0 + uSizeRandomness * (aRandom.x - 0.5)))
        / max(1.0, length(viewPosition.xyz));
    }

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
    vec2 uv = gl_PointCoord;
    float distanceFromCenter = length(uv - vec2(0.5));

    if (uAlphaParticles < 0.5) {
      if (distanceFromCenter > 0.5) discard;

      gl_FragColor = vec4(
        vColor + 0.12 * sin(uv.yxx + uTime + vRandom.y * 6.28),
        1.0
      );
    } else {
      float alpha = smoothstep(0.5, 0.38, distanceFromCenter) * 0.72;

      gl_FragColor = vec4(
        vColor + 0.12 * sin(uv.yxx + uTime + vRandom.y * 6.28),
        alpha
      );
    }
  }
`;

export function ParticleField({
  className = "",
  particleCount = 200,
  particleColors = DEFAULT_COLORS,
  particleSpread = 10,
  speed = 0.1,
  moveParticlesOnHover = true,
  particleHoverFactor = 1.15,
  disableRotation = false,
  particleBaseSize = 85,
  sizeRandomness = 1,
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
    gl.canvas.style.pointerEvents = "none";
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, cameraDistance);

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;

      renderer.setSize(width, height);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
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

      randoms.set(
        [Math.random(), Math.random(), Math.random(), Math.random()],
        i * 4,
      );

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
    });

    const particles = new Mesh(gl, {
      mode: gl.POINTS,
      geometry,
      program,
    });

    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
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
        particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
        particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
        particles.rotation.z += 0.01 * speed;
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
