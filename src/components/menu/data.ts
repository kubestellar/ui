import {
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineCommandLine,
  HiOutlineCog8Tooth,
  HiOutlineCog,
} from 'react-icons/hi2';

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
        icon: HiOutlineCog8Tooth,
        label: 'Binding Policies',
      },
      {
        isLink: true,
        url: '/wecs/treeview',
        icon: HiOutlineCog,
        label: `Deployed Workloads`,
      },
    ],
  },
];
