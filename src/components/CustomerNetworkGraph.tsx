import { useCallback, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

// Mock data for network graph - Enhanced with more leads
const initialNodes: Node[] = [
  // Naples CTC Cluster (6 nodes)
  { id: '1', type: 'default', position: { x: 250, y: 50 }, data: { label: 'Dr. Patterson', type: 'repeat_customer', influence: 72, location: 'Naples' } },
  { id: '2', type: 'default', position: { x: 100, y: 150 }, data: { label: 'Paul Stevenson', type: 'active_owner', influence: 88, location: 'Naples' } },
  { id: '3', type: 'default', position: { x: 400, y: 150 }, data: { label: 'Marcus Johnson', type: 'new_lead', influence: 45, location: 'Naples' } },
  { id: '4', type: 'default', position: { x: 250, y: 250 }, data: { label: 'Emily Chen', type: 'new_lead', influence: 42, location: 'Naples' } },
  { id: '11', type: 'default', position: { x: 50, y: 50 }, data: { label: 'Tom Richards', type: 'past_owner', influence: 51, location: 'Naples' } },
  { id: '12', type: 'default', position: { x: 450, y: 50 }, data: { label: 'Amy Foster', type: 'active_owner', influence: 68, location: 'Naples' } },
  
  // Dallas CTC Cluster (5 nodes)
  { id: '5', type: 'default', position: { x: 900, y: 50 }, data: { label: 'Jennifer Martinez', type: 'active_owner', influence: 65, location: 'Dallas' } },
  { id: '6', type: 'default', position: { x: 1050, y: 150 }, data: { label: 'Robert Chen', type: 'repeat_customer', influence: 58, location: 'Dallas' } },
  { id: '13', type: 'default', position: { x: 750, y: 150 }, data: { label: 'Michael Brown', type: 'new_lead', influence: 38, location: 'Dallas' } },
  { id: '14', type: 'default', position: { x: 900, y: 250 }, data: { label: 'Sandra Lee', type: 'active_owner', influence: 62, location: 'Dallas' } },
  { id: '15', type: 'default', position: { x: 1050, y: 50 }, data: { label: 'Chris Taylor', type: 'repeat_customer', influence: 55, location: 'Dallas' } },
  
  // Phoenix CTC Cluster (5 nodes)
  { id: '7', type: 'default', position: { x: 250, y: 450 }, data: { label: 'David Wu', type: 'active_owner', influence: 48, location: 'Phoenix' } },
  { id: '8', type: 'default', position: { x: 100, y: 550 }, data: { label: 'Sarah Miller', type: 'new_lead', influence: 35, location: 'Phoenix' } },
  { id: '16', type: 'default', position: { x: 400, y: 550 }, data: { label: 'Brian Davis', type: 'new_lead', influence: 41, location: 'Phoenix' } },
  { id: '17', type: 'default', position: { x: 250, y: 650 }, data: { label: 'Rachel Green', type: 'past_owner', influence: 46, location: 'Phoenix' } },
  { id: '18', type: 'default', position: { x: 100, y: 350 }, data: { label: 'Kevin Park', type: 'active_owner', influence: 59, location: 'Phoenix' } },
  
  // Miami CTC Cluster (5 nodes)
  { id: '9', type: 'default', position: { x: 900, y: 450 }, data: { label: 'James Wilson', type: 'past_owner', influence: 42, location: 'Miami' } },
  { id: '10', type: 'default', position: { x: 1050, y: 550 }, data: { label: 'Lisa Anderson', type: 'new_lead', influence: 38, location: 'Miami' } },
  { id: '19', type: 'default', position: { x: 750, y: 550 }, data: { label: 'Daniel Kim', type: 'active_owner', influence: 64, location: 'Miami' } },
  { id: '20', type: 'default', position: { x: 900, y: 650 }, data: { label: 'Patricia Moore', type: 'repeat_customer', influence: 53, location: 'Miami' } },
  { id: '21', type: 'default', position: { x: 1050, y: 350 }, data: { label: 'Mark Johnson', type: 'new_lead', influence: 37, location: 'Miami' } },
  
  // Scottsdale CTC Cluster (4 nodes)
  { id: '22', type: 'default', position: { x: 550, y: 350 }, data: { label: 'Angela White', type: 'active_owner', influence: 71, location: 'Scottsdale' } },
  { id: '23', type: 'default', position: { x: 550, y: 500 }, data: { label: 'George Harris', type: 'repeat_customer', influence: 49, location: 'Scottsdale' } },
  { id: '24', type: 'default', position: { x: 650, y: 425 }, data: { label: 'Nancy Clark', type: 'new_lead', influence: 33, location: 'Scottsdale' } },
  { id: '25', type: 'default', position: { x: 450, y: 425 }, data: { label: 'Steven Wright', type: 'past_owner', influence: 44, location: 'Scottsdale' } },
];

const initialEdges: Edge[] = [
  // Naples Pod (5 connections) - Hub and spoke around Dr. Patterson
  { id: 'e1-2', source: '1', target: '2', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } },
  { id: 'e1-3', source: '1', target: '3', label: 'Same CTC', style: { strokeDasharray: '5,5', stroke: '#94a3b8' } },
  { id: 'e1-4', source: '1', target: '4', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } },
  { id: 'e11-12', source: '11', target: '12', label: 'Friend', style: { strokeWidth: 2, stroke: '#3b82f6' } },
  
  // Dallas Pod (4 connections) - Hub around Jennifer Martinez
  { id: 'e5-6', source: '5', target: '6', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } },
  { id: 'e5-14', source: '5', target: '14', label: 'Same CTC', style: { strokeDasharray: '5,5', stroke: '#94a3b8' } },
  { id: 'e13-15', source: '13', target: '15', label: 'Friend', style: { strokeWidth: 2, stroke: '#3b82f6' } },
  
  // Phoenix Pod (3 connections) - Smaller network
  { id: 'e7-18', source: '7', target: '18', label: 'Business', style: { strokeDasharray: '3,3', strokeWidth: 2, stroke: '#f59e0b' } },
  { id: 'e8-16', source: '8', target: '16', label: 'Same CTC', style: { strokeDasharray: '5,5', stroke: '#94a3b8' } },
  // Node 17 (Rachel Green) is isolated - new lead
  
  // Miami Pod (3 connections)
  { id: 'e19-20', source: '19', target: '20', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } },
  { id: 'e9-10', source: '9', target: '10', label: 'Family', style: { strokeWidth: 4, stroke: '#ec4899' } },
  // Node 21 (Mark Johnson) is isolated - new lead
  
  // Scottsdale Pod (2 connections)
  { id: 'e22-23', source: '22', target: '23', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } },
  // Nodes 24 & 25 are isolated
  
  // Bridge Connections (3 strategic cross-cluster links only)
  { id: 'e1-5', source: '1', target: '5', label: 'Referral', markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 3, stroke: '#22c55e' } }, // Naples → Dallas
  { id: 'e2-22', source: '2', target: '22', label: 'Business', style: { strokeDasharray: '3,3', strokeWidth: 2, stroke: '#f59e0b' } }, // Naples → Scottsdale
  { id: 'e19-6', source: '19', target: '6', label: 'Same CTC', style: { strokeDasharray: '5,5', stroke: '#94a3b8' } }, // Miami → Dallas
];

export const CustomerNetworkGraph = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const getNodeStyle = (node: Node) => {
    const { type, influence } = node.data;
    const size = 40 + (influence / 100) * 40; // 40-80px based on influence
    
    let backgroundColor = 'hsl(var(--muted))';
    let borderColor = 'hsl(var(--border))';
    
    switch (type) {
      case 'new_lead':
        backgroundColor = 'hsl(210, 100%, 97%)';
        borderColor = 'hsl(210, 100%, 50%)';
        break;
      case 'active_owner':
        backgroundColor = 'hsl(45, 100%, 95%)';
        borderColor = 'hsl(45, 90%, 50%)';
        break;
      case 'repeat_customer':
        backgroundColor = 'hsl(142, 70%, 95%)';
        borderColor = 'hsl(142, 70%, 45%)';
        break;
      case 'past_owner':
        backgroundColor = 'hsl(0, 0%, 95%)';
        borderColor = 'hsl(0, 0%, 60%)';
        break;
    }
    
    return {
      background: backgroundColor,
      border: `2px solid ${borderColor}`,
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 600,
      padding: '4px',
      textAlign: 'center' as const,
    };
  };

  // Apply custom styles to nodes
  const styledNodes = nodes.map(node => ({
    ...node,
    style: getNodeStyle(node),
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Customer Network Map</CardTitle>
          <p className="text-sm text-muted-foreground">
            Interactive visualization of customer relationships across all CTC locations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Naples">Naples</SelectItem>
                <SelectItem value="Dallas">Dallas</SelectItem>
                <SelectItem value="Phoenix">Phoenix</SelectItem>
                <SelectItem value="Miami">Miami</SelectItem>
                <SelectItem value="Scottsdale">Scottsdale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="new_lead">New Leads</SelectItem>
                <SelectItem value="active_owner">Active Owners</SelectItem>
                <SelectItem value="repeat_customer">Repeat Customers</SelectItem>
                <SelectItem value="past_owner">Past Owners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Node Types</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-100 border-2 border-blue-500" />
                  <span className="text-xs">New Lead</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-100 border-2 border-yellow-500" />
                  <span className="text-xs">Active Owner</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-100 border-2 border-green-600" />
                  <span className="text-xs">Repeat Customer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-200 border-2 border-gray-500" />
                  <span className="text-xs">Past Owner</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Relationship Types</p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-green-500" style={{ width: '24px', height: '3px' }} />
                  <span className="text-xs">Referral</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-500" style={{ width: '24px', height: '2px' }} />
                  <span className="text-xs">Friend</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="border-b-2 border-dashed border-orange-500" style={{ width: '24px' }} />
                  <span className="text-xs">Business</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-pink-500" style={{ width: '24px', height: '4px' }} />
                  <span className="text-xs">Family</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="border-b-2 border-dashed border-gray-400" style={{ width: '24px' }} />
                  <span className="text-xs">Same CTC</span>
                </div>
              </div>
            </div>
          </div>

          {/* Network Graph */}
          <div className="h-[600px] border rounded-lg bg-background">
            <ReactFlow
              nodes={styledNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              attributionPosition="bottom-left"
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{nodes.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Relationships</p>
              <p className="text-2xl font-bold">{edges.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CTC Locations</p>
              <p className="text-2xl font-bold">5</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Owners</p>
              <p className="text-2xl font-bold">{nodes.filter(n => n.data.type === 'active_owner').length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Influence</p>
              <p className="text-2xl font-bold">
                {Math.round(nodes.reduce((sum, n) => sum + n.data.influence, 0) / nodes.length)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
