import { useEffect, useState } from "react";
import { Droppable, DroppableProps } from "@hello-pangea/dnd";

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  
  useEffect(() => {
    // Use requestAnimationFrame to delay rendering until after the first animation frame
    const animation = requestAnimationFrame(() => setEnabled(true));
    
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  
  if (!enabled) {
    return null;
  }
  
  return <Droppable {...props}>{children}</Droppable>;
};

export default StrictModeDroppable; 