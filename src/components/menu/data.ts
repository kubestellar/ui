import {
  HiOutlineHome,
  HiOutlineUser,
  HiOutlineClipboardDocumentList,
  HiOutlinePresentationChartBar,
  HiOutlineServer,
} from 'react-icons/hi2';

export const menu = [
  {
    catalog: 'Main',
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
      },
    ],
  },
  {
    catalog: 'Management',
    listItems: [
      {
        isLink: true,
        url: '/its',
        icon: HiOutlineServer,
        label: 'Manage Clusters',
      },
      {
        isLink: true,
        url: '/wds',
        icon: HiOutlinePresentationChartBar,
        label: 'Deployments',
      },
      {
        isLink: true,
        url: '/workloads/manage',
        icon: HiOutlineClipboardDocumentList,
        label: 'Manage Workloads',
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
        label: 'Manage Policies',
      },
    ],
  },
];
