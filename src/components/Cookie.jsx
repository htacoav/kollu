import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { samplePose, smoothstep } from '../lib/choreography.js'

/* ------------------------------------------------------------------
   Look & shape
   ------------------------------------------------------------------ */
const THICKEN = 2.0 // the scan is thin; make it a chunky, bakery cookie
const CHIPS_TOP = 105
const CHIPS_BOTTOM = 18
const LEAVES = 64
const CRUMBS = 46

const OUTSIDE = {
  center: new THREE.Color('#a8924c'), // golden bake
  light: new THREE.Color('#c4aa63'),
  olive: new THREE.Color('#8e9046'), // llaska tint in the dough
  rim: new THREE.Color('#6a5225'), // browned edge
  under: new THREE.Color('#84693a'),
}
const CHIP_COLORS = ['#4e7a2a', '#668c37', '#3f6224', '#7a9c47', '#33521d'].map((c) => new THREE.Color(c))
const LEAF_COLORS = ['#7d9b4a', '#93ad5c', '#5f7f35', '#a8bd73'].map((c) => new THREE.Color(c))
const CRUMB_COLORS = ['#cbb57a', '#b9a265', '#d8c48c', '#6a9a34'].map((c) => new THREE.Color(c))

/** Irregular break line through the cookie (same formula in GLSL below). */
const crackX = (y, z) =>
  0.07 * Math.sin(z * 6.0 + 1.3) + 0.035 * Math.sin(z * 15.0 + 0.4) + 0.018 * Math.sin(z * 33.0 + y * 12.0)

/** Cheap deterministic random so the cookie looks the same on every load. */
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

/**
 * One half of the cookie. Both halves render the SAME closed mesh; a shader
 * discards everything on the other side of the crack, so together they are
 * seamless. Through the open cut we see the mesh's back faces, which we paint
 * as the crumb interior — a solid-looking break with no extra geometry.
 */
function makeHalfMaterial(side) {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  m.onBeforeCompile = (s) => {
    s.uniforms.uSide = { value: side }
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;')
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vLocal;
        uniform float uSide;
        float crackX(vec3 p){
          return 0.07*sin(p.z*6.0+1.3) + 0.035*sin(p.z*15.0+0.4) + 0.018*sin(p.z*33.0+p.y*12.0);
        }
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }`,
      )
      .replace(
        'void main() {',
        `void main() {
          float cx = crackX(vLocal);
          if (uSide > 0.0 ? vLocal.x > cx : vLocal.x < cx) discard;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (!gl_FrontFacing) {
          vec3 crumb = mix(vec3(0.60,0.48,0.24), vec3(0.50,0.39,0.18), h3(floor(vLocal*90.0)));
          crumb = mix(crumb, vec3(0.10,0.24,0.05), step(0.84, h3(floor(vLocal*34.0))));
          diffuseColor.rgb = crumb;
        }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        if (!gl_FrontFacing) totalEmissiveRadiance += diffuseColor.rgb * 0.22;`,
      )
  }
  m.customProgramCacheKey = () => 'kollu-half-' + side
  return m
}

function useCookieAssets() {
  const { scene } = useGLTF('/cookie.glb')

  return useMemo(() => {
    const rand = rng(7)

    /* ---- geometry: centre, thicken, normalise to radius 1 ---- */
    let found = null
    scene.traverse((o) => {
      if (o.isMesh && !found) found = o.geometry
    })
    const g = found ? found.clone() : new THREE.CylinderGeometry(1, 1, 0.2, 96, 4)
    g.center()
    g.scale(1, THICKEN, 1)
    g.computeBoundingBox()
    const bb = g.boundingBox
    const r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2
    g.scale(1 / r, 1 / r, 1 / r)
    g.computeVertexNormals()
    g.computeBoundingBox()
    const halfT = g.boundingBox.max.y

    /* ---- baked colour: golden-olive centre, browned rim, mottling ---- */
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const rad = Math.hypot(x, z)
      const mottle =
        0.5 + 0.5 * Math.sin(x * 9.1 + z * 4.7) * Math.sin(z * 7.3 - x * 3.1) * 0.8 + (rand() - 0.5) * 0.25
      const tint = 0.5 + 0.5 * Math.sin(x * 4.3 - z * 5.9 + 1.7) * Math.sin(z * 3.7 + x * 2.2)
      c.copy(OUTSIDE.center).lerp(OUTSIDE.light, THREE.MathUtils.clamp(mottle, 0, 1) * 0.6)
      c.lerp(OUTSIDE.olive, tint * 0.55)
      c.lerp(OUTSIDE.rim, smoothstep(0.7, 1.0, rad) * 0.85)
      if (y < 0) c.lerp(OUTSIDE.under, 0.45)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    /* ---- green llaska chips, dropped onto the real surface ---- */
    const probe = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    probe.updateMatrixWorld()
    const ray = new THREE.Raycaster()
    const chipGeo = new THREE.IcosahedronGeometry(1, 1)
    const chipMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 })
    const halves = { L: [], R: [] }
    const up = new THREE.Vector3(0, 1, 0)
    const dummy = new THREE.Object3D()

    const drop = (fromTop) => {
      const a = rand() * Math.PI * 2
      const rr = Math.sqrt(rand()) * 0.86
      const x = Math.cos(a) * rr
      const z = Math.sin(a) * rr
      ray.set(new THREE.Vector3(x, fromTop ? 3 : -3, z), new THREE.Vector3(0, fromTop ? -1 : 1, 0))
      const hit = ray.intersectObject(probe, false)[0]
      if (!hit) return
      const n = hit.face.normal.clone()
      if (fromTop ? n.y < 0 : n.y > 0) n.negate()
      dummy.position.copy(hit.point).addScaledVector(n, -0.009)
      dummy.quaternion.setFromUnitVectors(up, n)
      dummy.rotateY(rand() * Math.PI * 2)
      const s = 0.024 + rand() * 0.02
      dummy.scale.set(s * (1 + rand() * 0.8), s * (0.4 + rand() * 0.2), s * (0.7 + rand() * 0.5))
      dummy.updateMatrix()
      const color = CHIP_COLORS[Math.floor(rand() * CHIP_COLORS.length)]
      const side = hit.point.x < crackX(hit.point.y, hit.point.z) ? 'L' : 'R'
      halves[side].push({ m: dummy.matrix.clone(), color })
    }
    for (let i = 0; i < CHIPS_TOP; i++) drop(true)
    for (let i = 0; i < CHIPS_BOTTOM; i++) drop(false)

    const makeChips = (list) => {
      const im = new THREE.InstancedMesh(chipGeo, chipMat, Math.max(list.length, 1))
      list.forEach((it, k) => {
        im.setMatrixAt(k, it.m)
        im.setColorAt(k, it.color)
      })
      im.count = list.length
      im.frustumCulled = false
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      return im
    }

    /* ---- crumbs that spray out of the break ---- */
    const crumbs = Array.from({ length: CRUMBS }, () => {
      const z = (rand() * 2 - 1) * 0.85
      const y = (rand() * 2 - 1) * halfT * 0.8
      return {
        o: new THREE.Vector3(crackX(y, z), y, z),
        dir: new THREE.Vector3((rand() - 0.5) * 0.7, 0.35 + rand() * 0.9, (rand() - 0.5) * 0.9),
        dist: 0.5 + rand() * 0.9,
        size: 0.012 + rand() * 0.022,
        spin: new THREE.Euler(rand() * 6, rand() * 6, rand() * 6),
        color: CRUMB_COLORS[Math.floor(rand() * CRUMB_COLORS.length)],
      }
    })
    const crumbMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      CRUMBS,
    )
    crumbs.forEach((cr, k) => crumbMesh.setColorAt(k, cr.color))
    crumbMesh.frustumCulled = false

    /* ---- floating llaska leaves ---- */
    const leafShape = new THREE.Shape()
    leafShape.moveTo(0, -1)
    leafShape.quadraticCurveTo(0.6, -0.2, 0, 1)
    leafShape.quadraticCurveTo(-0.6, -0.2, 0, -1)
    const leafMesh = new THREE.InstancedMesh(
      new THREE.ShapeGeometry(leafShape, 6),
      new THREE.MeshStandardMaterial({ roughness: 0.65, side: THREE.DoubleSide }),
      LEAVES,
    )
    leafMesh.frustumCulled = false
    const leaves = Array.from({ length: LEAVES }, (_, k) => {
      leafMesh.setColorAt(k, LEAF_COLORS[k % LEAF_COLORS.length])
      return {
        a: rand() * Math.PI * 2,
        r: 1.3 + rand() * 0.8,
        y: (rand() * 2 - 1) * 0.95,
        speed: (0.06 + rand() * 0.12) * (rand() < 0.5 ? -1 : 1),
        size: 0.06 + rand() * 0.06,
        ph: rand() * Math.PI * 2,
        rs: 0.3 + rand() * 0.7,
      }
    })

    return {
      geometry: g,
      matL: makeHalfMaterial(1),
      matR: makeHalfMaterial(-1),
      chipsL: makeChips(halves.L),
      chipsR: makeChips(halves.R),
      crumbs,
      crumbMesh,
      leaves,
      leafMesh,
    }
  }, [scene])
}

/* ------------------------------------------------------------------
   The cookie
   ------------------------------------------------------------------ */
export default function Cookie({ onReady }) {
  const assets = useCookieAssets()
  const { camera, size } = useThree()

  const root = useRef() // screen position + scale + cursor yaw
  const tilt = useRef() // forward tilt (+ cursor pitch)
  const spin = useRef() // turn around its own axis
  const halfL = useRef()
  const halfR = useRef()

  const pose = useRef({})
  const cur = useRef(null)
  const state = useRef({ spin: 0, t0: null, ready: false })
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const env = useRef({ reduce: false, fine: false })
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fp = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => {
      env.current.reduce = rm.matches
      env.current.fine = fp.matches
    }
    sync()
    rm.addEventListener('change', sync)
    fp.addEventListener('change', sync)
    const move = (e) => {
      pointer.current.tx = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      rm.removeEventListener('change', sync)
      fp.removeEventListener('change', sync)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  useFrame((frame, dt) => {
    const d = Math.min(dt, 1 / 20)
    const { reduce, fine } = env.current
    const st = state.current
    const p = samplePose(pose.current)
    if (!p) return

    /* screen px → world units at z = 0 */
    const wpp = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / size.height
    const target = {
      x: (p.cx - size.width / 2) * wpp,
      y: -(p.cy - size.height / 2) * wpp,
      s: ((p.d * wpp) / 2) * (1 - 0.22 * p.travel),
    }

    /* first frame: snap, then report ready (hides the loader) */
    if (!cur.current) {
      cur.current = { ...target, rx: p.rx, ry: p.ry, split: p.split, leaves: p.leaves }
      st.t0 = frame.clock.elapsedTime
    }
    if (!st.ready) {
      st.ready = true
      onReady?.()
    }

    /* critically-damped follow — tight on position so it stays glued to
       the layout, softer on pose so turns read as physical */
    const c = cur.current
    const D = THREE.MathUtils.damp
    c.x = D(c.x, target.x, 14, d)
    c.y = D(c.y, target.y, 14, d)
    c.s = D(c.s, target.s, 12, d)
    c.rx = D(c.rx, p.rx, 6, d)
    c.ry = D(c.ry, p.ry, 5, d)
    c.split = D(c.split, p.split, 7, d)
    if (c.split < 0.003) c.split = 0
    c.leaves = D(c.leaves, p.leaves, 4, d)

    /* entrance: the cookie rises, grows and settles its spin (≈1.4s) */
    const k = THREE.MathUtils.clamp((frame.clock.elapsedTime - st.t0) / (reduce ? 0.4 : 1.4), 0, 1)
    const intro = 1 - Math.pow(1 - k, 4)

    /* idle spin, locked to a clean angle while the cookie is broken open */
    if (!reduce) st.spin += d * 0.24 * (1 - c.split)
    if (p.split > 0.01) {
      const lock = Math.round(st.spin / (Math.PI * 2)) * Math.PI * 2
      st.spin = D(st.spin, lock, 5 * p.split, d)
    }

    /* cursor tilt (desktop only) */
    const pt = pointer.current
    const follow = fine && !reduce
    pt.x = D(pt.x, follow ? pt.tx : 0, 4, d)
    pt.y = D(pt.y, follow ? pt.ty : 0, 4, d)

    const bob = reduce ? 0 : Math.sin(frame.clock.elapsedTime * 0.8) * 0.035 * c.s

    root.current.position.set(c.x, c.y + bob - (1 - intro) * 0.5 * c.s, 0)
    root.current.scale.setScalar(c.s * (0.6 + 0.4 * intro))
    root.current.rotation.set(0, pt.x * 0.32, 0)
    tilt.current.rotation.set(c.rx + pt.y * 0.2, 0, 0)
    spin.current.rotation.set(0, st.spin + c.ry - (1 - intro) * 2.2, 0)

    /* break open: halves slide apart and swing their broken faces to us */
    const sp = c.split
    halfL.current.position.x = -0.32 * sp
    halfR.current.position.x = 0.32 * sp
    halfL.current.rotation.z = 0.62 * sp
    halfR.current.rotation.z = -0.62 * sp

    /* crumbs only exist while it is breaking */
    const crumbVis = smoothstep(0.03, 0.3, sp) * (1 - smoothstep(0.72, 1, sp))
    const { crumbs, crumbMesh, leaves, leafMesh } = assets
    crumbs.forEach((cr, i) => {
      const t = sp * cr.dist
      dummy.position.copy(cr.o).addScaledVector(cr.dir, t)
      dummy.rotation.set(cr.spin.x + t * 4, cr.spin.y + t * 3, cr.spin.z)
      dummy.scale.setScalar(cr.size * crumbVis + 1e-5)
      dummy.updateMatrix()
      crumbMesh.setMatrixAt(i, dummy.matrix)
    })
    crumbMesh.instanceMatrix.needsUpdate = true

    /* llaska leaves drift around the cookie */
    const time = frame.clock.elapsedTime
    const lv = c.leaves * intro
    leaves.forEach((l, i) => {
      if (!reduce) l.a += l.speed * d
      dummy.position.set(
        Math.cos(l.a) * l.r,
        l.y + (reduce ? 0 : Math.sin(time * 0.6 + l.ph) * 0.08),
        Math.sin(l.a) * l.r * 0.5,
      )
      dummy.rotation.set(time * l.rs * 0.6 + l.ph, l.ph * 2, time * l.rs * 0.4)
      dummy.scale.setScalar(l.size * lv + 1e-5)
      dummy.updateMatrix()
      leafMesh.setMatrixAt(i, dummy.matrix)
    })
    leafMesh.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={root} dispose={null}>
      <group ref={tilt}>
        <group ref={spin}>
          <group ref={halfL}>
            <mesh geometry={assets.geometry} material={assets.matL} />
            <primitive object={assets.chipsL} />
          </group>
          <group ref={halfR}>
            <mesh geometry={assets.geometry} material={assets.matR} />
            <primitive object={assets.chipsR} />
          </group>
          <primitive object={assets.crumbMesh} />
        </group>
      </group>
      <primitive object={assets.leafMesh} />
    </group>
  )
}

useGLTF.preload('/cookie.glb')
