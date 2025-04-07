import {
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineCommandLine,
} from 'react-icons/hi2';

import { MdPolicy, MdAssuredWorkload } from "react-icons/md";

export const menu = [
  {
    catalog: 'Main',
    centered: true,
    marginTop: '1rem',
    listItems: [
      {
        isLink: true,
        url: '/',
        icon: HiOutlineHome,
        label: 'Home',
      },
    ],
  },
  {
    catalog: 'Management',
    centered: true,
    marginTop: '1rem',
    listItems: [
      {
        isLink: true,
        url: '/its',
        icon: HiOutlineCube,
        label: 'Remote Clusters',
      },
      {
        isLink: true,
        url: '/workloads/manage',
        icon: HiOutlineCommandLine,
        label: 'Staged Workloads',
      },
      {
        isLink: true,
        url: '/bp/manage',
        icon: MdPolicy,
        label: 'Binding Policies',
      },
      {
        isLink: true,
        url: '/wecs/treeview',
        icon: MdAssuredWorkload,
        label: `Deployed Workloads`,
      },
    ],
  },
];
