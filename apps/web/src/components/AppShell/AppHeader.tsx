import type { NavTab } from "../../lib/navTabs";
import { PrimaryNav } from "./PrimaryNav";
import { TopUtilityBar } from "./TopUtilityBar";

type AppHeaderProps = {
  tabs: NavTab[];
  query?: string;
  onQueryChange?: (value: string) => void;
  compact?: boolean;
};

export function AppHeader({ tabs, query, onQueryChange, compact = false }: AppHeaderProps) {
  return (
    <>
      <TopUtilityBar query={query} onQueryChange={onQueryChange} compact={compact} />
      <PrimaryNav tabs={tabs} compact={compact} />
    </>
  );
}
