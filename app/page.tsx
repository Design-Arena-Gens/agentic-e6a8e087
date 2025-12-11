'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './page.module.css'

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Position = { x: number; y: number }
type Board = (string | null)[][]

interface Tetromino {
  type: TetrominoType
  shape: number[][]
  color: string
}

const TETROMINOES: Record<TetrominoType, Omit<Tetromino, 'type'>> = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0f000' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 1000
const MIN_SPEED = 100

export default function TetrisGame() {
  const [board, setBoard] = useState<Board>(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [nextPiece, setNextPiece] = useState<Tetromino | null>(null)
  const [heldPiece, setHeldPiece] = useState<Tetromino | null>(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [combo, setCombo] = useState(0)
  const [ghostPosition, setGhostPosition] = useState<Position>({ x: 0, y: 0 })
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

  function createEmptyBoard(): Board {
    return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  }

  function createRandomTetromino(): Tetromino {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
    const type = types[Math.floor(Math.random() * types.length)]
    return { type, ...TETROMINOES[type] }
  }

  function rotatePiece(piece: Tetromino): Tetromino {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    )
    return { ...piece, shape: rotated }
  }

  function isValidPosition(piece: Tetromino, pos: Position, testBoard?: Board): boolean {
    const checkBoard = testBoard || board
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = pos.x + x
          const newY = pos.y + y
          if (
            newX < 0 || newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && checkBoard[newY][newX])
          ) {
            return false
          }
        }
      }
    }
    return true
  }

  function calculateGhostPosition(piece: Tetromino, pos: Position): Position {
    let ghostY = pos.y
    while (isValidPosition(piece, { x: pos.x, y: ghostY + 1 })) {
      ghostY++
    }
    return { x: pos.x, y: ghostY }
  }

  function mergePiece() {
    if (!currentPiece) return

    const newBoard = board.map(row => [...row])
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = position.y + y
          const boardX = position.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = currentPiece.color
          }
        }
      }
    }
    setBoard(newBoard)
    checkLines(newBoard)
    setCanHold(true)
  }

  function checkLines(currentBoard: Board) {
    let linesCleared = 0
    const newBoard = currentBoard.filter(row => {
      const isFull = row.every(cell => cell !== null)
      if (isFull) linesCleared++
      return !isFull
    })

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null))
    }

    if (linesCleared > 0) {
      setBoard(newBoard)
      setLines(prev => prev + linesCleared)

      const newCombo = combo + 1
      setCombo(newCombo)

      const basePoints = [0, 100, 300, 500, 800][linesCleared]
      const comboBonus = newCombo * 50
      const levelBonus = level
      setScore(prev => prev + (basePoints + comboBonus) * levelBonus)

      const newLevel = Math.floor(lines / 10) + 1
      if (newLevel !== level) {
        setLevel(newLevel)
        setSpeed(Math.max(MIN_SPEED, INITIAL_SPEED - (newLevel - 1) * 100))
      }
    } else {
      setCombo(0)
    }
  }

  function spawnNewPiece() {
    const piece = nextPiece || createRandomTetromino()
    const newNext = createRandomTetromino()
    const startX = Math.floor(BOARD_WIDTH / 2) - Math.floor(piece.shape[0].length / 2)
    const startY = 0

    if (!isValidPosition(piece, { x: startX, y: startY })) {
      setGameOver(true)
      return
    }

    setCurrentPiece(piece)
    setPosition({ x: startX, y: startY })
    setNextPiece(newNext)
    const ghost = calculateGhostPosition(piece, { x: startX, y: startY })
    setGhostPosition(ghost)
  }

  function moveDown() {
    if (!currentPiece || gameOver || paused) return

    const newPos = { x: position.x, y: position.y + 1 }
    if (isValidPosition(currentPiece, newPos)) {
      setPosition(newPos)
      const ghost = calculateGhostPosition(currentPiece, newPos)
      setGhostPosition(ghost)
    } else {
      mergePiece()
      spawnNewPiece()
    }
  }

  function moveLeft() {
    if (!currentPiece || gameOver || paused) return
    const newPos = { x: position.x - 1, y: position.y }
    if (isValidPosition(currentPiece, newPos)) {
      setPosition(newPos)
      const ghost = calculateGhostPosition(currentPiece, newPos)
      setGhostPosition(ghost)
    }
  }

  function moveRight() {
    if (!currentPiece || gameOver || paused) return
    const newPos = { x: position.x + 1, y: position.y }
    if (isValidPosition(currentPiece, newPos)) {
      setPosition(newPos)
      const ghost = calculateGhostPosition(currentPiece, newPos)
      setGhostPosition(ghost)
    }
  }

  function rotate() {
    if (!currentPiece || gameOver || paused) return
    const rotated = rotatePiece(currentPiece)

    // Wall kick attempts
    const kicks = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ]

    for (const kick of kicks) {
      const newPos = { x: position.x + kick.x, y: position.y + kick.y }
      if (isValidPosition(rotated, newPos)) {
        setCurrentPiece(rotated)
        setPosition(newPos)
        const ghost = calculateGhostPosition(rotated, newPos)
        setGhostPosition(ghost)
        return
      }
    }
  }

  function hardDrop() {
    if (!currentPiece || gameOver || paused) return

    let dropDistance = 0
    let newPos = { ...position }
    while (isValidPosition(currentPiece, { x: newPos.x, y: newPos.y + 1 })) {
      newPos.y++
      dropDistance++
    }

    setPosition(newPos)
    setScore(prev => prev + dropDistance * 2)

    setTimeout(() => {
      mergePiece()
      spawnNewPiece()
    }, 50)
  }

  function holdPiece() {
    if (!currentPiece || !canHold || gameOver || paused) return

    setCanHold(false)

    if (heldPiece) {
      const temp = heldPiece
      setHeldPiece(currentPiece)
      setCurrentPiece(temp)
      const startX = Math.floor(BOARD_WIDTH / 2) - Math.floor(temp.shape[0].length / 2)
      setPosition({ x: startX, y: 0 })
      const ghost = calculateGhostPosition(temp, { x: startX, y: 0 })
      setGhostPosition(ghost)
    } else {
      setHeldPiece(currentPiece)
      spawnNewPiece()
    }
  }

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!gameStarted && e.code === 'Space') {
      startGame()
      return
    }

    if (e.code === 'Escape') {
      setPaused(p => !p)
      return
    }

    switch (e.code) {
      case 'ArrowLeft':
        moveLeft()
        break
      case 'ArrowRight':
        moveRight()
        break
      case 'ArrowDown':
        moveDown()
        setScore(prev => prev + 1)
        break
      case 'ArrowUp':
      case 'KeyX':
        rotate()
        break
      case 'Space':
        hardDrop()
        break
      case 'KeyC':
      case 'ShiftLeft':
        holdPiece()
        break
    }
  }, [gameStarted, currentPiece, position, paused, gameOver])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  useEffect(() => {
    if (!gameStarted || gameOver || paused) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      return
    }

    gameLoopRef.current = setInterval(moveDown, speed)
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [speed, gameStarted, gameOver, paused, position, currentPiece])

  function startGame() {
    setBoard(createEmptyBoard())
    setScore(0)
    setLevel(1)
    setLines(0)
    setCombo(0)
    setGameOver(false)
    setPaused(false)
    setGameStarted(true)
    setSpeed(INITIAL_SPEED)
    setHeldPiece(null)
    setCanHold(true)
    setNextPiece(createRandomTetromino())
    spawnNewPiece()
  }

  function renderBoard() {
    const displayBoard = board.map(row => [...row])

    // Ghost piece
    if (currentPiece && ghostPosition.y !== position.y) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = ghostPosition.y + y
            const boardX = ghostPosition.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              if (!displayBoard[boardY][boardX]) {
                displayBoard[boardY][boardX] = 'ghost'
              }
            }
          }
        }
      }
    }

    // Current piece
    if (currentPiece) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = position.y + y
            const boardX = position.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color
            }
          }
        }
      }
    }

    return displayBoard
  }

  function renderPreview(piece: Tetromino | null) {
    if (!piece) return null
    return (
      <div className={styles.preview}>
        {piece.shape.map((row, y) => (
          <div key={y} className={styles.previewRow}>
            {row.map((cell, x) => (
              <div
                key={x}
                className={styles.previewCell}
                style={{
                  backgroundColor: cell ? piece.color : 'transparent',
                  border: cell ? '1px solid rgba(255,255,255,0.3)' : 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameWrapper}>
        <div className={styles.sidePanel}>
          <div className={styles.panel}>
            <h3>HOLD</h3>
            <div className={styles.panelContent}>
              {renderPreview(heldPiece)}
            </div>
            <p className={styles.hint}>Press C</p>
          </div>
          <div className={styles.panel}>
            <h3>STATS</h3>
            <div className={styles.stats}>
              <div className={styles.statRow}>
                <span>SCORE</span>
                <span className={styles.statValue}>{score}</span>
              </div>
              <div className={styles.statRow}>
                <span>LEVEL</span>
                <span className={styles.statValue}>{level}</span>
              </div>
              <div className={styles.statRow}>
                <span>LINES</span>
                <span className={styles.statValue}>{lines}</span>
              </div>
              {combo > 0 && (
                <div className={styles.comboIndicator}>
                  COMBO x{combo}!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.mainGame}>
          <h1 className={styles.title}>TETRIS ULTRA</h1>

          <div className={styles.boardContainer}>
            {!gameStarted && (
              <div className={styles.overlay}>
                <h2>TETRIS ULTRA</h2>
                <p>Press SPACE to start</p>
                <div className={styles.controls}>
                  <p>← → : Move</p>
                  <p>↑ / X : Rotate</p>
                  <p>↓ : Soft Drop</p>
                  <p>SPACE : Hard Drop</p>
                  <p>C : Hold</p>
                  <p>ESC : Pause</p>
                </div>
              </div>
            )}

            {paused && gameStarted && (
              <div className={styles.overlay}>
                <h2>PAUSED</h2>
                <p>Press ESC to resume</p>
              </div>
            )}

            {gameOver && (
              <div className={styles.overlay}>
                <h2>GAME OVER</h2>
                <p className={styles.finalScore}>Score: {score}</p>
                <p className={styles.finalStats}>Level {level} • {lines} lines</p>
                <button className={styles.restartButton} onClick={startGame}>
                  PLAY AGAIN
                </button>
              </div>
            )}

            <div className={styles.board}>
              {renderBoard().map((row, y) => (
                <div key={y} className={styles.row}>
                  {row.map((cell, x) => (
                    <div
                      key={x}
                      className={`${styles.cell} ${cell === 'ghost' ? styles.ghost : ''}`}
                      style={{
                        backgroundColor: cell && cell !== 'ghost' ? cell : 'rgba(0,0,0,0.3)',
                        border: cell && cell !== 'ghost' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: cell && cell !== 'ghost' ? `inset 0 0 10px rgba(255,255,255,0.2)` : 'none',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.panel}>
            <h3>NEXT</h3>
            <div className={styles.panelContent}>
              {renderPreview(nextPiece)}
            </div>
          </div>
          <div className={styles.panel}>
            <h3>FEATURES</h3>
            <div className={styles.features}>
              <div className={styles.feature}>✓ Ghost Piece</div>
              <div className={styles.feature}>✓ Hold System</div>
              <div className={styles.feature}>✓ Wall Kicks</div>
              <div className={styles.feature}>✓ Combo System</div>
              <div className={styles.feature}>✓ Hard Drop</div>
              <div className={styles.feature}>✓ Speed Increase</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
