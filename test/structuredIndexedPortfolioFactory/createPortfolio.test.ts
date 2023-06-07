import { expect, use } from 'chai'
import { TrancheVault__factory } from 'contracts'
import { solidity } from 'ethereum-waffle'
import { constants } from 'ethers'
import { getContractAddress } from 'ethers/lib/utils'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { WHITELISTED_MANAGER_ROLE, extractEventArgFromTx } from 'utils'

use(solidity)

describe('StructuredIndexedPortfolioFactory.createPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when called by non whitelisted manager', async () => {
    const { portfolioFactory, other, token, tranchesInitData, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(portfolioFactory.connect(other).createPortfolio(token.address, portfolioParams, tranchesInitData, expectedEquityRate))
      .to.be.revertedWith('SIPF: Only whitelisted manager')
  })

  it('can be called by whitelisted manager', async () => {
    const { portfolioFactory, other, token, tranchesInitData, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolioFactory.grantRole(WHITELISTED_MANAGER_ROLE, other.address)
    await expect(portfolioFactory.connect(other).createPortfolio(token.address, portfolioParams, tranchesInitData, expectedEquityRate))
      .not.to.be.reverted
  })

  it('creates portfolios and saves them', async () => {
    const { portfolioFactory, portfolioCreationTx, unitranchePortfolioCreationTx } = await loadFixture(structuredIndexedPortfolioFixture)
    const portfolioAddress = await extractEventArgFromTx(portfolioCreationTx, [portfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])
    const unitranchePortfolioAddress = await extractEventArgFromTx(unitranchePortfolioCreationTx, [portfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])

    const portfolios = await portfolioFactory.getPortfolios()
    expect(portfolios).to.be.of.length(2)
    expect(portfolios[0]).to.eq(portfolioAddress)
    expect(portfolios[1]).to.eq(unitranchePortfolioAddress)
  })

  it('creates tranches', async () => {
    const { portfolioFactory, token, wallet, tranchesInitData, tranchesCount, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    const createPortfolioTx = await portfolioFactory.createPortfolio(token.address, portfolioParams, tranchesInitData, expectedEquityRate)
    const tranches = await extractEventArgFromTx(createPortfolioTx, [portfolioFactory.address, 'PortfolioCreated', 'tranches'])

    expect(tranches.length).to.eq(tranchesCount)

    for (let i = 0; i < tranches.length; i++) {
      const tranche = new TrancheVault__factory(wallet).attach(tranches[i])
      expect(await tranche.name()).to.eq(tranchesInitData[i].name)
      expect(await tranche.symbol()).to.eq(tranchesInitData[i].symbol)
    }
  })

  it('sets portfolio address in tranches', async () => {
    const { portfolioFactory, token, wallet, tranchesInitData, portfolioParams, expectedEquityRate } = await loadFixture(structuredIndexedPortfolioFixture)
    const createPortfolioTx = await portfolioFactory.createPortfolio(token.address, portfolioParams, tranchesInitData, expectedEquityRate)
    const tranches = await extractEventArgFromTx(createPortfolioTx, [portfolioFactory.address, 'PortfolioCreated', 'tranches'])
    const portfolioAddress = await extractEventArgFromTx(createPortfolioTx, [portfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])

    for (const trancheAddress of tranches) {
      const tranche = new TrancheVault__factory(wallet).attach(trancheAddress)
      expect(await tranche.portfolio()).to.eq(portfolioAddress)
    }
  })

  it('emits an event', async () => {
    const { portfolioFactory, wallet, tranchesCount, portfolioCreationTx } = await loadFixture(structuredIndexedPortfolioFixture)

    /**
     * Nonce 0 is taken by factory contract creation.
     * Next 12 nonces are required by tranches creation.
     * Each tranche requires 4 external calls (3x controller initialize + create tranche) thus `tranchesCount * 4`.
     * + 1 external call to create the portfolio.
     */
    const futurePortfolioAddress = getContractAddress({
      from: portfolioFactory.address,
      nonce: tranchesCount * 4 + 1,
    })

    const portfolioAddress = await extractEventArgFromTx(portfolioCreationTx, [portfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])
    const managerAddress = await extractEventArgFromTx(portfolioCreationTx, [portfolioFactory.address, 'PortfolioCreated', 'manager'])
    const tranches = await extractEventArgFromTx(portfolioCreationTx, [portfolioFactory.address, 'PortfolioCreated', 'tranches'])

    expect(portfolioAddress).to.eq(futurePortfolioAddress)
    expect(managerAddress).to.eq(wallet.address)
    expect(tranches).to.be.of.length(tranchesCount)

    for (let i = 0; i < tranches.lender; i++) {
      expect(tranches[i]).not.to.eq(constants.AddressZero)
    }
  })
})
