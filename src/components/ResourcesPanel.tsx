import { Utensils, Hammer, Mountain, Landmark, ShieldAlert, Shirt } from 'lucide-react';
import type { ResourceState } from '../types';
import { getResourceLimits } from '../utils/gameDefaults';

interface ResourcesPanelProps {
  resources: ResourceState;
}

export default function ResourcesPanel({
  resources,
}: ResourcesPanelProps) {
  const limits = getResourceLimits();

  const resourceConfigs = [
    {
      key: 'food' as const,
      label: 'Food',
      icon: <Utensils size={16} className="text-amber-800" />,
      max: limits.food,
      accent: 'text-amber-900',
    },
    {
      key: 'wood' as const,
      label: 'Wood',
      icon: <Hammer size={16} className="text-amber-950" />,
      max: limits.wood,
      accent: 'text-amber-950',
    },
    {
      key: 'stone' as const,
      label: 'Stone',
      icon: <Mountain size={16} className="text-gray-700" />,
      max: limits.stone,
      accent: 'text-gray-800',
    },
    {
      key: 'pottery' as const,
      label: 'Pottery',
      icon: <Landmark size={16} className="text-yellow-900" />,
      max: limits.pottery,
      accent: 'text-orange-900',
    },
    {
      key: 'cloth' as const,
      label: 'Cloth',
      icon: <Shirt size={16} className="text-indigo-900" />,
      max: limits.cloth,
      accent: 'text-indigo-950',
    },
    {
      key: 'spear' as const,
      label: 'Spears',
      icon: <ShieldAlert size={16} className="text-red-900" />,
      max: limits.spear,
      accent: 'text-red-950',
    },
  ];

  return (
    <div className="w-full texture-parchment rounded-lg p-1.5 shadow flex flex-col md:flex-row items-center gap-1.5 md:gap-2 justify-center text-surface-container-lowest border border-outline-variant border-opacity-30">
      <h3 className="font-serif text-xs font-bold text-on-primary-fixed uppercase tracking-wider shrink-0 border-b md:border-b-0 md:border-r border-outline-variant pb-0.5 md:pb-0 md:pr-2.5 border-opacity-40 select-none">
        Resources
      </h3>
      <div className="flex flex-wrap gap-1 md:gap-1.5 items-center justify-center flex-1 w-full">
        {resourceConfigs.map((res) => {
          const val = resources[res.key];

          return (
            <div
              key={res.key}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container-lowest/5 border border-on-tertiary-fixed/5 font-sans relative group select-none"
              title={`${res.label} warehouse count (max ${res.max})`}
            >
              {res.icon}
              <span className="text-[10px] font-bold text-on-tertiary-fixed/70 hidden sm:inline">
                {res.label}:
              </span>
              <span className={`text-xs font-semibold ${res.accent}`}>
                {val}
              </span>
              <span className="text-[10px] text-on-tertiary-fixed/60 font-medium font-mono">
                /{res.max}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
