import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { FOIL_LIST, HARDWARE_LIST, LEATHERS } from './catalog'
import type { Configuration, ProductId } from './types'

type CameraViewKey = 'Perspective' | 'Front' | 'Side' | 'Back' | 'Top'

const CAMERA_PRESETS: Record<CameraViewKey, [number, number]> = {
  Perspective: [0.55, 1.25],
  Front: [0, 1.48],
  Side: [Math.PI / 2, 1.48],
  Back: [Math.PI, 1.48],
  Top: [0, 0.2],
}

// Procedural grain canvas cache
const grainCache: Record<string, { colorTex: HTMLCanvasElement; bumpTex: HTMLCanvasElement }> = {}

function getLeatherCanvases(finishType: string) {
  if (grainCache[finishType]) return grainCache[finishType]
  const S = 512
  const bump = document.createElement('canvas')
  bump.width = bump.height = S
  const bc = bump.getContext('2d')!

  bc.fillStyle = '#808080'
  bc.fillRect(0, 0, S, S)

  if (finishType === 'saffiano') {
    const id = bc.createImageData(S, S)
    const d = id.data
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const v = (Math.cos((2 * Math.PI * (x + y)) / 8) + Math.cos((2 * Math.PI * (x - y)) / 8)) / 4 + 0.5
        const o = (y * S + x) * 4
        const val = 40 + v * 180 + (Math.random() - 0.5) * 16
        d[o] = d[o + 1] = d[o + 2] = val
        d[o + 3] = 255
      }
    }
    bc.putImageData(id, 0, 0)
  } else if (finishType === 'pebble') {
    bc.fillStyle = '#3a3a3a'
    bc.fillRect(0, 0, S, S)
    const N = 32
    const sp = S / N
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const cx = (i + 0.5 + (Math.random() - 0.5) * 0.7) * sp
        const cy = (j + 0.5 + (Math.random() - 0.5) * 0.7) * sp
        const r = sp * (0.58 + Math.random() * 0.24)
        for (let ox = -S; ox <= S; ox += S) {
          for (let oy = -S; oy <= S; oy += S) {
            const x2 = cx + ox
            const y2 = cy + oy
            if (x2 < -r || x2 > S + r || y2 < -r || y2 > S + r) continue
            const g = bc.createRadialGradient(x2, y2, 0, x2, y2, r)
            g.addColorStop(0, '#f0f0f0')
            g.addColorStop(0.65, '#999999')
            g.addColorStop(1, '#333333')
            bc.fillStyle = g
            bc.beginPath()
            bc.arc(x2, y2, r, 0, Math.PI * 2)
            bc.fill()
          }
        }
      }
    }
  } else if (finishType === 'pullup' || finishType === 'smooth') {
    // Vegetable tanned pores & soft natural hand
    for (let k = 0; k < 3000; k++) {
      bc.fillStyle = `rgba(35, 35, 35, ${0.2 + Math.random() * 0.35})`
      bc.beginPath()
      bc.arc(Math.random() * S, Math.random() * S, 0.6 + Math.random() * 1.2, 0, Math.PI * 2)
      bc.fill()
    }
    bc.lineWidth = 1
    for (let q = 0; q < 200; q++) {
      const sx = Math.random() * S
      const sy = Math.random() * S
      const a = Math.random() * Math.PI
      const l = 8 + Math.random() * 24
      bc.strokeStyle = Math.random() < 0.5 ? 'rgba(25, 25, 25, 0.24)' : 'rgba(235, 235, 235, 0.2)'
      bc.beginPath()
      bc.moveTo(sx, sy)
      bc.quadraticCurveTo(sx + Math.cos(a + 0.5) * l * 0.5, sy + Math.sin(a + 0.5) * l * 0.5, sx + Math.cos(a) * l, sy + Math.sin(a) * l)
      bc.stroke()
    }
  } else {
    // Suede / soft velour
    const id = bc.createImageData(S, S)
    const d = id.data
    for (let i = 0; i < d.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 36
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
    bc.putImageData(id, 0, 0)
  }

  const col = document.createElement('canvas')
  col.width = col.height = S
  const cc = col.getContext('2d')!
  cc.fillStyle = '#f2ede4'
  cc.fillRect(0, 0, S, S)
  cc.globalAlpha = finishType === 'suede' ? 0.25 : 0.12
  cc.drawImage(bump, 0, 0)

  return (grainCache[finishType] = { colorTex: col, bumpTex: bump })
}

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  const P = Math.PI
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -P / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, P / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, P / 2, P, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, P, P * 1.5, false)
  return s
}

function slab(w: number, h: number, d: number, r: number, b: number, mat: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w - 2 * b, h - 2 * b, Math.max(r - b, 0.01)), {
    depth: Math.max(0.01, d - 2 * b),
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelOffset: 0,
    bevelSegments: 4,
    curveSegments: 14,
  })
  g.translate(0, 0, -(d - 2 * b) / 2)
  const m = new THREE.Mesh(g, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function Product3DViewer({
  config,
  onResetCamera,
}: {
  config: Configuration
  onResetCamera?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [autoTurn, setAutoTurn] = useState(true)
  const [currentView, setCurrentView] = useState<CameraViewKey>('Perspective')
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return true
    try {
      const cv = document.createElement('canvas')
      return !!(window.WebGLRenderingContext && (cv.getContext('webgl') || cv.getContext('experimental-webgl')))
    } catch {
      return false
    }
  })

  // Three.js internal references
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    root: THREE.Group
    productGroup: THREE.Group
    decalMesh: THREE.Mesh | null
    monoCanvas: HTMLCanvasElement
    monoTex: THREE.CanvasTexture
    materials: {
      body: THREE.MeshStandardMaterial
      accent: THREE.MeshStandardMaterial
      lining: THREE.MeshStandardMaterial
      edge: THREE.MeshStandardMaterial
      thread: THREE.MeshStandardMaterial
      hw: THREE.MeshStandardMaterial
      mono: THREE.MeshStandardMaterial
    }
    cur: { az: number; pol: number; dist: number; ty: number }
    goal: { az: number; pol: number; dist: number; ty: number; base: number; zoom: number }
    dragging: boolean
    auto: boolean
  } | null>(null)

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)

    // Studio lighting
    const hemiLight = new THREE.HemisphereLight(0xfffbf2, 0x5a5348, 0.85)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.15)
    keyLight.position.set(5, 9, 7)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.bias = -0.0004
    keyLight.shadow.normalBias = 0.02
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 25
    keyLight.shadow.camera.left = -6
    keyLight.shadow.camera.right = 6
    keyLight.shadow.camera.top = 6
    keyLight.shadow.camera.bottom = -6
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xdde8f5, 0.45)
    fillLight.position.set(-6, 4, -5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0xfff0db, 0.35)
    rimLight.position.set(0, -4, -6)
    scene.add(rimLight)

    // Soft ground shadow plane
    const groundGeo = new THREE.PlaneGeometry(30, 30)
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.24 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const root = new THREE.Group()
    scene.add(root)

    const productGroup = new THREE.Group()
    root.add(productGroup)

    // Materials dictionary
    const materials = {
      body: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
      accent: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
      lining: new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, side: THREE.DoubleSide }),
      edge: new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 }),
      thread: new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 }),
      hw: new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.92 }),
      mono: new THREE.MeshStandardMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        roughness: 0.35,
        metalness: 0.85,
      }),
    }

    const monoCanvas = document.createElement('canvas')
    monoCanvas.width = 1024
    monoCanvas.height = 512
    const monoTex = new THREE.CanvasTexture(monoCanvas)
    materials.mono.map = monoTex

    const cur = { az: 0.55, pol: 1.25, dist: 8.5, ty: 1.4 }
    const goal = { az: 0.55, pol: 1.25, dist: 8.5, ty: 1.4, base: 8.5, zoom: 1 }

    threeRef.current = {
      renderer,
      scene,
      camera,
      root,
      productGroup,
      decalMesh: null,
      monoCanvas,
      monoTex,
      materials,
      cur,
      goal,
      dragging: false,
      auto: true,
    }

    // Pointer events for orbit controls
    const ptr: Record<number, [number, number]> = {}
    let px = 0
    let py = 0
    let pinch = 0

    const stopAutoTurn = () => {
      setAutoTurn(false)
      if (threeRef.current) threeRef.current.auto = false
    }

    const onPointerDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      ptr[e.pointerId] = [e.clientX, e.clientY]
      px = e.clientX
      py = e.clientY
      if (threeRef.current) threeRef.current.dragging = true

      const keys = Object.keys(ptr)
      if (keys.length === 2) {
        pinch = Math.hypot(ptr[Number(keys[0])][0] - ptr[Number(keys[1])][0], ptr[Number(keys[0])][1] - ptr[Number(keys[1])][1])
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!ptr[e.pointerId] || !threeRef.current) return
      ptr[e.pointerId] = [e.clientX, e.clientY]
      const keys = Object.keys(ptr)

      if (keys.length >= 2) {
        const d = Math.hypot(ptr[Number(keys[0])][0] - ptr[Number(keys[1])][0], ptr[Number(keys[0])][1] - ptr[Number(keys[1])][1])
        if (pinch > 0 && d > 0) {
          threeRef.current.goal.zoom = Math.min(1.8, Math.max(0.5, threeRef.current.goal.zoom * (pinch / d)))
        }
        pinch = d
        stopAutoTurn()
        return
      }

      stopAutoTurn()
      const dx = e.clientX - px
      const dy = e.clientY - py
      px = e.clientX
      py = e.clientY

      threeRef.current.goal.az -= dx * 0.008
      threeRef.current.goal.pol = Math.min(1.6, Math.max(0.18, threeRef.current.goal.pol - dy * 0.007))
    }

    const onPointerUp = (e: PointerEvent) => {
      delete ptr[e.pointerId]
      pinch = 0
      if (!Object.keys(ptr).length && threeRef.current) {
        threeRef.current.dragging = false
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!threeRef.current) return
      stopAutoTurn()
      threeRef.current.goal.zoom = Math.min(1.8, Math.max(0.5, threeRef.current.goal.zoom * Math.exp(e.deltaY * 0.0012)))
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!canvas || !threeRef.current) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (!w || !h) return
      threeRef.current.renderer.setSize(w, h, false)
      threeRef.current.camera.aspect = w / h
      threeRef.current.camera.updateProjectionMatrix()
    })
    resizeObserver.observe(container)

    // Animation frame loop
    let animId = 0
    let lastTime = performance.now()

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate)
      const app = threeRef.current
      if (!app) return

      const dt = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      if (app.auto && !app.dragging) {
        app.goal.az += dt * 0.28
      }

      // Smooth camera interpolation
      const smoothFactor = 1 - Math.pow(0.0005, dt)
      app.cur.az += (app.goal.az - app.cur.az) * smoothFactor
      app.cur.pol += (app.goal.pol - app.cur.pol) * smoothFactor
      app.cur.ty += (app.goal.ty - app.cur.ty) * smoothFactor

      const targetDist = app.goal.base * app.goal.zoom
      app.cur.dist += (targetDist - app.cur.dist) * smoothFactor

      const sp = Math.sin(app.cur.pol)
      app.camera.position.set(
        app.cur.dist * sp * Math.sin(app.cur.az),
        app.cur.ty + app.cur.dist * Math.cos(app.cur.pol),
        app.cur.dist * sp * Math.cos(app.cur.az),
      )
      app.camera.lookAt(0, app.cur.ty, 0)

      app.renderer.render(app.scene, app.camera)
    }

    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      renderer.dispose()
      threeRef.current = null
    }
  }, [])

  // Sync autoTurn state to Three.js ref
  useEffect(() => {
    if (threeRef.current) {
      threeRef.current.auto = autoTurn
    }
  }, [autoTurn])

  // Update materials, colors, textures & monogram decal
  const updateMaterialsAndDecal = useCallback(() => {
    const app = threeRef.current
    if (!app) return

    const leather = LEATHERS.find((l) => l.id === config.leatherId) ?? LEATHERS[0]
    const bodyColorHex = leather.colors.find((c) => c.id === config.colorId)?.hex ?? leather.colors[0].hex
    const accentColorHex = leather.colors.find((c) => c.id === config.accentColorId)?.hex ?? leather.colors[1]?.hex ?? bodyColorHex

    const finish = config.leatherFinish ?? (leather.availableFinishes?.[0] ?? 'smooth')
    const canvases = getLeatherCanvases(finish)

    // Bump texture
    const bumpTex = new THREE.CanvasTexture(canvases.bumpTex)
    bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping
    bumpTex.repeat.set(4, 4)

    // Body material
    const M = app.materials
    M.body.color.set(bodyColorHex).convertSRGBToLinear()
    M.body.bumpMap = bumpTex
    M.body.bumpScale = finish === 'pebble' ? 0.12 : finish === 'saffiano' ? 0.09 : 0.05
    M.body.roughness = finish === 'saffiano' ? 0.38 : finish === 'suede' ? 0.95 : 0.6
    M.body.needsUpdate = true

    // Accent material
    M.accent.color.set(accentColorHex).convertSRGBToLinear()
    M.accent.bumpMap = bumpTex
    M.accent.bumpScale = M.body.bumpScale
    M.accent.roughness = M.body.roughness
    M.accent.needsUpdate = true

    // Hardware material
    const hwMatch = HARDWARE_LIST.find((h) => h.id === config.hardware) ?? HARDWARE_LIST[0]
    M.hw.color.set(hwMatch.hex).convertSRGBToLinear()
    M.hw.roughness = config.hardware === 'silver' ? 0.22 : 0.3
    M.hw.metalness = config.hardware === 'black' ? 0.35 : 0.95
    M.hw.needsUpdate = true

    // Edge paint
    const edgeColor = config.edgeColorId === 'black' ? '#111111' : config.edgeColorId === 'natural' ? '#cca777' : '#281a14'
    M.edge.color.set(edgeColor).convertSRGBToLinear()

    // Draw Monogram onto 2D canvas
    const text = config.monogram.trim().toUpperCase()
    const cv = app.monoCanvas
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)

    if (text.length > 0 && app.decalMesh) {
      app.decalMesh.visible = true
      const fontChoice = config.monogramFont ?? 'serif'
      const scaleMul = config.monogramSize === 'L' ? 1.35 : config.monogramSize === 'S' ? 0.72 : 1.0
      const basePx = fontChoice === 'script' ? 240 : fontChoice === 'sans' ? 210 : 230
      const fontSizePx = Math.round(basePx * scaleMul)
      const fontString =
        fontChoice === 'script'
          ? `italic 600 ${fontSizePx}px "Pinyon Script", "Brush Script MT", cursive`
          : fontChoice === 'sans'
            ? `800 ${fontSizePx}px "Instrument Sans", "Manrope", system-ui, sans-serif`
            : `600 ${fontSizePx}px "Newsreader", "Georgia", serif`

      ctx.font = fontString
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const foilMatch = FOIL_LIST.find((f) => f.id === config.monogramMethod) ?? FOIL_LIST[0]
      const cx = cv.width / 2
      const cy = cv.height / 2

      if (foilMatch.stops) {
        // Metallic foil gradient
        const grad = ctx.createLinearGradient(cx - 300, cy - 100, cx + 300, cy + 100)
        foilMatch.stops.forEach((s, idx) => {
          grad.addColorStop(idx / (foilMatch.stops!.length - 1), s)
        })
        ctx.fillStyle = grad
        ctx.fillText(text, cx, cy)

        M.mono.metalness = 0.88
        M.mono.roughness = 0.26
      } else if (config.monogramMethod === 'blind_deboss') {
        // Deboss depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
        ctx.fillText(text, cx + 3, cy + 4)
        ctx.fillStyle = 'rgba(15, 10, 6, 0.65)'
        ctx.fillText(text, cx, cy)

        M.mono.metalness = 0.1
        M.mono.roughness = 0.85
      } else {
        // Emboss
        ctx.fillStyle = 'rgba(10, 8, 5, 0.4)'
        ctx.fillText(text, cx + 2, cy + 3)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
        ctx.fillText(text, cx, cy)

        M.mono.metalness = 0.15
        M.mono.roughness = 0.75
      }

      app.monoTex.needsUpdate = true
    } else if (app.decalMesh) {
      app.decalMesh.visible = false
    }
  }, [
    config.leatherId,
    config.colorId,
    config.accentColorId,
    config.hardware,
    config.leatherFinish,
    config.monogram,
    config.monogramMethod,
    config.monogramFont,
    config.monogramSize,
    config.edgeColorId,
  ])

  // Rebuild 3D model when product architecture changes
  useEffect(() => {
    const app = threeRef.current
    if (!app) return

    // Clean up previous product geometries
    while (app.productGroup.children.length > 0) {
      const child = app.productGroup.children.pop() as THREE.Mesh
      if (child.geometry) child.geometry.dispose()
    }

    const pid = config.productId as ProductId
    const M = app.materials

    // Normalized visual scales
    const W = config.widthCm * 0.08
    const H = config.heightCm * 0.08
    const D = Math.max(0.25, config.depthCm * 0.08)

    let anchorX = 0
    let anchorY = H * 0.4
    let anchorZ = D / 2 + 0.006
    let anchorScale = 0.9

    if (pid === 'tote') {
      // Main Tote Body
      const body = slab(W, H, D, 0.22, 0.1, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Top Edge Rim / Collar
      const rim = roundedShape(W - 0.1, D - 0.1, 0.08)
      rim.holes.push(roundedShape(W - 0.35, D - 0.35, 0.04))
      const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(rim, { depth: 0.03, bevelEnabled: false }), M.edge)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = H
      ring.castShadow = true
      app.productGroup.add(ring)

      // Interior lining
      const lining = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(W - 0.36, D - 0.36, 0.04)), M.lining)
      lining.rotation.x = -Math.PI / 2
      lining.position.y = H - 0.01
      app.productGroup.add(lining)

      // Dual Rolled Handles
      const hr = W * 0.24
      const handleHeight = H * 0.58
      ;[-1, 1].forEach((s) => {
        const pts = [
          [-hr, H * 0.8, (D / 2) * s],
          [-hr * 1.05, H + handleHeight * 0.4, (D / 2) * s],
          [-hr * 0.7, H + handleHeight * 0.9, (D / 2) * s * 0.7],
          [0, H + handleHeight, (D / 2) * s * 0.5],
          [hr * 0.7, H + handleHeight * 0.9, (D / 2) * s * 0.7],
          [hr * 1.05, H + handleHeight * 0.4, (D / 2) * s],
          [hr, H * 0.8, (D / 2) * s],
        ].map((p) => new THREE.Vector3(p[0], p[1], p[2]))

        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.065, 12, false), M.accent)
        tube.castShadow = true
        app.productGroup.add(tube)

        // Handle mount patches & rivets
        ;[-hr, hr].forEach((x) => {
          const patch = slab(0.3, 0.55, 0.06, 0.06, 0.02, M.accent)
          patch.position.set(x, H * 0.82, s * (D / 2 + 0.01))
          app.productGroup.add(patch)

          const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.03, 18), M.hw)
          rivet.rotation.x = Math.PI / 2
          rivet.position.set(x, H * 0.78, s * (D / 2 + 0.045))
          rivet.castShadow = true
          app.productGroup.add(rivet)
        })
      })

      // Center snap fastener
      const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 20), M.hw)
      snap.rotation.x = Math.PI / 2
      snap.position.set(0, H - 0.25, D / 2 + 0.012)
      app.productGroup.add(snap)

      // Shoulder strap if enabled
      if (config.removableStrap) {
        ;[-1, 1].forEach((s) => {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 20), M.hw)
          ring.rotation.y = Math.PI / 2
          ring.position.set(s * (W / 2 + 0.02), H * 0.8, 0)
          app.productGroup.add(ring)
        })
      }

      anchorX = config.monogramPlacement === 'corner' ? W * 0.28 : 0
      anchorY = config.monogramPlacement === 'corner' ? H * 0.25 : H * 0.42
      anchorZ = D / 2 + 0.008
      anchorScale = 1.15
      app.goal.base = Math.max(W, H) * 2.3 + D
      app.goal.ty = H * 0.55
    } else if (pid === 'handbag') {
      // Structured Sculptor Handbag
      const body = slab(W, H, D, 0.35, 0.12, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Envelope front flap
      const flap = slab(W * 0.94, H * 0.55, 0.08, 0.2, 0.02, M.accent)
      flap.position.set(0, H * 0.68, D / 2 + 0.02)
      app.productGroup.add(flap)

      // Metallic turnlock clasp
      const lockBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24), M.hw)
      lockBase.rotation.x = Math.PI / 2
      lockBase.position.set(0, H * 0.42, D / 2 + 0.06)
      app.productGroup.add(lockBase)

      const lockTurn = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.08), M.hw)
      lockTurn.position.set(0, H * 0.42, D / 2 + 0.08)
      app.productGroup.add(lockTurn)

      // Crossbody strap ring mounts
      ;[-1, 1].forEach((s) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 20), M.hw)
        ring.position.set(s * (W / 2 + 0.02), H * 0.75, 0)
        app.productGroup.add(ring)
      })

      anchorX = 0
      anchorY = H * 0.22
      anchorZ = D / 2 + 0.01
      anchorScale = 0.95
      app.goal.base = Math.max(W, H) * 2.5 + D
      app.goal.ty = H * 0.52
    } else if (pid === 'wallet') {
      // Bifold / Snap Wallet
      const bodyBack = slab(W, H, D * 0.4, 0.12, 0.03, M.body)
      bodyBack.position.set(0, H / 2, -D * 0.2)
      app.productGroup.add(bodyBack)

      const bodyFront = slab(W, H, D * 0.4, 0.12, 0.03, M.body)
      bodyFront.position.set(0, H / 2, D * 0.2)
      app.productGroup.add(bodyFront)

      // Interior contrast divider / lining
      const divider = slab(W * 0.95, H * 0.88, 0.02, 0.08, 0.01, M.lining)
      divider.position.set(0, H / 2, 0)
      app.productGroup.add(divider)

      // Snap closure tab
      const tab = slab(W * 0.26, H * 0.45, 0.05, 0.06, 0.015, M.accent)
      tab.position.set(0, H * 0.65, D * 0.42)
      app.productGroup.add(tab)

      const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), M.hw)
      snap.rotation.x = Math.PI / 2
      snap.position.set(0, H * 0.52, D * 0.46)
      app.productGroup.add(snap)

      anchorX = config.monogramPlacement === 'corner' ? W * 0.26 : 0
      anchorY = config.monogramPlacement === 'corner' ? H * 0.22 : H * 0.28
      anchorZ = D * 0.4 + 0.01
      anchorScale = 0.85
      app.goal.base = Math.max(W, H) * 2.8 + D
      app.goal.ty = H * 0.5
    } else if (pid === 'cardholder') {
      // Essential Cardholder
      const body = slab(W, H, D, 0.08, 0.025, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Stepped card pocket front
      const pocket1 = slab(W * 0.92, H * 0.6, 0.04, 0.06, 0.015, M.accent)
      pocket1.position.set(0, H * 0.32, D / 2 + 0.02)
      app.productGroup.add(pocket1)

      const pocket2 = slab(W * 0.88, H * 0.4, 0.03, 0.05, 0.012, M.body)
      pocket2.position.set(0, H * 0.22, D / 2 + 0.04)
      app.productGroup.add(pocket2)

      // Rivets at pocket corners
      ;[-W * 0.4, W * 0.4].forEach((x) => {
        const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), M.hw)
        rivet.rotation.x = Math.PI / 2
        rivet.position.set(x, H * 0.62, D / 2 + 0.03)
        app.productGroup.add(rivet)
      })

      anchorX = 0
      anchorY = H * 0.75
      anchorZ = D / 2 + 0.015
      anchorScale = 0.72
      app.goal.base = Math.max(W, H) * 3.2 + D
      app.goal.ty = H * 0.5
    } else if (pid === 'sleeve') {
      // Tech & Passport Sleeve
      const body = slab(W, H, D, 0.16, 0.05, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Envelope closure flap
      const flap = slab(W * 0.96, H * 0.42, 0.05, 0.14, 0.018, M.accent)
      flap.position.set(0, H * 0.78, D / 2 + 0.02)
      app.productGroup.add(flap)

      // Brass collar stud
      const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 20), M.hw)
      stud.rotation.x = Math.PI / 2
      stud.position.set(0, H * 0.6, D / 2 + 0.05)
      app.productGroup.add(stud)

      anchorX = config.monogramPlacement === 'corner' ? W * 0.32 : 0
      anchorY = config.monogramPlacement === 'corner' ? H * 0.25 : H * 0.32
      anchorZ = D / 2 + 0.01
      anchorScale = 1.05
      app.goal.base = Math.max(W, H) * 2.4 + D
      app.goal.ty = H * 0.52
    } else if (pid === 'toiletry') {
      // Nomad Toiletry Kit / Dopp Bag
      const body = slab(W, H, D, 0.2, 0.08, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Top brass zipper track
      const zipTrack = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.04, 0.08), M.hw)
      zipTrack.position.set(0, H + 0.02, 0)
      app.productGroup.add(zipTrack)

      const zipPull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.03), M.hw)
      zipPull.position.set(W * 0.38, H + 0.04, 0.04)
      app.productGroup.add(zipPull)

      // Grab handle on side
      const handle = slab(0.08, H * 0.5, D * 0.7, 0.05, 0.02, M.accent)
      handle.position.set(-W / 2 - 0.04, H / 2, 0)
      app.productGroup.add(handle)

      anchorX = 0
      anchorY = H * 0.45
      anchorZ = D / 2 + 0.01
      anchorScale = 1.0
      app.goal.base = Math.max(W, H) * 2.6 + D
      app.goal.ty = H * 0.5
    } else {
      // Sunglass Cover (Origami)
      const body = slab(W, H, D, 0.25, 0.06, M.body)
      body.position.y = H / 2
      app.productGroup.add(body)

      // Wrap flap with snap
      const flap = slab(W * 0.85, H * 0.6, 0.04, 0.15, 0.015, M.accent)
      flap.position.set(0, H * 0.62, D / 2 + 0.02)
      app.productGroup.add(flap)

      const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 20), M.hw)
      snap.rotation.x = Math.PI / 2
      snap.position.set(0, H * 0.4, D / 2 + 0.05)
      app.productGroup.add(snap)

      anchorX = 0
      anchorY = H * 0.2
      anchorZ = D / 2 + 0.015
      anchorScale = 0.8
      app.goal.base = Math.max(W, H) * 3.0 + D
      app.goal.ty = H * 0.48
    }

    // Monogram plane decal
    const monoPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), M.mono)
    monoPlane.position.set(anchorX, anchorY, anchorZ)
    const scaleFactor = anchorScale * (config.monogramSize === 'S' ? 0.75 : config.monogramSize === 'L' ? 1.3 : 1.0)
    monoPlane.scale.set(scaleFactor, scaleFactor, 1)
    monoPlane.renderOrder = 3
    app.productGroup.add(monoPlane)
    app.decalMesh = monoPlane

    // Update materials & monogram
    updateMaterialsAndDecal()
  }, [config.productId, config.widthCm, config.heightCm, config.depthCm, config.removableStrap, config.paddedLining, config.monogramPlacement, config.monogramSize, updateMaterialsAndDecal])

  // Trigger material & monogram update whenever config changes
  useEffect(() => {
    updateMaterialsAndDecal()
  }, [updateMaterialsAndDecal])

  // Camera preset handler
  const setCameraView = (view: CameraViewKey) => {
    const app = threeRef.current
    if (!app) return
    setCurrentView(view)
    setAutoTurn(false)
    app.auto = false

    const [az, pol] = CAMERA_PRESETS[view]
    const turns = Math.round((app.goal.az - az) / (Math.PI * 2))
    app.goal.az = az + turns * Math.PI * 2
    app.goal.pol = pol
  }

  const handleZoom = (factor: number) => {
    const app = threeRef.current
    if (!app) return
    setAutoTurn(false)
    app.auto = false
    app.goal.zoom = Math.min(1.8, Math.max(0.5, app.goal.zoom * factor))
  }

  return (
    <div className="studio-3d-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        id="studio-3d-canvas"
        tabIndex={0}
        aria-label="Interactive 3D product view. Drag to rotate, scroll to zoom."
      />

      {!isSupported && (
        <div className="studio-fallback-msg">
          <p>WebGL is not supported on this device. Your bespoke selections and technical specifications remain fully operational.</p>
        </div>
      )}

      {/* Floating 3D Overlays */}
      <div className="stage-top-overlay">
        <div className="view-presets-bar">
          {(['Perspective', 'Front', 'Side', 'Back', 'Top'] as CameraViewKey[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`view-pill ${currentView === v ? 'active' : ''}`}
              onClick={() => setCameraView(v)}
            >
              {v}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`turntable-toggle ${autoTurn ? 'active' : ''}`}
          onClick={() => setAutoTurn((prev) => !prev)}
          title="Toggle Turntable Auto-Rotation"
        >
          <span className="dot" />
          {autoTurn ? 'Auto-turn ON' : 'Turn OFF'}
        </button>
      </div>

      <div className="stage-bottom-overlay">
        <div className="zoom-controls">
          <button type="button" onClick={() => handleZoom(0.85)} title="Zoom In">
            +
          </button>
          <button type="button" onClick={() => handleZoom(1.18)} title="Zoom Out">
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setCameraView('Perspective')
              if (threeRef.current) threeRef.current.goal.zoom = 1
              onResetCamera?.()
            }}
            title="Reset View"
          >
            Reset
          </button>
        </div>

        <div className="drag-hint">
          <span>Drag to orbit · Scroll to zoom</span>
        </div>
      </div>
    </div>
  )
}
export default Product3DViewer
