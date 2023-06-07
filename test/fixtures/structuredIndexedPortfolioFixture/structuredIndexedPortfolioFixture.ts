import { Wallet } from 'ethers'
import { LIST_ADMIN_ROLE } from 'utils/constants'
import { deployFixtureContracts } from './deployFixtureContracts'
import { wrapFixtureUtils } from './wrapFixtureUtils'

export enum StructuredIndexedPortfolioStatus {
  CapitalFormation,
  Live,
  Closed,
}

export async function structuredIndexedPortfolioFixture([wallet]: Wallet[]) {
  const deployReturn = await deployFixtureContracts([wallet])
  const { token, vaultsRegistry } = deployReturn

  const fixtureUtils = wrapFixtureUtils(deployReturn)
  const { parseMockToken } = fixtureUtils

  await token.mint(wallet.address, parseMockToken(10_000_000))
  await vaultsRegistry.grantRole(LIST_ADMIN_ROLE, wallet.address)

  return { ...deployReturn, ...fixtureUtils }
}
