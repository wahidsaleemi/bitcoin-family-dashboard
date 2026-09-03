import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.2.2:0',
  releaseNotes: {
    en_US:
      'UI fix: when a watch-only wallet is configured for a member but its balance has not been fetched yet (public API scan still in progress), the member card shows "Fetching..." instead of the stale manually-entered balance, with a hover tooltip explaining that the first scan can take a while. USD value and P&L are hidden until the real balance arrives.',
    es_ES:
      'Corrección de interfaz: cuando se configura un monedero de solo observación para un miembro pero su saldo aún no se ha obtenido (el escaneo de API pública sigue en curso), la tarjeta del miembro muestra "Obteniendo..." en lugar del saldo manual obsoleto, con información al pasar el cursor explicando que el primer escaneo puede tardar. El valor USD y P&L se ocultan hasta que llegue el saldo real.',
    de_DE:
      'UI-Korrektur: Wenn für ein Mitglied ein Watch-only-Wallet konfiguriert ist, dessen Saldo aber noch nicht abgerufen wurde (öffentlicher API-Scan läuft noch), zeigt die Mitgliedskarte "Wird abgerufen..." anstelle des veralteten manuell eingegebenen Saldos, mit einem Tooltip, der erklärt, dass der erste Scan dauern kann. USD-Wert und P&L werden ausgeblendet, bis das echte Saldo eintrifft.',
    pl_PL:
      'Poprawka interfejsu: gdy portfel watch-only jest skonfigurowany dla członka, ale jego saldo nie zostało jeszcze pobrane (skanowanie publicznego API wciąż trwa), karta członka pokazuje "Pobieranie..." zamiast nieaktualnego ręcznie wprowadzonego salda, z dymkiem wyjaśniającym, że pierwsze skanowanie może potrwać. Wartość USD i P&L są ukryte, dopóki nie nadejdzie prawdziwe saldo.',
    fr_FR:
      'Correction UI : lorsqu\'un portefeuille watch-only est configuré pour un membre mais que son solde n\'a pas encore été récupéré (analyse d\'API publique en cours), la carte du membre affiche "Récupération..." au lieu du solde saisi manuellement et obsolète, avec une infobulle expliquant que la première analyse peut prendre du temps. La valeur USD et le P&L sont masqués jusqu\'à l\'arrivée du solde réel.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
