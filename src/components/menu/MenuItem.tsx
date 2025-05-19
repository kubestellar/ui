import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconType } from 'react-icons';
import useClusterStore from '../../stores/clusterStore';

interface MenuItemProps {
  onClick?: () => void;
  catalog: string;
  listItems: Array<{
    isLink: boolean;
    url?: string;
    icon: IconType;
    label: string;
    onClick?: () => void;
  }>;
  centered?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ onClick, catalog, listItems, centered }) => {
  const location = useLocation();
  const selectedCluster = useClusterStore(state => state.selectedCluster);
  const hasAvailableClusters = useClusterStore(state => state.hasAvailableClusters);
  const isDisabled = !hasAvailableClusters || !selectedCluster;

  const shouldDisableItem = (label: string) => {
    const alwaysEnabledItems = ['Home', 'User', 'Onboard'];
    return !alwaysEnabledItems.includes(label) && isDisabled;
  };

  const getDisabledMessage = () => {
    if (!hasAvailableClusters) return 'Please configure a cluster first';
    if (!selectedCluster) return 'Please select a cluster to access this feature';
    return '';
  };

  return (
    <div className="group mb-6 flex w-full flex-col items-stretch gap-3" role="navigation">
      <span
        className={`border-l-[3px] border-transparent px-2 text-sm font-semibold uppercase 
        tracking-[0.15em] text-[#2f86ff] transition-all 
        duration-300 ${centered ? 'text-center' : ''}`}
      >
        {catalog}
      </span>
      {listItems.map((listItem, index) => {
        const isItemDisabled = shouldDisableItem(listItem.label);
        const disabledMessage = isItemDisabled ? getDisabledMessage() : '';

        if (listItem.isLink) {
          return (
            <NavLink
              key={index}
              onClick={isItemDisabled ? e => e.preventDefault() : onClick}
              to={listItem.url || ''}
              title={disabledMessage}
              aria-disabled={isItemDisabled}
              className={({ isActive }) =>
                `3xl:min-h-[64px] btn hover:text-[#2f86ff] 2xl:min-h-[52px] ${
                  isActive && location.pathname === listItem.url ? 'btn-active' : ''
                } btn-ghost btn-block justify-start ${
                  isItemDisabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''
                } ${
                  isItemDisabled
                    ? 'pointer-events-none cursor-not-allowed bg-gray-50/5 opacity-60'
                    : 'hover:translate-x-2 hover:shadow-md'
                }`
              }
            >
              <listItem.icon
                className={`shrink-0 text-2xl hover:text-[#4498FF] ${
                  isItemDisabled
                    ? 'text-gray-400'
                    : 'text-[#4498FF] drop-shadow-[0_2px_1px_rgba(68,152,255,0.15)]'
                } transition-transform duration-300 group-hover:scale-110`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-medium tracking-wide ${
                  isItemDisabled ? 'text-gray-400' : 'text-foreground/90'
                }`}
              >
                {listItem.label}
              </span>
            </NavLink>
          );
        } else {
          return (
            <button
              key={index}
              onClick={listItem.onClick}
              className="flex items-center gap-4 rounded-xl from-primary/5 to-transparent 
              px-4 py-3 transition-all duration-300 
              hover:translate-x-2 hover:bg-gradient-to-r hover:shadow-md
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <listItem.icon className="shrink-0 text-2xl text-[#2f86ff] drop-shadow-[0_2px_1px_rgba(68,152,255,0.15)]" />
              <span className="text-foreground/90 text-sm font-medium tracking-wide">
                {listItem.label}
              </span>
            </button>
          );
        }
      })}
    </div>
  );
};

export default MenuItem;
