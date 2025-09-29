import { useState } from 'react';
import { Member, MatrixStats } from '@/types/member';

export const useMatrixLogic = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rootMember, setRootMember] = useState<Member | undefined>();
  const [currentViewMemberId, setCurrentViewMemberId] = useState<string | undefined>();

  // Automatic spillover logic for personal matrix
  const findNextAvailablePositionInMatrix = (matrixMembers: Member[]): { level: number; slot: number } | null => {
    // Check level 1 first (positions 0, 1)
    const level1Positions = [0, 1];
    for (const slot of level1Positions) {
      const exists = matrixMembers.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        return { level: 1, slot };
      }
    }

    // Check level 2 (positions 0, 1, 2, 3)
    const level2Positions = [0, 1, 2, 3];
    for (const slot of level2Positions) {
      const exists = matrixMembers.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        return { level: 2, slot };
      }
    }

    return null; // Matrix is full
  };

  // Legacy function for backwards compatibility
  const findNextAvailablePosition = (): { level: number; slot: number } | null => {
    const currentMatrix = getCurrentViewMatrix();
    return findNextAvailablePositionInMatrix(currentMatrix);
  };

  const addMember = (memberData: Omit<Member, 'id' | 'joinDate'>) => {
    const newId = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If no root member, make this the root
    if (!rootMember) {
      const newRootMember: Member = {
        ...memberData,
        id: newId,
        joinDate: new Date().toISOString(),
        position: { level: 0, slot: 0 },
        personalMatrix: { members: [] }
      };
      setRootMember(newRootMember);
      setCurrentViewMemberId(newId);
      return;
    }

    // Find sponsor (parent) member
    const sponsorId = memberData.position.parentId || (currentViewMemberId || rootMember.id);
    const sponsor = sponsorId === rootMember.id ? rootMember : members.find(m => m.id === sponsorId);

    if (!sponsor) {
      throw new Error('Sponsor not found');
    }

    // Find next available position in sponsor's matrix
    let position = memberData.position;
    const sponsorMembers = sponsor.personalMatrix?.members || [];
    
    // If the requested position is taken in sponsor's matrix, use spillover
    const positionTaken = sponsorMembers.some(
      m => m.position.level === position.level && m.position.slot === position.slot
    );
    
    if (positionTaken) {
      const nextPosition = findNextAvailablePositionInMatrix(sponsorMembers);
      if (!nextPosition) {
        throw new Error('Sponsor matrix is full');
      }
      position = nextPosition;
    }

    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position: { ...position, parentId: sponsorId },
      status: 'active',
      personalMatrix: { members: [] }
    };

    // Add to global members list
    setMembers(prev => [...prev, newMember]);

    // Add to sponsor's personal matrix
    if (sponsorId === rootMember.id) {
      setRootMember(prev => prev ? {
        ...prev,
        personalMatrix: { 
          members: [...(prev.personalMatrix?.members || []), newMember] 
        }
      } : prev);
    } else {
      setMembers(prev => prev.map(m => 
        m.id === sponsorId ? {
          ...m,
          personalMatrix: { 
            members: [...(m.personalMatrix?.members || []), newMember] 
          }
        } : m
      ));
    }
  };

  const getCurrentViewMatrix = (): Member[] => {
    if (!currentViewMemberId) {
      return rootMember?.personalMatrix?.members || [];
    }
    
    if (currentViewMemberId === rootMember?.id) {
      return rootMember?.personalMatrix?.members || [];
    }
    
    const viewMember = members.find(m => m.id === currentViewMemberId);
    return viewMember?.personalMatrix?.members || [];
  };

  const getAvailablePositions = (): { level: number; slot: number }[] => {
    const available: { level: number; slot: number }[] = [];
    const currentMatrix = getCurrentViewMatrix();
    
    // Level 1 positions
    for (let slot = 0; slot < 2; slot++) {
      const exists = currentMatrix.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 1, slot });
      }
    }

    // Level 2 positions
    for (let slot = 0; slot < 4; slot++) {
      const exists = currentMatrix.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        available.push({ level: 2, slot });
      }
    }

    return available;
  };

  const getMatrixStats = (): MatrixStats => {
    const currentMatrix = getCurrentViewMatrix();
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
      availablePositions,
      currentMatrixMembers: currentMatrix.length
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
    findNextAvailablePosition,
    currentViewMemberId,
    setCurrentViewMemberId,
    getCurrentViewMatrix
  };
};