import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function ConversionFunnel() {
  const data = [
    { stage: 'Calculator Users', count: 847, rate: 100 },
    { stage: 'Qualified Leads', count: 423, rate: 50 },
    { stage: 'Demo Scheduled', count: 254, rate: 30 },
    { stage: 'In Negotiation', count: 169, rate: 20 },
    { stage: 'Closed Won', count: 85, rate: 10 },
  ];

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--jet-color))',
    'hsl(var(--sr22-color))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
  ];

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
          <YAxis dataKey="stage" type="category" width={120} stroke="hsl(var(--muted-foreground))" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: any) => [value, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-foreground">34%</div>
          <div className="text-xs text-muted-foreground">Overall Conversion</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold text-success">50%</div>
          <div className="text-xs text-muted-foreground">Lead → Demo Rate</div>
        </div>
      </div>
    </Card>
  );
}