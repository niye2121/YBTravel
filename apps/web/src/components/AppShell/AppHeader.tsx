import type { NavTab } from "../../lib/navTabs";
import { PrimaryNav } from "./PrimaryNav";
import { TopUtilityBar } from "./TopUtilityBar";

type AppHeaderProps = {
  tabs: NavTab[];
  query?: string;
  onQueryChange?: (value: string) => void;
};

export function AppHeader({ tabs, query, onQueryChange }: AppHeaderProps) {
  return (
    <>
      <TopUtilityBar query={query} onQueryChange={onQueryChange} />
      <PrimaryNav tabs={tabs} />
    </>
  );
}
