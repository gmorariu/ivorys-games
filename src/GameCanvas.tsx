import React, { useState, useRef, useEffect, useCallback } from 'react';
import gojoImg from './assets/gojo.png';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const WORLD_WIDTH = 2000; // The world is much wider than the canvas

// Character Constants
const CHARACTER_ASPECT_RATIO = 443 / 279;
const CHARACTER_WIDTH = 40;
const CHARACTER_HEIGHT = CHARACTER_WIDTH * CHARACTER_ASPECT_RATIO;

// Physics Constants
const GRAVITY = 1800; // pixels per second per second
const HORIZONTAL_SPEED = 250; // pixels per second
const JUMP_STRENGTH = -700; // pixels per second

const platforms = [
  // Ground platform spanning the entire world
  { x: 0, y: CANVAS_HEIGHT - 20, width: WORLD_WIDTH, height: 20 },
  // Additional platforms in the world
  { x: 150, y: 320, width: 100, height: 20 },
  { x: 300, y: 280, width: 100, height: 20 },
  { x: 450, y: 240, width: 100, height: 20 },
  { x: 650, y: 200, width: 150, height: 20 },
  { x: 900, y: 250, width: 100, height: 20 },
  { x: 1100, y: 200, width: 100, height: 20 },
  { x: 1300, y: 150, width: 120, height: 20 },
];

interface GameCanvasProps {
  setLastPressedKey: (key: string | null) => void;
  restartCounter: number;
  handleRestart: () => void;
}

const initialCharacterState = {
  x: platforms[1].x,
  y: platforms[1].y - CHARACTER_HEIGHT,
  vy: 0,
  onGround: true,
};

const GameCanvas: React.FC<GameCanvasProps> = ({ setLastPressedKey, restartCounter, handleRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraX, setCameraX] = useState(0);
  const [characterImg, setCharacterImg] = useState<HTMLImageElement | null>(null);
  const [characterState, setCharacterState] = useState(initialCharacterState);
  const lastTimeRef = useRef<number | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  // Effect for loading the character image
  useEffect(() => {
    const img = new Image();
    img.src = gojoImg;
    img.onload = () => setCharacterImg(img); // eslint-disable-line no-confusing-void-expression
  }, []);

  // Effect for restarting the game
  useEffect(() => {
    if (restartCounter > 0) {
      setCharacterState(initialCharacterState);
      setCameraX(0);
      lastTimeRef.current = null;
      keysPressed.current.clear();
    }
  }, [restartCounter]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setLastPressedKey(e.key);
    if (['a', 'd', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
      keysPressed.current.add(e.key); // Handle movement as a continuous press
    }

    if (e.key === ' ' && characterState.onGround) {
      setCharacterState(prevState => ({ ...prevState, vy: JUMP_STRENGTH, onGround: false }));
    }
  }, [setLastPressedKey]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key);
  }, []);
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === null || !characterImg) {
        lastTimeRef.current = currentTime;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Delta time in seconds
      lastTimeRef.current = currentTime;

      setCharacterState(prevState => {
        let { x, y, vy, onGround } = { ...prevState };

        // Apply gravity
        vy += GRAVITY * deltaTime;

        // Jumping - this is now handled in handleKeyDown to be more responsive
        // if (keysPressed.current.has(' ') && onGround) {
        //   vy = JUMP_STRENGTH;
        //   onGround = false; // No longer on the ground
        // }

        // Horizontal movement
        if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
          x -= HORIZONTAL_SPEED * deltaTime;
        }
        if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
          x += HORIZONTAL_SPEED * deltaTime;
        }

        y += vy * deltaTime;

        // Clamp position to canvas bounds
        if (x < 0) x = 0; // Clamp to the start of the world
        if (x + CHARACTER_WIDTH > WORLD_WIDTH) x = WORLD_WIDTH - CHARACTER_WIDTH; // Clamp to the end of the world

        // Platform collision
        onGround = false;
        for (const [index, p] of platforms.entries()) {
          // Check for lava collision (platform 0)
          if (index === 0 && y + CHARACTER_HEIGHT >= p.y) {
            handleRestart();
            return { ...prevState }; // Stop further processing for this frame
          }


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

        // Target for the camera is to have the player in the middle of the screen
        const targetCameraX = x - (CANVAS_WIDTH / 2);

        // Clamp camera to world bounds
        let newCameraX = Math.max(0, targetCameraX); // Don't go past the left edge
        newCameraX = Math.min(newCameraX, WORLD_WIDTH - CANVAS_WIDTH); // Don't go past the right edge
        setCameraX(newCameraX);

        return { x, y, vy, onGround };
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (characterImg) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [handleKeyDown, handleKeyUp, characterImg, handleRestart]);

  // Drawing Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !characterImg) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.save();

    // Clear canvas
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Translate the canvas to simulate the camera
    context.translate(-cameraX, 0);

    // Draw platforms
    platforms.forEach((p, index) => {
      if (index === 0) {
        context.fillStyle = '#FF4500'; // Fiery orange for lava
      } else {
        context.fillStyle = '#8B4513'; // A brownish color for platforms
      }
      context.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw character
    context.drawImage(characterImg, characterState.x, characterState.y, CHARACTER_WIDTH, CHARACTER_HEIGHT); // Draw at world coordinates

    context.restore();
  }, [characterState, characterImg, cameraX]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />;
};

export default GameCanvas;