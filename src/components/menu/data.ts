import {
  HiOutlineHome,
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineSquares2X2,
  HiOutlineCommandLine,
  HiOutlineCog8Tooth,
  HiOutlineShieldCheck,
  HiOutlineCubeTransparent,
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
      {
        isLink: true,
        url: '/profile',
        icon: HiOutlineUser,
        label: 'Profile',
        marginBottom: '2rem',
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
        url: '/wds',
        icon: HiOutlineSquares2X2,
        label: 'Deployments',
      },
      {
        isLink: true,
        url: '/workloads/manage',
        icon: HiOutlineCommandLine,
        label: 'Workloads',
        marginBottom: '2rem',
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
        url: '/bp',
        icon: HiOutlineShieldCheck,
        label: 'Overview',
      },
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
        url: '/wds/treeview',
        icon: HiOutlineCubeTransparent,
        label: 'Workload Topology',
      },
      {
        isLink: true,
        url: '/wecs/treeview',
        icon: HiOutlineCog,
        label: `WEC'S Topology`,
      },
    ],
  },
];
