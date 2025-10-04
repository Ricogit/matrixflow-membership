import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Member } from '@/types/member';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditMemberDialogProps {
  member: Member;
  onUpdateMember: (memberId: string, updates: Partial<Member>) => void;
}

export const EditMemberDialog: React.FC<EditMemberDialogProps> = ({
  member,
  onUpdateMember
}) => {
  const [open, setOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: member.name,
    email: member.email,
    phone: member.phone || ''
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast({
        title: "Error",
        description: "Name and email are required fields.",
        variant: "destructive"
      });
      return;
    }

    onUpdateMember(member.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined
    });
    
    setOpen(false);
    
    toast({
      title: "Success",
      description: "Member details updated successfully.",
    });
  };

  // Reset form data when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || ''
      });
    }
  }, [open, member]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Member Details</DialogTitle>
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
            <Label htmlFor="email">Email *</Label>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:bg-primary-hover">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};