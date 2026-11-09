import React, { useEffect, useRef } from 'react';

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `
precision highp float;
uniform float t;
uniform vec2 res;

float hash(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f*f*(3. - 2.*f);
  return mix(
    mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p){
  float a = .5, s = 0.;
  for(int i=0;i<5;i++){ s += a*noise(p); p = p*2.03 + vec3(1.7,9.2,3.1); a *= .5; }
  return s;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - .5*res) / (.5*min(res.x,res.y));
  float r = length(uv);
  float px = 2. / min(res.x,res.y);
  float mask = 1. - smoothstep(1. - 1.5*px, 1., r);
  if(mask <= 0.){ gl_FragColor = vec4(0.); return; }

  // point on sphere surface, rotated over time => fog drifts around inside
  float z = sqrt(max(1. - r*r, 0.));
  vec3 n = vec3(uv, z);
  float c = cos(t*.35), s = sin(t*.35);
  vec3 p = vec3(c*n.x + s*n.z, n.y, -s*n.x + c*n.z) * 1.5;

  // domain warp = organic, non-repeating swirls
  vec3 w = vec3(
    fbm(p + vec3(0., t*.45, 0.)),
    fbm(p + vec3(5.2, 1.3, 2.8) - t*.38),
    fbm(p + vec3(2.1, 7.7, 4.4) + t*.30));
  float f = fbm(p + 2.4*(w - .5));
  f = clamp(f*1.35 - .12 + uv.y*.30, 0., 1.);   // bias: bright top, deep blue bottom

  vec3 deep  = vec3(0.02, 0.36, 1.00);
  vec3 mid   = vec3(0.17, 0.60, 1.00);
  vec3 sky   = vec3(0.62, 0.88, 1.00);
  vec3 cream = vec3(1.00, 0.99, 0.94);

  vec3 col = mix(deep, mid, smoothstep(.15, .45, f));
  col = mix(col, sky,   smoothstep(.42, .68, f));
  col = mix(col, cream, smoothstep(.66, .92, f));

  // 3D shading
  vec3 L = normalize(vec3(-.45, .6, .65));
  float diff = dot(n, L)*.5 + .5;
  col *= mix(.78, 1.06, diff);                                  // soft light/dark sides
  col += vec3(.55,.8,1.) * pow(1. - z, 3.) * .22;               // faint fresnel glow at edge
  col += vec3(1.) * pow(max(dot(n, normalize(L + vec3(0,0,1))), 0.), 40.) * .22; // soft specular

  gl_FragColor = vec4(col*mask, mask);
}
`;

function useOrbGL(canvasRef, speed) {
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
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
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
    const loop = (now) => {
      gl.uniform1f(uT, ((now - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

export default function ChatGPTOrb({ orbNumber = 1, avatar = '⚡', size = 'w-28 h-28', speed = 0.45 }) {
  const canvasRef = useRef(null);
  useOrbGL(canvasRef, speed);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <div className="pointer-events-none absolute inset-2 -z-10 rounded-full bg-sky-400/40 blur-2xl" />

      <div
        className={`relative ${size} overflow-hidden rounded-full`}
        style={{
          boxShadow: '0 14px 36px rgba(2,110,220,0.30)',
          background: 'linear-gradient(180deg,#d8f3ff,#2c98ff 70%,#0a6cff)',
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-full" />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center pointer-events-none">
          <span className="font-arena text-[10px] font-black uppercase tracking-widest text-sky-950/70">ORB</span>
          <span className="font-arena mt-0.5 text-3xl font-black leading-none tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,40,160,0.6)] sm:text-[34px]">
            {orbNumber}
          </span>
        </div>
      </div>

      {avatar && (
        <div className="absolute -bottom-1 -right-1 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/90 text-sm shadow-[0_4px_12px_rgba(0,0,0,0.18)] backdrop-blur-md">
          {avatar}
        </div>
      )}
    </div>
  );
}