import React, { useEffect, useRef, useState } from 'react';
import { Rainbow, Rocket, Gem, Cloud, Timer, Github, LineChart } from 'lucide-react';
import { Discord } from './icons/Discord';
import { Dexscreener } from './icons/Dexscreener';
import { GameState, Player, Collectible, Obstacle } from '../types';

const BASE_GAME_WIDTH = 800;
const BASE_GAME_HEIGHT = 600;
const GRAVITY = 0.3;
const JUMP_FORCE = -7;
const PLAYER_SIZE = 40;
const INITIAL_TIME = 30;
const TIME_BONUS = {
  token: 2,
  moonRocket: 5,
  diamondHands: 3,
};

const SCORE_VALUES = {
  token: 10,
  moonRocket: 15,
  diamondHands: 20,
};

const BASE_HORIZONTAL_SPEED = 3;
const BASE_OBSTACLE_SPEED = 4;
const BASE_SPAWN_RATE = {
  collectible: 0.015,
  obstacle: 0.008,
};

const getDifficultyMultiplier = (score: number) => {
  return 1 + Math.floor(score / 100) * 0.2;
};

const getSpawnRates = (score: number) => {
  const multiplier = getDifficultyMultiplier(score);
  return {
    collectible: Math.min(BASE_SPAWN_RATE.collectible * multiplier, 0.03),
    obstacle: Math.min(BASE_SPAWN_RATE.obstacle * multiplier, 0.02),
  };
};

const getSpeeds = (score: number) => {
  const multiplier = getDifficultyMultiplier(score);
  return {
    horizontal: BASE_HORIZONTAL_SPEED * multiplier,
    obstacle: BASE_OBSTACLE_SPEED * multiplier,
  };
};

const initialPlayer: Player = {
  x: 100,
  y: BASE_GAME_HEIGHT / 2,
  width: PLAYER_SIZE,
  height: PLAYER_SIZE,
  velocity: 0,
  isInvincible: false,
  hasDoublePoints: false,
};

function Game() {
  const [gameState, setGameState] = useState<GameState>({
    player: initialPlayer,
    collectibles: [],
    obstacles: [],
    score: 0,
    timeLeft: INITIAL_TIME,
    isGameOver: false,
    isPaused: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [gameWidth, setGameWidth] = useState(BASE_GAME_WIDTH);
  const [gameHeight, setGameHeight] = useState(BASE_GAME_HEIGHT);
  const gameLoopRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  const updateGameDimensions = () => {
    if (!containerRef.current) return;

    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 8 : 32;
    const containerWidth = Math.min(window.innerWidth - padding * 2, BASE_GAME_WIDTH);
    const maxHeight = window.innerHeight - (isMobile ? 120 : 300);
    
    let scale: number;
    let height: number;
    
    if (isMobile) {
      const heightScale = maxHeight / BASE_GAME_HEIGHT;
      const widthScale = containerWidth / BASE_GAME_WIDTH;
      scale = Math.min(heightScale, widthScale);
      height = BASE_GAME_HEIGHT * scale;
    } else {
      scale = containerWidth / BASE_GAME_WIDTH;
      height = BASE_GAME_HEIGHT * scale;
    }

    setScale(scale);
    setGameWidth(containerWidth);
    setGameHeight(height);
  };

  const handleInteraction = () => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        velocity: JUMP_FORCE,
      },
    }));
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      handleInteraction();
    }
  };

  const spawnCollectible = () => {
    const types: Collectible['type'][] = ['token', 'moonRocket', 'diamondHands'];
    const type = types[Math.floor(Math.random() * types.length)];
    const rotation = Math.random() * 360;
    
    return {
      type,
      x: BASE_GAME_WIDTH,
      y: Math.random() * (BASE_GAME_HEIGHT - PLAYER_SIZE),
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      rotation,
    };
  };

  const spawnObstacle = () => {
    const types: Obstacle['type'][] = ['rugPull', 'marketDump', 'whaleWave'];
    const type = types[Math.floor(Math.random() * types.length)];
    const rotation = Math.random() * 360;
    
    return {
      type,
      x: BASE_GAME_WIDTH,
      y: Math.random() * (BASE_GAME_HEIGHT - PLAYER_SIZE),
      width: PLAYER_SIZE * 1.5,
      height: PLAYER_SIZE * 1.5,
      rotation,
    };
  };

  const updateScore = (collectibleType: Collectible['type'], hasDoublePoints: boolean) => {
    const baseScore = SCORE_VALUES[collectibleType];
    const multiplier = hasDoublePoints ? 2 : 1;
    return baseScore * multiplier;
  };

  const checkCollisions = (state: GameState) => {
    const { player, collectibles, obstacles } = state;
    let newScore = state.score;
    let isInvincible = player.isInvincible;
    let hasDoublePoints = player.hasDoublePoints;
    let timeBonus = 0;

    const remainingCollectibles = collectibles.filter(collectible => {
      const hasCollided = (
        player.x < collectible.x + collectible.width &&
        player.x + player.width > collectible.x &&
        player.y < collectible.y + collectible.height &&
        player.y + player.height > collectible.y
      );

      if (hasCollided) {
        timeBonus += TIME_BONUS[collectible.type];
        newScore += updateScore(collectible.type, player.hasDoublePoints);
        
        switch (collectible.type) {
          case 'moonRocket':
            hasDoublePoints = true;
            setTimeout(() => {
              setGameState(prev => ({
                ...prev,
                player: { ...prev.player, hasDoublePoints: false },
              }));
            }, 5000);
            break;
          case 'diamondHands':
            isInvincible = true;
            setTimeout(() => {
              setGameState(prev => ({
                ...prev,
                player: { ...prev.player, isInvincible: false },
              }));
            }, 3000);
            break;
        }
        return false;
      }
      return true;
    });

    const hasHitObstacle = obstacles.some(obstacle => (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ));

    return {
      ...state,
      player: { ...player, isInvincible, hasDoublePoints },
      collectibles: remainingCollectibles,
      score: newScore,
      timeLeft: state.timeLeft + timeBonus,
      isGameOver: (hasHitObstacle && !isInvincible) || state.timeLeft <= 0,
    };
  };

  const gameLoop = (timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const deltaTime = timestamp - lastTimeRef.current;
    
    if (deltaTime > 16) {
      setGameState(prev => {
        if (prev.isGameOver || prev.isPaused) return prev;

        const newVelocity = prev.player.velocity + GRAVITY;
        const newY = prev.player.y + newVelocity;

        const newPlayer = {
          ...prev.player,
          y: newY,
          velocity: newVelocity,
        };

        if (newPlayer.y > BASE_GAME_HEIGHT - PLAYER_SIZE) {
          newPlayer.y = BASE_GAME_HEIGHT - PLAYER_SIZE;
          newPlayer.velocity = 0;
        }
        if (newPlayer.y < 0) {
          newPlayer.y = 0;
          newPlayer.velocity = Math.max(0, newPlayer.velocity);
        }

        const spawnRates = getSpawnRates(prev.score);
        const speeds = getSpeeds(prev.score);

        const shouldSpawnCollectible = Math.random() < spawnRates.collectible;
        const shouldSpawnObstacle = Math.random() < spawnRates.obstacle;

        const timeScale = deltaTime / 16;
        const horizontalMove = speeds.horizontal * timeScale;
        const obstacleMove = speeds.obstacle * timeScale;

        const newCollectibles = [
          ...prev.collectibles
            .filter(c => c.x > -PLAYER_SIZE)
            .map(c => ({
              ...c,
              x: c.x - horizontalMove,
            })),
          ...(shouldSpawnCollectible ? [spawnCollectible()] : []),
        ];

        const newObstacles = [
          ...prev.obstacles
            .filter(o => o.x > -PLAYER_SIZE)
            .map(o => ({
              ...o,
              x: o.x - obstacleMove,
            })),
          ...(shouldSpawnObstacle ? [spawnObstacle()] : []),
        ];

        const newState = {
          ...prev,
          player: newPlayer,
          collectibles: newCollectibles,
          obstacles: newObstacles,
        };

        return checkCollisions(newState);
      });

      lastTimeRef.current = timestamp;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (!gameState.isGameOver && !gameState.isPaused) {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1),
        }));
      }, 1000);
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [gameState.isGameOver, gameState.isPaused]);

  useEffect(() => {
    updateGameDimensions();
    window.addEventListener('resize', updateGameDimensions);
    window.addEventListener('keydown', handleKeyPress);
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', updateGameDimensions);
      window.removeEventListener('keydown', handleKeyPress);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const restartGame = () => {
    setGameState({
      player: initialPlayer,
      collectibles: [],
      obstacles: [],
      score: 0,
      timeLeft: INITIAL_TIME,
      isGameOver: false,
      isPaused: false,
    });
  };

  const shareOnX = () => {
    const text = `🎮 Just scored ${gameState.score} points in YUME-Coin Catcher! Can you beat my score? 🚀\n\nJoin the competition for a chance to win awesome YUME prizes! 🏆\n\n#YUMEOS #YUMEinfrastructure #YUMEai #YUMEcoin @YUMEtech`;
    const url = 'https://catcher.YUMEi.app';
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400 tracking-tight">
          YUME-Coin Catcher
        </h1>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div 
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl touch-none"
          style={{
            width: `${gameWidth}px`,
            height: `${gameHeight}px`,
          }}
          onClick={handleInteraction}
          onTouchStart={handleInteraction}
        >
          <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', width: BASE_GAME_WIDTH, height: BASE_GAME_HEIGHT }}>
            <div
              className={`absolute transition-transform duration-75 will-change-transform ${
                gameState.player.isInvincible ? 'animate-pulse text-yellow-400' :
                gameState.player.hasDoublePoints ? 'text-green-400' : 'text-yellow-300'
              }`}
              style={{
                transform: `translate(${gameState.player.x}px, ${gameState.player.y}px)`,
              }}
            >
              <Rainbow size={PLAYER_SIZE} />
            </div>

            {gameState.collectibles.map((collectible, index) => (
              <div
                key={`collectible-${index}-${collectible.x}-${collectible.y}`}
                className="absolute will-change-transform"
                style={{
                  transform: `translate3d(${collectible.x}px, ${collectible.y}px, 0) rotate(${collectible.rotation}deg)`,
                  transition: 'transform 16ms linear',
                }}
              >
                {collectible.type === 'token' && (
                  <div className="text-yellow-300">
                    <Rainbow size={PLAYER_SIZE} />
                  </div>
                )}
                {collectible.type === 'moonRocket' && (
                  <div className="text-green-400">
                    <Rocket size={PLAYER_SIZE} />
                  </div>
                )}
                {collectible.type === 'diamondHands' && (
                  <div className="text-blue-400">
                    <Gem size={PLAYER_SIZE} />
                  </div>
                )}
              </div>
            ))}

            {gameState.obstacles.map((obstacle, index) => (
              <div
                key={`obstacle-${index}-${obstacle.x}-${obstacle.y}`}
                className="absolute will-change-transform text-red-400/80"
                style={{
                  transform: `translate3d(${obstacle.x}px, ${obstacle.y}px, 0) rotate(${obstacle.rotation}deg)`,
                  transition: 'transform 16ms linear',
                }}
              >
                <Cloud size={PLAYER_SIZE * 1.5} fill="currentColor" />
              </div>
            ))}

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <div className="text-white/90 text-xl font-medium">
                Score: {gameState.score}
              </div>
              <div className="flex items-center gap-2 text-white/90 text-xl font-medium">
                <Timer className="w-5 h-5" />
                {Math.ceil(gameState.timeLeft)}s
              </div>
              <div className="text-white/90 text-xl font-medium">
                Level {Math.floor(gameState.score / 100) + 1}
              </div>
            </div>

            {gameState.isGameOver && (
              <div className="absolute inset-0 backdrop-blur-xl bg-black/40 flex flex-col items-center justify-center">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400 mb-2">
                  YUME-Coin Catcher
                </h2>
                <p className="text-4xl font-bold text-white/90 mb-8">Game Over!</p>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-8 py-4 mb-8">
                  <p className="text-2xl text-white/90">Final Score: {gameState.score}</p>
                  <p className="text-lg text-white/80 mt-2">Share your score for a chance to win awesome YUME prizes! 🎁</p>
                </div>
                <div className="flex flex-col gap-4">
                  <button
                    onClick={shareOnX}
                    className="px-8 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-blue-500/20"
                  >
                    Share on X (Twitter)
                  </button>
                  <button
                    onClick={restartGame}
                    className="px-8 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg shadow-indigo-500/20"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <span className="text-white/70 text-sm">
                  {window.innerWidth < 768 ? 'Tap to jump' : 'Press Space to jump'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          <a
            href="https://discord.com/invite/TBS9f9tm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 transition-colors duration-200"
          >
            <Discord size={20} className="w-5 h-5" />
            <span className="text-sm font-medium">Discord</span>
          </a>
          
          <a
            href="https://dexscreener.com/solana/ej6n6y8qwkc9ytcz5utazrizzgubusb2fz61crhszgd8"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 transition-colors duration-200"
          >
            <Dexscreener size={20} className="w-5 h-5" />
            <span className="text-sm font-medium">Dexscreener</span>
          </a>

          <a
            href="https://github.com/YUMEinfrastructure"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 transition-colors duration-200"
          >
            <Github className="w-5 h-5" />
            <span className="text-sm font-medium">GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default Game;