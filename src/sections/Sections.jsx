import { useEffect, useRef, useState } from 'react'
import Words from '../components/Words.jsx'
import ScrubText from '../components/ScrubText.jsx'
import Anchor from '../components/Anchor.jsx'
import { Scene, Mountains, Lake, Balsa, Reeds } from '../components/Scenery.jsx'

// TODO: pon aquí el número real: https://wa.me/51XXXXXXXXX?text=...
export const WHATSAPP = 'https://wa.me/?text=Hola%20KOLLU%2C%20quiero%20probar%20las%20galletas%20de%20llaska'
const EMAIL = 'hola@kollu.pe' // placeholder

const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)
const I = {
  waves: (
    <>
      <path d="M2 10c3-4 6-4 10 0s7 4 10 0" />
      <path d="M2 17c3-4 6-4 10 0s7 4 10 0" />
    </>
  ),
  box: <path d="M3 8l9-5 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8" />,
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  campus: <path d="M3 10l9-6 9 6M5 10v9h14v-9M9 19v-5h6v5" />,
  bag: <path d="M4 9h16l-1 11H5L4 9zM8 9V6a4 4 0 0 1 8 0v3" />,
  kiosk: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M3 9l2-5h14l2 5" />
    </>
  ),
  chat: <path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
}

const PLACES = ['Llachón', 'Ccotos', 'Hilata', 'Capachica', 'Lago Titicaca']

const STEPS = [
  ['Cosecha manual', 'Recolectamos la llaska a mano en el litoral del lago, en aguas claras y poco profundas.'],
  ['Lavado y secado', 'Se limpia con cuidado y se seca para conservar sus nutrientes.'],
  ['Harina de llaska', 'La molemos hasta obtener una harina fina que se une al camote.'],
  ['Horneado y empaque', 'Se amasa, se hornea y se empaca lista para llevar, sin refrigeración.'],
]

const FAQ = [
  ['¿Qué es la llaska?', 'Un alga verde (Cladophora crispata) que crece sobre las rocas del lago Titicaca. Ha sido alimento de las comunidades del lago y aporta entre 10 y 20 % de proteína.'],
  ['¿A qué sabe la galleta?', '[Describir el sabor según los resultados de la degustación.]'],
  ['¿Necesita refrigeración?', 'No. Viene empacada y lista para llevar en la mochila. [Vida útil: N días]'],
  ['¿Cómo hago un pedido?', 'Escríbenos por WhatsApp o déjanos tu correo y te avisamos de las degustaciones y del lanzamiento en la UNA Puno.'],
]

function Notify() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const submit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent('Quiero enterarme del lanzamiento de KOLLU')
    const body = encodeURIComponent(`Hola, avísenme del lanzamiento. Mi correo: ${email}`)
    window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`
    setSent(true)
  }
  return (
    <form className="notify" onSubmit={submit}>
      <label htmlFor="notify-email">O déjanos tu correo para el lanzamiento</label>
      <div className="notify__row">
        <input id="notify-email" type="email" required autoComplete="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" className="btn btn--line">Avísame</button>
      </div>
      <p className="notify__status" role="status">
        {sent ? 'Abrimos tu app de correo para enviar la solicitud.' : ''}
      </p>
    </form>
  )
}

/** The step nearest the viewport centre is active; the cookie turns a
 *  quarter per step and tilts a little, so it "shows" each stage. */
function useActiveStep() {
  const stepsRef = useRef(null)
  const [active, setActive] = useState(0)
  useEffect(() => {
    const list = stepsRef.current
    const anchor = list.closest('section').querySelector('[data-cookie]')
    let raf = 0
    let cur = -1
    const update = () => {
      raf = 0
      const mid = window.innerHeight / 2
      let best = 0
      let bestD = Infinity
      ;[...list.children].forEach((li, i) => {
        const r = li.getBoundingClientRect()
        const d = Math.abs(r.top + r.height / 2 - mid)
        if (d < bestD) { bestD = d; best = i }
      })
      if (best !== cur) {
        cur = best
        setActive(best)
        anchor.dataset.ry = String(1.4 + best * (Math.PI / 2))
        anchor.dataset.rx = String([1.05, 0.7, 1.35, 0.9][best] ?? 1)
        anchor.dataset.split = best === 2 ? '0.35' : '0'
        anchor.dataset.leaves = best === 0 ? '0.8' : '0.3'
      }
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])
  return { stepsRef, active }
}

export default function Sections() {
  const { stepsRef, active } = useActiveStep()
  return (
    <>
      {/* 1 · HERO ------------------------------------------------------ */}
      <section className="sec hero" id="top" data-theme="light" data-bg="#ece7db">
        <Scene tone="light" className="scene--hero">
          <Mountains height={360} layers={3} seed={3} />
        </Scene>
        <div className="hero__copy">
          <p className="eyebrow fade" data-reveal>Galletas funcionales de llaska con camote</p>
          <Words as="h1" className="display" text={'Proteína andina\ndel *Titicaca.*'} />
          <p className="lead fade" data-reveal style={{ '--d': '320ms' }}>
            Alga llaska del lago y camote del altiplano, horneados en una galleta para tu jornada.
          </p>
          <div className="cta-row fade" data-reveal style={{ '--d': '420ms' }}>
            <a className="btn btn--primary" href={WHATSAPP} target="_blank" rel="noreferrer">Quiero probarla</a>
            <a className="btn btn--link" href="#llaska">
              Conoce la llaska <Icon d={I.arrow} size={16} />
            </a>
          </div>
        </div>
        <Anchor className="hero__anchor" rx={0.62} leaves={0.4} />
        <ul className="trust fade" data-reveal style={{ '--d': '560ms' }}>
          <li><Icon d={I.waves} />Llaska del lago Titicaca</li>
          <li><Icon d={I.box} />Sin refrigeración</li>
          <li><Icon d={I.pin} />Hecha en Puno</li>
        </ul>
      </section>

      {/* 2 · COMMUNITIES MARQUEE --------------------------------------- */}
      <div className="marquee" data-theme="dark" data-bg="#2c3a2a" aria-label="Comunidades del lago: Llachón, Ccotos, Hilata, Capachica">
        <div className="marquee__track" aria-hidden="true">
          {[0, 1].map((k) => (
            <div className="marquee__set" key={k}>
              {PLACES.map((p) => (
                <span key={p}>
                  {p}
                  <i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 3 · STATEMENT (scroll-scrubbed) -------------------------------- */}
      <section className="sec statement" data-theme="light" data-bg="#f6f3ec">
        <div className="statement__sticky">
          <div className="statement__inner">
            <ScrubText text="Un alga ancestral del *lago* *Titicaca,* cosechada a mano, molida en harina y horneada con camote. Proteína andina en cada mordida." />
            <Anchor className="statement__anchor" rx={1.2} ry={0.7} leaves={0.6} />
          </div>
        </div>
      </section>

      {/* 4 · INGREDIENTS (the cookie breaks open) ----------------------- */}
      <section className="sec ingredients" id="llaska" data-theme="light" data-bg="#f6f3ec" data-line="#6b7f4e/0.22">
        <Scene tone="light">
          <Reeds className="reeds--bl" count={18} seed={11} height={170} />
          <Reeds className="reeds--br" count={14} seed={23} height={150} flip />
        </Scene>
        <header className="head head--center">
          <p className="eyebrow fade" data-reveal>01 · Los ingredientes</p>
          <Words className="h1" text={'Dos tesoros del altiplano.\nUna sola galleta.'} />
        </header>
        <div className="ingredients__grid">
          <article className="ing fade" data-reveal>
            <p className="ing__kicker">Por dentro · 01</p>
            <h3 className="h2">Llaska</h3>
            <p className="ing__latin">Cladophora crispata</p>
            <p className="ing__big"><span>10–20 %</span> de proteína</p>
            <p className="body">
              Alga verde que crece sobre las rocas del Titicaca, en aguas claras y poco profundas. Alimento histórico de las comunidades del lago, con aminoácidos esenciales.
            </p>
            <ul className="chips">
              <li>Histidina</li><li>Lisina</li><li>Valina</li><li>Leucina</li><li>Antioxidante</li>
            </ul>
            <p className="sources">Messyasz et al., 2015; Pikosz et al., 2019.</p>
          </article>
          <Anchor className="ingredients__anchor" rx={1.38} split={1} leaves={0.55} size={0.62} />
          <article className="ing ing--right fade" data-reveal style={{ '--d': '120ms' }}>
            <p className="ing__kicker">Por dentro · 02</p>
            <h3 className="h2">Camote</h3>
            <p className="ing__latin">Ipomoea batatas</p>
            <p className="ing__big ing__big--warm"><span>Dulzor</span> natural</p>
            <p className="body">
              Le da a la masa su dulzor y una textura suave, para disfrutarla sin depender de azúcares añadidos. [Confirmar con la ficha técnica.]
            </p>
            <ul className="chips chips--warm">
              <li>Dulzor natural</li><li>Energía</li><li>Textura suave</li>
            </ul>
          </article>
        </div>
      </section>

      {/* 5 · WHY IT MATTERS (dark) -------------------------------------- */}
      <section className="sec why on-dark" id="beneficios" data-theme="dark" data-bg="#2c3a2a">
        <Scene tone="dark">
          <Mountains height={260} layers={2} seed={8} />
        </Scene>
        <div className="two-col">
          <div className="why__copy">
            <p className="eyebrow fade" data-reveal>02 · Por qué importa</p>
            <Words className="h1" text={'Pensada para la región\ncon más anemia del Perú.'} />
            <p className="body fade" data-reveal style={{ '--d': '200ms' }}>
              Sumar harina de llaska a una galleta eleva su proteína. Un aporte funcional para el día a día, no un lujo premium.
            </p>
            <dl className="stats">
              <div className="stat fade" data-reveal style={{ '--d': '0ms' }}>
                <dt>70,7 %</dt>
                <dd>de anemia infantil en menores de 3 años en Puno <span>ENDES 2024 · INEI</span></dd>
              </div>
              <div className="stat fade" data-reveal style={{ '--d': '80ms' }}>
                <dt className="accent">+7,4 %</dt>
                <dd>de proteína al incorporar harina de llaska <span>Aguilar, 2008 · UNA Puno</span></dd>
              </div>
              <div className="stat fade" data-reveal style={{ '--d': '160ms' }}>
                <dt>18 160</dt>
                <dd>estudiantes en la UNA Puno, nuestro primer mercado <span>UNA Puno</span></dd>
              </div>
            </dl>
          </div>
          <Anchor className="why__anchor" rx={0.8} ry={-0.6} leaves={0.2} />
        </div>
      </section>

      {/* 6 · PROCESS (cookie pinned while steps scroll) ----------------- */}
      <section className="sec process" id="proceso" data-theme="light" data-bg="#ece7db">
        <div className="process__grid">
          <div className="process__pin">
            <Anchor className="process__anchor" rx={1.05} ry={1.4} leaves={0.3} />
            <ol className="process__dots" aria-hidden="true">
              {STEPS.map(([t], i) => (
                <li key={t} className={i === active ? 'is-on' : ''} />
              ))}
            </ol>
          </div>
          <div className="process__steps">
            <header className="head">
              <p className="eyebrow fade" data-reveal>03 · Del lago al horno</p>
              <Words className="h1" text={'Proceso honesto,\nreceta estudiada.'} />
              <p className="body fade" data-reveal style={{ '--d': '200ms' }}>
                Receta base desarrollada a partir de una tesis de maestría de la UNA Puno (Aguilar, 2008).
              </p>
            </header>
            <ol className="steps" ref={stepsRef}>
              {STEPS.map(([t, d], i) => (
                <li className={`step fade${i === active ? ' is-active' : ''}`} data-reveal key={t}>
                  <span className="step__n">{String(i + 1).padStart(2, '0')}</span>
                  <div className="step__txt">
                    <h3 className="h3">{t}</h3>
                    <p className="body">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 7 · ORIGIN (dark lake) ----------------------------------------- */}
      <section className="sec origin on-dark" id="origen" data-theme="dark" data-bg="#1c2822" data-line="#9aa884/0.36">
        <Scene tone="dark" className="scene--lake">
          <div className="lakescape">
            <Mountains height={230} layers={2} seed={14} />
            <Lake rows={16} seed={4} />
            <Balsa className="balsa--a" width={300} depth={0.5} drift={0.5} />
            <Balsa className="balsa--b" width={150} depth={0.25} drift={-0.3} sail={false} flip />
            <Reeds className="reeds--bl" count={20} seed={31} height={300} depth={0.6} />
            <Reeds className="reeds--br" count={16} seed={47} height={240} depth={0.55} flip />
          </div>
        </Scene>
        <header className="head head--center">
          <p className="eyebrow fade" data-reveal>04 · Origen verificable</p>
          <Words className="h1" text={'Del lago Titicaca\na tu mano.'} />
        </header>
        <Anchor className="origin__anchor" rx={1.5} leaves={1} />
        <p className="lead center fade" data-reveal>
          La llaska es genuinamente local: crece en las riberas del lago. Cada galleta rescata un alimento del altiplano y lo devuelve a su gente.
        </p>
        <ul className="places">
          {PLACES.slice(0, 4).map((p, i) => (
            <li key={p} className="fade" data-reveal style={{ '--d': `${i * 70}ms` }}>{p}</li>
          ))}
        </ul>
      </section>

      {/* 8 · SHOP / WHERE ----------------------------------------------- */}
      <section className="sec shop" id="comprar" data-theme="light" data-bg="#e6e0d1">
        <div className="head head--row">
          <div>
            <p className="eyebrow fade" data-reveal>05 · Accesible, a propósito</p>
            <Words className="h1" text={'Nutrición que sí\nllega a su gente.'} />
          </div>
          <p className="body fade" data-reveal style={{ '--d': '200ms' }}>
            El mercado local es 87,9 % NSE D-E (APEIM, 2020). Por eso KOLLU es un snack de bajo costo, en el campus, bodegas y kioscos.
          </p>
        </div>
        <div className="shop__grid">
          <article className="card fade" data-reveal>
            <div className="ph">[Foto o render: empaque individual]</div>
            <div className="card__row"><h3 className="h3">Pack individual</h3><span className="price">S/ [PRECIO]</span></div>
            <p className="body">[N] galletas · para el recreo o la clase</p>
          </article>
          <article className="card card--feature on-dark fade" data-reveal style={{ '--d': '90ms' }}>
            <span className="badge">Más pedido</span>
            <Anchor className="shop__anchor" rx={0.9} ry={0.3} leaves={0.25} size={0.86} />
            <div className="card__row"><h3 className="h3">Pack semanal</h3><span className="price">S/ [PRECIO]</span></div>
            <p className="body">[N] paquetes · tu semana de clases cubierta</p>
          </article>
          <article className="card fade" data-reveal style={{ '--d': '180ms' }}>
            <h3 className="h3">Dónde encontrarnos</h3>
            <ul className="where">
              <li><Icon d={I.campus} size={22} /><span><strong>Campus UNA Puno</strong>[Punto de venta y horario]</span></li>
              <li><Icon d={I.bag} size={22} /><span><strong>Bodegas de barrio</strong>[Zonas de Puno]</span></li>
              <li><Icon d={I.kiosk} size={22} /><span><strong>Kioscos</strong>[Ubicaciones]</span></li>
            </ul>
          </article>
        </div>
      </section>

      {/* 9 · FAQ --------------------------------------------------------- */}
      <section className="sec faq" id="faq" data-theme="light" data-bg="#ece7db">
        <Scene tone="light">
          <Reeds className="reeds--br" count={12} seed={61} height={200} flip />
        </Scene>
        <div className="faq__grid">
          <header className="head">
            <p className="eyebrow fade" data-reveal>06 · Preguntas</p>
            <Words className="h1" text={'Lo que nos\nsuelen preguntar.'} />
          </header>
          <div className="faq__list">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="fade" data-reveal style={{ '--d': `${i * 60}ms` }} open={i === 0}>
                <summary>
                  {q}
                  <span className="faq__plus" aria-hidden="true" />
                </summary>
                <p className="body">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 10 · CTA -------------------------------------------------------- */}
      <section className="sec cta on-dark" id="contacto" data-theme="dark" data-bg="#223027" data-line="#c9d6a8/0.26">
        <Scene tone="dark" className="scene--lake">
          <div className="lakescape lakescape--low">
            <Mountains height={180} layers={2} seed={21} />
            <Lake rows={12} seed={12} />
            <Balsa className="balsa--cross" width={220} depth={0.45} drift={1.4} />
            <Reeds className="reeds--bl" count={14} seed={71} height={220} depth={0.6} />
          </div>
        </Scene>
        <Anchor className="cta__anchor" rx={1.1} leaves={0.7} />
        <div className="cta__copy">
          <p className="eyebrow fade" data-reveal>Sé de los primeros</p>
          <Words className="display" text={'Prueba *KOLLU.*'} />
          <p className="lead fade" data-reveal style={{ '--d': '200ms' }}>
            Degustación y primeros pedidos en la UNA Puno. Escríbenos y te avisamos del lanzamiento.
          </p>
          <div className="cta__actions fade" data-reveal style={{ '--d': '300ms' }}>
            <a className="btn btn--primary btn--lg" href={WHATSAPP} target="_blank" rel="noreferrer">
              <Icon d={I.chat} /> Pedir por WhatsApp
            </a>
            <Notify />
          </div>
        </div>
      </section>

      {/* 11 · FOOTER ----------------------------------------------------- */}
      <footer className="footer" data-theme="light" data-bg="#ece7db">
        <Scene tone="light">
          <Mountains height={150} layers={1} seed={5} snowy={false} />
        </Scene>
        <div className="footer__top">
          <div>
            <a className="footer__brand" href="#top">KOLLU<span>.</span></a>
            <p>Galletas de llaska con camote · Puno, Perú · Proyecto en validación.</p>
          </div>
          <ul className="footer__links">
            <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
            <li><a href="#">[Instagram]</a></li>
            <li><a href="#">[TikTok]</a></li>
          </ul>
        </div>
        <p className="footer__fine">
          Datos: ENDES 2024 (INEI), APEIM 2020, Scientia Agropecuaria 2021, Aguilar (2008), UNA Puno.
        </p>
      </footer>
    </>
  )
}
