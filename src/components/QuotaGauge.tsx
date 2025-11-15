import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface QuotaGaugeProps {
  current: number;
  target: number;
}

export function QuotaGauge({ current, target }: QuotaGaugeProps) {
  const percentage = Math.min((current / target) * 100, 150);
  const rotation = (percentage / 150) * 270 - 135; // -135 to 135 degrees

  // Create gauge data
  const data = [
    { value: percentage, color: percentage >= 100 ? 'hsl(var(--success))' : percentage >= 75 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' },
    { value: 150 - percentage, color: 'hsl(var(--muted))' }
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Quota Attainment</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center mt-8">
            <div className="text-4xl font-bold text-foreground">{current}%</div>
            <div className="text-sm text-muted-foreground">of {target}% target</div>
          </div>
        </div>

        {/* Gauge Markers */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-8">
          <span>0%</span>
          <span>75%</span>
          <span>100%</span>
          <span>150%</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monthly Target</span>
          <span className="font-semibold">$4.8M</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Current Pipeline</span>
          <span className="font-semibold text-success">$6.1M</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Projected Close</span>
          <span className="font-semibold text-success">$5.2M</span>
        </div>
      </div>
    </Card>
  );
}