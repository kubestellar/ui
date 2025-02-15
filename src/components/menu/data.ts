import {
  HiOutlineHome,
  HiOutlineUser,
  HiOutlineCube,
  HiOutlineClipboardDocumentList,
  HiOutlinePresentationChartBar,
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
        url: '/its',
        icon: HiOutlineServer,
        label: 'Overview',
      },
      {
        isLink: true,
        url: '/createcluster',
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
        url: '/wds',
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
        url: '/bp',
        icon: HiOutlinePresentationChartBar,
        label: 'Overview',
      },
      {
        isLink: true,
        url: '/bp/manage',
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
