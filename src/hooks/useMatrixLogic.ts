import { useState } from 'react';
import { Member, MatrixStats } from '@/types/member';
import { getNextStage } from '@/types/stages';

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

  // Get the L1 parent for a given L2 slot (binary tree structure)
  const getL1ParentForL2Slot = (slot: number): number => {
    // L2P0, L2P1 belong to L1P0
    // L2P2, L2P3 belong to L1P1
    return slot < 2 ? 0 : 1;
  };

  // Find next available position in matrix following binary tree structure
  const findNextPositionInBinaryMatrix = (matrixMembers: Member[], matrixOwnerId: string): { level: number; slot: number; parentMemberId?: string } | null => {
    // Check Level 1 first (slots 0, 1)
    // L1 members should have the matrix owner as their parent
    for (let slot = 0; slot < 2; slot++) {
      const exists = matrixMembers.some(m => m.position.level === 1 && m.position.slot === slot);
      if (!exists) {
        return { level: 1, slot, parentMemberId: matrixOwnerId };
      }
    }

    // Check Level 2 (slots 0, 1, 2, 3) - must check which L1 parent owns each slot
    // L2P0, L2P1 should have L1P0 as parent
    // L2P2, L2P3 should have L1P1 as parent
    for (let slot = 0; slot < 4; slot++) {
      const exists = matrixMembers.some(m => m.position.level === 2 && m.position.slot === slot);
      if (!exists) {
        // Find the L1 parent that owns this L2 slot
        const l1ParentSlot = getL1ParentForL2Slot(slot);
        const l1Parent = matrixMembers.find(m => m.position.level === 1 && m.position.slot === l1ParentSlot);
        
        // L2 positions must have an L1 parent - if it doesn't exist, this slot isn't available yet
        if (!l1Parent) {
          continue;
        }
        
        return { level: 2, slot, parentMemberId: l1Parent.id };
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
        position: { level: 0, slot: 0 },
        personalMatrix: { members: [] },
        stage: 1, // Root starts at Stage 1
        directUplineId: undefined
      };
      setRootMember(newRootMember);
      setCurrentViewMemberId(newId);
      return;
    }

    // Get the direct recruiter/sponsor
    const recruiterId = memberData.position.parentId || (currentViewMemberId || rootMember.id);
    const recruiter = recruiterId === rootMember.id ? rootMember : members.find(m => m.id === recruiterId);
    
    if (!recruiter) {
      throw new Error('Recruiter not found');
    }

    // Determine matrix owner (upline whose matrix gets filled)
    // If recruiter is root, new member goes in root's matrix
    // If recruiter is in someone's matrix, new member goes in recruiter's upline's matrix
    let matrixOwnerId: string;
    
    if (recruiterId === rootMember?.id) {
      matrixOwnerId = rootMember.id;
    } else {
      // New member goes into recruiter's upline matrix
      matrixOwnerId = recruiter.position.parentId || rootMember?.id || '';
    }

    const matrixOwner = matrixOwnerId === rootMember.id ? rootMember : members.find(m => m.id === matrixOwnerId);
    if (!matrixOwner) {
      throw new Error('Matrix owner not found');
    }

    const matrixMembers = matrixOwner.personalMatrix?.members || [];
    
    // Find next available position following binary tree structure
    const positionData = findNextPositionInBinaryMatrix(matrixMembers, matrixOwnerId);
    
    if (!positionData) {
      throw new Error('Matrix is full. No available positions.');
    }

    const { level, slot, parentMemberId } = positionData;

    // Create new member - inherits stage from direct recruiter
    const newMember: Member = {
      ...memberData,
      id: newId,
      joinDate: new Date().toISOString(),
      position: { 
        level, 
        slot, 
        parentId: parentMemberId || matrixOwnerId
      },
      status: 'active',
      personalMatrix: { members: [] },
      earnings: 0,
      stage: recruiter.stage, // Inherit stage from direct recruiter
      directUplineId: recruiterId // Track direct upline for stage progression
    };

    // Add to global members list
    setMembers(prev => [...prev, newMember]);

    // Add to matrix owner's personal matrix (upline)
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

    // ALSO add to direct recruiter's personal matrix (if different from matrix owner)
    if (recruiterId !== matrixOwnerId) {
      const recruiterPersonalMatrix = recruiter.personalMatrix?.members || [];
      const recruiterPositionData = findNextPositionInBinaryMatrix(recruiterPersonalMatrix, recruiterId);
      
      if (recruiterPositionData) {
        // Create a copy for recruiter's personal matrix with adjusted position
        const personalMatrixMember: Member = {
          ...newMember,
          position: {
            level: recruiterPositionData.level,
            slot: recruiterPositionData.slot,
            parentId: recruiterPositionData.parentMemberId || recruiterId
          }
        };

        if (recruiterId === rootMember.id) {
          setRootMember(prev => prev ? {
            ...prev,
            personalMatrix: {
              members: [...(prev.personalMatrix?.members || []), personalMatrixMember]
            }
          } : prev);
        } else {
          setMembers(prev => prev.map(m =>
            m.id === recruiterId ? {
              ...m,
              personalMatrix: {
                members: [...(m.personalMatrix?.members || []), personalMatrixMember]
              }
            } : m
          ));
        }
      }
    }

    // Check if matrix is full (6/6) and trigger cycle
    const updatedMatrix = [...matrixMembers, newMember];
    if (isMatrixFull(updatedMatrix)) {
      cycleMatrixAndProgressStage(matrixOwnerId);
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

  const updateMember = (memberId: string, updates: Partial<Member>) => {
    // Update root member if it's the one being edited
    if (memberId === rootMember?.id) {
      setRootMember(prev => prev ? { ...prev, ...updates } : prev);
      return;
    }

    // Update in members list
    setMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, ...updates } : m
    ));

    // Also update in all personal matrices where this member appears
    setMembers(prev => prev.map(m => ({
      ...m,
      personalMatrix: {
        members: m.personalMatrix?.members.map(pm =>
          pm.id === memberId ? { ...pm, ...updates } : pm
        ) || []
      }
    })));

    // Update in root's personal matrix if needed
    if (rootMember?.personalMatrix?.members.some(m => m.id === memberId)) {
      setRootMember(prev => prev ? {
        ...prev,
        personalMatrix: {
          members: prev.personalMatrix?.members.map(m =>
            m.id === memberId ? { ...m, ...updates } : m
          ) || []
        }
      } : prev);
    }
  };

  const cycleMatrixAndProgressStage = (matrixOwnerId: string) => {
    console.log(`Matrix cycled for member: ${matrixOwnerId}`);
    
    const matrixOwner = matrixOwnerId === rootMember?.id ? rootMember : members.find(m => m.id === matrixOwnerId);
    if (!matrixOwner) return;

    // Get next stage
    const nextStage = getNextStage(matrixOwner.stage);
    if (!nextStage) {
      console.log('Member has reached the final stage');
      return;
    }

    // Find the direct upline's stage to follow
    let targetStage = nextStage.level;
    if (matrixOwner.directUplineId) {
      const directUpline = matrixOwner.directUplineId === rootMember?.id 
        ? rootMember 
        : members.find(m => m.id === matrixOwner.directUplineId);
      
      if (directUpline && directUpline.stage >= targetStage) {
        targetStage = directUpline.stage;
      }
    }

    // Progress member to next stage
    if (matrixOwnerId === rootMember?.id) {
      setRootMember(prev => prev ? {
        ...prev,
        stage: targetStage,
        personalMatrix: { members: [] } // Reset matrix for new stage
      } : prev);
    } else {
      setMembers(prev => prev.map(m =>
        m.id === matrixOwnerId ? {
          ...m,
          stage: targetStage,
          personalMatrix: { members: [] } // Reset matrix for new stage
        } : m
      ));
    }

    console.log(`Member ${matrixOwnerId} progressed to Stage ${targetStage}`);
  };

  return {
    members,
    rootMember,
    addMember,
    getAvailablePositions,
    getMatrixStats,
    updateMemberStatus,
    updateMember,
    findNextAvailablePosition,
    currentViewMemberId,
    setCurrentViewMemberId,
    getCurrentViewMatrix
  };
};