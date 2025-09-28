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
}

export const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  onAddMember,
  availablePositions
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    sponsor: '',
    position: { level: 1, slot: 0 }
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    onAddMember({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      sponsor: formData.sponsor || undefined,
      position: formData.position,
      status: 'pending',
      earnings: 0
    });

    setFormData({
      name: '',
      email: '',
      phone: '',
      sponsor: '',
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
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
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
            <Label htmlFor="sponsor">Sponsor (Optional)</Label>
            <Input
              id="sponsor"
              value={formData.sponsor}
              onChange={(e) => setFormData(prev => ({ ...prev, sponsor: e.target.value }))}
              placeholder="Enter sponsor's name"
            />
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