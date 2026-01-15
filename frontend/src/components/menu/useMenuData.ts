import {
  FaHome,
  FaLayerGroup,
  FaLink,
  FaRocket,
  FaSearch,
  FaPuzzlePiece,
  FaUsersCog,
  FaCubes,
} from 'react-icons/fa';
import { SiGrafana, SiKubernetes } from 'react-icons/si';
import { useTranslation } from 'react-i18next';
import { MenuItemData } from './Menu';
import { useAdminCheck } from '../../hooks/useAuth';
import { usePlugins } from '../../plugins/PluginLoader';

export const useMenuData = (): MenuItemData[] => {
  const { t } = useTranslation();
  const { isAdmin } = useAdminCheck();
  const { pluginMenuItems } = usePlugins();

  const menuItems: MenuItemData[] = [
    {
      catalog: t('menu.catalogs.main'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/',
          icon: FaHome,
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
          icon: SiKubernetes,
          label: t('menu.items.managedClusters'),
        },
        {
          isLink: true,
          url: '/workloads/manage',
          icon: FaLayerGroup,
          label: t('menu.items.stagedWorkloads'),
        },
        {
          isLink: true,
          url: '/bp/manage',
          icon: FaLink,
          label: t('menu.items.bindingPolicies'),
        },
        {
          isLink: true,
          url: '/wecs/treeview',
          icon: FaCubes,
          label: t('menu.items.deployedWorkloads'),
        },
        {
          isLink: true,
          url: '/resources',
          icon: FaSearch,
          label: t('menu.items.resourceExplorer'),
        },
        {
          isLink: true,
          url: '/grafana',
          icon: SiGrafana,
          label: t('menu.items.Grafana'),
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
          icon: FaRocket,
          label: t('menu.items.galaxyMarketplace', 'Galaxy Marketplace'),
        },
        {
          isLink: true,
          url: '/plugins/manage',
          icon: FaPuzzlePiece,
          label: t('menu.items.pluginManager'),
        },
        ...pluginMenuItems,
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
          icon: FaUsersCog,
          label: t('menu.items.userManagement') || 'User Management',
        },
      ],
    });
  }

  return menuItems;
};
