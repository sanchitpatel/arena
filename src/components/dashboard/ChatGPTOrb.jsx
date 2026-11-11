import React, { useEffect, useRef, useState } from 'react';
import ArenaAvatar from '../avatars/ArenaAvatar';
import { BootstrapQrCode } from '../icons';

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform float t;
uniform vec2 res;

float hash(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.1));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  // Quintic Hermite curve for buttery C2 continuity (eliminates noise creases)
  f = f * f * f * (f * (f * 6.0 - vec3(15.0)) + vec3(10.0));
  return mix(
    mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

// Buttery 3-octave harmonic waves (strips high-frequency mottled noise)
float fbm(vec3 p){
  return 0.58 * noise(p) + 0.28 * noise(p * 1.9 + vec3(1.7, 4.3, 2.1)) + 0.14 * noise(p * 3.6 + vec3(5.1, 1.2, 8.4));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / (0.5 * min(res.x, res.y));
  float r = length(uv);
  float px = 2.0 / min(res.x, res.y);
  float mask = 1.0 - smoothstep(1.0 - 1.5 * px, 1.0, r);
  if (mask <= 0.0) { gl_FragColor = vec4(0.0); return; }

  // Spherical 3D surface
  float z = sqrt(max(1.0 - r * r, 0.0));
  vec3 n = vec3(uv, z);

  // Slow, serene rotation around sphere
  float c = cos(t * 0.22);
  float s = sin(t * 0.22);
  vec3 p = vec3(c * n.x + s * n.z, n.y, -s * n.x + c * n.z) * 1.25;

  // Broad, silky domain warping
  vec3 w = vec3(
    noise(p * 0.95 + vec3(0.0, t * 0.20, 0.0)),
    noise(p * 0.95 + vec3(3.2, 1.1, 4.5) - vec3(0.0, 0.0, t * 0.18)),
    noise(p * 0.95 + vec3(1.5, 6.7, 2.3) + vec3(t * 0.15, 0.0, 0.0))
  );

  float f = fbm(p + 1.15 * (w - vec3(0.5)));
  f = clamp(f * 1.15 - 0.06 + uv.y * 0.28, 0.0, 1.0);

  // Soothing velvety palette - rich light sky blue with refined white crests
  vec3 deep  = vec3(0.10, 0.48, 0.99); // Soft azure base
  vec3 mid   = vec3(0.24, 0.65, 1.00); // Luminous cyan
  vec3 sky   = vec3(0.62, 0.88, 1.00); // Vibrant light sky blue
  vec3 cream = vec3(0.99, 0.995, 1.00); // Silky cloud white

  // Expanded light sky blue capacity; moderated white coverage
  vec3 col = mix(deep, mid, smoothstep(0.02, 0.38, f));
  col = mix(col, sky, smoothstep(0.22, 0.68, f));
  col = mix(col, cream, smoothstep(0.62, 0.94, f));

  // Soft spherical lighting
  vec3 L = normalize(vec3(-0.4, 0.55, 0.72));
  float diff = dot(n, L) * 0.5 + 0.5;
  col *= mix(0.82, 1.06, diff);
  col += vec3(0.50, 0.78, 1.00) * pow(1.0 - z, 3.2) * 0.20; // Silky rim glow
  col += vec3(1.00) * pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 36.0) * 0.18; // Specular luster

  gl_FragColor = vec4(col * mask, mask);
}
`;

function useOrbGL(canvasRef, speed, onReady) {
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) return;

    const onLost = (e) => e.preventDefault();
    canvas.addEventListener('webglcontextlost', onLost);

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(s));
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uT = gl.getUniformLocation(prog, 't');
    const uRes = gl.getUniformLocation(prog, 'res');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now() + Math.random() * 20000; // each orb gets a unique pattern
    let raf;
    let isFirstFrame = true;
    const loop = (now) => {
      gl.uniform1f(uT, ((now - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (isFirstFrame) {
        isFirstFrame = false;
        if (onReadyRef.current) onReadyRef.current();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
    };
  }, [canvasRef, speed]);
}

export default function ChatGPTOrb({
  orbNumber = 1,
  avatar = '1',
  size = 'w-24 h-24 sm:w-28 sm:h-28',
  speed = 0.65,
  badge = 'avatar',
  onBadgeClick,
}) {
  const canvasRef = useRef(null);
  const [isGlReady, setIsGlReady] = useState(false);
  useOrbGL(canvasRef, speed, () => setIsGlReady(true));

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="pointer-events-none absolute inset-2 -z-10 rounded-full bg-sky-400/40 blur-2xl" />

      <div
        className={`relative ${size} rounded-full`}
        style={{
          boxShadow: '0 14px 36px rgba(2,110,220,0.30)',
        }}
      >
        {/* 3D Fallback Orb (visible on refresh / load, fades out cleanly once WebGL renders) */}
        <div
          className={`absolute inset-0 overflow-hidden rounded-full transition-opacity duration-500 ease-out ${
            isGlReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #bde8ff 25%, #38bdf8 55%, #1c86ff 85%, #0284c7 100%)',
          }}
        >
          {/* Volumetric Soft Depth (no harsh border) */}
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_-8px_-8px_16px_rgba(2,110,220,0.30),inset_6px_6px_12px_rgba(255,255,255,0.6)]" />

          {/* Organic Azure Fluid Mass (Bottom) */}
          <div className="pointer-events-none absolute -bottom-[15%] -left-[10%] h-[75%] w-[120%] rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-transparent blur-lg opacity-80" />

          {/* Luminous Silky Cloud Mass (Top-Right) */}
          <div className="pointer-events-none absolute -top-[12%] -right-[8%] h-[65%] w-[75%] rounded-full bg-gradient-to-b from-white via-sky-100 to-transparent blur-md opacity-80" />

          {/* 3D Specular Curvature Glint (Top-Left) */}
          <div className="pointer-events-none absolute top-[12%] left-[16%] h-[32%] w-[42%] rounded-full bg-gradient-to-br from-white/90 via-white/20 to-transparent blur-[2px] -rotate-12" />
        </div>

        {/* Main WebGL Celestial Orb (fades in seamlessly once compiled and rendering first frame) */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full rounded-full transition-opacity duration-500 ease-out ${
            isGlReady ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-sans text-[11px] sm:text-[12px] -mt-1 font-black uppercase tracking-widest text-sky-950/70">ORB</span>
          <span
            className="font-arena mt-0.5 text-4xl sm:text-4xl font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,40,160,0.6)]"
            style={{ WebkitTextStroke: '1px #a4a4a9ff', paintOrder: 'stroke fill' }}
          >
            {orbNumber}
          </span>
        </div>
      </div>

      {badge && (
        <div
          onClick={onBadgeClick}
          role={onBadgeClick ? 'button' : undefined}
          tabIndex={onBadgeClick ? 0 : undefined}
          className={`absolute z-20 flex items-center justify-center border-2 border-white bg-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-md overflow-hidden transition-all ${
            badge === 'qr'
              ? '-bottom-1 -right-2 sm:-right-1 w-9 h-9 rounded-lg'
              : '-bottom-1 -right-2.5 sm:-right-2 h-10 w-10 sm:h-11 sm:w-11 rounded-full'
          } ${
            onBadgeClick ? 'cursor-pointer active:scale-95 hover:scale-105' : ''
          }`}
          title={badge === 'qr' ? 'My QR Code' : 'Player Avatar'}
        >
          {badge === 'qr' ? (
            <BootstrapQrCode size={25} className="text-zinc-900" />
          ) : avatar ? (
            <ArenaAvatar id={avatar} size="badge" className="w-full h-full" />
          ) : null}
        </div>
      )}
    </div>
  );
}