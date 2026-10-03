import { useEffect, useRef } from 'react'

/**
 * Scroll-scrubbed statement: words light up one by one as you scroll
 * through the (sticky) section. Purely scroll-driven, so it is always
 * reversible and never runs on its own.
 */
export default function ScrubText({ text, className = '' }) {
  const ref = useRef(null)
  const words = text.split(' ')

  useEffect(() => {
    const el = ref.current
    const section = el.closest('section')
    const spans = [...el.querySelectorAll('.scrub__w')]
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    let raf = 0

    const update = () => {
      raf = 0
      if (reduce.matches) {
        spans.forEach((s) => (s.style.opacity = 1))
        return
      }
      const r = section.getBoundingClientRect()
      const vh = window.innerHeight
      const total = Math.max(r.height - vh, 1)
      const p = Math.min(Math.max((vh * 0.35 - r.top) / total, 0), 1)
      const lit = p * (spans.length + 4)
      spans.forEach((s, i) => {
        const o = Math.min(Math.max(lit - i, 0), 1)
        s.style.opacity = (0.16 + 0.84 * o).toFixed(3)
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <p ref={ref} className={`scrub ${className}`}>
      {words.map((w, i) => (
        <span key={i} className={`scrub__w${w.includes('*') ? ' accent' : ''}`}>
          {w.replace(/\*/g, '')}{' '}
        </span>
      ))}
    </p>
  )
}
