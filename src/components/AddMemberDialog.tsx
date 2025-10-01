import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Member } from '@/types/member';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddMemberDialogProps {
  onAddMember: (member: Omit<Member, 'id' | 'joinDate'>) => void;
  availablePositions: { level: number; slot: number }[];
  members: Member[];
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  onAddMember,
  availablePositions,
  members
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    sponsorId: '',
    position: { level: 1, slot: 0 }
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const selectedSponsor = members.find(m => m.id === formData.sponsorId);

    onAddMember({
      name: formData.name,
      email: `${formData.name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
      phone: formData.phone || undefined,
      sponsor: selectedSponsor?.name || undefined,
      position: { 
        ...formData.position, 
        parentId: formData.sponsorId || undefined 
      },
      status: 'active',
      earnings: 0
    });

    setFormData({
      name: '',
      phone: '',
      sponsorId: '',
      position: { level: 1, slot: 0 }
    });
    
    setOpen(false);
    
    toast({
      title: "Success",
      description: "Member added successfully with automatic spillover placement.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:bg-primary-hover shadow-soft">
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter member's full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor">Preferred Sponsor (Direct Partner)</Label>
            <Select
              value={formData.sponsorId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a sponsor" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availablePositions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="position">Preferred Position</Label>
              <Select
                value={`${formData.position.level}-${formData.position.slot}`}
                onValueChange={(value) => {
                  const [level, slot] = value.split('-').map(Number);
                  setFormData(prev => ({ ...prev, position: { level, slot } }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((pos) => (
                    <SelectItem key={`${pos.level}-${pos.slot}`} value={`${pos.level}-${pos.slot}`}>
                      Level {pos.level}, Position {pos.slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:bg-primary-hover">
              Add Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};