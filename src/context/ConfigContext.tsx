import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from '@/types/aircraft';
import { loadConfig, saveConfig } from '@/lib/config';

type ConfigType = typeof DEFAULT_CONFIG;

interface ConfigContextType {
  config: ConfigType;
  updateConfig: (newConfig: ConfigType) => void;
  reloadConfig: () => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigType>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load config from database on mount
  useEffect(() => {
    loadConfig().then((loadedConfig) => {
      // Migrate old tab format to new nested format
      const migratedTabs = { ...loadedConfig.tabs };
      Object.keys(migratedTabs).forEach((key) => {
        if (typeof migratedTabs[key] === 'boolean') {
          const oldValue = migratedTabs[key];
          migratedTabs[key] = { public: oldValue, admin: oldValue };
        }
      });

      // Ensure leasebackCalculator tab, sr22Leaseback, pc24Ownership, and ownersFleetOwnership config exists in loaded config
      const configWithDefaults = {
        ...loadedConfig,
        ownershipShare: loadedConfig.ownershipShare ?? DEFAULT_CONFIG.ownershipShare,
        tabs: {
          ...migratedTabs,
          leasebackCalculator: migratedTabs?.leasebackCalculator ?? { public: false, admin: true },
        },
        sr22Leaseback: {
          ...DEFAULT_CONFIG.sr22Leaseback,
          ...loadedConfig.sr22Leaseback,
        },
        pc24Ownership: {
          ...DEFAULT_CONFIG.pc24Ownership,
          ...loadedConfig.pc24Ownership,
        },
        ownersFleetOwnership: {
          ...DEFAULT_CONFIG.ownersFleetOwnership,
          ...loadedConfig.ownersFleetOwnership,
        },
      };
      setConfig(configWithDefaults);
      setIsLoading(false);
    });
  }, []);

  const updateConfig = async (newConfig: ConfigType) => {
    setConfig(newConfig);
    await saveConfig(newConfig);
  };

  const reloadConfig = async () => {
    const loadedConfig = await loadConfig();
    
    // Migrate old tab format to new nested format
    const migratedTabs = { ...loadedConfig.tabs };
    Object.keys(migratedTabs).forEach((key) => {
      if (typeof migratedTabs[key] === 'boolean') {
        const oldValue = migratedTabs[key];
        migratedTabs[key] = { public: oldValue, admin: oldValue };
      }
    });

    const configWithDefaults = {
      ...loadedConfig,
      ownershipShare: loadedConfig.ownershipShare ?? DEFAULT_CONFIG.ownershipShare,
      tabs: {
        ...migratedTabs,
        leasebackCalculator: migratedTabs?.leasebackCalculator ?? { public: false, admin: true },
      },
      sr22Leaseback: {
        ...DEFAULT_CONFIG.sr22Leaseback,
        ...loadedConfig.sr22Leaseback,
      },
      pc24Ownership: {
        ...DEFAULT_CONFIG.pc24Ownership,
        ...loadedConfig.pc24Ownership,
      },
      ownersFleetOwnership: {
        ...DEFAULT_CONFIG.ownersFleetOwnership,
        ...loadedConfig.ownersFleetOwnership,
      },
    };
    setConfig(configWithDefaults);
  };

  // Always render children with context, even during loading
  // Components can handle loading state if needed
  return (
    <ConfigContext.Provider value={{ config, updateConfig, reloadConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
