/**
 * Scroll choreography driven by the page layout itself.
 *
 * Every section that "hosts" the cookie contains an empty anchor element
 * (`<Anchor>` → `[data-cookie]`). The anchor's on-screen box says WHERE the
 * cookie sits and HOW BIG it is; its data-attributes say how it is posed
 * (tilt, turn, split, llaska particles).
 *
 * Each frame we find the two anchors that bracket the viewport centre and
 * blend between their LIVE screen positions. Near the start of a gap the
 * cookie rides along with the first anchor (so it scrolls with the content,
 * as if it lived in the layout), then glides over and lands on the next one.
 * Because everything is read from the DOM, the choreography follows the
 * responsive layout automatically — on a phone the anchors stack and so
 * does the cookie.
 */

const num = (v, d) => (v === undefined || v === '' ? d : parseFloat(v))

export const clamp = (x, a, b) => Math.min(Math.max(x, a), b)
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

let cache = []

export function getAnchors() {
  if (!cache.length || cache.some((a) => !a.el.isConnected)) {
    cache = [...document.querySelectorAll('[data-cookie]')].map((el) => ({ el }))
  }
  // pose params are read live, so sections can steer the cookie (e.g. the
  // process steps turn it as each step becomes active)
  for (const a of cache) {
    const d = a.el.dataset
    a.rx = num(d.rx, 1)
    a.ry = num(d.ry, 0)
    a.split = num(d.split, 0)
    a.leaves = num(d.leaves, 0.35)
    a.size = num(d.size, 1)
  }
  return cache
}

function box(a) {
  const r = a.el.getBoundingClientRect()
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    d: Math.min(r.width, r.height) * a.size,
  }
}

const lerp = (a, b, t) => a + (b - a) * t

/**
 * Returns the cookie's target pose in SCREEN space (px) plus pose params.
 * `travel` is 0 while resting on an anchor and peaks at 1 mid-flight.
 */
export function samplePose(out) {
  const anchors = getAnchors()
  if (!anchors.length) return null
  const mid = window.innerHeight / 2
  const boxes = anchors.map(box)

  // last anchor whose centre has reached (or passed) the viewport centre
  let i = -1
  for (let k = 0; k < boxes.length; k++) if (boxes[k].cy <= mid) i = k

  let a, b, A, B, e
  if (i === -1) {
    a = b = anchors[0]
    A = B = boxes[0]
    e = 0
  } else if (i === anchors.length - 1) {
    a = b = anchors[i]
    A = B = boxes[i]
    e = 0
  } else {
    a = anchors[i]
    b = anchors[i + 1]
    A = boxes[i]
    B = boxes[i + 1]
    const t = clamp((mid - A.cy) / Math.max(B.cy - A.cy, 1), 0, 1)
    // ride with the current anchor for the first stretch, then glide over
    e = smoothstep(0.22, 0.78, t)
  }

  out.cx = lerp(A.cx, B.cx, e)
  out.cy = lerp(A.cy, B.cy, e)
  out.d = lerp(A.d, B.d, e)
  out.rx = lerp(a.rx, b.rx, e)
  out.ry = lerp(a.ry, b.ry, e)
  out.split = lerp(a.split, b.split, e)
  out.leaves = lerp(a.leaves, b.leaves, e)
  out.travel = Math.sin(Math.PI * e)
  return out
}
