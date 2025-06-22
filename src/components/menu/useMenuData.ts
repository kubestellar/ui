import { HiOutlineHome, HiOutlineCube, HiOutlineCommandLine, HiOutlinePuzzlePiece } from 'react-icons/hi2';
import { MdPolicy, MdAssuredWorkload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { MenuItemData } from './Menu';

export const useMenuData = (): MenuItemData[] => {
  const { t } = useTranslation();

  return [
    {
      catalog: t('menu.catalogs.main'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/',
          icon: HiOutlineHome,
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
      ],
    },
    {
      catalog: t('menu.catalogs.plugins'),
      centered: true,
      marginTop: '1rem',
      listItems: [
        {
          isLink: true,
          url: '/plugins/manage',
          icon: HiOutlinePuzzlePiece,
          label: t('menu.items.pluginManager'),
        },
      ],
    },
  ];
};
