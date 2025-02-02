import {
  HiOutlineHome,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineClipboardDocumentList,
  HiOutlinePresentationChartBar,
  HiOutlineDocumentText,
  HiOutlineServer,
} from 'react-icons/hi2';

export const menu = [
  {
    catalog: 'Dashboard',
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
    catalog: 'Clusters',
    listItems: [
      {
        isLink: true,
        url: '/clusters',
        icon: HiOutlineServer,
        label: 'Overview',
      },
      {
        isLink: true,
        url: '/clusters/create',
        icon: HiOutlineCube,
        label: 'Onboard',
      },

    ],
  },

  {
    catalog: 'Workloads',
    listItems: [
      {
        isLink: true,
        url: '/workloads',
        icon: HiOutlinePresentationChartBar,
        label: 'deployments',
      },
      {
        isLink: true,
        url: '/workloads/manage',
        icon: HiOutlineClipboardDocumentList,
        label: 'Manage',
      },
    ],
  },
  {
    catalog: 'Binding Policies',
    listItems: [
      {
        isLink: true,
        url: '/nodes',
        icon: HiOutlinePresentationChartBar,
        label: 'Overview',
      },
      {
        isLink: true,
        url: '/nodes/manage',
        icon: HiOutlineClipboardDocumentList,
        label: 'Policies',
      },
    ],
  },

  {
    catalog: 'Profile',
    listItems: [
      {
        isLink: true,
        url: '/profile',
        icon: HiOutlineUser,
        label: 'User',
      },
    ],
  },
];
