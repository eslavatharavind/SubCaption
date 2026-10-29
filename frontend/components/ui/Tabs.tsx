import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#262D36]', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2',
              isActive
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                : 'text-brand-muted hover:text-white hover:bg-[#151A21]'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
