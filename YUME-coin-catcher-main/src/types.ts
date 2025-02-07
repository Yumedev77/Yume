export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Player extends GameObject {
  velocity: number;
  isInvincible: boolean;
  hasDoublePoints: boolean;
}

export interface Collectible extends GameObject {
  type: 'token' | 'moonRocket' | 'diamondHands';
}

export interface Obstacle extends GameObject {
  type: 'rugPull' | 'marketDump' | 'whaleWave';
}

export interface GameState {
  player: Player;
  collectibles: Collectible[];
  obstacles: Obstacle[];
  score: number;
  timeLeft: number;
  isGameOver: boolean;
  isPaused: boolean;
}