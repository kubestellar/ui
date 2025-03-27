import { memo } from "react";
import { FiMoreVertical } from "react-icons/fi";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { ResourceItem } from "../TreeViewComponent";
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support

interface NodeLabelProps {
  label: string;
  icon: string;
  dynamicText: string;
  status: string;
  timeAgo?: string;
  onClick: (e: React.MouseEvent) => void;
  onMenuClick: (e: React.MouseEvent) => void;
  resourceData?: ResourceItem;
}

export const NodeLabel = memo<NodeLabelProps>(({
  label,
  icon,
  dynamicText,
  timeAgo,
  onClick,
  onMenuClick,
}) => {
    const theme = useTheme((state) => state.theme); // Get the current theme
  
  return (
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "-5px" }}>
        <div>
          <img src={icon} alt={label} width="18" height="18" />
          <span style={{ color: "gray", fontWeight: 500 }}>{dynamicText}</span>
        </div>
        <div style={{ textAlign: "left" }}>
          <div>{label}</div>
          <div style={{ display: "flex", gap: "1px" }}>
            {/* Removed heart and check/cross icons */}
            {/* Removed heart and check/cross icons */}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <FiMoreVertical
          style={{ fontSize: "11px", color: "#34aadc", marginRight: "-10px", cursor: "pointer" }}
          onClick={onMenuClick}
        />
      </div>
      {timeAgo && (
        <div
          style={{
            position: "absolute",
            bottom: "-6px",
            right: "-10px",
            fontSize: "5px",
            color: theme === "dark" ? "#fff" : "#495763",
            // background: "#ccd6dd",
            backgroundColor: theme === "dark" ? "#333333" : "#ccd6dd",
            padding: "0 2px",
            border: "1px solid #8fa4b1",
            borderRadius: "3px",
          }}
        >
          {timeAgo}
        </div>
      )}
    </div>
  );
});