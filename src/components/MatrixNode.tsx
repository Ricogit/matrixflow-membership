import React from 'react';
import { Member } from '@/types/member';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MatrixNodeProps {
  member?: Member;
  position: {
    level: number;
    slot: number;
  };
  isAvailable?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MatrixNode: React.FC<MatrixNodeProps> = ({
  member,
  position,
  isAvailable = false,
  onClick,
  className
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'pending':
        return 'bg-accent text-accent-foreground';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-300 cursor-pointer hover:shadow-medium",
        member ? "bg-gradient-card" : "bg-muted/30 border-dashed",
        isAvailable && "border-accent hover:border-accent-foreground hover:shadow-glow",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4 text-center">
        {member ? (
          <div className="space-y-3">
            <Avatar className="mx-auto h-12 w-12 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1">
              <h3 className="font-semibold text-sm truncate">{member.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(member.status))}
              >
                {member.status}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              <div>Level {position.level}</div>
              <div>Position {position.slot}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 opacity-60">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">Empty</span>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground">Available</h3>
              <div className="text-xs text-muted-foreground">
                <div>Level {position.level}</div>
                <div>Position {position.slot}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAvailable && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse" />
      )}
    </Card>
  );
};