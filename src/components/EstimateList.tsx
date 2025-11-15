import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Edit, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { formatDistanceToNow } from 'date-fns';

type CustomOwnershipEstimate = Database['public']['Tables']['custom_ownership_estimates']['Row'];

interface EstimateListProps {
  estimates: CustomOwnershipEstimate[];
  loading: boolean;
  onEdit: (estimate: CustomOwnershipEstimate) => void;
  onDelete: (id: string) => void;
}

export function EstimateList({ estimates, loading, onEdit, onDelete }: EstimateListProps) {
  const { toast } = useToast();

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/estimate/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Estimate URL copied to clipboard',
    });
  };

  const previewEstimate = (slug: string) => {
    window.open(`/estimate/${slug}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: 'secondary',
      sent: 'default',
      viewed: 'outline',
      expired: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          Loading estimates...
        </CardContent>
      </Card>
    );
  }

  if (estimates.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          No estimates yet. Create your first custom ownership estimate!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Aircraft</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{estimate.customer_name}</div>
                    {estimate.customer_email && (
                      <div className="text-sm text-muted-foreground">
                        {estimate.customer_email}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={estimate.aircraft_type === 'SR22' ? 'default' : 'secondary'}>
                    {estimate.aircraft_type || 'SR22'}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(estimate.status)}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(estimate.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUrl(estimate.unique_slug)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy estimate link</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => previewEstimate(estimate.unique_slug)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Preview estimate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(estimate)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edit estimate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(estimate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete estimate</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
