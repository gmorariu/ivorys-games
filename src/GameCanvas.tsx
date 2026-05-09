import React, { useState, useRef, useEffect, useCallback } from 'react';
import gojoImg from './assets/gojo.png';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;

// Character Constants
const CHARACTER_ASPECT_RATIO = 443 / 279;
const CHARACTER_WIDTH = 40;
const CHARACTER_HEIGHT = CHARACTER_WIDTH * CHARACTER_ASPECT_RATIO;

// Physics Constants
const GRAVITY = 0.6;
const JUMP_STRENGTH = -15;
const MOVE_SPEED = 5;

const platforms = [
  // Ground
  { x: 0, y: CANVAS_HEIGHT - 20, width: CANVAS_WIDTH, height: 20 },
  // Some platforms
  { x: 150, y: 220, width: 100, height: 20 },
  { x: 300, y: 180, width: 100, height: 20 },
  { x: 450, y: 140, width: 100, height: 20 },
];

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [characterImg, setCharacterImg] = useState<HTMLImageElement | null>(null);
  const [characterState, setCharacterState] = useState({ x: 50, y: 0, vy: 0, onGround: false });
  const keysPressed = useRef<Set<string>>(new Set());

  // Effect for loading the character image
  useEffect(() => {
    const img = new Image();
    img.src = gojoImg;
    img.onload = () => setCharacterImg(img);
  }, []);

  // Game Loop and Input Handling
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      setCharacterState(prevState => {
        let { x, y, vy, onGround } = { ...prevState };

        // Horizontal movement
        if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
          x -= MOVE_SPEED;
        }
        if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
          x += MOVE_SPEED;
        }

        // Apply gravity
        vy += GRAVITY;
        y += vy;

        // Clamp position to canvas bounds
        if (x < 0) x = 0;
        if (x + CHARACTER_WIDTH > CANVAS_WIDTH) x = CANVAS_WIDTH - CHARACTER_WIDTH;

        // Platform collision
        onGround = false;
        for (const p of platforms) {
          // Is the character's bottom edge intersecting the platform's top edge?
          if (
            y + CHARACTER_HEIGHT >= p.y &&
            y + CHARACTER_HEIGHT <= p.y + p.height &&
            x + CHARACTER_WIDTH > p.x &&
            x < p.x + p.width &&
            vy >= 0
          ) {
            vy = 0;
            y = p.y - CHARACTER_HEIGHT;
            onGround = true;
            break;
          }
        }

        return { x, y, vy, onGround };
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'ArrowUp', ' '].includes(e.key) && characterState.onGround) {
        setCharacterState(prevState => ({ ...prevState, vy: JUMP_STRENGTH, onGround: false }));
      }
      keysPressed.current.add(e.key);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameLoop();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [characterState.onGround]);

  // Drawing Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !characterImg) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw platforms
    context.fillStyle = '#8B4513'; // A brownish color for platforms
    platforms.forEach(p => {
      context.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw character
    context.drawImage(characterImg, characterState.x, characterState.y, CHARACTER_WIDTH, CHARACTER_HEIGHT);
  }, [characterState, characterImg]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />;
};

export default GameCanvas;