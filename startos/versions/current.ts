import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.1:0',
  releaseNotes: {
    en_US:
      'Watch-only wallet balance fixes: multi-provider public API fallback (mempool.space, blockstream.info, blockcypher.com, blockchain.info), rate-limit retry/backoff with startup provider probing and periodic re-probe, scan capped at 200 addresses with BIP32 gap detection, and Health Check now shows "still scanning" until a balance is actually resolved instead of misleadingly reporting idle. Balance Source picker warns that public API scans can take several hours.',
    es_ES:
      'Correcciones de saldo de monederos watch-only: respaldo multi-proveedor de API pública (mempool.space, blockstream.info, blockcypher.com, blockchain.info), reintentos con límite de tasa, sondeo de proveedores al inicio y re-sondeo periódico, escaneo limitado a 200 direcciones con detección de brechas BIP32, y el Health Check ahora muestra "sigue escaneando" hasta que se resuelve un saldo en lugar de informar erróneamente inactivo. El selector de fuente de saldo advierte que los escaneos de API pública pueden tardar varias horas.',
    de_DE:
      'Korrekturen für Watch-only-Wallet-Salden: Multi-Provider-Fallback für öffentliche APIs (mempool.space, blockstream.info, blockcypher.com, blockchain.info), Rate-Limit-Wiederholungen, Provider-Prüfung beim Start und regelmäßige Neuprüfung, Scan auf 200 Adressen mit BIP32-Lückenerkennung begrenzt, und der Health Check zeigt jetzt "scannt noch", bis ein Saldo tatsächlich ermittelt wurde, statt irreführend "inaktiv" zu melden. Die Guthabenquellen-Auswahl warnt, dass öffentliche API-Scans mehrere Stunden dauern können.',
    pl_PL:
      'Poprawki sald portfeli watch-only: wielodostawcowe publiczne API (mempool.space, blockstream.info, blockcypher.com, blockchain.info), ponawianie przy limitach szybkości, sprawdzanie dostawców przy starcie i okresowe ponowne sprawdzanie, skan ograniczony do 200 adresów z wykrywaniem luk BIP32, a Health Check pokazuje teraz "nadal skanuje", dopóki saldo nie zostanie faktycznie ustalone, zamiast mylącego "bezczynny". Wybór źródła salda ostrzega, że skanowanie przez publiczne API może zająć kilka godzin.',
    fr_FR:
      'Correctifs des soldes de portefeuilles watch-only : repli multi-fournisseurs d\'API publiques (mempool.space, blockstream.info, blockcypher.com, blockchain.info), nouvelles tentatives avec limite de débit, sondage des fournisseurs au démarrage et re-sondage périodique, analyse limitée à 200 adresses avec détection d\'écart BIP32, et le Health Check affiche désormais "analyse en cours" jusqu\'à ce qu\'un solde soit réellement résolu au lieu de signaler à tort "inactif". Le sélecteur de source de solde avertit que les analyses via API publique peuvent prendre plusieurs heures.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
