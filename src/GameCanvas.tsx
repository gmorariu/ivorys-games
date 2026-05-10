import React, { useState, useRef, useEffect, useCallback } from 'react';
import characterImgAsset from './assets/merlin-idle.png';
import characterWalkImgAsset from './assets/merlin-walk.png';
import { CHARACTER_HEIGHT, HORIZONTAL_SPEED, GRAVITY } from './character';
import {
  JUMP_STRENGTH,
  drawCharacter,
  initialCharacterState,
  updateCharacter,
  type CharacterState,
} from './character';
import type { Platform } from './types';


const INITIAL_WORLD_WIDTH = 2000;
const GROUND_Y_POSITION = 400 - 20;

const generateInitialPlatforms = (): Platform[] => {
  const platforms: Platform[] = [
    // Ground platform spanning the entire world
    { x: 0, y: GROUND_Y_POSITION, width: INITIAL_WORLD_WIDTH, height: 20, isLava: true },
  ];

  // Based on character physics
  const maxJumpTime = -JUMP_STRENGTH / GRAVITY;
  const maxJumpHeight = (-JUMP_STRENGTH * maxJumpTime) + (0.5 * GRAVITY * maxJumpTime * maxJumpTime);
  const maxJumpDistance = HORIZONTAL_SPEED * (maxJumpTime * 2);

  let lastPlatform = { x: 200, y: 320, width: 100 };
  platforms.push({ ...lastPlatform, height: 20, isLava: false });

  let currentX = lastPlatform.x + lastPlatform.width;

  while (currentX < INITIAL_WORLD_WIDTH - 300) { // Leave some space at the end
    const gap = Math.random() * (maxJumpDistance * 0.7) + 30; // 30px min gap
    const nextX = currentX + gap;

    const yDiff = Math.random() * (maxJumpHeight * 0.8);
    const nextY = Math.max(150, Math.min(GROUND_Y_POSITION - CHARACTER_HEIGHT, lastPlatform.y - yDiff + Math.random() * 100));

    const width = 80 + Math.random() * 70;
    const newPlatform = { x: nextX, y: nextY, width, height: 20, isLava: false };
    platforms.push(newPlatform);
    currentX = newPlatform.x + newPlatform.width;
  }

  return platforms;
};

const lavaVideoAsset = 'https://example.com/lava.mp4'; // Replace with your direct video link

interface GameCanvasProps {
  setLastPressedKey: (key: string | null) => void;
  restartCounter: number;
  handleRestart: () => void;
}

const generatePlatforms = (startX: number): Platform[] => {
  const newPlatforms: Platform[] = [];
  const numberOfPlatforms = Math.floor(Math.random() * 3) + 1; // Generate 1 to 3 platforms
  let lastPlatformX = startX;

  for (let i = 0; i < numberOfPlatforms; i++) {
    // Set a gap from the last generated platform
    const gap = i === 0 ? 200 + Math.random() * 150 : 100 + Math.random() * 100;
    const x = lastPlatformX + gap;
    const y = 150 + Math.random() * 200; // Random height from 150 to 350
    const width = 80 + Math.random() * 70; // Random width from 80 to 150
    newPlatforms.push({ x, y, width, height: 20, isLava: false });
    lastPlatformX = x + width;
  }
  return newPlatforms;
};

const GameCanvas: React.FC<GameCanvasProps> = ({ setLastPressedKey, restartCounter, handleRestart }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 400 });
  const [cameraX, setCameraX] = useState(0);
  const [characterImg, setCharacterImg] = useState<HTMLImageElement | null>(null);
  const [characterWalkImg, setCharacterWalkImg] = useState<HTMLImageElement | null>(null);
  const [lavaVideo, setLavaVideo] = useState<HTMLVideoElement | null>(null);
  const [lavaPattern, setLavaPattern] = useState<CanvasPattern | null>(null);
  const [characterState, setCharacterState] = useState(initialCharacterState);
  const [platforms, setPlatforms] = useState<Platform[]>(generateInitialPlatforms());
  const [worldWidth, setWorldWidth] = useState(INITIAL_WORLD_WIDTH);
  const lastGeneratedPlatformX = useRef(1250);
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
      setPlatforms(generateInitialPlatforms());
      setWorldWidth(INITIAL_WORLD_WIDTH);
      lastGeneratedPlatformX.current = 1250;
      lastTimeRef.current = null;
      keysPressed.current.clear();
    }
  }, [restartCounter]);

  // Effect for lava platforms
  useEffect(() => {
    const lavaInterval = setInterval(() => {
      setPlatforms(currentPlatforms => {
        const nonLavaPlatforms = currentPlatforms
          .map((p, i) => ({ p, i }))
          .filter(item => !item.p.isLava);

        if (nonLavaPlatforms.length === 0) {
          return currentPlatforms;
        }

        const randomIndex = Math.floor(Math.random() * nonLavaPlatforms.length);
        const platformToChangeIndex = nonLavaPlatforms[randomIndex].i;

        setTimeout(() => {
          setPlatforms(prev =>
            prev.map((p, i) =>
              i === platformToChangeIndex ? { ...p, isLava: false } : p
            )
          );
        }, 2000 + Math.random() * 1000); // Turn back to normal after 2-3 seconds

        return currentPlatforms.map((p, i) =>
          i === platformToChangeIndex ? { ...p, isLava: true } : p
        );
      });
    }, 3000); // Every 3 seconds, a platform might turn to lava

    return () => clearInterval(lavaInterval);
  }, []);

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
        const newState = updateCharacter(prevState, keysPressed.current, { deltaTime, currentTime }, platforms, worldWidth, handleRestart);

        // Generate new platforms if character is near the edge of the generated world
        if (newState.x > lastGeneratedPlatformX.current - canvasSize.width) {
          const newPlatforms = generatePlatforms(lastGeneratedPlatformX.current);
          lastGeneratedPlatformX.current = newPlatforms[newPlatforms.length - 1].x;
          
          setPlatforms(prevPlatforms => {
            const ground = { ...prevPlatforms[0], width: worldWidth + 500 };
            return [ground, ...prevPlatforms.slice(1), ...newPlatforms];
          });

          setWorldWidth(prev => prev + 500);
        }

        // Target for the camera is to have the player in the middle of the screen
        const targetCameraX = newState.x - (canvasSize.width / 2);

        // Clamp camera to world bounds
        let newCameraX = Math.max(0, targetCameraX); // Don't go past the left edge
        newCameraX = Math.min(newCameraX, worldWidth - canvasSize.width); // Don't go past the right edge
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
      cancelAnimationFrame(animationFrameId);
    };
  }, [handleKeyDown, handleKeyUp, characterImg, characterWalkImg, handleRestart, platforms, worldWidth, canvasSize.width]);

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
      if (p.isLava && lavaPattern) {
        context.fillStyle = lavaPattern;
      } else if (p.isLava) {
        context.fillStyle = '#FF4500'; // Fallback fiery orange for lava
      } else {
        context.fillStyle = 'purple';
      }
      context.fillRect(p.x, p.y, p.width, p.height);
    });

    drawCharacter(context, characterState, characterImg, characterWalkImg);

    context.restore();
  }, [characterState, characterImg, characterWalkImg, cameraX, lavaVideo, lavaPattern, canvasSize, platforms]);

  return <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />;
};

export default GameCanvas;