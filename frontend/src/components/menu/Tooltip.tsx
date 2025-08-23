import ReactDOM from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  position: { top: number; left: number };
}

const Tooltip: React.FC<TooltipProps> = ({ children, position }) => {
  return ReactDOM.createPortal(
    <div
      className="fixed z-[9999] rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg transition-opacity duration-200"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default Tooltip;
