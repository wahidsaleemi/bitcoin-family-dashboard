import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.0:0',
  releaseNotes: {
    en_US:
      'Watch-only wallets: attach a Bitcoin output descriptor to any family member — balances are fetched from your Bitcoin Core node when available, otherwise mempool.space, and override the manual entry. Watch scan health reporting, cross-source fallback, updated price sources (CoinGecko, Coinbase, Bitstamp, Binance), rotating landscape backgrounds, and refreshed docs.',
    es_ES:
      'Monederos de solo lectura: adjunte un descriptor de salida de Bitcoin a cualquier miembro de la familia; los saldos se obtienen de su nodo Bitcoin Core cuando está disponible o de mempool.space, y anulan la entrada manual. Informes de salud del escaneo, respaldo de múltiples fuentes, fuentes de precios actualizadas (CoinGecko, Coinbase, Bitstamp, Binance), fondos de paisajes rotativos y documentación renovada.',
    de_DE:
      'Watch-only-Wallets: Fügen Sie jedem Familienmitglied einen Bitcoin-Output-Descriptor hinzu — Salden werden von Ihrem Bitcoin-Core-Knoten (falls verfügbar) oder von mempool.space abgerufen und überschreiben die manuelle Eingabe. Scan-Health-Reporting, Fallback über mehrere Quellen, aktualisierte Preisquellen (CoinGecko, Coinbase, Bitstamp, Binance), rotierende Landschaftshintergründe und aktualisierte Dokumentation.',
    pl_PL:
      'Portfele watch-only: przypisz deskryptor wyjścia Bitcoin do dowolnego członka rodziny — salda są pobierane z Twojego węzła Bitcoin Core, gdy jest dostępny, lub z mempool.space i zastępują wpis ręczny. Raportowanie stanu skanowania, awaryjne przełączanie źródeł, zaktualizowane źródła cen (CoinGecko, Coinbase, Bitstamp, Binance), obracające się tła krajobrazowe i odświeżona dokumentacja.',
    fr_FR:
      'Portefeuilles watch-only : associez un descripteur de sortie Bitcoin à tout membre de la famille — les soldes sont récupérés depuis votre nœud Bitcoin Core lorsqu\'il est disponible, sinon depuis mempool.space, et remplacent la saisie manuelle. Rapport d\'état d\'analyse, bascule multi-sources, sources de prix mises à jour (CoinGecko, Coinbase, Bitstamp, Binance), arrière-plans paysagers rotatifs et documentation rafraîchie.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
