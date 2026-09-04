import React, { useState, useEffect, useCallback } from 'react';
import { SectorId, GameStateData } from './types';
import { MainMenu } from './components/MainMenu';
import { IntroStory } from './components/IntroStory';
import { StationMap } from './components/StationMap';
import { SectorScreen } from './components/SectorScreen';
import { VictoryScreen } from './components/VictoryScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { TheoryGuide } from './components/TheoryGuide';
import { AchievementsModal } from './components/AchievementsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { FreeLaboratory } from './components/FreeLaboratory';
import { AstronautCalculator } from './components/AstronautCalculator';
import { CertificateModal } from './components/CertificateModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { sound } from './utils/audio';

const STORAGE_KEY = 'ARES3_ORBITAL_CIRCUITS_SAVE';
const MAX_LIVES = 5;

export default function App() {
  // Main Game State
  const [gameState, setGameState] = useState<GameStateData['status']>('MENU');
  const [activeSectorId, setActiveSectorId] = useState<SectorId | null>(null);
  
  // Player Astronaut Identity & Lives (5 Lives System)
  const [playerName, setPlayerName] = useState<string>('Astronauta');
  const [lives, setLives] = useState<number>(MAX_LIVES);

  // Modals & Tools
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showTheory, setShowTheory] = useState<boolean>(false);
  const [showAchievements, setShowAchievements] = useState<boolean>(false);
  const [showLab, setShowLab] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [showAudioSettings, setShowAudioSettings] = useState<boolean>(false);

  // Stats & Progress
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [stationIntegrity, setStationIntegrity] = useState<number>(100);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [wrongAnswersCount, setWrongAnswersCount] = useState<number>(0);
  const [hintsUsedCount, setHintsUsedCount] = useState<number>(0);
  const [completedSectors, setCompletedSectors] = useState<SectorId[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load Saved Game on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.playerName) setPlayerName(data.playerName);
        if (typeof data.lives === 'number') setLives(data.lives > 0 ? data.lives : MAX_LIVES);
        if (data.score) setScore(data.score);
        if (data.completedSectors) setCompletedSectors(data.completedSectors);
        if (data.unlockedAchievements) setUnlockedAchievements(data.unlockedAchievements);
        if (data.correctAnswersCount) setCorrectAnswersCount(data.correctAnswersCount);
        if (data.wrongAnswersCount) setWrongAnswersCount(data.wrongAnswersCount);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save Progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        playerName,
        lives,
        score,
        completedSectors,
        unlockedAchievements,
        correctAnswersCount,
        wrongAnswersCount,
      }));
    } catch {
      // ignore
    }
  }, [playerName, lives, score, completedSectors, unlockedAchievements, correctAnswersCount, wrongAnswersCount]);

  // Sound Engine Sync
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  const unlockAchievement = useCallback((achId: string) => {
    setUnlockedAchievements((prev) => {
      if (prev.includes(achId)) return prev;
      sound.playFanfare();
      return [...prev, achId];
    });
  }, []);

  // Check achievements & handle 3-lives system on stat updates
  const handleUpdateStats = useCallback((pointsDelta: number, isCorrect: boolean) => {
    if (isCorrect) {
      setScore((prev) => prev + pointsDelta);
      setStreak((prev) => {
        const next = prev + 1;
        if (next > maxStreak) setMaxStreak(next);
        if (next >= 5) unlockAchievement('perfect_streak');
        return next;
      });
      setCorrectAnswersCount((prev) => prev + 1);

      // Slightly restore integrity on correct answer
      setStationIntegrity((prev) => Math.min(100, prev + 5));
    } else {
      setStreak(0);
      setWrongAnswersCount((prev) => prev + 1);

      // Decrement Life in 3-lives system
      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          sound.playAlert();
          setTimeout(() => {
            setGameState('GAME_OVER');
          }, 700);
          return 0;
        }
        return nextLives;
      });

      // Reduce station integrity on mistake
      setStationIntegrity((prev) => {
        const next = prev - 20;
        if (next <= 0) {
          sound.playAlert();
          setTimeout(() => {
            setGameState('GAME_OVER');
          }, 700);
          return 0;
        }
        return next;
      });
    }
  }, [maxStreak, unlockAchievement]);

  // Sector Completion Handler
  const handleSectorCompleted = useCallback((sectorId: SectorId) => {
    setCompletedSectors((prev) => {
      const next = prev.includes(sectorId) ? prev : [...prev, sectorId];
      
      // Sector specific achievements
      if (sectorId === 1) unlockAchievement('first_spark');
      if (sectorId === 2) unlockAchievement('ohm_master');
      if (sectorId === 3) unlockAchievement('series_guardian');
      if (sectorId === 4) unlockAchievement('parallel_wizard');
      if (sectorId === 5) unlockAchievement('mixed_architect');
      if (sectorId === 6) unlockAchievement('power_engineer');
      if (sectorId === 7) unlockAchievement('thermal_protector');
      if (sectorId === 8) {
        unlockAchievement('orbit_hero');
      }
      if (sectorId === 9) {
        unlockAchievement('enem_champion');
        setTimeout(() => {
          setGameState('VITORIA');
        }, 1200);
      }
      return next;
    });
  }, [unlockAchievement]);

  // Game Reset / Restart
  const handleRestartMission = () => {
    setLives(MAX_LIVES);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setStationIntegrity(100);
    setCorrectAnswersCount(0);
    setWrongAnswersCount(0);
    setHintsUsedCount(0);
    setCompletedSectors([]);
    setStartTime(Date.now());
    setActiveSectorId(null);
    setGameState('MAPA_ESTACAO');
  };

  const handleRetryAfterGameOver = () => {
    setLives(MAX_LIVES);
    setStationIntegrity(100);
    setGameState('MAPA_ESTACAO');
  };

  const handleGoHome = () => {
    setGameState('MENU');
    setActiveSectorId(null);
  };

  const handleStartGame = () => {
    if (completedSectors.length > 0) {
      setGameState('MAPA_ESTACAO');
    } else {
      setGameState('INTRO');
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans relative overflow-x-hidden">
      {/* Background Starfield and Galactic Ambient Dust */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
                            radial-gradient(1.5px 1.5px at 140px 180px, #38bdf8, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 280px 90px, #e0f2fe, rgba(0,0,0,0)),
                            radial-gradient(2px 2px at 420px 320px, #06b6d4, rgba(0,0,0,0)),
                            radial-gradient(1px 1px at 560px 210px, #ffffff, rgba(0,0,0,0)),
                            radial-gradient(1.5px 1.5px at 700px 450px, #38bdf8, rgba(0,0,0,0))`,
          backgroundRepeat: 'repeat',
          backgroundSize: '800px 800px',
        }}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-center p-3 sm:p-6 lg:p-8">
        {gameState === 'MENU' && (
          <MainMenu
            playerName={playerName}
            onUpdatePlayerName={setPlayerName}
            onStartGame={handleStartGame}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onOpenTheory={() => setShowTheory(true)}
            onOpenAchievements={() => setShowAchievements(true)}
            onOpenLab={() => setShowLab(true)}
            onOpenCalculator={() => setShowCalculator(true)}
            onOpenAudioSettings={() => setShowAudioSettings(true)}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            completedSectorsCount={completedSectors.length}
          />
        )}

        {gameState === 'INTRO' && (
          <IntroStory
            playerName={playerName}
            onStartMission={() => setGameState('MAPA_ESTACAO')}
          />
        )}

        {gameState === 'MAPA_ESTACAO' && (
          <StationMap
            playerName={playerName}
            lives={lives}
            completedSectors={completedSectors}
            currentSectorId={activeSectorId}
            onSelectSector={(id) => {
              setActiveSectorId(id);
              setGameState('SECTOR_ACTIVE');
            }}
            stationIntegrity={stationIntegrity}
            score={score}
            streak={streak}
            onOpenTheory={() => setShowTheory(true)}
            onOpenAchievements={() => setShowAchievements(true)}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
            onOpenLab={() => setShowLab(true)}
            onOpenCalculator={() => setShowCalculator(true)}
            onOpenCertificate={() => setShowCertificate(true)}
            onOpenAudioSettings={() => setShowAudioSettings(true)}
          />
        )}

        {gameState === 'SECTOR_ACTIVE' && activeSectorId && (
          <SectorScreen
            sectorId={activeSectorId}
            playerName={playerName}
            lives={lives}
            onBackToMap={() => {
              setActiveSectorId(null);
              setGameState('MAPA_ESTACAO');
            }}
            onSectorCompleted={handleSectorCompleted}
            onUpdateStats={handleUpdateStats}
            stationIntegrity={stationIntegrity}
            score={score}
            streak={streak}
          />
        )}

        {gameState === 'VITORIA' && (
          <VictoryScreen
            playerName={playerName}
            score={score}
            correctAnswersCount={correctAnswersCount}
            wrongAnswersCount={wrongAnswersCount}
            startTime={startTime}
            onRestart={handleRestartMission}
            onGoHome={handleGoHome}
            onOpenCertificate={() => setShowCertificate(true)}
            onOpenLab={() => setShowLab(true)}
          />
        )}

        {gameState === 'GAME_OVER' && (
          <GameOverScreen
            playerName={playerName}
            onRestart={handleRetryAfterGameOver}
            onGoHome={handleGoHome}
          />
        )}
      </main>

      {/* Interactive Free Laboratory Modal */}
      {showLab && (
        <FreeLaboratory onClose={() => setShowLab(false)} />
      )}

      {/* Floating Astronaut Calculator Modal */}
      {showCalculator && (
        <AstronautCalculator onClose={() => setShowCalculator(false)} />
      )}

      {/* Official Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          playerName={playerName}
          score={score}
          accuracy={
            correctAnswersCount + wrongAnswersCount > 0
              ? Math.round((correctAnswersCount / (correctAnswersCount + wrongAnswersCount)) * 100)
              : 100
          }
          totalAnswered={correctAnswersCount + wrongAnswersCount}
          onClose={() => setShowCertificate(false)}
        />
      )}

      {/* Floating Modals */}
      {showTheory && (
        <TheoryGuide onClose={() => setShowTheory(false)} />
      )}

      {showAchievements && (
        <AchievementsModal
          unlockedAchievements={unlockedAchievements}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* Audio & Voice Settings Modal */}
      {showAudioSettings && (
        <AudioSettingsModal onClose={() => setShowAudioSettings(false)} />
      )}

      {/* Footer Branding */}
      <footer className="relative z-10 py-3 px-4 text-center text-[11px] font-mono text-slate-500 border-t border-slate-900 bg-slate-950/60 backdrop-blur-sm space-y-1">
        <div>Circuitos Elétricos — Missão: Salvar a Estação Orbital • Física 3º Ano EM • Mascote Tigrão</div>
        <div className="text-cyan-400/70 font-medium">feito com carinho pelo <span className="text-cyan-300 font-semibold">prof. Silas</span></div>
      </footer>
    </div>
  );
}
