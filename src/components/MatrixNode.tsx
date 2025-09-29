import React from 'react';
import { Member } from '@/types/member';
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
    <div
      className={cn(
        "relative transition-all duration-300 cursor-pointer hover:shadow-glow rounded-full aspect-square flex items-center justify-center",
        member ? "bg-gradient-card border-2 border-primary/30" : "bg-muted/30 border-2 border-dashed border-muted-foreground/30",
        isAvailable && "border-accent hover:border-accent-foreground hover:shadow-glow animate-pulse",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4 text-center flex flex-col items-center justify-center h-full">
        {member ? (
          <div className="space-y-2 flex flex-col items-center">
            <Avatar className="h-10 w-10 border-2 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-1 text-center">
              <h3 className="font-semibold text-xs truncate max-w-20">{member.name}</h3>
              
              <Badge 
                variant="outline" 
                className={cn("text-xs px-1 py-0", getStatusColor(member.status))}
              >
                {member.status}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              <div>L{position.level}</div>
              <div>P{position.slot}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 opacity-60 flex flex-col items-center">
            <div className="h-10 w-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">+</span>
            </div>
            
            <div className="space-y-1 text-center">
              <h3 className="font-medium text-xs text-muted-foreground">Open</h3>
              <div className="text-xs text-muted-foreground">
                <div>L{position.level}</div>
                <div>P{position.slot}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAvailable && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-pulse" />
      )}
    </div>
  );
};