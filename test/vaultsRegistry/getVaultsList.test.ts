import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Wallet } from 'ethers'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'

use(solidity)

describe('VaultsRegistry.getVaultsList', () => {
  const loadFixture = setupFixtureLoader()

  it('returns an empty array if no vaults were added', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await vaultsRegistry.getVaultsList()).to.deep.eq([])
  })

  it('returns a list of added vaults', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const vaultAddresses = [Wallet.createRandom().address, Wallet.createRandom().address]
    await vaultsRegistry.addVault(vaultAddresses[0])
    await vaultsRegistry.addVault(vaultAddresses[1])

    expect(await vaultsRegistry.getVaultsList()).to.deep.eq(vaultAddresses)
  })

  it('returns a list of added vaults - removed vault', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const vaultAddresses = [Wallet.createRandom().address, Wallet.createRandom().address]
    await vaultsRegistry.addVault(vaultAddresses[0])
    await vaultsRegistry.addVault(vaultAddresses[1])
    await vaultsRegistry.removeVault(vaultAddresses[0])

    expect(await vaultsRegistry.getVaultsList()).to.deep.eq([vaultAddresses[1]])
  })
})
