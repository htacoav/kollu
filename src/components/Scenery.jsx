import { useMemo } from 'react'

/**
 * Altiplano scenery, drawn as line-art SVG in the brand greens:
 * Andean ridges with snow, the lake, totora reed boats (balsas) and
 * totora reeds. Shapes are generated from a seeded random so they look
 * hand-drawn yet identical on every load.
 *
 * Any element with `data-depth` is moved by useSceneMotion (App.jsx):
 * parallax with scroll, a little sway with the cursor, and `data-drift`
 * slides it sideways as its section scrolls by (boats crossing the lake).
 */

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const W = 1600

/** Jagged Andean ridge: a few dominant peaks plus rock detail. */
function ridge(seed, base, amp, peaks, rough = 1) {
  const r = rng(seed)
  const centers = Array.from({ length: peaks }, (_, i) => ({
    x: ((i + 0.3 + r() * 0.5) / peaks) * W,
    h: amp * (0.55 + r() * 0.45),
    w: 120 + r() * 160,
  }))
  const pts = []
  for (let x = -20; x <= W + 20; x += 14) {
    let y = 0
    for (const c of centers) {
      const d = Math.abs(x - c.x) / c.w
      y = Math.max(y, c.h * Math.max(0, 1 - d) ** 1.25)
    }
    y += (r() - 0.5) * 10 * rough + Math.sin(x * 0.05 + seed) * 4 * rough
    pts.push([x, base - y])
  }
  return { pts, centers }
}

const toPath = (pts, bottom) =>
  `M${pts[0][0]},${bottom} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1][0]},${bottom} Z`
const toLine = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')

/** Snow caps: the ridge above the snow line, closed by a ragged lower edge. */
function snow(pts, line, seed) {
  const r = rng(seed)
  const caps = []
  let cur = null
  for (const p of pts) {
    if (p[1] < line) {
      if (!cur) cur = []
      cur.push(p)
    } else if (cur) {
      if (cur.length > 2) caps.push(cur)
      cur = null
    }
  }
  return caps.map((c) => {
    const top = c.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    // ragged, zig-zag lower edge like snow melting into rock gullies
    const bottom = [...c]
      .reverse()
      .map(([x, y], k) => {
        const tip = k % 2 ? line + 14 + r() * 22 : line - 2 + r() * 6
        return `${x.toFixed(1)},${Math.max(y + 5, tip).toFixed(1)}`
      })
    return 'M' + [...top, ...bottom].join(' L') + ' Z'
  })
}

export function Mountains({ height = 340, layers = 3, seed = 3, snowy = true, className = '' }) {
  const data = useMemo(() => {
    const H = 340
    const conf = [
      { base: 250, amp: 210, peaks: 6, cls: 'm-far', depth: 0.15 },
      { base: 290, amp: 150, peaks: 5, cls: 'm-mid', depth: 0.3 },
      { base: 330, amp: 80, peaks: 7, cls: 'm-near', depth: 0.5 },
    ].slice(3 - layers)
    return conf.map((c, i) => {
      const { pts } = ridge(seed * 31 + i * 7, c.base, c.amp, c.peaks, i === 0 ? 1 : 0.6)
      // inner ridge strokes (contour feel)
      const inner = [0.35, 0.62].map((k) => pts.map(([x, y]) => [x, y + (c.base - y) * k]))
      return {
        ...c,
        d: toPath(pts, H + 4),
        line: toLine(pts),
        inner: inner.map(toLine),
        caps: snowy && i === 0 ? snow(pts, c.base - c.amp * 0.62, seed + i) : [],
      }
    })
  }, [layers, seed, snowy])

  return (
    <div className={`mountains ${className}`} style={{ height }} aria-hidden="true">
      {data.map((l) => (
        <svg key={l.cls} className={`m-layer ${l.cls}`} data-depth={l.depth} viewBox={`0 0 ${W} 344`} preserveAspectRatio="xMidYMax slice">
          <path d={l.d} className="m-fill" />
          {l.inner.map((d, k) => (
            <path key={k} d={d} className="m-contour" />
          ))}
          {l.caps.map((d, k) => (
            <path key={k} d={d} className="m-snow" />
          ))}
          <path d={l.line} className="m-ridge" />
        </svg>
      ))}
    </div>
  )
}

/** Lake surface: dashed wave lines that get denser toward the horizon. */
export function Lake({ rows = 14, seed = 9, className = '' }) {
  const lines = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: rows }, (_, i) => {
      const t = i / (rows - 1)
      const y = 6 + Math.pow(t, 1.7) * 190
      const segs = []
      let x = -40 + r() * 60
      while (x < W + 40) {
        const len = 30 + r() * (60 + t * 160)
        segs.push(`M${x.toFixed(0)},${y.toFixed(1)} q${(len / 2).toFixed(0)},${(-3 - t * 4).toFixed(1)} ${len.toFixed(0)},0`)
        x += len + 20 + r() * (90 - t * 40)
      }
      return { d: segs.join(' '), w: 0.7 + t * 1.0, o: 0.22 + t * 0.4, i }
    })
  }, [rows, seed])
  return (
    <svg className={`lake ${className}`} viewBox={`0 0 ${W} 200`} preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      {lines.map((l) => (
        <path key={l.i} d={l.d} className="lake__line" style={{ strokeWidth: l.w, opacity: l.o, animationDelay: `${-l.i * 0.7}s` }} />
      ))}
    </svg>
  )
}

/** Balsa de totora — Uros reed boat with curled prows and a reed sail. */
export function Balsa({ width = 260, sail = true, className = '', depth = 0.4, drift = 0, flip = false }) {
  const bindings = []
  for (let x = 38; x <= 206; x += 14) {
    const k = (x - 120) / 100
    const top = 64 + k * k * -14
    const bot = 80 - k * k * 10
    bindings.push(`M${x},${top.toFixed(1)} L${x + 2},${bot.toFixed(1)}`)
  }
  return (
    <div className={`balsa ${className}`} data-depth={depth} data-drift={drift} style={{ width }} aria-hidden="true">
      <svg viewBox="0 0 240 120" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
        <g className="balsa__bob">
          {sail && (
            <g className="balsa__sail">
              <path d="M121 66 L121 6" className="b-mast" />
              <path d="M123 10 L162 16 L158 54 L123 58 Z" className="b-sail" />
              {[20, 28, 36, 44, 52].map((y) => (
                <path key={y} d={`M123 ${y} L${161 - (y - 10) * 0.08} ${y + 2}`} className="b-thin" />
              ))}
            </g>
          )}
          {/* hull */}
          <path
            d="M14 60 C 40 86 80 90 120 90 C 165 90 200 86 226 58 C 210 70 175 74 120 74 C 65 74 32 70 14 60 Z"
            className="b-hull"
          />
          <path d="M22 66 C 60 82 180 82 218 64" className="b-thin" />
          {bindings.map((d, i) => (
            <path key={i} d={d} className="b-thin" />
          ))}
          {/* curled prows */}
          <path d="M14 60 C 2 50 2 32 14 28 C 22 26 26 34 20 38" className="b-line" />
          <path d="M226 58 C 240 44 240 20 226 16 C 214 14 212 26 220 28" className="b-line" />
          {/* reflection */}
          <path d="M30 96 C 80 104 160 104 210 96" className="b-ref" />
          <path d="M60 104 C 100 109 140 109 180 104" className="b-ref" />
        </g>
      </svg>
    </div>
  )
}

/** A clump of totora reeds, some with their brown seed heads. */
export function Reeds({ count = 16, seed = 5, height = 220, className = '', depth = 0.25, flip = false }) {
  const stalks = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, (_, i) => {
      const x = 20 + (i / count) * 140 + (r() - 0.5) * 18
      const h = 0.45 + r() * 0.55
      const bend = (r() - 0.35) * 40
      const top = 200 - h * 190
      return {
        d: `M${x.toFixed(1)},200 Q${(x + bend * 0.3).toFixed(1)},${(200 - h * 100).toFixed(1)} ${(x + bend).toFixed(1)},${top.toFixed(1)}`,
        head: r() < 0.45 ? { x: x + bend, y: top + 12, rot: bend * 0.5 } : null,
        w: 1.4 + r() * 1.6,
      }
    })
  }, [count, seed])
  return (
    <div className={`reeds ${className}`} data-depth={depth} style={{ height }} aria-hidden="true">
      <svg viewBox="0 0 180 200" preserveAspectRatio="xMidYMax meet" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
        <g className="reeds__sway">
          {stalks.map((s, i) => (
            <g key={i}>
              <path d={s.d} className="r-stalk" style={{ strokeWidth: s.w }} />
              {s.head && <ellipse cx={s.head.x} cy={s.head.y} rx="3.4" ry="11" className="r-head" transform={`rotate(${s.head.rot} ${s.head.x} ${s.head.y})`} />}
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

/** Absolute, behind-content layer for a section. */
export function Scene({ tone = 'light', className = '', children }) {
  return (
    <div className={`scene scene--${tone} ${className}`} aria-hidden="true">
      {children}
    </div>
  )
}
