/**
 * Reserves space in the layout for the 3D cookie and describes its pose
 * there. Cookie.jsx reads these boxes every frame (see lib/choreography.js).
 *
 *  rx     tilt toward the viewer (0 = edge-on, ~1.57 = face-on)
 *  ry     extra turn around its own axis
 *  split  0 = whole, 1 = broken in two
 *  leaves 0..1 amount of floating llaska around it
 *  size   fraction of the box the cookie should fill
 */
export default function Anchor({ className = '', rx = 1, ry = 0, split = 0, leaves = 0.35, size = 1 }) {
  return (
    <div
      className={`anchor ${className}`}
      data-cookie=""
      data-rx={rx}
      data-ry={ry}
      data-split={split}
      data-leaves={leaves}
      data-size={size}
      aria-hidden="true"
    />
  )
}
