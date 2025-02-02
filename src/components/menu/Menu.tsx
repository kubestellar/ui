// import React from 'react';
import { menu } from './data';
import MenuItem from './MenuItem';

const Menu = () => {
  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-5">
        {menu.map((item, index) => (
          <MenuItem
            key={index}
            catalog={item.catalog}
            listItems={item.listItems}
          />
        ))}
      </div>
    </div>
  );
};

export default Menu;
