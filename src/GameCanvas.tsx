import React, { useState, useRef, useEffect, useCallback } from 'react';
import characterImgAsset from './assets/merlin-idle.png';
import characterWalkImgAsset from './assets/merlin-walk.png';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const WORLD_WIDTH = 2000; // The world is much wider than the canvas

// Character Constants
const SPRITE_SHEET_FRAME_WIDTH = 256; // Width of a single frame in the sprite sheet
const SPRITE_SHEET_FRAME_HEIGHT = 256; // Height of a single frame
const CHARACTER_ASPECT_RATIO = SPRITE_SHEET_FRAME_WIDTH / SPRITE_SHEET_FRAME_HEIGHT;
const CHARACTER_WIDTH = 100;
const CHARACTER_HEIGHT = CHARACTER_WIDTH * CHARACTER_ASPECT_RATIO;
const CHARACTER_HITBOX_WIDTH = 25; // The actual width of the character for collision
const CHARACTER_HITBOX_X_OFFSET = (CHARACTER_WIDTH - CHARACTER_HITBOX_WIDTH) / 2;
const CHARACTER_Y_OFFSET = 15; // Visual adjustment for empty space in sprite

// Physics Constants
const GRAVITY = 1800; // pixels per second per second
const HORIZONTAL_SPEED = 250; // pixels per second
const JUMP_STRENGTH = -700; // pixels per second

// Sprite Animation Constants - Merlin has 5 rows and 5 columns
const SPRITE_SHEET_COLS = 5;
const TOTAL_FRAMES = 25; // Total number of frames in the sprite sheet
const ANIMATION_FPS = 12; // Frames per second for the animation
const FRAME_DURATION = 1000 / ANIMATION_FPS; // Duration of each frame in milliseconds

const platforms = [
  // Ground platform spanning the entire world
  { x: 0, y: CANVAS_HEIGHT - 20, width: WORLD_WIDTH, height: 20 },
  // Additional platforms in the world
  { x: 200, y: 320, width: 100, height: 20 },
  { x: 450, y: 280, width: 100, height: 20 },
  { x: 700, y: 240, width: 100, height: 20 },
  { x: 950, y: 200, width: 150, height: 20 },
  { x: 1250, y: 250, width: 100, height: 20 },
  { x: 1500, y: 200, width: 100, height: 20 },
  { x: 1750, y: 150, width: 120, height: 20 },
];

const lavaImgAsset = 'data:image/jpeg;base64,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';
interface GameCanvasProps {
  setLastPressedKey: (key: string | null) => void;
  restartCounter: number;
  handleRestart: () => void;
}

interface CharacterState {
  x: number;
  y: number;
  vy: number;
  onGround: boolean;
  isMoving: boolean;
  direction: 'left' | 'right';
}

const initialCharacterState: CharacterState = {
  x: platforms[1].x,
  y: platforms[1].y - CHARACTER_HEIGHT,
  vy: 0,
  onGround: true,
  isMoving: false,
  direction: 'right',
};

const GameCanvas: React.FC<GameCanvasProps> = ({ setLastPressedKey, restartCounter, handleRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraX, setCameraX] = useState(0);
  const [characterImg, setCharacterImg] = useState<HTMLImageElement | null>(null);
  const [characterWalkImg, setCharacterWalkImg] = useState<HTMLImageElement | null>(null);
  const [lavaImg, setLavaImg] = useState<HTMLImageElement | null>(null);
  const [lavaPattern, setLavaPattern] = useState<CanvasPattern | null>(null);
  const [characterState, setCharacterState] = useState(initialCharacterState);
  const [animationFrame, setAnimationFrame] = useState(0);
  const lastFrameTimeRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  // Effect for loading the character image
  useEffect(() => {
    const idleImg = new Image();
    idleImg.src = characterImgAsset;
    idleImg.onload = () => setCharacterImg(idleImg); // eslint-disable-line no-confusing-void-expression

    const walkImg = new Image();
    walkImg.src = characterWalkImgAsset;
    walkImg.onload = () => setCharacterWalkImg(walkImg); // eslint-disable-line no-confusing-void-expression

    const newLavaImg = new Image();
    newLavaImg.src = lavaImgAsset;
    newLavaImg.onload = () => setLavaImg(newLavaImg); // eslint-disable-line no-confusing-void-expression
  }, []);

  // Effect for restarting the game
  useEffect(() => {
    if (restartCounter > 0) {
      setCharacterState(initialCharacterState);
      setCameraX(0);
      lastTimeRef.current = null;
      keysPressed.current.clear();
      setAnimationFrame(0);
      lastFrameTimeRef.current = 0;
    }
  }, [restartCounter]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setLastPressedKey(e.key);
    if (e.key === ' ' && characterState.onGround && !keysPressed.current.has(' ')) {
      setCharacterState(prevState => ({ ...prevState, vy: JUMP_STRENGTH, onGround: false }));
    }

    if (['a', 'd', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
      keysPressed.current.add(e.key); // Handle movement as a continuous press
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLastPressedKey, characterState.onGround]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key);
  }, []);
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      if (lastTimeRef.current === null || !characterImg || !characterWalkImg) {
        lastTimeRef.current = currentTime;
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Delta time in seconds
      lastTimeRef.current = currentTime;

      // Update animation frame
      if (currentTime > lastFrameTimeRef.current + FRAME_DURATION) {
        setAnimationFrame(prevFrame => (prevFrame + 1) % TOTAL_FRAMES);
        lastFrameTimeRef.current = currentTime;
      }


      setCharacterState(prevState => {
        let { x, y, vy, onGround, direction } = { ...prevState };
        let isMoving = false;

        // Apply gravity
        vy += GRAVITY * deltaTime;

        // Horizontal movement
        if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
          x -= HORIZONTAL_SPEED * deltaTime;
          isMoving = true;
          direction = 'left';
        }
        if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
          x += HORIZONTAL_SPEED * deltaTime;
          isMoving = true;
          direction = 'right';
        }

        y += vy * deltaTime;

        // Clamp position to canvas bounds
        if (x < 0) x = 0; // Clamp to the start of the world
        if (x + CHARACTER_WIDTH > WORLD_WIDTH) x = WORLD_WIDTH - CHARACTER_WIDTH; // Clamp to the end of the world

        // Platform collision
        onGround = false;
        for (const [index, p] of platforms.entries()) {
          // Check for lava collision (platform 0)
          if (index === 0 && y + CHARACTER_HEIGHT - CHARACTER_Y_OFFSET >= p.y) {
            handleRestart();
            return { ...prevState }; // Stop further processing for this frame
          }


          // Is the character's bottom edge intersecting the platform's top edge?
          if (
            y + CHARACTER_HEIGHT >= p.y && // Character's visual bottom is at or below platform top
            y + CHARACTER_HEIGHT - CHARACTER_Y_OFFSET <= p.y + p.height && // Character's feet are not past the bottom of the platform
            x + CHARACTER_HITBOX_X_OFFSET + CHARACTER_HITBOX_WIDTH > p.x && // Character's right hitbox edge is past platform's left edge
            x + CHARACTER_HITBOX_X_OFFSET < p.x + p.width && // Character's left hitbox edge is not past platform's right edge
            vy >= 0
          ) {
            vy = 0; // Stop vertical movement
            y = p.y - CHARACTER_HEIGHT + CHARACTER_Y_OFFSET; // Align bottom of character with platform top
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
        
        return { x, y, vy, onGround, isMoving, direction};
      });
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    if (characterImg && characterWalkImg) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [handleKeyDown, handleKeyUp, characterImg, characterWalkImg, handleRestart]);

  // Drawing Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Create lava pattern if it doesn't exist yet
    if (lavaImg && !lavaPattern) {
      const pattern = context.createPattern(lavaImg, 'repeat');
      if (pattern) {
        setLavaPattern(pattern);
      }
    }

    context.save();

    const activeSprite = characterState.isMoving ? characterWalkImg : characterImg;
    if (!activeSprite) return;

    // Clear canvas
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Translate the canvas to simulate the camera
    context.translate(-cameraX, 0);

    // Draw platforms
    platforms.forEach((p, index) => {
      if (index === 0 && lavaPattern) {
        context.fillStyle = lavaPattern;
      } else if (index === 0) {
        context.fillStyle = '#FF4500'; // Fallback fiery orange for lava
      } else {
        context.fillStyle = 'purple';
      }
      context.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw character
    const frameCol = animationFrame % SPRITE_SHEET_COLS;
    const frameRow = Math.floor(animationFrame / SPRITE_SHEET_COLS);
    const frameX = frameCol * SPRITE_SHEET_FRAME_WIDTH;
    const frameY = frameRow * SPRITE_SHEET_FRAME_HEIGHT;

    if (characterState.direction === 'left') {
      context.save();
      context.scale(-1, 1);
      context.translate(-characterState.x - CHARACTER_WIDTH, 0);
    } else {
      context.translate(characterState.x, 0);
    }

    context.drawImage(
      activeSprite,
      frameX, frameY, // Source x, y
      SPRITE_SHEET_FRAME_WIDTH, SPRITE_SHEET_FRAME_HEIGHT, // Source width, height
      0, characterState.y, // Destination x, y
      CHARACTER_WIDTH, CHARACTER_HEIGHT // Destination width, height
    );

    if (characterState.direction === 'left') {
      context.restore();
    }

    context.restore();
  }, [characterState, characterImg, characterWalkImg, cameraX, animationFrame, lavaImg, lavaPattern]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />;
};

export default GameCanvas;