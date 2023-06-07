import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  getTxTimestamp,
  ONE_DAY_IN_SECONDS,
  startTimeTravelAndClosePortfolio,
  timeTravelTo,
} from 'utils'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.totalPendingFees.noFees.multitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      await startTimeTravelAndClosePortfolio(portfolio)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { portfolio, portfolioCreationTx } = await loadFixture(structuredIndexedPortfolioFixture)

      const timeElapsedBeforeClose = await getHalfPortfolioDuration(portfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS

      const portfolioCreationTxTimestamp = await getTxTimestamp(portfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + timeElapsedBeforeClose)

      const closeTx = await portfolio.close()

      const closeTxTimestamp = await getTxTimestamp(closeTx)
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio, wallet, parseMockToken, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio, depositToTranches, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { portfolio, portfolioCreationTx, depositToTranches, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const timeElapsedBeforeClose = await getHalfPortfolioDuration(portfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS

      const portfolioCreationTxTimestamp = await getTxTimestamp(portfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + timeElapsedBeforeClose)

      const closeTx = await portfolio.close()

      const closeTxTimestamp = await getTxTimestamp(closeTx)
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })
  })
})
