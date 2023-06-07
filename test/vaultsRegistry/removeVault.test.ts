import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Wallet } from 'ethers'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('VaultsRegistry.removeVault', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when called by non default admin', async () => {
    const { vaultsRegistry, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await expect(vaultsRegistry.connect(other).removeVault(vaultAddress))
      .to.be.revertedWith('VR: Only default admin')
  })

  it('reverts when vault hasn\'t been added', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await expect(vaultsRegistry.removeVault(vaultAddress))
      .to.be.revertedWith('VR: Vault hasn\'t been added')
  })

  it('removes vault', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await vaultsRegistry.addVault(vaultAddress)
    await vaultsRegistry.removeVault(vaultAddress)

    expect(await vaultsRegistry.isVaultAdded(vaultAddress)).to.be.false
  })

  it('emits VaultRemoved event', async () => {
    const { vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    const vaultAddress = Wallet.createRandom().address
    await vaultsRegistry.addVault(vaultAddress)
    await expect(vaultsRegistry.removeVault(vaultAddress))
      .to.emit(vaultsRegistry, 'VaultRemoved')
      .withArgs(vaultAddress)
  })
})
