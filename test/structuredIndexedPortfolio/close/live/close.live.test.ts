import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { describe, it } from 'mocha'

import { MockERC4626Vault__factory } from 'build/types'
import { structuredIndexedPortfolioFixture, StructuredIndexedPortfolioStatus } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { createAndRegisterInvestment, getHalfPortfolioDuration, getPortfolioDuration, getTxTimestamp, setNextBlockTimestamp, startAndGetTimestamp, startAndTimeTravelPastEndDate, startTimeTravelAndClosePortfolio, sumArray, timeTravelTo } from 'utils'
import { depositAndCalculateAssumedTranchesValue } from 'fixtures/utils'

use(solidity)

describe('StructuredIndexedPortfolio.close.live', () => {
  const loadFixture = setupFixtureLoader()

  describe('sets Closed status', () => {
    it('manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await portfolio.close()
      expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.Closed)
    })

    it('non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      await startAndTimeTravelPastEndDate(portfolio)
      await portfolio.connect(other).close()
      expect(await portfolio.status()).to.eq(StructuredIndexedPortfolioStatus.Closed)
    })
  })

  it('sets deficit checkpoint timestamp', async () => {
    const { portfolio, tranches: [equityTranche, juniorTranche, seniorTranche] } = await loadFixture(structuredIndexedPortfolioFixture)
    const halfPortfolioDuration = await getHalfPortfolioDuration(portfolio)

    const startTimestamp = await startAndGetTimestamp(portfolio)
    const expectedTimestamp = startTimestamp + halfPortfolioDuration

    await setNextBlockTimestamp(expectedTimestamp)
    await portfolio.close()

    const equityCheckpoint = await equityTranche.getCheckpoint()
    const juniorCheckpoint = await juniorTranche.getCheckpoint()
    const seniorCheckpoint = await seniorTranche.getCheckpoint()
    expect(equityCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(juniorCheckpoint.timestamp).to.eq(expectedTimestamp)
    expect(seniorCheckpoint.timestamp).to.eq(expectedTimestamp)
  })

  it('calls updateCheckpointFromPortfolio', async () => {
    const { portfolio, tranches, token, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
    const equityAssets = parseMockToken(3_000_000)
    const juniorAssets = parseMockToken(2_000_000)
    const seniorAssets = parseMockToken(1_000_000)
    const depositAssets = [equityAssets, juniorAssets, seniorAssets]
    const portfolioDuration = await getPortfolioDuration(portfolio)

    const [, assumedJuniorTrancheValue, assumedSeniorTrancheValue] =
      await depositAndCalculateAssumedTranchesValue(portfolio, token, depositAssets, wallet, portfolioDuration)
    const assumedEquityTrancheValue = sumArray(depositAssets).sub(assumedJuniorTrancheValue).sub(assumedSeniorTrancheValue)

    await startTimeTravelAndClosePortfolio(portfolio)

    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[0], [assumedEquityTrancheValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[1], [assumedJuniorTrancheValue])
    expect('updateCheckpointFromPortfolio').to.be.calledOnContractWith(tranches[2], [assumedSeniorTrancheValue])
  })

  it('emits event', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.start()
    await expect(portfolio.close())
      .to.emit(portfolio, 'PortfolioStatusChanged')
      .withArgs(StructuredIndexedPortfolioStatus.Closed)
  })

  describe('before end date', () => {
    it('sets endDate', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()

      const closeTx = await portfolio.close()
      const closeTimestamp = await getTxTimestamp(closeTx)

      expect(await portfolio.endDate()).to.eq(closeTimestamp)
    })

    it('no investment, manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await expect(portfolio.close()).not.to.be.reverted
    })

    it('no investment, non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await expect(portfolio.connect(other).close())
        .to.be.revertedWith('SIP: Cannot close before end date')
    })

    it('with investment, manager', async () => {
      const { portfolio, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await expect(portfolio.close())
        .to.be.revertedWith('SIP: Registered investments exist')
    })

    it('with investment, non-manager', async () => {
      const { portfolio, wallet, other } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)
      await expect(portfolio.connect(other).close())
        .to.be.revertedWith('SIP: Registered investments exist')
    })
  })

  describe('after end date', () => {
    it('does not set endDate', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const portfolioDuration = await getPortfolioDuration(portfolio)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const initialPortfolioEndDate = await portfolio.endDate()

      await timeTravelTo(startTxTimestamp + portfolioDuration + 1)
      await portfolio.close()

      expect(await portfolio.endDate()).to.eq(initialPortfolioEndDate)
    })

    it('no investment, manager', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await startAndTimeTravelPastEndDate(portfolio)
      await expect(portfolio.close()).not.to.be.reverted
    })

    it('no investment, non-manager', async () => {
      const { portfolio, other } = await loadFixture(structuredIndexedPortfolioFixture)
      await startAndTimeTravelPastEndDate(portfolio)
      await expect(portfolio.connect(other).close()).not.to.be.reverted
    })

    it('with investment, manager', async () => {
      const { portfolio, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const portfolioDuration = await getPortfolioDuration(portfolio)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      await timeTravelTo(startTxTimestamp + portfolioDuration + 1)
      await expect(portfolio.close()).not.to.be.reverted
    })

    it('with investment, non-manager', async () => {
      const { portfolio, wallet, other } = await loadFixture(structuredIndexedPortfolioFixture)
      const portfolioDuration = await getPortfolioDuration(portfolio)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)
      await createAndRegisterInvestment(portfolio, wallet, MockERC4626Vault__factory)

      await timeTravelTo(startTxTimestamp + portfolioDuration + 1)
      await expect(portfolio.connect(other).close()).not.to.be.reverted
    })
  })
})
