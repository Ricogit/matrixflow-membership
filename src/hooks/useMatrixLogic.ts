import { useState } from 'react';
import { Member, MatrixStats } from '@/types/member';

export const useMatrixLogic = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rootMember, setRootMember] = useState<Member | undefined>();
  const [currentViewMemberId, setCurrentViewMemberId] = useState<string | undefined>();

  // Check if matrix is full (7 total: 2 in level 1 + 4 in level 2 + 1 root = 7)
  const isMatrixFull = (matrixMembers: Member[]): boolean => {
    return matrixMembers.length >= 6; // 6 members under root (2 + 4)
  };

  // Find available position in a specific matrix
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

  // Find spillover position in downline (breadth-first search)
  const findSpilloverPosition = (sponsorId: string): { memberId: string; position: { level: number; slot: number } } | null => {
    const queue: string[] = [sponsorId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Get current member's matrix
      const currentMember = currentId === rootMember?.id ? rootMember : members.find(m => m.id === currentId);
      if (!currentMember) continue;

      const matrixMembers = currentMember.personalMatrix?.members || [];

      // Check if this member has available positions
      if (!isMatrixFull(matrixMembers)) {
        const position = findNextAvailablePositionInMatrix(matrixMembers);
        if (position) {
          return { memberId: currentId, position };
        }
      }

      // Add downline members to queue for breadth-first search
      matrixMembers.forEach(m => queue.push(m.id));
    }

    return null;
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

    // STEP 1: Check Available Positions
    let sponsorId = memberData.position.parentId || (currentViewMemberId || rootMember.id);
    let sponsor = sponsorId === rootMember.id ? rootMember : members.find(m => m.id === sponsorId);

    if (!sponsor) {
      throw new Error('Sponsor not found');
    }

    const sponsorMembers = sponsor.personalMatrix?.members || [];
    
    // STEP 2: Check Direct Spot vs Spillover
    let finalSponsorId = sponsorId;
    let position = memberData.position;

    // Check if direct sponsor has space
    if (isMatrixFull(sponsorMembers)) {
      // Spillover to downline - find first available position
      const spillover = findSpilloverPosition(sponsorId);
      if (spillover) {
        finalSponsorId = spillover.memberId;
        position = spillover.position;
      } else {
        throw new Error('No available positions in entire downline');
      }
    } else {
      // Direct spot available
      const availablePosition = findNextAvailablePositionInMatrix(sponsorMembers);
      if (availablePosition) {
        position = availablePosition;
      } else {
        throw new Error('Unexpected error: Matrix should have space');
      }
    }

    // STEP 3: Place User & Pay
    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position: { ...position, parentId: finalSponsorId },
      status: 'active',
      personalMatrix: { members: [] },
      earnings: 0
    };

    // Add to global members list
    setMembers(prev => [...prev, newMember]);

    // Add to final sponsor's personal matrix
    if (finalSponsorId === rootMember.id) {
      setRootMember(prev => prev ? {
        ...prev,
        personalMatrix: { 
          members: [...(prev.personalMatrix?.members || []), newMember] 
        }
      } : prev);
    } else {
      setMembers(prev => prev.map(m => 
        m.id === finalSponsorId ? {
          ...m,
          personalMatrix: { 
            members: [...(m.personalMatrix?.members || []), newMember] 
          }
        } : m
      ));
    }

    // STEP 4: Check if Matrix Full (7/7) and Cycle
    const updatedSponsorMembers = [...sponsorMembers, newMember];
    if (isMatrixFull(updatedSponsorMembers)) {
      // Matrix is full - trigger cycle (can add payment/notification logic here)
      console.log(`Matrix cycled for member: ${finalSponsorId}`);
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
    // Calculate total earnings: R100 per member (excluding root)
    const totalEarnings = members.length * 100;
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