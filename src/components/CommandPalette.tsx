import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useTheme from '../stores/themeStore';
import getThemeStyles from '../lib/theme-utils';
import {
  FiCommand,
  FiSearch,
  FiGitBranch,
  FiServer,
  FiLayers,
  FiHome,
  FiBox,
  FiLogOut,
} from 'react-icons/fi';
import { useAuthActions } from '../hooks/useAuth';
import { MdShoppingBasket } from 'react-icons/md';

// Command types to support various actions
type CommandType = 'navigation' | 'action' | 'documentation';

interface CommandItem {
  id: string;
  type: CommandType;
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
  keywords: string[];
  section?: string;
}

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandListRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const themeStyles = getThemeStyles(isDark);
  const { logout } = useAuthActions();

  // Close the command palette on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate('/login', {
      state: {
        infoMessage: 'You have been successfully logged out.',
      },
    });
  };

  // Prepare commands based on the KubeStellar navigation and feature set
  const commands: CommandItem[] = [
    {
      id: 'home',
      type: 'navigation',
      icon: FiHome,
      title: 'Home',
      description: 'Go to dashboard',
      action: () => navigate('/'),
      keywords: ['dashboard', 'home', 'main', 'dashboard', 'home', 'main'],
      section: 'Navigation',
    },
    {
      id: 'clusters',
      type: 'navigation',
      icon: FiServer,
      title: 'Remote Clusters',
      description: 'Manage Kubernetes clusters',
      action: () => navigate('/its'),
      keywords: [
        'kubernetes',
        'k8s',
        'cluster',
        'import',
        'onboard',
        'clusters',
        'remote',
        'clusters',
        'kubernetes',
        'k8s',
        'cluster',
        'import',
        'onboard',
      ],
      section: 'Navigation',
    },
    {
      id: 'workloads',
      type: 'navigation',
      icon: FiBox,
      title: 'Workloads',
      description: 'Manage workloads across clusters',
      action: () => navigate('/workloads/manage'),
      keywords: [
        'workload',
        'application',
        'deploy',
        'container',
        'pods',
        'services',
        'deployments',
        'jobs',
        'cronjobs',
        'statefulsets',
        'daemonsets',
        'replicasets',
        'jobs',
        'wds',
        'statefulsets',
        'daemonsets',
        'replicasets',
      ],
      section: 'Navigation',
    },
    {
      id: 'binding-policies',
      type: 'navigation',
      icon: FiLayers,
      title: 'Binding Policies',
      description: 'Configure binding policies',
      action: () => navigate('/bp/manage'),
      keywords: [
        'binding',
        'policy',
        'bp',
        'rules',
        'configuration',
        'binding',
        'policy',
        'bp',
        'rules',
        'configuration',
      ],
      section: 'Navigation',
    },
    {
      id: 'wds-treeview',
      type: 'navigation',
      icon: FiGitBranch,
      title: 'WDS Treeview',
      description: 'Visualize workload distribution',
      action: () => navigate('/wds/treeview'),
      keywords: ['tree', 'view', 'wds', 'hierarchy', 'structure'],
      section: 'Visualizations',
    },
    {
      id: 'wecs-treeview',
      type: 'navigation',
      icon: FiGitBranch,
      title: 'WECS Treeview',
      description: 'Visualize Deployed Workloads structure',
      action: () => navigate('/wecs/treeview'),
      keywords: [
        'tree',
        'view',
        'wecs',
        'edge',
        'computing',
        'deployed',
        'workloads',
        'pods',
        'services',
        'deployments',
        'jobs',
        'cronjobs',
        'statefulsets',
        'daemonsets',
        'replicasets',
        'jobs',
        'wds',
        'statefulsets',
        'daemonsets',
        'replicasets',
      ],
      section: 'Visualizations',
    },
    {
      id: 'plugins',
      type: 'navigation',
      icon: MdShoppingBasket,
      title: 'Plugins',
      description: 'Manage installed plugins',
      action: () => navigate('/plugins'),
      keywords: ['plugins', 'extensions', 'add-ons', 'modules'],
      section: 'Navigation',
    },
    {
      id: 'documentation',
      type: 'documentation',
      icon: FiSearch,
      title: 'Open Documentation',
      description: 'Launch KubeStellar documentation',
      action: () =>
        window.open('https://docs.kubestellar.io/release-0.27.2/', '_blank', 'noopener,noreferrer'),
      keywords: [
        'docs',
        'help',
        'guide',
        'manual',
        'reference',
        'documentation',
        'docs',
        'help',
        'guide',
        'manual',
        'reference',
      ],
      section: 'Help',
    },
    {
      id: 'logout',
      type: 'action',
      icon: FiLogOut,
      title: 'Logout',
      description: 'Sign out of your account',
      action: handleLogout,
      keywords: [
        'sign out',
        'exit',
        'quit',
        'log out',
        'logout',
        'sign out',
        'exit',
        'quit',
        'log out',
      ],
      section: 'Account',
    },
  ];

  // Filter commands based on search query
  const filteredCommands = searchQuery
    ? commands.filter(command => {
        const searchLower = searchQuery.toLowerCase();
        return (
          command.title.toLowerCase().includes(searchLower) ||
          command.description.toLowerCase().includes(searchLower) ||
          command.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
        );
      })
    : commands;

  // Group commands by section
  const groupedCommands: [string, CommandItem[]][] = searchQuery
    ? []
    : Object.entries(
        commands.reduce<Record<string, CommandItem[]>>((groups, command) => {
          const section = command.section || 'Other';
          if (!groups[section]) {
            groups[section] = [];
          }
          groups[section].push(command);
          return groups;
        }, {})
      );

  // Handle command execution
  const executeCommand = (command: CommandItem) => {
    setIsOpen(false);
    command.action();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      default:
        break;
    }
  };

  // Scroll to ensure selected item is visible
  useEffect(() => {
    if (commandListRef.current && filteredCommands.length > 0) {
      const selectedElement = commandListRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  // Command button icon variants
  const iconVariants = {
    rest: {
      rotate: 0,
      scale: 1,
    },
    hover: {
      rotate: 15,
      scale: 1.1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 8,
      },
    },
    tap: {
      rotate: 0,
      scale: 0.9,
    },
  };

  return (
    <>
      {/* Command palette toggle button */}
      <motion.div
        className="relative"
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        ref={buttonRef}
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          className="btn btn-circle relative transition-all duration-300"
          style={{
            color: themeStyles.colors.text.primary,
            background: themeStyles.button.secondary.background,
            boxShadow: themeStyles.colors.shadow.sm,
            overflow: 'hidden',
          }}
          aria-label="Open command palette"
          title="Command Palette (Ctrl+K)"
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              background: isDark
                ? 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            }}
          />

          <motion.div className="relative z-10 flex items-center justify-center">
            <motion.div variants={iconVariants}>
              <FiCommand
                className="text-xl"
                style={{
                  color: isDark
                    ? themeStyles.colors.brand.primaryLight
                    : themeStyles.colors.brand.primary,
                }}
              />
            </motion.div>
          </motion.div>
        </motion.button>

        <motion.div
          className="bg-brand-primary absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white"
          style={{
            background: isDark
              ? themeStyles.colors.brand.primary
              : themeStyles.colors.brand.primary,
            boxShadow: `0 0 0 2px ${isDark ? themeStyles.colors.bg.secondary : 'white'}`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          K
        </motion.div>
      </motion.div>

      {/* Command palette dialog */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - subtle for header dropdown style */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(3px)',
              }}
            />

            {/* Command palette dropdown */}
            <motion.div
              className="absolute right-4 z-50 mt-2 w-80 origin-top-right sm:w-96 md:right-8 md:w-[30rem]"
              style={{
                top: '100%',
                filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.15))',
                transformOrigin: 'top right',
              }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: 0.95 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                mass: 0.8,
              }}
            >
              <div
                className="flex max-h-[calc(100vh-120px)] flex-col rounded-lg border"
                style={{
                  background: isDark ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(8px)',
                  borderColor: isDark ? 'rgba(75, 85, 99, 0.4)' : 'rgba(226, 232, 240, 0.8)',
                  boxShadow: isDark
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Search input */}
                <div
                  className="shrink-0 border-b p-3"
                  style={{
                    borderColor: isDark ? 'rgba(75, 85, 99, 0.4)' : 'rgba(226, 232, 240, 0.8)',
                    background: isDark ? 'rgba(31, 41, 55, 0.7)' : 'rgba(249, 250, 251, 0.7)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FiSearch
                      className="text-lg"
                      style={{ color: themeStyles.colors.text.tertiary }}
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setSelectedIndex(0);
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Search commands..."
                      className="w-full bg-transparent text-base focus:outline-none"
                      style={{
                        color: themeStyles.colors.text.primary,
                      }}
                      autoComplete="off"
                    />
                    <kbd
                      className="hidden items-center rounded px-1.5 py-0.5 text-xs font-semibold sm:inline-flex"
                      style={{
                        background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                        color: themeStyles.colors.text.secondary,
                      }}
                    >
                      ESC
                    </kbd>
                  </div>
                </div>

                {/* Command list - completely revised scrolling area */}
                <div
                  className="flex-1 overflow-y-auto overflow-x-hidden"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${themeStyles.colors.brand.primary} transparent`,
                    WebkitOverflowScrolling: 'touch',
                    msOverflowStyle: 'auto',
                  }}
                  ref={commandListRef}
                >
                  {filteredCommands.length === 0 ? (
                    <div
                      className="px-3 py-8 text-center"
                      style={{ color: themeStyles.colors.text.tertiary }}
                    >
                      No commands found. Try a different search term.
                    </div>
                  ) : (
                    <div className="py-1">
                      {searchQuery ? (
                        // Show flat list when searching
                        <div>
                          {filteredCommands.map((command, index) => (
                            <CommandListItem
                              key={command.id}
                              command={command}
                              index={index}
                              selectedIndex={selectedIndex}
                              executeCommand={executeCommand}
                              setSelectedIndex={setSelectedIndex}
                              isDark={isDark}
                              themeStyles={themeStyles}
                              compact
                            />
                          ))}
                        </div>
                      ) : (
                        // Show grouped list when not searching
                        <div>
                          {groupedCommands.map(([section, items]: [string, CommandItem[]]) => (
                            <div key={section} className="relative mb-2">
                              <div
                                className="sticky top-0 z-10 px-3 py-1 text-xs font-semibold uppercase"
                                style={{
                                  color: themeStyles.colors.text.tertiary,
                                  background: isDark
                                    ? 'rgba(17, 24, 39, 0.95)'
                                    : 'rgba(249, 250, 251, 0.95)',
                                  backdropFilter: 'blur(8px)',
                                }}
                              >
                                {section}
                              </div>
                              <div className="pb-1">
                                {items.map((command: CommandItem) => {
                                  const globalIdx = commands.findIndex(c => c.id === command.id);
                                  return (
                                    <CommandListItem
                                      key={command.id}
                                      command={command}
                                      index={globalIdx}
                                      selectedIndex={selectedIndex}
                                      executeCommand={executeCommand}
                                      setSelectedIndex={setSelectedIndex}
                                      isDark={isDark}
                                      themeStyles={themeStyles}
                                      compact
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer with hints - more compact */}
                <div
                  className="flex shrink-0 items-center justify-between border-t px-3 py-1.5 text-xs"
                  style={{
                    borderColor: isDark ? 'rgba(75, 85, 99, 0.4)' : 'rgba(226, 232, 240, 0.8)',
                    color: themeStyles.colors.text.tertiary,
                    background: isDark ? 'rgba(31, 41, 55, 0.7)' : 'rgba(249, 250, 251, 0.7)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <kbd
                        className="inline-flex min-w-4 items-center justify-center rounded px-1 py-0.5 text-xs font-semibold"
                        style={{
                          background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                        }}
                      >
                        ↑↓
                      </kbd>
                      <span className="ml-0.5">navigate</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <kbd
                        className="inline-flex min-w-4 items-center justify-center rounded px-1 py-0.5 text-xs font-semibold"
                        style={{
                          background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                        }}
                      >
                        ↵
                      </kbd>
                      <span className="ml-0.5">select</span>
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <kbd
                      className="mx-1 inline-flex min-w-4 items-center justify-center rounded px-1 py-0.5 text-xs font-semibold"
                      style={{
                        background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)',
                      }}
                    >
                      Ctrl+K
                    </kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// Extract command list item to a separate component for clarity
interface CommandListItemProps {
  command: CommandItem;
  index: number;
  selectedIndex: number;
  executeCommand: (command: CommandItem) => void;
  setSelectedIndex: (index: number) => void;
  isDark: boolean;
  themeStyles: ReturnType<typeof getThemeStyles>;
  compact?: boolean;
}

const CommandListItem: React.FC<CommandListItemProps> = ({
  command,
  index,
  selectedIndex,
  executeCommand,
  setSelectedIndex,
  isDark,
  themeStyles,
  compact = false,
}) => {
  // Determine icon color based on command type
  const getIconColor = (type: CommandType) => {
    switch (type) {
      case 'navigation':
        return themeStyles.colors.brand.primary;
      case 'documentation':
        return themeStyles.colors.status.info;
      case 'action':
        return command.id === 'logout'
          ? themeStyles.colors.status.error
          : themeStyles.colors.status.warning;
      default:
        return themeStyles.colors.text.primary;
    }
  };

  return (
    <motion.button
      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-200`}
      style={{
        background:
          selectedIndex === index
            ? isDark
              ? 'rgba(59, 130, 246, 0.1)'
              : 'rgba(59, 130, 246, 0.05)'
            : 'transparent',
        borderLeft:
          selectedIndex === index
            ? `2px solid ${themeStyles.colors.brand.primary}`
            : '2px solid transparent',
      }}
      onClick={() => executeCommand(command)}
      onMouseEnter={() => setSelectedIndex(index)}
      whileHover={{ x: 2 }}
    >
      <div
        className="flex h-8 min-w-8 items-center justify-center rounded-md"
        style={{
          background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.7)',
        }}
      >
        <command.icon className="text-base" style={{ color: getIconColor(command.type) }} />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium"
          style={{ color: themeStyles.colors.text.primary }}
        >
          {command.title}
        </div>
        {!compact && (
          <div
            className="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
            style={{ color: themeStyles.colors.text.secondary }}
          >
            {command.description}
          </div>
        )}
        {compact && (
          <div
            className="overflow-hidden text-ellipsis whitespace-nowrap text-xs"
            style={{ color: themeStyles.colors.text.tertiary }}
          >
            {command.description}
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default CommandPalette;
