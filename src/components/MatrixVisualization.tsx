import React from 'react';
import { Member } from '@/types/member';
import { MatrixNode } from './MatrixNode';
import { cn } from '@/lib/utils';

interface MatrixVisualizationProps {
  rootMember?: Member;
  members: Member[];
  onNodeClick?: (position: { level: number; slot: number }, member?: Member) => void;
  className?: string;
}

export const MatrixVisualization: React.FC<MatrixVisualizationProps> = ({
  rootMember,
  members,
  onNodeClick,
  className
}) => {
  // Create matrix structure for 2x2, 2 levels deep
  const getMatrixStructure = () => {
    const matrix: { [key: string]: Member | undefined } = {};
    
    // Root position (Level 0)
    matrix['0-0'] = rootMember;
    
    // Level 1 positions (2 positions)
    matrix['1-0'] = undefined; // Left child
    matrix['1-1'] = undefined; // Right child
    
    // Level 2 positions (4 positions)
    matrix['2-0'] = undefined; // Left-Left
    matrix['2-1'] = undefined; // Left-Right
    matrix['2-2'] = undefined; // Right-Left  
    matrix['2-3'] = undefined; // Right-Right

    // Fill matrix with members based on spillover logic
    members.forEach(member => {
      const key = `${member.position.level}-${member.position.slot}`;
      matrix[key] = member;
    });

    return matrix;
  };

  const matrix = getMatrixStructure();

  const renderConnectionLine = (startLevel: number, startSlot: number, endLevel: number, endSlot: number) => {
    // Simple connection lines between levels
    const isLeft = endSlot % 2 === 0;
    return (
      <div
        key={`line-${startLevel}-${startSlot}-${endLevel}-${endSlot}`}
        className={cn(
          "absolute h-px bg-matrix-connection",
          "top-1/2 transform -translate-y-1/2",
          isLeft ? "w-8 -left-8" : "w-8 -right-8"
        )}
      />
    );
  };

  return (
    <div className={cn("relative p-8", className)}>
      {/* Level 0 - Root */}
      <div className="flex justify-center mb-12">
        <div className="relative">
          <MatrixNode
            member={matrix['0-0']}
            position={{ level: 0, slot: 0 }}
            isAvailable={!matrix['0-0']}
            onClick={() => onNodeClick?.({ level: 0, slot: 0 }, matrix['0-0'])}
            className="w-32 h-32"
          />
        </div>
      </div>

      {/* Connection lines from root to level 1 */}
      <div className="relative mb-8">
        <div className="absolute left-1/2 transform -translate-x-1/2 top-0">
          <div className="w-px h-8 bg-matrix-connection"></div>
          <div className="w-32 h-px bg-matrix-connection"></div>
          <div className="absolute left-0 top-0 w-px h-8 bg-matrix-connection"></div>
          <div className="absolute right-0 top-0 w-px h-8 bg-matrix-connection"></div>
        </div>
      </div>

      {/* Level 1 - First level children */}
      <div className="flex justify-center gap-16 mb-12">
        <div className="relative">
          <MatrixNode
            member={matrix['1-0']}
            position={{ level: 1, slot: 0 }}
            isAvailable={!matrix['1-0']}
            onClick={() => onNodeClick?.({ level: 1, slot: 0 }, matrix['1-0'])}
            className="w-28 h-28"
          />
        </div>
        <div className="relative">
          <MatrixNode
            member={matrix['1-1']}
            position={{ level: 1, slot: 1 }}
            isAvailable={!matrix['1-1']}
            onClick={() => onNodeClick?.({ level: 1, slot: 1 }, matrix['1-1'])}
            className="w-28 h-28"
          />
        </div>
      </div>

      {/* Connection lines from level 1 to level 2 */}
      <div className="relative mb-8">
        <div className="flex justify-center gap-16">
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="w-px h-6 bg-matrix-connection"></div>
              <div className="w-16 h-px bg-matrix-connection -ml-8"></div>
              <div className="absolute left-0 top-6 w-px h-6 bg-matrix-connection"></div>
              <div className="absolute right-0 top-6 w-px h-6 bg-matrix-connection"></div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="w-px h-6 bg-matrix-connection"></div>
              <div className="w-16 h-px bg-matrix-connection -ml-8"></div>
              <div className="absolute left-0 top-6 w-px h-6 bg-matrix-connection"></div>
              <div className="absolute right-0 top-6 w-px h-6 bg-matrix-connection"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Level 2 - Second level children */}
      <div className="flex justify-center gap-8">
        <div className="flex gap-4">
          <MatrixNode
            member={matrix['2-0']}
            position={{ level: 2, slot: 0 }}
            isAvailable={!matrix['2-0']}
            onClick={() => onNodeClick?.({ level: 2, slot: 0 }, matrix['2-0'])}
            className="w-24 h-24"
          />
          <MatrixNode
            member={matrix['2-1']}
            position={{ level: 2, slot: 1 }}
            isAvailable={!matrix['2-1']}
            onClick={() => onNodeClick?.({ level: 2, slot: 1 }, matrix['2-1'])}
            className="w-24 h-24"
          />
        </div>
        <div className="flex gap-4">
          <MatrixNode
            member={matrix['2-2']}
            position={{ level: 2, slot: 2 }}
            isAvailable={!matrix['2-2']}
            onClick={() => onNodeClick?.({ level: 2, slot: 2 }, matrix['2-2'])}
            className="w-24 h-24"
          />
          <MatrixNode
            member={matrix['2-3']}
            position={{ level: 2, slot: 3 }}
            isAvailable={!matrix['2-3']}
            onClick={() => onNodeClick?.({ level: 2, slot: 3 }, matrix['2-3'])}
            className="w-24 h-24"
          />
        </div>
      </div>
    </div>
  );
};