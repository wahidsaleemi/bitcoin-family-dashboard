import { sdk } from '../sdk'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { seedConfig } from './seed'

export const init = sdk.setupInit(
  seedConfig,
  restoreInit,
  versionGraph,
  setInterfaces,
  setDependencies,
  actions,
)

export const uninit = sdk.setupUninit(versionGraph)
