import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { Wallet } from 'ethers'

use(solidity)

describe('VaultsRegistry.isVaultAdded', () => {
  const loadFixture = setupFixtureLoader()

  it('returns false for not added vaults', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.false
  })

  it('returns true for added vaults', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.false
    await vaultsRegistry.addVault(vaultAddress)
    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.true
  })

  it('returns false for removed vaults', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await vaultsRegistry.addVault(vaultAddress)
    await vaultsRegistry.removeVault(vaultAddress)

    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.false
  })
})
