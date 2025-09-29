import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MatrixVisualization } from '@/components/MatrixVisualization';
import { StatsCard } from '@/components/StatsCard';
import { AddMemberDialog } from '@/components/AddMemberDialog';
import { useMatrixLogic } from '@/hooks/useMatrixLogic';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  DollarSign,
  Network,
  Clock,
  Download
} from 'lucide-react';

const Index = () => {
  const {
    members,
    rootMember,
    addMember,
    getAvailablePositions,
    getMatrixStats,
    updateMemberStatus,
    currentViewMemberId,
    setCurrentViewMemberId,
    getCurrentViewMatrix
  } = useMatrixLogic();

  const stats = getMatrixStats();
  const availablePositions = getAvailablePositions();

  const handleAddMember = (memberData: Parameters<typeof addMember>[0]) => {
    try {
      addMember(memberData);
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const exportData = () => {
    const exportData = {
      rootMember,
      members,
      stats,
      exportDate: new Date().toISOString(),
      matrixType: "2x2 Personal Matrix System"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `karoo-matrix-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card shadow-soft border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Karoo Product Club
              </h1>
              <p className="text-muted-foreground mt-1">
                Personal Matrix Network with Automatic Spillover
              </p>
            </div>
            <div className="flex items-center gap-4">
              <AddMemberDialog 
                onAddMember={handleAddMember}
                availablePositions={availablePositions}
              />
              <Button
                onClick={exportData}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Matrix Visualization - Top Priority */}
        <Card className="bg-gradient-card shadow-medium mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Matrix Structure (2 Levels Deep)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Interactive matrix showing member positions with automatic spillover placement
            </p>
          </CardHeader>
          <CardContent>
            <MatrixVisualization
              rootMember={currentViewMemberId === rootMember?.id || !currentViewMemberId ? rootMember : undefined}
              members={getCurrentViewMatrix()}
              onNodeClick={(position) => {
                console.log('Node clicked:', position);
                // Could open member details or assignment dialog
              }}
            />
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Members"
            value={stats.totalMembers}
            description="Including root member"
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Active Members"
            value={stats.activeMembers}
            description="Currently participating"
            icon={UserPlus}
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Available Positions"
            value={stats.availablePositions}
            description="Ready for placement"
            icon={Network}
            trend={{ value: 3, isPositive: false }}
          />
          <StatsCard
            title="Total Earnings"
            value={`$${stats.totalEarnings.toLocaleString()}`}
            description="Cumulative network earnings"
            icon={DollarSign}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-gradient-card shadow-medium">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Button
                  onClick={exportData}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No members yet. Add your first member to get started!
                  </p>
                ) : (
                  members.slice(-5).reverse().map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{member.name}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(member.joinDate)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Joined Level {member.position.level}, Position {member.position.slot}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(member.joinDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' ? 'bg-success/20 text-success' :
                          member.status === 'pending' ? 'bg-accent/20 text-accent' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Matrix Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Matrix Completion</span>
                  <span className="font-semibold">
                    {Math.round(((6 - stats.availablePositions) / 6) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((6 - stats.availablePositions) / 6) * 100}%` }}
                  />
                </div>
                
                <div className="space-y-2 mt-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Level 1 (2 positions)</span>
                    <span className="font-medium">
                      {2 - availablePositions.filter(p => p.level === 1).length}/2 filled
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Level 2 (4 positions)</span>
                    <span className="font-medium">
                      {4 - availablePositions.filter(p => p.level === 2).length}/4 filled
                    </span>
                  </div>
                </div>

                {stats.matrixFull && (
                  <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-success text-sm font-medium">
                      🎉 Matrix is completely filled! Consider expanding to new levels.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;