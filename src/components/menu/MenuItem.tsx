import React from "react";
import { NavLink } from "react-router-dom";
import { IconType } from "react-icons";
import { useCluster } from "../../context/ClusterContext";

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
  const { selectedCluster, hasAvailableClusters } = useCluster();
  const isDisabled = !hasAvailableClusters || !selectedCluster;

  const shouldDisableItem = (label: string) => {
    const alwaysEnabledItems = ["Home", "User", "Onboard"];
    return !alwaysEnabledItems.includes(label) && isDisabled;
  };

  const getDisabledMessage = () => {
    if (!hasAvailableClusters) return "Please configure a cluster first";
    if (!selectedCluster) return "Please select a cluster to access this feature";
    return "";
  };

  return (
    <div className="w-full flex flex-col items-stretch gap-3 group mb-6" role="navigation">
      <span className={`px-2 text-sm font-semibold text-primary/80 uppercase tracking-[0.15em] 
        transition-all duration-300 hover:text-primary hover:pl-3 border-l-[3px] 
        border-transparent ${centered ? 'text-center' : ''}`}>
        {catalog}
      </span>
      {listItems.map((listItem, index) => {
        const isItemDisabled = shouldDisableItem(listItem.label);
        const disabledMessage = isItemDisabled ? getDisabledMessage() : "";

        if (listItem.isLink) {
          return (
            <NavLink
              key={index}
              onClick={isItemDisabled ? (e) => e.preventDefault() : onClick}
              to={listItem.url || ""}
              title={disabledMessage}
              aria-disabled={isItemDisabled}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all 
                duration-300 hover:bg-gradient-to-r from-primary/5 to-transparent
                ${
                  isActive && window.location.pathname === listItem.url
                    ? "bg-primary/10 border-l-4 border-primary shadow-[inset_2px_0_8px_rgba(99,102,241,0.2)]"
                    : ""
                } ${
                  isItemDisabled
                    ? "opacity-60 cursor-not-allowed pointer-events-none bg-gray-50/5"
                    : "hover:translate-x-2 hover:shadow-md"
                }`
              }
            >
              <listItem.icon
                className={`text-2xl shrink-0 ${
                  isItemDisabled 
                    ? "text-gray-400" 
                    : "text-primary drop-shadow-[0_2px_1px_rgba(99,102,241,0.15)]"
                } transition-transform duration-300 group-hover:scale-110`}
                aria-hidden="true"
              />
              <span
                className={`text-sm font-medium tracking-wide ${
                  isItemDisabled ? "text-gray-400" : "text-foreground/90"
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
              className="flex items-center gap-4 px-4 py-3 rounded-xl 
              transition-all duration-300 hover:bg-gradient-to-r from-primary/5 
              to-transparent hover:translate-x-2 hover:shadow-md
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <listItem.icon className="text-2xl text-primary shrink-0 drop-shadow-[0_2px_1px_rgba(99,102,241,0.15)]" />
              <span className="text-sm font-medium tracking-wide text-foreground/90">
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
