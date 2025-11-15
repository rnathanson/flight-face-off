import { useEffect, useState } from 'react';
import { Plane, Car } from 'lucide-react';

interface RacingVisualizationProps {
  sr22Time: number; // minutes
  jetTime: number; // minutes
  commercialTime?: number; // minutes (optional)
  drivingTime?: number; // minutes (optional)
  distance: number; // nautical miles
  showCommercial?: boolean;
  showDriving?: boolean;
  autoStart?: boolean;
}

export function RacingVisualization({ 
  sr22Time, 
  jetTime, 
  commercialTime, 
  drivingTime,
  distance,
  showCommercial = false,
  showDriving = false,
  autoStart = false
}: RacingVisualizationProps) {
  const [sr22Progress, setSr22Progress] = useState(0);
  const [jetProgress, setJetProgress] = useState(0);
  const [commercialProgress, setCommercialProgress] = useState(0);
  const [drivingProgress, setDrivingProgress] = useState(0);
  const [isRacing, setIsRacing] = useState(autoStart);
  const [winner, setWinner] = useState<'sr22' | 'jet' | 'commercial' | 'driving' | null>(null);

  useEffect(() => {
    if (!isRacing) return;

    // Reset
    setSr22Progress(0);
    setJetProgress(0);
    setCommercialProgress(0);
    setDrivingProgress(0);
    setWinner(null);

    const startTime = Date.now();
    const animationDuration = 4000; // 4 seconds for the full race

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Calculate progress for each aircraft
      // They move at different speeds based on their actual times
      const sr22AnimProgress = Math.min((progress * animationDuration) / (sr22Time / jetTime * animationDuration), 1);
      const jetAnimProgress = progress;
      
      setSr22Progress(sr22AnimProgress * 100);
      setJetProgress(jetAnimProgress * 100);

      if (showCommercial && commercialTime) {
        // Commercial has 4-hour delay (represented as slower start)
        const commercialDelay = 0.3; // 30% of animation is "waiting"
        const commercialAnimProgress = Math.max(0, (progress - commercialDelay) / (1 - commercialDelay));
        const commercialSpeed = Math.min((commercialAnimProgress * animationDuration) / (commercialTime / jetTime * animationDuration), 1);
        setCommercialProgress(commercialSpeed * 100);
      }

      if (showDriving && drivingTime) {
        // Driving moves at its own pace
        const drivingAnimProgress = Math.min((progress * animationDuration) / (drivingTime / jetTime * animationDuration), 1);
        setDrivingProgress(drivingAnimProgress * 100);
      }

      // Check for winners
      if (progress >= 1) {
        clearInterval(interval);
        // Determine winner based on actual times
        const times = [
          { name: 'jet', time: jetTime },
          { name: 'sr22', time: sr22Time },
          ...(showCommercial && commercialTime ? [{ name: 'commercial', time: commercialTime }] : []),
          ...(showDriving && drivingTime ? [{ name: 'driving', time: drivingTime }] : [])
        ];
        
        const fastest = times.reduce((prev, current) => (prev.time < current.time) ? prev : current);
        setWinner(fastest.name as 'sr22' | 'jet' | 'commercial' | 'driving');
      }
    }, 16);

    return () => clearInterval(interval);
  }, [isRacing, sr22Time, jetTime, commercialTime, drivingTime, showCommercial, showDriving]);

  const formatTimeRemaining = (progress: number, totalTime: number) => {
    const remaining = Math.max(0, totalTime - (progress / 100 * totalTime));
    const hours = Math.floor(remaining / 60);
    const mins = Math.round(remaining % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {!isRacing && (
        <div className="text-center">
          <button
            onClick={() => setIsRacing(true)}
            className="px-8 py-4 bg-accent text-accent-foreground rounded-lg font-bold text-lg hover:shadow-glow transition-smooth uppercase"
          >
            Start Race
          </button>
        </div>
      )}

      {isRacing && (
        <div className="space-y-4">
          {/* Vision Jet */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Plane className="w-6 h-6 text-jet rotate-90" />
                <span className="font-bold text-jet">Vision Jet</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {jetProgress < 100 ? (winner ? '+' : '') + formatTimeRemaining(jetProgress, jetTime) : '✓ Arrived'}
              </span>
            </div>
            <div className="h-10 md:h-12 bg-muted rounded-lg overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-jet/50 to-jet transition-all duration-100 ease-linear"
                style={{ width: `${jetProgress}%` }}
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Plane className={`w-6 h-6 text-white rotate-90 ${winner === 'jet' ? 'jet-glow' : ''}`} />
                </div>
              </div>
            </div>
          </div>

          {/* SR22 */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Plane className="w-6 h-6 text-sr22 rotate-90" />
                <span className="font-bold text-sr22">SR22</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {sr22Progress < 100 ? (winner ? '+' : '') + formatTimeRemaining(sr22Progress, sr22Time) : '✓ Arrived'}
              </span>
            </div>
            <div className="h-10 md:h-12 bg-muted rounded-lg overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-sr22/50 to-sr22 transition-all duration-100 ease-linear"
                style={{ width: `${sr22Progress}%` }}
              >
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Plane className={`w-6 h-6 text-white rotate-90 ${winner === 'sr22' ? 'sr22-glow' : ''}`} />
                </div>
              </div>
            </div>
          </div>

          {/* Commercial (optional) */}
          {showCommercial && commercialTime && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Plane className="w-6 h-6 text-muted-foreground rotate-90" />
                  <span className="font-bold text-muted-foreground">Commercial</span>
                  {commercialProgress < 10 && (
                    <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                      ⏳ 4hr overhead
                    </span>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {commercialProgress < 100 ? (winner ? '+' : '') + formatTimeRemaining(commercialProgress, commercialTime) : '✓ Arrived'}
                </span>
              </div>
              <div className="h-10 md:h-12 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-muted-foreground/50 to-muted-foreground transition-all duration-100 ease-linear"
                  style={{ width: `${commercialProgress}%` }}
                >
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Plane className="w-6 h-6 text-white rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Driving (optional) */}
          {showDriving && drivingTime && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Car className="w-6 h-6 text-muted-foreground" />
                  <span className="font-bold text-muted-foreground">Driving</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {drivingProgress < 100 ? (winner ? '+' : '') + formatTimeRemaining(drivingProgress, drivingTime) : '✓ Arrived'}
                </span>
              </div>
              <div className="h-10 md:h-12 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-muted-foreground/50 to-muted-foreground transition-all duration-100 ease-linear"
                  style={{ width: `${drivingProgress}%` }}
                >
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {winner && (
            <div className="text-center mt-6 animate-scale-in">
              <div className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg">
                <p className="text-2xl font-bold uppercase">
                  {winner === 'jet' && 'Vision Jet Wins!'}
                  {winner === 'sr22' && 'SR22 Wins!'}
                  {winner === 'commercial' && 'Commercial Wins!'}
                  {winner === 'driving' && 'Driving Wins!'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
