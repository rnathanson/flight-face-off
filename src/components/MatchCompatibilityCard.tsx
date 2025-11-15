import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MatchResult } from '@/lib/matchingAlgorithm';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface MatchCompatibilityCardProps {
  match: MatchResult;
  profile1Name: string;
  profile2Name: string;
}

export function MatchCompatibilityCard({ match, profile1Name, profile2Name }: MatchCompatibilityCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <Card className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            {profile1Name} ↔ {profile2Name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{match.recommendation}</p>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(match.score)}`}>
          {match.score}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Compatibility Score</span>
          <span className="font-medium">{match.score}%</span>
        </div>
        <Progress value={match.score} className="h-2" />
      </div>

      {/* Factor Breakdown */}
      <div className="space-y-3 pt-2">
        <h4 className="font-semibold text-sm">Match Factors</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {match.factors.aircraftMatch ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">Aircraft Match</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {match.factors.shareMatch ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">Share Compatibility</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getScoreBgColor(match.factors.timelineAlignment)}`} />
              <span className="text-sm">Timeline ({match.factors.timelineAlignment}%)</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getScoreBgColor(match.factors.scheduleCompatibility)}`} />
              <span className="text-sm">Schedule ({match.factors.scheduleCompatibility}%)</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{match.factors.pilotMix}</Badge>
              <span className="text-sm">Pilot Mix</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getScoreBgColor(match.factors.budgetCompatibility)}`} />
              <span className="text-sm">Budget ({match.factors.budgetCompatibility}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {match.warnings.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-amber-600">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Considerations</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {match.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Match Badge */}
      <div className="pt-2">
        <Badge 
          variant={match.score >= 80 ? 'default' : match.score >= 60 ? 'secondary' : 'outline'}
          className="w-full justify-center"
        >
          {match.score >= 80 ? '🎯 Excellent Match' : match.score >= 60 ? '✅ Good Match' : '⚠️ Consider Carefully'}
        </Badge>
      </div>
    </Card>
  );
}
