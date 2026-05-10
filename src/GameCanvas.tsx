import React, { useState, useRef, useEffect, useCallback } from 'react';
import characterImgAsset from './assets/merlin-idle.png';
import characterWalkImgAsset from './assets/merlin-walk.png';
import {
  JUMP_STRENGTH,
  drawCharacter,
  initialCharacterState,
  updateCharacter,
  type CharacterState,
} from './character';
import type { Platform } from './types';

const WORLD_WIDTH = 2000; // The world is much wider than the canvas
const platforms: Platform[] = [
  // Ground platform spanning the entire world
  { x: 0, y: 400 - 20, width: WORLD_WIDTH, height: 20 },
  // Additional platforms in the world
  { x: 200, y: 320, width: 100, height: 20 },
  { x: 450, y: 280, width: 100, height: 20 },
  { x: 700, y: 240, width: 100, height: 20 },
  { x: 950, y: 200, width: 150, height: 20 },
  { x: 1250, y: 250, width: 100, height: 20 },
  { x: 1500, y: 200, width: 100, height: 20 },
  { x: 1750, y: 150, width: 120, height: 20 },
];

const lavaVideoAsset = 'https://example.com/lava.mp4'; // Replace with your direct video link
interface GameCanvasProps {
  setLastPressedKey: (key: string | null) => void;
  restartCounter: number;
  handleRestart: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ setLastPressedKey, restartCounter, handleRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 400 });
  const [cameraX, setCameraX] = useState(0);
  const [characterImg, setCharacterImg] = useState<HTMLImageElement | null>(null);
  const [characterWalkImg, setCharacterWalkImg] = useState<HTMLImageElement | null>(null);
  const [lavaVideo, setLavaVideo] = useState<HTMLVideoElement | null>(null);
  const [lavaPattern, setLavaPattern] = useState<CanvasPattern | null>(null);
  const [characterState, setCharacterState] = useState(initialCharacterState);
  const lastTimeRef = useRef<number | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        setCanvasSize({ width: canvasRef.current.parentElement.clientWidth, height: 400 });
      }
    };

    handleResize(); // Set initial size

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // Effect for loading the character image
  useEffect(() => {
    const idleImg = new Image();
    idleImg.src = characterImgAsset;
    idleImg.onload = () => setCharacterImg(idleImg); // eslint-disable-line no-confusing-void-expression

    const walkImg = new Image();
    walkImg.src = characterWalkImgAsset;
    walkImg.onload = () => setCharacterWalkImg(walkImg); // eslint-disable-line no-confusing-void-expression

    const video = document.createElement('video');
    video.src = lavaVideoAsset;
    video.crossOrigin = 'anonymous'; // Required for using video from another domain as a texture
    video.loop = true;
    video.muted = true; // Autoplay often requires the video to be muted
    video.playsInline = true;
    video.oncanplay = () => {
      video.play();
      video.currentTime = 45; // Start at 45 seconds
      setLavaVideo(video);
    };
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

      setCharacterState(prevState => {
        const newState = updateCharacter(prevState, keysPressed.current, { deltaTime, currentTime }, platforms, WORLD_WIDTH, handleRestart);

        // Target for the camera is to have the player in the middle of the screen
        const targetCameraX = newState.x - (canvasSize.width / 2);

        // Clamp camera to world bounds
        let newCameraX = Math.max(0, targetCameraX); // Don't go past the left edge
        newCameraX = Math.min(newCameraX, WORLD_WIDTH - canvasSize.width); // Don't go past the right edge
        setCameraX(newCameraX);
        
        return newState;
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
    if (lavaVideo && !lavaPattern) {
      const pattern = context.createPattern(lavaVideo, 'repeat');
      if (pattern) {
        setLavaPattern(pattern);
      }
    }

    context.save();

    if (!characterImg || !characterWalkImg) return;

    // Clear canvas
    context.clearRect(0, 0, canvasSize.width, canvasSize.height);

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

    drawCharacter(context, characterState, characterImg, characterWalkImg);

    context.restore();
  }, [characterState, characterImg, characterWalkImg, cameraX, lavaVideo, lavaPattern, canvasSize]);

  return <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />;
};

export default GameCanvas;