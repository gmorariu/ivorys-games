import type { Platform } from './types';

// Character Constants
export const SPRITE_SHEET_FRAME_WIDTH = 256; // Width of a single frame in the sprite sheet
export const SPRITE_SHEET_FRAME_HEIGHT = 256; // Height of a single frame
export const CHARACTER_HEIGHT = 200;
export const CHARACTER_ASPECT_RATIO = SPRITE_SHEET_FRAME_HEIGHT / SPRITE_SHEET_FRAME_WIDTH;
export const CHARACTER_WIDTH = CHARACTER_HEIGHT / CHARACTER_ASPECT_RATIO;
export const CHARACTER_HITBOX_WIDTH = 25; // The actual width of the character for collision
export const CHARACTER_HITBOX_X_OFFSET = (CHARACTER_WIDTH - CHARACTER_HITBOX_WIDTH) / 2;
export const CHARACTER_Y_OFFSET = 30; // Visual adjustment for empty space in sprite

// Physics Constants
export const GRAVITY = 1800; // pixels per second per second
export const HORIZONTAL_SPEED = 275; // pixels per second
export const JUMP_STRENGTH = -700; // pixels per second

// Sprite Animation Constants
export const SPRITE_SHEET_COLS = 5;
export const TOTAL_FRAMES = 25;
export const ANIMATION_FPS = 12;
export const FRAME_DURATION = 1000 / ANIMATION_FPS;

export interface CharacterState {
  x: number;
  y: number;
  vy: number;
  onGround: boolean;
  isMoving: boolean;
  direction: 'left' | 'right';
  animationFrame: number;
  lastFrameTime: number;
}

export const initialCharacterState: CharacterState = {
  x: 200, // Starting on the second platform
  y: 320 - CHARACTER_HEIGHT,
  vy: 0,
  onGround: true,
  isMoving: false,
  direction: 'right',
  animationFrame: 0,
  lastFrameTime: 0,
};

export function updateCharacter(
  prevState: CharacterState,
  keysPressed: Set<string>,
  { deltaTime, currentTime }: { deltaTime: number, currentTime: number },
  platforms: Platform[],
  worldWidth: number,
  handleRestart: () => void
): CharacterState {
  let { x, y, vy, onGround, direction, animationFrame, lastFrameTime } = { ...prevState };
  let isMoving = false;

  // Apply gravity
  vy += GRAVITY * deltaTime;

  // Horizontal movement
  if (keysPressed.has('ArrowLeft') || keysPressed.has('a')) {
    x -= HORIZONTAL_SPEED * deltaTime;
    isMoving = true;
    direction = 'left';
  }
  if (keysPressed.has('ArrowRight') || keysPressed.has('d')) {
    x += HORIZONTAL_SPEED * deltaTime;
    isMoving = true;
    direction = 'right';
  }

  y += vy * deltaTime;

  // Clamp position to world bounds
  if (x < 0) x = 0;
  if (x + CHARACTER_WIDTH > worldWidth) x = worldWidth - CHARACTER_WIDTH;

  // Platform collision
  onGround = false;
  for (const [index, p] of platforms.entries()) {
    // Check for lava collision
    if (
      p.isLava && // It's a lava platform
      y + CHARACTER_HEIGHT - CHARACTER_Y_OFFSET >= p.y && // Character's feet are below platform's top
      y + CHARACTER_HEIGHT - CHARACTER_Y_OFFSET <= p.y + p.height && // Character's feet are above platform's bottom
      x + CHARACTER_HITBOX_X_OFFSET + CHARACTER_HITBOX_WIDTH > p.x && // Character is horizontally overlapping
      x + CHARACTER_HITBOX_X_OFFSET < p.x + p.width
    ) {
      handleRestart(); // Restart the game on lava contact
      return { ...prevState };
    }

    // Is the character's bottom edge intersecting the platform's top edge?
    if (
      y + CHARACTER_HEIGHT >= p.y &&
      y + CHARACTER_HEIGHT - CHARACTER_Y_OFFSET <= p.y + p.height &&
      x + CHARACTER_HITBOX_X_OFFSET + CHARACTER_HITBOX_WIDTH > p.x &&
      x + CHARACTER_HITBOX_X_OFFSET < p.x + p.width &&
      vy >= 0
    ) {
      vy = 0; // Stop vertical movement
      y = p.y - CHARACTER_HEIGHT + CHARACTER_Y_OFFSET; // Align bottom of character with platform top
      onGround = true;
      break;
    }
  }

  // Update animation frame
  if (currentTime > lastFrameTime + FRAME_DURATION) {
    animationFrame = (animationFrame + 1) % TOTAL_FRAMES;
    lastFrameTime = currentTime;
  }

  return { x, y, vy, onGround, isMoving, direction, animationFrame, lastFrameTime };
}

export function drawCharacter(
  context: CanvasRenderingContext2D,
  characterState: CharacterState,
  idleImg: HTMLImageElement,
  walkImg: HTMLImageElement
) {
  const activeSprite = characterState.isMoving ? walkImg : idleImg;

  const frameCol = characterState.animationFrame % SPRITE_SHEET_COLS;
  const frameRow = Math.floor(characterState.animationFrame / SPRITE_SHEET_COLS);
  const frameX = frameCol * SPRITE_SHEET_FRAME_WIDTH;
  const frameY = frameRow * SPRITE_SHEET_FRAME_HEIGHT;

  context.save();

  if (characterState.direction === 'left') {
    context.scale(-1, 1);
    context.translate(-characterState.x - CHARACTER_WIDTH, characterState.y);
  } else {
    context.translate(characterState.x, characterState.y);
  }

  context.drawImage(
    activeSprite,
    frameX, frameY, // Source x, y
    SPRITE_SHEET_FRAME_WIDTH, SPRITE_SHEET_FRAME_HEIGHT, // Source width, height
    0, 0, // Destination x, y
    CHARACTER_WIDTH, CHARACTER_HEIGHT // Destination width, height
  );

  context.restore();
}