import { useState } from 'react';
import { Member, MatrixStats } from '@/types/member';

export const useMatrixLogic = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [rootMember, setRootMember] = useState<Member | undefined>();
  const [currentViewMemberId, setCurrentViewMemberId] = useState<string | undefined>();

  // Check if matrix is full (6 positions: 2 in level 1 + 4 in level 2)
  const isMatrixFull = (matrixMembers: Member[]): boolean => {
    return matrixMembers.length >= 6;
  };

  // Find next available position left-to-right in a matrix
  const findNextAvailablePositionInMatrix = (matrixMembers: Member[]): { level: number; slot: number } | null => {
    // Fill left to right: Level 1 (slots 0, 1), then Level 2 (slots 0, 1, 2, 3)
    const allPositions = [
      { level: 1, slot: 0 },
      { level: 1, slot: 1 },
      { level: 2, slot: 0 },
      { level: 2, slot: 1 },
      { level: 2, slot: 2 },
      { level: 2, slot: 3 }
    ];

    for (const pos of allPositions) {
      const exists = matrixMembers.some(m => m.position.level === pos.level && m.position.slot === pos.slot);
      if (!exists) {
        return pos;
      }
    }

    return null; // Matrix is full
  };

  // Legacy function for backwards compatibility
  const findNextAvailablePosition = (): { level: number; slot: number } | null => {
    const currentMatrix = getCurrentViewMatrix();
    return findNextAvailablePositionInMatrix(currentMatrix);
  };

  // Find the matrix owner (upline) for a given member
  const findMatrixOwner = (memberId: string): string => {
    // If it's the root, the root is the matrix owner
    if (memberId === rootMember?.id) {
      return memberId;
    }

    // Find which member's matrix contains this memberId
    if (rootMember?.personalMatrix?.members.some(m => m.id === memberId)) {
      return rootMember.id;
    }

    for (const member of members) {
      if (member.personalMatrix?.members.some(m => m.id === memberId)) {
        return member.id;
      }
    }

    // Default to root if not found
    return rootMember?.id || memberId;
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

    // Get the recruiter/sponsor
    const recruiterId = memberData.position.parentId || (currentViewMemberId || rootMember.id);
    
    // Find the matrix owner (the upline whose matrix should be filled)
    // If recruiter is root, new member goes in root's matrix
    // If recruiter is in someone's matrix, new member goes in that same matrix
    const matrixOwnerId = findMatrixOwner(recruiterId);
    const matrixOwner = matrixOwnerId === rootMember.id ? rootMember : members.find(m => m.id === matrixOwnerId);

    if (!matrixOwner) {
      throw new Error('Matrix owner not found');
    }

    const matrixMembers = matrixOwner.personalMatrix?.members || [];
    
    // Find next available position in the matrix owner's matrix (left to right)
    const position = findNextAvailablePositionInMatrix(matrixMembers);
    
    if (!position) {
      throw new Error('Matrix is full. No available positions.');
    }

    // Create new member
    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position: { ...position, parentId: matrixOwnerId },
      status: 'active',
      personalMatrix: { members: [] },
      earnings: 0
    };

    // Add to global members list
    setMembers(prev => [...prev, newMember]);

    // Add to matrix owner's personal matrix
    if (matrixOwnerId === rootMember.id) {
      setRootMember(prev => prev ? {
        ...prev,
        personalMatrix: { 
          members: [...(prev.personalMatrix?.members || []), newMember] 
        }
      } : prev);
    } else {
      setMembers(prev => prev.map(m => 
        m.id === matrixOwnerId ? {
          ...m,
          personalMatrix: { 
            members: [...(m.personalMatrix?.members || []), newMember] 
          }
        } : m
      ));
    }

    // Check if matrix is full (6/6) and trigger cycle
    const updatedMatrixMembers = [...matrixMembers, newMember];
    if (isMatrixFull(updatedMatrixMembers)) {
      console.log(`Matrix cycled for member: ${matrixOwnerId}`);
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