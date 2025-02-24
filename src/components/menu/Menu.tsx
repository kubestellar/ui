// import React from 'react';
import { menu } from './data';
import MenuItem from './MenuItem';

const Menu = () => {
  return (
    <div className="w-full p-4 flex flex-col backdrop-blur-sm 
    bg-white/5 rounded-xl border border-primary/10 
    shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
      {menu.map((item, index) => (
        <MenuItem
          key={index}
          catalog={item.catalog}
          listItems={item.listItems}
        />
      ))}
    </div>
  );
};

export default Menu;
