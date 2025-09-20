import { ReactNode } from 'react';

export interface NavItem {
  title: string;
  path: string;
  icon: ReactNode;
  roles?: string[];
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
