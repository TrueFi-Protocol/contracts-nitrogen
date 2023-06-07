import { expect, use } from 'chai'
import { describe, it } from 'mocha'
import { solidity } from 'ethereum-waffle'
import { setupFixtureLoader } from 'test/setup'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { deployMockERC4626Vault, deployMockToken } from 'fixtures/tasks'
import { startAndGetTimestamp } from 'utils/startAndGetTimestamp'
import { setNextBlockTimestamp } from 'utils/timeTravel'
import { getHalfPortfolioDuration } from 'utils/getHalfPortfolioDuration'

use(solidity)

describe('StructuredIndexedPortfolio.register', () => {
  const loadFixture = setupFixtureLoader()

  it('when not paused only', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.pause()
    await expect(portfolio.close()).to.be.revertedWith('Pausable: paused')
  })

  it('only manager', async () => {
    const { portfolio, other, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)

    await expect(portfolio.connect(other).register(mockErc4626Vault.address))
      .to.be.revertedWith('SIP: Only manager')
  })

  it('only vaults in registry', async () => {
    const { portfolio, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolio.register(mockErc4626Vault.address)).to.be.revertedWith('SIP: Investment is not in the registry')
  })

  it('Capital Formation status', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)

    await expect(portfolio.register(mockErc4626Vault.address)).to.be.revertedWith('SIP: Portfolio is not live')
  })

  it('Closed status', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)
    await portfolio.close()

    await expect(portfolio.register(mockErc4626Vault.address)).to.be.revertedWith('SIP: Portfolio is not live')
  })

  it('adds to investments', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)

    await portfolio.start()
    await portfolio.register(mockErc4626Vault.address)
    expect(await portfolio.getInvestments()).to.deep.eq([mockErc4626Vault.address])
  })

  it('asset mismatched', async () => {
    const { wallet, portfolio, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)

    const differentDecimalsToken = await deployMockToken(wallet, 1)
    const conflictingVault = await deployMockERC4626Vault(wallet, differentDecimalsToken)
    await vaultsRegistry.addVault(conflictingVault.address)
    await portfolio.start()

    await expect(portfolio.register(conflictingVault.address))
      .to.be.revertedWith('SIP: Asset mismatched')
  })

  it('investment already registered', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)

    await portfolio.start()
    await portfolio.register(mockErc4626Vault.address)
    await expect(portfolio.register(mockErc4626Vault.address))
      .to.be.revertedWith('SIP: Investment already registered')
  })

  it('updates checkpoint', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
    const timeElapsed = await getHalfPortfolioDuration(portfolio)

    await vaultsRegistry.addVault(mockErc4626Vault.address)
    const startTimestamp = await startAndGetTimestamp(portfolio)

    const registerTimestamp = startTimestamp + timeElapsed
    await setNextBlockTimestamp(registerTimestamp)
    await portfolio.register(mockErc4626Vault.address)

    const checkpoint = await tranches[0].getCheckpoint()
    await expect(checkpoint.timestamp).to.eq(registerTimestamp)
  })

  it('emits event', async () => {
    const { portfolio, mockErc4626Vault, vaultsRegistry } = await loadFixture(structuredIndexedPortfolioFixture)
    await vaultsRegistry.addVault(mockErc4626Vault.address)

    await portfolio.start()
    await expect(portfolio.register(mockErc4626Vault.address))
      .to.emit(portfolio, 'InvestmentRegistered')
      .withArgs(mockErc4626Vault.address)
  })
})
