import { useState } from 'react';
import { Member, MatrixStats } from '@/types/member';

export const useMatrixLogic = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rootMember, setRootMember] = useState<Member | undefined>();

  // Automatic spillover logic for 2x2 matrix
  const findNextAvailablePosition = (): { level: number; slot: number } | null => {
    // Check level 1 first (positions 0, 1)
    const level1Positions = [0, 1];
    for (const slot of level1Positions) {
      const exists = members.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        return { level: 1, slot };
      }
    }

    // Check level 2 (positions 0, 1, 2, 3)
    const level2Positions = [0, 1, 2, 3];
    for (const slot of level2Positions) {
      const exists = members.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        return { level: 2, slot };
      }
    }

    return null; // Matrix is full
  };

  const addMember = (memberData: Omit<Member, 'id' | 'joinDate'>) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If no root member, make this the root
    if (!rootMember) {
      const newRootMember: Member = {
        ...memberData,
        id: newId,
        joinDate: new Date().toISOString(),
        position: { level: 0, slot: 0 }
      };
      setRootMember(newRootMember);
      return;
    }

    // Find next available position using spillover logic
    let position = memberData.position;
    
    // If the requested position is taken, use spillover
    const positionTaken = members.some(
      m => m.position.level === position.level && m.position.slot === position.slot
    );
    
    if (positionTaken) {
      const nextPosition = findNextAvailablePosition();
      if (!nextPosition) {
        throw new Error('Matrix is full');
      }
      position = nextPosition;
    }

    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position,
      status: 'active'
    };

    setMembers(prev => [...prev, newMember]);
  };

  const getAvailablePositions = (): { level: number; slot: number }[] => {
    const available: { level: number; slot: number }[] = [];
    
    // Level 1 positions
    for (let slot = 0; slot < 2; slot++) {
      const exists = members.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 1, slot });
      }
    }

    // Level 2 positions
    for (let slot = 0; slot < 4; slot++) {
      const exists = members.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 2, slot });
      }
    }

    return available;
  };

  const getMatrixStats = (): MatrixStats => {
    const totalMembers = members.length + (rootMember ? 1 : 0);
    const activeMembers = members.filter(m => m.status === 'active').length + (rootMember ? 1 : 0);
    const pendingMembers = members.filter(m => m.status === 'pending').length;
    const totalEarnings = members.reduce((sum, m) => sum + (m.earnings || 0), 0);
    const availablePositions = getAvailablePositions().length;
    const matrixFull = availablePositions === 0;

    return {
      totalMembers,
      activeMembers,
      pendingMembers,
      totalEarnings,
      matrixFull,
      availablePositions
    };
  };

  const updateMemberStatus = (memberId: string, status: Member['status']) => {
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, status } : m
    ));
  };

  return {
    members,
    rootMember,
    addMember,
    getAvailablePositions,
    getMatrixStats,
    updateMemberStatus,
    findNextAvailablePosition
  };
};