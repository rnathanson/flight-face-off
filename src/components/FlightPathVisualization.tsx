import { useEffect, useRef, useState } from 'react';

interface FlightPathVisualizationProps {
  from: string;
  to: string;
  distance: number;
  sr22Stops: number;
  jetStops: number;
  sr22Range: number;
  jetRange: number;
  showAnimation?: boolean;
  onAnimationComplete?: () => void;
}

export function FlightPathVisualization({ 
  from, 
  to, 
  distance, 
  sr22Stops, 
  jetStops,
  showAnimation = false,
  onAnimationComplete
}: FlightPathVisualizationProps) {
  // Dynamic sizing to ensure paths reach the destination label
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgWidth, setSvgWidth] = useState(800);
  const [sr22Progress, setSr22Progress] = useState(0);
  const [jetProgress, setJetProgress] = useState(0);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [sr22ElapsedTime, setSr22ElapsedTime] = useState(0); // in minutes
  const [jetElapsedTime, setJetElapsedTime] = useState(0); // in minutes

  // Path refs and computed lengths for precise dash animations
  const sr22PathRefs = useRef<SVGPathElement[]>([]);
  const jetPathRefs = useRef<SVGPathElement[]>([]);
  const [sr22PathLengths, setSr22PathLengths] = useState<number[]>([]);
  const [jetPathLengths, setJetPathLengths] = useState<number[]>([]);

  useEffect(() => {
    const update = () => setSvgWidth(containerRef.current?.clientWidth ?? 800);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Measure actual SVG path lengths so the dash animation aligns with the head position
  useEffect(() => {
    const sr = sr22PathRefs.current.map(p => (p ? p.getTotalLength() : 0));
    const jt = jetPathRefs.current.map(p => (p ? p.getTotalLength() : 0));
    setSr22PathLengths(sr);
    setJetPathLengths(jt);
  }, [svgWidth, sr22Stops, jetStops]);

  // Animation effect with realistic flight physics
  useEffect(() => {
    if (showAnimation && !animationStarted) {
      setAnimationStarted(true);
      setSr22Progress(0);
      setJetProgress(0);
      
      // Get actual flight data
      const sr22Speed = 183; // knots (cruise speed)
      const jetSpeed = 300; // knots (cruise speed)
      const sr22StopTime = 20; // minutes per stop - quick fuel stop
      const jetStopTime = 20; // minutes per stop - quick fuel stop
      const taxiTime = 20; // minutes (10 min each end)
      
      // Calculate actual flight times in minutes
      const sr22FlightTime = (distance / sr22Speed) * 60; // convert to minutes
      const jetFlightTime = (distance / jetSpeed) * 60;
      
      // Total time including stops and taxi
      const sr22TotalTime = sr22FlightTime + taxiTime + (sr22Stops > 0 ? sr22Stops * sr22StopTime : 0);
      const jetTotalTime = jetFlightTime + taxiTime + (jetStops > 0 ? jetStops * jetStopTime : 0);
      
      // Animation duration in ms - scale to 5-8 seconds for viewing pleasure
      const maxTime = Math.max(sr22TotalTime, jetTotalTime);
      const animationDuration = Math.min(8000, Math.max(5000, maxTime * 50)); // Scale factor for visual speed
      
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const animProgress = Math.min(elapsed / animationDuration, 1);
        
        // Calculate actual time passed in "flight minutes"
        const flightMinutesPassed = animProgress * maxTime;
        
        // SR22 Progress calculation - time synced to visual progress
        let sr22Prog = 0;
        
        if (sr22Stops === 0) {
          // No stops - linear progress
          sr22Prog = Math.min((flightMinutesPassed / sr22TotalTime), 1);
        } else {
          // With stops - account for stop times
          let timeAccounted = 0;
          const legDistance = distance / (sr22Stops + 1);
          const legTime = (legDistance / sr22Speed) * 60;
          
          for (let i = 0; i <= sr22Stops; i++) {
            const legEnd = timeAccounted + legTime;
            const stopEnd = i < sr22Stops ? legEnd + sr22StopTime : legEnd;
            
            if (flightMinutesPassed <= legEnd) {
              // Currently flying this leg
              const legProgress = (flightMinutesPassed - timeAccounted) / legTime;
              sr22Prog = (i + legProgress) / (sr22Stops + 1);
              break;
            } else if (i < sr22Stops && flightMinutesPassed <= stopEnd) {
              // Currently stopped
              sr22Prog = (i + 1) / (sr22Stops + 1);
              break;
            }
            
            timeAccounted = stopEnd;
            if (i === sr22Stops) {
              sr22Prog = 1;
            }
          }
        }
        
        sr22Prog = Math.min(sr22Prog, 1);
        setSr22Progress(sr22Prog);
        
        // Time display matches visual progress exactly
        setSr22ElapsedTime(sr22Prog * sr22TotalTime);
        
        // Vision Jet Progress calculation - time synced to visual progress
        let jetProg = 0;
        
        if (jetStops === 0) {
          // No stops - linear progress
          jetProg = Math.min((flightMinutesPassed / jetTotalTime), 1);
        } else {
          // With stops - account for stop times
          let timeAccounted = 0;
          const legDistance = distance / (jetStops + 1);
          const legTime = (legDistance / jetSpeed) * 60;
          
          for (let i = 0; i <= jetStops; i++) {
            const legEnd = timeAccounted + legTime;
            const stopEnd = i < jetStops ? legEnd + jetStopTime : legEnd;
            
            if (flightMinutesPassed <= legEnd) {
              // Currently flying this leg
              const legProgress = (flightMinutesPassed - timeAccounted) / legTime;
              jetProg = (i + legProgress) / (jetStops + 1);
              break;
            } else if (i < jetStops && flightMinutesPassed <= stopEnd) {
              // Currently stopped
              jetProg = (i + 1) / (jetStops + 1);
              break;
            }
            
            timeAccounted = stopEnd;
            if (i === jetStops) {
              jetProg = 1;
            }
          }
        }
        
        jetProg = Math.min(jetProg, 1);
        setJetProgress(jetProg);
        
        // Time display matches visual progress exactly
        setJetElapsedTime(jetProg * jetTotalTime);
        
        if (animProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Animation complete - ensure both at 100%
          setSr22Progress(1);
          setJetProgress(1);
          // Fire completion on the next animation frame so the final path is painted
          requestAnimationFrame(() => {
            onAnimationComplete?.();
          });
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [showAnimation, animationStarted, onAnimationComplete, distance, sr22Stops, jetStops]);

  const margin = 50;
  const startX = margin;
  const endX = Math.max(margin + 1, svgWidth - margin);
  const totalWidth = endX - startX;

  // Check if aircraft is eliminated (-1 means not viable)
  const sr22Eliminated = sr22Stops < 0;
  const jetEliminated = jetStops < 0;

  // Geometry
  const sr22Y = 90;
  const jetY = 110;
  const stopY = 120; // Y position where stops land
  
  // Create arc segments for multi-stop flights
  const createArcSegments = (stops: number, y: number, ctrlYOffset: number) => {
    if (stops <= 0) {
      // Nonstop flight - single arc
      const midX = startX + totalWidth / 2;
      return {
        paths: [`M ${startX} ${y} Q ${midX} ${y - ctrlYOffset}, ${endX} ${y}`],
        stopPoints: []
      };
    }
    
    // Multiple stops - create segment for each leg
    const legs = stops + 1;
    const segmentWidth = totalWidth / legs;
    const paths: string[] = [];
    const stopPoints: { x: number; y: number }[] = [];
    
    for (let i = 0; i < legs; i++) {
      const segStartX = startX + (i * segmentWidth);
      const segEndX = startX + ((i + 1) * segmentWidth);
      const segMidX = (segStartX + segEndX) / 2;
      
      // Arc descends to stop or stays at flight level
      const startY = i === 0 ? y : stopY;
      const endY = i === legs - 1 ? y : stopY;
      const ctrlY = y - ctrlYOffset;
      
      paths.push(`M ${segStartX} ${startY} Q ${segMidX} ${ctrlY}, ${segEndX} ${endY}`);
      
      // Add stop marker (except at destination)
      if (i < legs - 1) {
        stopPoints.push({ x: segEndX, y: stopY });
      }
    }
    
    return { paths, stopPoints };
  };

  const sr22Arcs = sr22Eliminated ? { paths: [], stopPoints: [] } : createArcSegments(sr22Stops, sr22Y, 70);
  const jetArcs = jetEliminated ? { paths: [], stopPoints: [] } : createArcSegments(jetStops, jetY, 70);

  // Helper to get current head (x,y) locked to the drawn arc
  const getHeadPosition = (stops: number, baseY: number, progress: number) => {
    const ctrlYOffset = 70;
    if (progress <= 0) return { x: startX, y: baseY };
    if (progress >= 1) return { x: endX, y: baseY };
    if (stops <= 0) {
      const t = progress;
      const midX = startX + totalWidth / 2;
      const ctrlY = baseY - ctrlYOffset;
      const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
      const y = (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * ctrlY + t * t * baseY;
      return { x, y };
    }
    const legs = stops + 1;
    let idx = Math.floor(progress * legs);
    let t = progress * legs - idx;
    if (idx >= legs) { idx = legs - 1; t = 1; }
    if (t === 0 && progress > 0) {
      if (idx > 0) { idx = idx - 1; t = 1; }
    }
    const segmentWidth = totalWidth / legs;
    const segStartX = startX + idx * segmentWidth;
    const segEndX = startX + (idx + 1) * segmentWidth;
    const segMidX = (segStartX + segEndX) / 2;
    const startYForLeg = idx === 0 ? baseY : stopY;
    const endYForLeg = idx === legs - 1 ? baseY : stopY;
    const ctrlY = baseY - ctrlYOffset;
    const x = (1 - t) * (1 - t) * segStartX + 2 * (1 - t) * t * segMidX + t * t * segEndX;
    const y = (1 - t) * (1 - t) * startYForLeg + 2 * (1 - t) * t * ctrlY + t * t * endYForLeg;
    return { x, y };
  };

  const sr22Head = !sr22Eliminated ? getHeadPosition(sr22Stops, sr22Y, sr22Progress) : null;
  const jetHead = !jetEliminated ? getHeadPosition(jetStops, jetY, jetProgress) : null;

  return (
    <div ref={containerRef} className="relative w-full h-40 md:h-48 bg-card rounded-lg p-3 md:p-4 overflow-hidden border-2 border-primary/20">
      {/* Distance display at top center */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 text-center">
        <div className="text-2xl md:text-3xl font-bold text-primary">{Math.round(distance)} nm</div>
      </div>
      
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid-combined" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-combined)" />
        </svg>
      </div>

      {/* Flight paths */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sr22Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--sr22-color))" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="hsl(var(--sr22-color))" stopOpacity="1"/>
          </linearGradient>
          <linearGradient id="jetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--jet-color))" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="hsl(var(--jet-color))" stopOpacity="1"/>
          </linearGradient>
        </defs>

        {/* SR22 Path - multiple arc segments for stops */}
        {sr22Eliminated ? (
          <>
            {/* Muted red dashed path for eliminated aircraft */}
            <path
              d={`M ${startX} ${sr22Y} Q ${startX + totalWidth / 2} ${sr22Y - 70}, ${endX} ${sr22Y}`}
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth="4"
              strokeDasharray="10,10"
              opacity="0.2"
            />
          </>
        ) : (
          <>
            {/* Draw each arc segment */}
            {sr22Arcs.paths.map((pathData, idx) => {
              const length = sr22PathLengths[idx] ?? 0;
              const totalLegs = sr22Stops + 1;
              
              // Calculate which leg we're currently on based on progress
              const currentLeg = Math.floor(sr22Progress * totalLegs);
              const legProgress = (sr22Progress * totalLegs) - currentLeg;
              
              let visible = 0; // 0..1 visible fraction of this segment
              if (idx < currentLeg) {
                // Completed leg - fully drawn
                visible = 1;
              } else if (idx === currentLeg) {
                // Current leg - being drawn
                visible = Math.max(0, Math.min(1, legProgress));
              } else {
                // Future leg - hidden
                visible = 0;
              }
              
              const dashArray = Math.max(length, 1);
              const offset = dashArray * (1 - visible);
              
              return (
                <path
                  key={`sr22-arc-${idx}`}
                  ref={(el) => { if (el) sr22PathRefs.current[idx] = el; }}
                  d={pathData}
                  fill="none"
                  stroke="url(#sr22Gradient)"
                  strokeWidth="4"
                  strokeDasharray={dashArray}
                  strokeDashoffset={showAnimation ? offset : 0}
                  style={{ transition: 'none' }}
                />
              );
            })}
            {/* Draw stop markers */}
            {sr22Arcs.stopPoints.map((pt, idx) => (
              <circle 
                key={`sr22-stop-${idx}`} 
                cx={pt.x} 
                cy={pt.y} 
                r="6" 
                fill="hsl(var(--warning))" 
                className="animate-scale-in" 
              />
            ))}
          </>
        )}

        {/* Vision Jet Path - multiple arc segments for stops */}
        {jetEliminated ? (
          <>
            {/* Muted red dashed path for eliminated aircraft */}
            <path
              d={`M ${startX} ${jetY} Q ${startX + totalWidth / 2} ${jetY - 70}, ${endX} ${jetY}`}
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth="4"
              strokeDasharray="10,10"
              opacity="0.2"
            />
          </>
        ) : (
          <>
            {/* Draw each arc segment */}
            {jetArcs.paths.map((pathData, idx) => {
              const length = jetPathLengths[idx] ?? 0;
              const totalLegs = jetStops + 1;
              
              // Calculate which leg we're currently on based on progress
              const currentLeg = Math.floor(jetProgress * totalLegs);
              const legProgress = (jetProgress * totalLegs) - currentLeg;
              
              let visible = 0; // 0..1 visible fraction of this segment
              if (idx < currentLeg) {
                // Completed leg - fully drawn
                visible = 1;
              } else if (idx === currentLeg) {
                // Current leg - being drawn
                visible = Math.max(0, Math.min(1, legProgress));
              } else {
                // Future leg - hidden
                visible = 0;
              }
              
              const dashArray = Math.max(length, 1);
              const offset = dashArray * (1 - visible);
              
              return (
                <path
                  key={`jet-arc-${idx}`}
                  ref={(el) => { if (el) jetPathRefs.current[idx] = el; }}
                  d={pathData}
                  fill="none"
                  stroke="url(#jetGradient)"
                  strokeWidth="4"
                  strokeDasharray={dashArray}
                  strokeDashoffset={showAnimation ? offset : 0}
                  style={{ transition: 'none' }}
                />
              );
            })}
            {/* Draw stop markers */}
            {jetArcs.stopPoints.map((pt, idx) => (
              <circle 
                key={`jet-stop-${idx}`} 
                cx={pt.x} 
                cy={pt.y} 
                r="6" 
                fill="hsl(var(--warning))" 
                className="animate-scale-in" 
              />
            ))}
          </>
        )}

        {/* Start marker */}
        <circle cx={startX} cy={100} r="8" fill="hsl(var(--primary))" className="animate-scale-in" />
        {/* End markers */}
        {!sr22Eliminated && <circle cx={endX} cy={sr22Y} r="6" fill="hsl(var(--sr22-color))" className="animate-scale-in" />}
        {!jetEliminated && <circle cx={endX} cy={jetY} r="6" fill="hsl(var(--jet-color))" className="animate-scale-in" />}
        
        {/* Elapsed time displays */}
        {showAnimation && animationStarted && (
          <>
            {/* SR22 Time */}
            {!sr22Eliminated && sr22Progress > 0 && sr22Head && (
              <text 
                x={sr22Head.x}
                y={sr22Head.y - 16} 
                fill="hsl(var(--sr22-color))" 
                fontSize="14" 
                fontWeight="bold"
                textAnchor="middle"
                className="font-sans"
              >
                {Math.floor(sr22ElapsedTime / 60)}h {Math.round(sr22ElapsedTime % 60)}m
              </text>
            )}
            
            {/* Jet Time */}
            {!jetEliminated && jetProgress > 0 && jetHead && (
              <text 
                x={jetHead.x}
                y={jetHead.y + 18} 
                fill="hsl(var(--jet-color))" 
                fontSize="14" 
                fontWeight="bold"
                textAnchor="middle"
                className="font-sans"
              >
                {Math.floor(jetElapsedTime / 60)}h {Math.round(jetElapsedTime % 60)}m
              </text>
            )}
          </>
        )}
      </svg>

      {/* Labels - From/To only */}
      <div className="relative z-10 flex justify-between items-end h-full pt-8">
        <div className="text-left">
          <div className="text-xs text-muted-foreground uppercase">From</div>
          <div className="text-sm font-bold text-primary">{from.split(',')[0]}</div>
        </div>
        <div className="text-center">
          <div className="flex gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-sr22"></div>
              <span className={`font-semibold ${sr22Eliminated ? 'line-through opacity-50 text-destructive' : 'text-sr22'}`}>
                SR22 {sr22Eliminated ? '(not viable)' : sr22Stops > 0 ? `(${sr22Stops} stop${sr22Stops > 1 ? 's' : ''})` : '(nonstop)'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-jet"></div>
              <span className={`font-semibold ${jetEliminated ? 'line-through opacity-50 text-destructive' : 'text-jet'}`}>
                Jet {jetEliminated ? '(not viable)' : jetStops > 0 ? `(${jetStops} stop${jetStops > 1 ? 's' : ''})` : '(nonstop)'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase">To</div>
          <div className="text-sm font-bold text-primary">{to.split(',')[0]}</div>
        </div>
      </div>
    </div>
  );
}
