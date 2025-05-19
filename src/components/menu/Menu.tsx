// import React from 'react';
import { menu } from './data';
import MenuItem from './MenuItem';

const Menu = () => {
  return (
    <div
      className="flex w-full flex-col rounded-xl border border-primary/10 
    bg-white/5 p-2 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] 
    backdrop-blur-sm"
    >
      {menu.map((item, index) => (
        <MenuItem key={index} catalog={item.catalog} listItems={item.listItems} />
      ))}
    </div>
  );
};

export default Menu;
