import { sdk } from '../sdk'
import { addMember, removeMember, updateMember } from './family-members'
import { configurePriceSource } from './price-source'
import { configureBackground } from './background'
import { configureWatchOnlyWallet } from './watch-only-wallet'

export const actions = sdk.Actions.of()
  .addAction(addMember)
  .addAction(removeMember)
  .addAction(updateMember)
  .addAction(configurePriceSource)
  .addAction(configureBackground)
  .addAction(configureWatchOnlyWallet)
