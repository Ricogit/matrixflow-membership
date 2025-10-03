export interface Stage {
  level: number;
  name: string;
  price: number;
}

export const STAGES: Stage[] = [
  { level: 1, name: 'Stage 1 Adpack', price: 30 },
  { level: 2, name: 'Stage 2 Adpack', price: 90 },
  { level: 3, name: 'Stage 3 Adpack', price: 270 },
  { level: 4, name: 'Stage 4 Adpack', price: 810 },
  { level: 5, name: 'Stage 5 Adpack', price: 2430 },
  { level: 6, name: 'Stage 6 Adpack', price: 7290 },
  { level: 7, name: 'Stage 7 Adpack', price: 43740 },
];

export const getStageByLevel = (level: number): Stage | undefined => {
  return STAGES.find(s => s.level === level);
};

export const getNextStage = (currentLevel: number): Stage | undefined => {
  return STAGES.find(s => s.level === currentLevel + 1);
};
