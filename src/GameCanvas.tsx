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
    const activeSprite = characterState.isMoving ? characterWalkImg : characterImg;
    if (!canvas || !activeSprite) return;
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
        context.fillStyle = 'green';
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
  }, [characterState, characterImg, characterWalkImg, cameraX, animationFrame]);

  return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />;
};

export default GameCanvas;