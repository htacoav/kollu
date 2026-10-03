import { useEffect, useRef } from 'react'

/**
 * Interactive background — one WebGL2 canvas behind the whole page.
 *
 *  · Every section declares its ground with `data-bg` (and optionally
 *    `data-line`). The shader paints each pixel with the colour of the
 *    section underneath it, so edges stay locked to the layout.
 *  · Over that ground: topographic contour lines of the altiplano that
 *    drift slowly and bend away from the cursor, like a hand in water.
 *  · Moving the pointer drops ripples (lago Titicaca) that ring outward;
 *    a soft light follows the cursor; a fine grain removes the flat look.
 *
 * If WebGL2 is unavailable the CSS section backgrounds stay in place.
 */

const MAX_SECTIONS = 16
const MAX_RIPPLES = 10

const VERT = `#version 300 es
in vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
out vec4 o;
uniform vec2 uRes;        // drawing-buffer px
uniform float uScale;     // css px -> buffer px
uniform float uTime;
uniform float uScroll;    // css px
uniform vec2 uMouse;      // css px (top-left origin)
uniform float uMouseOn;
uniform int uCount;
uniform float uTop[${MAX_SECTIONS}];
uniform vec3 uCol[${MAX_SECTIONS}];
uniform vec4 uLine[${MAX_SECTIONS}];
uniform vec4 uRip[${MAX_RIPPLES}]; // x, y (css px), age (s), strength

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 4; k++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

void main(){
  // css-pixel coordinates, top-left origin
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;

  // which section is under this pixel
  vec3 base = uCol[0];
  vec4 line = uLine[0];
  for (int k = 0; k < ${MAX_SECTIONS}; k++) {
    if (k >= uCount) break;
    if (fc.y >= uTop[k]) { base = uCol[k]; line = uLine[k]; }
  }

  // world space for the pattern: scrolls with the page, but slower (parallax)
  vec2 w = vec2(fc.x, fc.y + uScroll * 0.55) / 520.0;

  // cursor pushes the field away, like a hand in water
  vec2 dm = fc - uMouse;
  float md = length(dm);
  float push = exp(-md * md / (2.0 * 190.0 * 190.0)) * uMouseOn;
  w += (dm / 190.0) * push * 0.2; // smooth lens bulge, no singularity at the centre

  // ripples
  float rip = 0.0;
  for (int k = 0; k < ${MAX_RIPPLES}; k++) {
    vec4 r = uRip[k];
    if (r.w <= 0.0) continue;
    float d = length(fc - r.xy);
    float radius = r.z * 260.0;
    float ring = exp(-pow((d - radius) / 22.0, 2.0));
    rip += ring * r.w * exp(-r.z * 1.6) * sin((d - radius) * 0.12);
  }

  // topographic field
  float t = uTime * 0.025;
  vec2 q = vec2(fbm(w + vec2(t, -t)), fbm(w + vec2(5.2, 1.3) - t));
  float h = fbm(w * 1.2 + q * 1.6) + rip * 0.05;

  // contour lines, anti-aliased with derivatives
  float bands = h * 11.0;
  float fw = fwidth(bands);
  float c = abs(fract(bands) - 0.5);
  float lines = 1.0 - smoothstep(fw * 0.3, fw * 1.5, 0.5 - c);
  // every 5th line a bit stronger
  float dMajor = (0.5 - abs(fract(bands / 5.0) - 0.5)) * 5.0;
  float major = 1.0 - smoothstep(fw * 0.6, fw * 2.6, dMajor);

  vec3 col = base;
  // slow tonal clouds so large fields never look flat
  float cloud = fbm(w * 0.35 + vec2(t * 0.6, 0.0));
  col *= 0.965 + 0.07 * cloud;
  // lines
  float la = line.a * max(lines * 0.7, major * 1.15) * (1.0 + push * 1.2);
  col = mix(col, line.rgb, la);
  // ripple shimmer + cursor light
  col += line.rgb * rip * 0.05;
  col = mix(col, col + vec3(0.06, 0.06, 0.04), push * 0.55);
  // grain
  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * 0.018;

  o = vec4(col, 1.0);
}`

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
function parseLine(str, dark) {
  if (str) {
    const [hex, a] = str.split('/')
    return [...hexToRgb(hex.trim()), parseFloat(a ?? '0.12')]
  }
  return dark ? [...hexToRgb('#9aa884'), 0.26] : [...hexToRgb('#6b7f4e'), 0.22]
}

export default function BackgroundFX() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!gl) return
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
      return s
    }
    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    } catch (e) {
      console.warn('[KOLLU] background disabled:', e)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const U = (n) => gl.getUniformLocation(prog, n)
    const u = {
      res: U('uRes'), scale: U('uScale'), time: U('uTime'), scroll: U('uScroll'),
      mouse: U('uMouse'), mouseOn: U('uMouseOn'), count: U('uCount'),
      top: U('uTop'), col: U('uCol'), line: U('uLine'), rip: U('uRip'),
    }

    document.documentElement.classList.add('has-bgfx')

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    // render below native resolution: the field is soft, this keeps it cheap
    let scale = 1
    const resize = () => {
      scale = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(window.innerWidth * scale)
      canvas.height = Math.round(window.innerHeight * scale)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // sections (re-read when the DOM changes size)
    let sections = []
    const collect = () => {
      sections = [...document.querySelectorAll('[data-bg]')].slice(0, MAX_SECTIONS).map((el) => ({
        el,
        col: hexToRgb(el.dataset.bg),
        line: parseLine(el.dataset.line, el.dataset.theme === 'dark'),
      }))
    }
    collect()

    // pointer + ripples
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: 0, ton: 0 }
    const ripples = []
    let last = { x: 0, y: 0, t: 0 }
    const onMove = (e) => {
      mouse.tx = e.clientX
      mouse.ty = e.clientY
      mouse.ton = 1
      if (mouse.x < -9000) { mouse.x = e.clientX; mouse.y = e.clientY }
      const now = performance.now() / 1000
      const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y)
      if (!reduce.matches && dist > 90 && now - last.t > 0.12) {
        ripples.push({ x: e.clientX, y: e.clientY + window.scrollY, born: now, s: Math.min(dist / 160, 1) })
        if (ripples.length > MAX_RIPPLES) ripples.shift()
        last = { x: e.clientX, y: e.clientY, t: now }
      }
    }
    const onDown = (e) => {
      if (reduce.matches) return
      ripples.push({ x: e.clientX, y: e.clientY + window.scrollY, born: performance.now() / 1000, s: 1.4 })
      if (ripples.length > MAX_RIPPLES) ripples.shift()
    }
    const onLeave = () => (mouse.ton = 0)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    const tops = new Float32Array(MAX_SECTIONS)
    const cols = new Float32Array(MAX_SECTIONS * 3)
    const lines = new Float32Array(MAX_SECTIONS * 4)
    const rip = new Float32Array(MAX_RIPPLES * 4)

    let raf = 0
    let prev = performance.now()
    const start = prev
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      if (sections.some((s) => !s.el.isConnected)) collect()

      const k = 1 - Math.exp(-dt * 8)
      mouse.x += (mouse.tx - mouse.x) * k
      mouse.y += (mouse.ty - mouse.y) * k
      mouse.on += (mouse.ton - mouse.on) * (1 - Math.exp(-dt * 4))

      sections.forEach((s, i) => {
        tops[i] = i === 0 ? -1e5 : s.el.getBoundingClientRect().top
        cols.set(s.col, i * 3)
        lines.set(s.line, i * 4)
      })

      const tSec = (now - start) / 1000
      rip.fill(0)
      const nowS = now / 1000
      ripples.forEach((r, i) => {
        const age = nowS - r.born
        if (age > 2.6) return
        rip.set([r.x, r.y - window.scrollY, age, r.s], i * 4)
      })

      gl.uniform2f(u.res, canvas.width, canvas.height)
      gl.uniform1f(u.scale, scale)
      gl.uniform1f(u.time, reduce.matches ? 0 : tSec)
      gl.uniform1f(u.scroll, window.scrollY)
      gl.uniform2f(u.mouse, mouse.x, mouse.y)
      gl.uniform1f(u.mouseOn, reduce.matches ? 0 : mouse.on)
      gl.uniform1i(u.count, sections.length)
      gl.uniform1fv(u.top, tops)
      gl.uniform3fv(u.col, cols)
      gl.uniform4fv(u.line, lines)
      gl.uniform4fv(u.rip, rip)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
      document.documentElement.classList.remove('has-bgfx')
    }
  }, [])

  return <canvas ref={ref} className="bgfx" aria-hidden="true" />
}
