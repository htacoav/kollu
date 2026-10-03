import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Environment, Lightformer, useProgress } from '@react-three/drei'
import Cookie from './components/Cookie.jsx'
import BackgroundFX from './components/BackgroundFX.jsx'
import Sections, { WHATSAPP } from './sections/Sections.jsx'

function Lights() {
  return (
    <>
      <hemisphereLight args={['#fffaf0', '#b9b39c', 0.45]} />
      <directionalLight position={[4, 6, 6]} intensity={2.1} color="#fff2dc" />
      <directionalLight position={[-6, 2, -3]} intensity={0.9} color="#c4dc9e" />
      <directionalLight position={[0, -5, 3]} intensity={0.3} color="#e3e8d2" />
      {/* soft studio reflections, built locally (no HDR download) */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.4} position={[0, 4, 5]} scale={[10, 3, 1]} color="#fff4e2" />
        <Lightformer intensity={0.7} position={[-6, 1, 1]} scale={[3, 8, 1]} color="#cfe2ad" />
        <Lightformer intensity={0.5} position={[6, -2, 2]} scale={[4, 4, 1]} color="#ffffff" />
      </Environment>
    </>
  )
}

function Loader({ done }) {
  const { progress } = useProgress()
  return (
    <div className={`loader${done ? ' is-done' : ''}`} aria-hidden={done}>
      <div className="loader__brand">KOLLU</div>
      <div className="loader__bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="loader__fill" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
    </div>
  )
}

const NAV = [
  ['#llaska', 'La llaska'],
  ['#beneficios', 'Por qué'],
  ['#proceso', 'Proceso'],
  ['#origen', 'Origen'],
  ['#comprar', 'Comprar'],
  ['#faq', 'Preguntas'],
]

/** Parallax + cursor sway + sideways drift for every [data-depth] layer. */
function useSceneMotion() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const m = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e) => {
      m.tx = (e.clientX / window.innerWidth) * 2 - 1
      m.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    let els = []
    const collect = () => {
      els = [...document.querySelectorAll('[data-depth]')].map((el) => ({
        el,
        host: el.closest('section, footer') || el.parentElement,
        depth: parseFloat(el.dataset.depth) || 0,
        drift: parseFloat(el.dataset.drift) || 0,
      }))
    }
    collect()
    let raf = 0
    let prev = performance.now()
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      if (reduce.matches) return
      const k = 1 - Math.exp(-dt * 3)
      m.x += (m.tx - m.x) * k
      m.y += (m.ty - m.y) * k
      const vh = window.innerHeight
      for (const it of els) {
        const r = it.host.getBoundingClientRect()
        if (r.bottom < -200 || r.top > vh + 200) continue
        const p = (r.top + r.height / 2 - vh / 2) / vh // 0 when centred
        const tx = m.x * it.depth * 28 - p * it.drift * 420
        const ty = p * it.depth * 90 + m.y * it.depth * 8
        it.el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
}

export default function App() {
  useSceneMotion()
  const [ready, setReady] = useState(false)
  const [navDark, setNavDark] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const onReady = useCallback(() => setReady(true), [])

  // Reveal-on-enter for every [data-reveal] (headlines, cards, rows).
  // Starts only once the cookie is on stage so the hero animates in view.
  useEffect(() => {
    if (!ready) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [ready])

  // Nav material follows the section underneath it.
  useEffect(() => {
    const sections = [...document.querySelectorAll('[data-theme]')]
    let raf = 0
    const update = () => {
      raf = 0
      let dark = false
      for (const s of sections) {
        const r = s.getBoundingClientRect()
        if (r.top <= 28 && r.bottom > 28) {
          dark = s.dataset.theme === 'dark'
          break
        }
      }
      setNavDark(dark)
      setScrolled(window.scrollY > 8)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  return (
    <div className={`app${ready ? ' is-ready' : ''}`}>
      <BackgroundFX />
      <a className="skip" href="#llaska">Saltar al contenido</a>

      <header className={`nav${navDark ? ' is-dark' : ''}${scrolled ? ' is-scrolled' : ''}`}>
        <nav className="nav__inner" aria-label="Principal">
          <a className="nav__brand" href="#top">
            KOLLU<span>.</span>
          </a>
          <ul className="nav__links">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
          <a className="nav__cta" href={WHATSAPP} target="_blank" rel="noreferrer">
            Pedir
          </a>
        </nav>
      </header>

      <main>
        <Sections />
      </main>

      <div className="stage" aria-hidden="true">
        <Canvas
          camera={{ position: [0, 0, 6], fov: 35 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          <AdaptiveDpr pixelated />
          <Suspense fallback={null}>
            <Lights />
            <Cookie onReady={onReady} />
          </Suspense>
        </Canvas>
      </div>

      <Loader done={ready} />
    </div>
  )
}
