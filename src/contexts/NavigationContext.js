import { createContext, useContext } from 'react';

export const NavigationContext = createContext({
  path: '/dashboard',
  navigate: () => {}
});

export function useNavigation() {
  return useContext(NavigationContext);
}
