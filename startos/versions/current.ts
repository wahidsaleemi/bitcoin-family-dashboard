import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:0',
  releaseNotes: {
    en_US:
      'Actions & Config: manage family members and price source from StartOS. Bitcoin Family branding.',
    es_ES:
      'Acciones y configuración: gestione los miembros de la familia y la fuente de precios desde StartOS. Marca Bitcoin Family.',
    de_DE:
      'Aktionen & Konfiguration: Familienmitglieder und Preisquelle über StartOS verwalten. Bitcoin Family-Branding.',
    pl_PL:
      'Akcje i konfiguracja: zarządzaj członkami rodziny i źródłem cen z StartOS. Marka Bitcoin Family.',
    fr_FR:
      'Actions et configuration : gérez les membres de la famille et la source de prix depuis StartOS. Marque Bitcoin Family.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
