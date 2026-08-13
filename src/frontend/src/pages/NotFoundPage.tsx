import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

type GamePhase = 'idle' | 'playing' | 'gameover'

interface Obstacle {
  x: number
  width: number
  height: number
}

interface GameState {
  phase: GamePhase
  troncodriloY: number
  velocityY: number
  isJumping: boolean
  obstacles: Obstacle[]
  score: number
  highScore: number
  speed: number
  framesUntilNextObstacle: number
}

const CANVAS_HEIGHT = 150
const CANVAS_WIDTH_DESKTOP = 600
const GROUND_Y = CANVAS_HEIGHT - 1
const SPRITE_SIZE = 48
const CHAR_X = 60
const GRAVITY = 0.6
const JUMP_VELOCITY = -12
const OBSTACLE_WIDTH = 20
const OBSTACLE_MIN_HEIGHT = 30
const OBSTACLE_MAX_HEIGHT = 70
const INITIAL_SPEED = 4
const SPEED_INCREMENT = 0.5
const SPEED_INCREMENT_EVERY = 500
const SPAWN_MIN_FRAMES = 60
const SPAWN_MAX_FRAMES = 120
const SPRITE_SRC = '/FaviconFullHD_troncodrilo.png'
const HIGH_SCORE_KEY = 'troncodrilo_highscore'

function loadHighScore(): number {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY)
    return stored ? parseInt(stored, 10) || 0 : 0
  } catch {
    return 0
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch {
    // localStorage no disponible (modo privado, etc.) — no es crítico para el juego
  }
}

function createInitialState(): GameState {
  return {
    phase: 'idle',
    troncodriloY: GROUND_Y - SPRITE_SIZE,
    velocityY: 0,
    isJumping: false,
    obstacles: [],
    score: 0,
    highScore: loadHighScore(),
    speed: INITIAL_SPEED,
    framesUntilNextObstacle: SPAWN_MIN_FRAMES,
  }
}

function randomSpawnInterval(): number {
  return SPAWN_MIN_FRAMES + Math.random() * (SPAWN_MAX_FRAMES - SPAWN_MIN_FRAMES)
}

function randomObstacleHeight(): number {
  return OBSTACLE_MIN_HEIGHT + Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT)
}

function boxesIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

// Colisión con un margen del 20% del sprite para ser generosos con el jugador
// — el rectángulo real del PNG incluye bastante espacio transparente alrededor
// del personaje.
function checkCollision(state: GameState): boolean {
  const inset = SPRITE_SIZE * 0.1
  const charBox = {
    x: CHAR_X + inset,
    y: state.troncodriloY + inset,
    width: SPRITE_SIZE * 0.8,
    height: SPRITE_SIZE * 0.8,
  }
  return state.obstacles.some(o =>
    boxesIntersect(charBox, { x: o.x, y: GROUND_Y - o.height, width: o.width, height: o.height })
  )
}

function jump(state: GameState): void {
  if (state.phase === 'playing' && !state.isJumping) {
    state.velocityY = JUMP_VELOCITY
    state.isJumping = true
  }
}

function update(state: GameState, canvasWidth: number): void {
  if (state.phase !== 'playing') return

  state.velocityY += GRAVITY
  state.troncodriloY += state.velocityY
  const groundLevel = GROUND_Y - SPRITE_SIZE
  if (state.troncodriloY >= groundLevel) {
    state.troncodriloY = groundLevel
    state.velocityY = 0
    state.isJumping = false
  }

  state.speed = INITIAL_SPEED + Math.floor(state.score / SPEED_INCREMENT_EVERY) * SPEED_INCREMENT

  for (const o of state.obstacles) o.x -= state.speed
  state.obstacles = state.obstacles.filter(o => o.x + o.width > 0)

  state.framesUntilNextObstacle -= 1
  if (state.framesUntilNextObstacle <= 0) {
    state.obstacles.push({ x: canvasWidth, width: OBSTACLE_WIDTH, height: randomObstacleHeight() })
    state.framesUntilNextObstacle = randomSpawnInterval()
  }

  if (checkCollision(state)) {
    state.phase = 'gameover'
    if (state.score > state.highScore) {
      state.highScore = state.score
      saveHighScore(state.score)
    }
    return
  }

  state.score += 1
}

function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, state: GameState, sprite: HTMLImageElement): void {
  ctx.fillStyle = '#FAFAF8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = 'rgba(26,26,26,0.2)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, GROUND_Y + 0.5)
  ctx.lineTo(canvas.width, GROUND_Y + 0.5)
  ctx.stroke()

  ctx.fillStyle = '#8B4A2A'
  for (const o of state.obstacles) {
    ctx.fillRect(o.x, GROUND_Y - o.height, o.width, o.height)
  }

  if (sprite.complete && sprite.naturalWidth > 0) {
    ctx.drawImage(sprite, CHAR_X, state.troncodriloY, SPRITE_SIZE, SPRITE_SIZE)
  }
}

export default function NotFoundPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const idleOverlayRef = useRef<HTMLDivElement>(null)
  const gameOverOverlayRef = useRef<HTMLDivElement>(null)
  const finalScoreRef = useRef<HTMLParagraphElement>(null)
  const bestScoreRef = useRef<HTMLParagraphElement>(null)
  const scoreCounterRef = useRef<HTMLDivElement>(null)

  const stateRef = useRef<GameState>(createInitialState())
  const spriteRef = useRef<HTMLImageElement | null>(null)
  const rafRef = useRef<number>(0)

  // Mide el ancho real del contenedor antes de pintar, para que el canvas
  // nazca ya al tamaño correcto (600px desktop / 100% móvil) sin parpadeo.
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    function resize() {
      if (canvas && container) canvas.width = container.clientWidth
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function showOverlay(el: HTMLDivElement | null, visible: boolean) {
    if (el) el.style.display = visible ? 'flex' : 'none'
  }

  function handleAction() {
    const state = stateRef.current
    if (state.phase === 'idle') {
      state.phase = 'playing'
      showOverlay(idleOverlayRef.current, false)
    } else if (state.phase === 'playing') {
      jump(state)
    } else if (state.phase === 'gameover') {
      const highScore = state.highScore
      stateRef.current = createInitialState()
      stateRef.current.highScore = highScore
      stateRef.current.phase = 'playing'
      showOverlay(gameOverOverlayRef.current, false)
    }
  }

  useEffect(() => {
    const sprite = new Image()
    sprite.src = SPRITE_SRC
    spriteRef.current = sprite

    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        handleAction()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    function loop() {
      const canvas = canvasRef.current
      const state = stateRef.current
      const spriteImg = spriteRef.current
      if (canvas && spriteImg) {
        const wasPlaying = state.phase === 'playing'
        update(state, canvas.width)

        if (wasPlaying && state.phase === 'gameover') {
          showOverlay(gameOverOverlayRef.current, true)
          if (finalScoreRef.current) finalScoreRef.current.textContent = `Puntuación: ${String(state.score).padStart(3, '0')}`
          if (bestScoreRef.current) bestScoreRef.current.textContent = `Mejor puntuación: ${String(state.highScore).padStart(3, '0')}`
        }

        const ctx = canvas.getContext('2d')
        if (ctx) render(ctx, canvas, state, spriteImg)

        if (scoreCounterRef.current) {
          scoreCounterRef.current.textContent = `PUNTOS: ${String(state.score).padStart(3, '0')}`
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-dvh bg-canvas flex flex-col items-center justify-center px-4 gap-8 py-12">
      <div className="text-center">
        <h1 className="font-editorial text-8xl text-ink">404</h1>
        <p className="label-caps text-ink/60 mt-3">Esta página se ha perdido en el pantano</p>
        <p className="text-xs text-ink/40 mt-1.5">Pulsa ESPACIO o toca la pantalla para jugar</p>
      </div>

      <div ref={containerRef} className="relative w-full max-w-[600px]">
        <canvas
          ref={canvasRef}
          height={CANVAS_HEIGHT}
          width={CANVAS_WIDTH_DESKTOP}
          onClick={handleAction}
          className="w-full block touch-manipulation cursor-pointer"
          style={{ height: CANVAS_HEIGHT, background: '#FAFAF8' }}
        />

        <div ref={idleOverlayRef} className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="label-caps text-ink/60">Pulsa espacio para empezar</p>
        </div>

        <div
          ref={gameOverOverlayRef}
          className="absolute inset-0 flex-col items-center justify-center gap-1"
          style={{ display: 'none', backgroundColor: 'rgba(250,250,248,0.8)' }}
        >
          <p className="font-editorial text-2xl text-ink">FIN DEL PANTANO</p>
          <p ref={finalScoreRef} className="text-sm text-ink mt-1">Puntuación: 000</p>
          <p ref={bestScoreRef} className="text-xs text-ink/60">Mejor puntuación: 000</p>
          <p className="text-xs text-ink/40 mt-2">ESPACIO o toca para reiniciar</p>
        </div>

        <div
          ref={scoreCounterRef}
          className="absolute top-2 right-3 label-caps text-xs text-ink pointer-events-none"
        >
          PUNTOS: 000
        </div>
      </div>

      <Link to="/" className="btn-secondary">Volver al inicio</Link>
    </div>
  )
}
