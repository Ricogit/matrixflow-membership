-- Create members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  upline_id UUID,
  matrix_owner_id UUID,
  level INTEGER NOT NULL DEFAULT 1,
  slot INTEGER NOT NULL DEFAULT 1,
  stage TEXT NOT NULL DEFAULT 'stage1',
  earnings NUMERIC NOT NULL DEFAULT 0,
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  personal_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own members" 
ON public.members 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own members" 
ON public.members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own members" 
ON public.members 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own members" 
ON public.members 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_matrix_owner_id ON public.members(user_id, matrix_owner_id);