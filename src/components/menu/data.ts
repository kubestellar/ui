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
        label: 'Clusters',
      },
      {
        isLink: true,
        url: '/workloads/manage',
        icon: HiOutlineCommandLine,
        label: 'Workloads',
      },
    ],
  },
  {
    catalog: 'Binding Policies',
    centered: true,
    marginTop: '1rem',
    listItems: [
      {
        isLink: true,
        url: '/bp/manage',
        icon: HiOutlineCog8Tooth,
        label: 'Manage Policies',
      },
    ],
  },
  // treeview 
  {
    catalog: 'KubeStellar Topology',
    centered: true,
    marginTop: '1rem',
    listItems: [
      {
        isLink: true,
        url: '/wecs/treeview',
        icon: HiOutlineCog,
        label: `WEC'S Topology`,
      },
    ],
  },
];
