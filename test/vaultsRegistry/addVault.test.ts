import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { Wallet } from 'ethers'

use(solidity)

describe('VaultsRegistry.addVault', () => {
  const loadFixture = setupFixtureLoader()

  it('is only callable by a list admin', async () => {
    const { vaultsRegistry, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await expect(vaultsRegistry.connect(other).addVault(vaultAddress))
      .to.be.revertedWith('VR: Only list admin')
  })

  it('adds new vault to the set', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const vaultAddress = Wallet.createRandom().address
    await vaultsRegistry.addVault(vaultAddress)
    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.true
  })

  it('reverts if vault is already added', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const vaultAddress = Wallet.createRandom().address
    await vaultsRegistry.addVault(vaultAddress)
    await expect(vaultsRegistry.addVault(vaultAddress))
      .to.be.revertedWith('VR: Vault already added')
  })

  it('emits VaultAdded event', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const vaultAddress = Wallet.createRandom().address
    await expect(vaultsRegistry.addVault(vaultAddress))
      .to.emit(vaultsRegistry, 'VaultAdded')
      .withArgs(vaultAddress)
  })
})
