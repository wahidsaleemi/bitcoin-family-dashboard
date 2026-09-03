import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:0',
  releaseNotes: {
    en_US:
      'Watch-only wallet balance reliability: multi-provider public API fallback (mempool.space, blockstream.info, blockcypher.com, blockchain.info) with rate-limit retry/backoff, startup provider probing + periodic re-probe, scan capped at 200 addresses with BIP32 gap detection, and Health Check shows "still scanning" until a balance is actually resolved. Balance Source picker warns public API scans can take several hours. Member cards show "Fetching..." (with tooltip) instead of a stale manual balance while a watch-only balance is pending, and USD/P&L hide until the real balance arrives. Fixes a price-update ReferenceError.',
    es_ES:
      'Fiabilidad del saldo de monederos watch-only: respaldo multi-proveedor de API pública (mempool.space, blockstream.info, blockcypher.com, blockchain.info) con reintentos y límite de tasa, sondeo de proveedores al inicio y re-sondeo periódico, escaneo limitado a 200 direcciones con detección de brechas BIP32, y el Health Check muestra "sigue escaneando" hasta que se resuelve un saldo. El selector de fuente de saldo advierte que los escaneos de API pública pueden tardar varias horas. Las tarjetas de miembros muestran "Obteniendo..." (con información) en lugar de un saldo manual obsoleto mientras un saldo watch-only está pendiente, y USD/P&L se ocultan hasta que llega el saldo real. Corrige un ReferenceError en la actualización de precios.',
    de_DE:
      'Zuverlässigkeit von Watch-only-Wallet-Salden: Multi-Provider-Fallback für öffentliche APIs (mempool.space, blockstream.info, blockcypher.com, blockchain.info) mit Rate-Limit-Wiederholungen, Provider-Prüfung beim Start und regelmäßiger Neuprüfung, Scan auf 200 Adressen mit BIP32-Lückenerkennung begrenzt, und der Health Check zeigt "scannt noch", bis ein Saldo tatsächlich ermittelt wurde. Die Guthabenquellen-Auswahl warnt, dass öffentliche API-Scans mehrere Stunden dauern können. Mitgliedskarten zeigen "Wird abgerufen..." (mit Tooltip) statt eines veralteten manuellen Saldos, während ein Watch-only-Saldo aussteht, und USD/P&L werden ausgeblendet, bis das echte Saldo eintrifft. Behebt einen ReferenceError bei der Preisaktualisierung.',
    pl_PL:
      'Niezawodność sald portfeli watch-only: wielodostawcowe publiczne API (mempool.space, blockstream.info, blockcypher.com, blockchain.info) z ponawianiem przy limitach szybkości, sprawdzanie dostawców przy starcie i okresowe ponowne sprawdzanie, skan ograniczony do 200 adresów z wykrywaniem luk BIP32, a Health Check pokazuje "nadal skanuje", dopóki saldo nie zostanie faktycznie ustalone. Wybór źródła salda ostrzega, że skanowanie przez publiczne API może zająć kilka godzin. Karty członków pokazują "Pobieranie..." (z dymkiem) zamiast nieaktualnego ręcznie wprowadzonego salda, gdy saldo watch-only jest oczekujące, a USD/P&L są ukryte, dopóki nie nadejdzie prawdziwe saldo. Naprawia ReferenceError przy aktualizacji cen.',
    fr_FR:
      'Fiabilité des soldes de portefeuilles watch-only : repli multi-fournisseurs d\'API publiques (mempool.space, blockstream.info, blockcypher.com, blockchain.info) avec nouvelles tentatives et limite de débit, sondage des fournisseurs au démarrage et re-sondage périodique, analyse limitée à 200 adresses avec détection d\'écart BIP32, et le Health Check affiche "analyse en cours" jusqu\'à ce qu\'un solde soit réellement résolu. Le sélecteur de source de solde avertit que les analyses via API publique peuvent prendre plusieurs heures. Les cartes des membres affichent "Récupération..." (avec infobulle) au lieu d\'un solde manuel obsolète pendant qu\'un solde watch-only est en attente, et la valeur USD/P&L sont masqués jusqu\'à l\'arrivée du solde réel. Corrige une ReferenceError lors de la mise à jour des prix.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
