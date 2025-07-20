import {
  HiOutlineCube,
  HiOutlineCommandLine,
  HiOutlinePuzzlePiece,
  HiOutlineUsers,
  HiOutlineRocketLaunch,
  HiOutlineViewfinderCircle,
} from 'react-icons/hi2';
import { MdPolicy, MdAssuredWorkload, MdDashboard } from 'react-icons/md';
import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MenuItemData } from './Menu';
import { useAdminCheck } from '../../hooks/useAuth';
import { FaRocket } from 'react-icons/fa';

export const useMenuData = (): MenuItemData[] => {
  const { t } = useTranslation();
  const { isAdmin } = useAdminCheck();

  const menuItems: MenuItemData[] = [
    {
      catalog: t('menu.catalogs.main'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/',
          icon: MdDashboard,
          label: t('menu.items.home'),
        },
      ],
    },
    {
      catalog: t('menu.catalogs.management'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/its',
          icon: HiOutlineCube,
          label: t('menu.items.remoteClusters'),
        },
        {
          isLink: true,
          url: '/workloads/manage',
          icon: HiOutlineCommandLine,
          label: t('menu.items.stagedWorkloads'),
        },
        {
          isLink: true,
          url: '/bp/manage',
          icon: MdPolicy,
          label: t('menu.items.bindingPolicies'),
        },
        {
          isLink: true,
          url: '/wecs/treeview',
          icon: MdAssuredWorkload,
          label: t('menu.items.deployedWorkloads'),
        },
        {
          isLink: true,
          url: '/resources',
          icon: HiOutlineViewfinderCircle,
          label: t('menu.items.resourceExplorer'),
        },
        {
          isLink: true,
          url: '/metrics',
          icon: BarChart3,
          label: t('menu.items.metricsDashboard'),
        },
      ],
    },
    {
      catalog: t('menu.catalogs.plugins'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/plugins/marketplace',
          icon: HiOutlineRocketLaunch,
          label: t('menu.items.galaxyMarketplace', 'Galaxy Marketplace'),
        },
        {
          isLink: true,
          url: '/plugins/manage',
          icon: HiOutlinePuzzlePiece,
          label: t('menu.items.pluginManager'),
        },
      ],
    },
  ];

  // Add User Management option only for admins
  if (isAdmin) {
    menuItems.push({
      catalog: t('menu.catalogs.admin') || 'Admin',
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/admin/users',
          icon: HiOutlineUsers,
          label: t('menu.items.userManagement') || 'User Management',
        },
      ],
    });
  }

  return menuItems;
};
