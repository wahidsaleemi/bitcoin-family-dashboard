import { sdk } from '../sdk'
import { addMember, removeMember, updateMember } from './family-members'
import { configurePriceSource } from './price-source'

export const actions = sdk.Actions.of()
  .addAction(addMember)
  .addAction(removeMember)
  .addAction(updateMember)
  .addAction(configurePriceSource)
