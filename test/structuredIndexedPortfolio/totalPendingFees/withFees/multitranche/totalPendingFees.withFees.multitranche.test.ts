import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  ONE_YEAR_IN_SECONDS,
  getHalfPortfolioDuration,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  percentToBips,
  calculateTotalPendingFees,
  ONE_DAY_IN_SECONDS,
  getTranchesVirtualTokenBalances,
} from 'utils'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const JUNIOR_FEE_RATE = 200
const SENIOR_FEE_RATE = 300
const TRANCHES_FEE_RATES = [
  EQUITY_FEE_RATE,
  JUNIOR_FEE_RATE,
  SENIOR_FEE_RATE,
]
const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 3_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.totalPendingFees.withFees.multitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      await portfolio.start()
      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { portfolio, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      await startTimeTravelAndClosePortfolio(portfolio)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { portfolio, portfolioCreationTx, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)

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
      const { portfolio, depositToTranches, parseMockToken, wallet, tranches, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { tranches, portfolio, wallet, parseMockToken, depositAndCalculateWaterfallWithoutFees, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const waterfall = await depositAndCalculateWaterfallWithoutFees(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const expectedPendingFees = calculateTotalPendingFees(waterfall, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES, timeElapsed)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(expectedPendingFees)
    })

    it('fee bigger than value', async () => {
      const { tranches, portfolio, wallet, parseMockToken, depositAndCalculateWaterfallWithoutFees, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = await getHalfPortfolioDuration(portfolio)
      const maxFeeRate = Math.round(percentToBips(200) * ONE_YEAR_IN_SECONDS / timeElapsed)
      const tranchesFeeRates = [maxFeeRate, maxFeeRate, maxFeeRate]
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, tranchesFeeRates)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      const waterfall = await depositAndCalculateWaterfallWithoutFees(depositAmounts, wallet, timeElapsed)

      const startTx = await portfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const expectedPendingFees = calculateTotalPendingFees(waterfall, DEFAULT_PROTOCOL_FEE_RATE, tranchesFeeRates, timeElapsed)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(expectedPendingFees)
    })

    it('closed', async () => {
      const { tranches, portfolio, wallet, parseMockToken, setProtocolAndTranchesFeeRates, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const tranchesVirtualTokenBalances = await getTranchesVirtualTokenBalances(tranches)

      const tranchesZeroFeeRates = [0, 0, 0]
      const totalPendingFees = calculateTotalPendingFees(tranchesVirtualTokenBalances, DEFAULT_PROTOCOL_FEE_RATE, tranchesZeroFeeRates, timeElapsedAfterClose)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(totalPendingFees)
    })

    it('capital formation -> closed', async () => {
      const { tranches, portfolio, portfolioCreationTx, wallet, parseMockToken, setProtocolAndTranchesFeeRates, depositToTranches } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates(tranches, DEFAULT_PROTOCOL_FEE_RATE, TRANCHES_FEE_RATES)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)

      const timeElapsedBeforeClose = await getHalfPortfolioDuration(portfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS

      const portfolioCreationTxTimestamp = await getTxTimestamp(portfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + timeElapsedBeforeClose)

      const closeTx = await portfolio.close()

      const closeTxTimestamp = await getTxTimestamp(closeTx)
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const tranchesVirtualTokenBalances = await getTranchesVirtualTokenBalances(tranches)

      const tranchesZeroFeeRates = [0, 0, 0]
      const totalPendingFees = calculateTotalPendingFees(tranchesVirtualTokenBalances, DEFAULT_PROTOCOL_FEE_RATE, tranchesZeroFeeRates, timeElapsedAfterClose)

      const pendingFees = await portfolio.totalPendingFees()
      expect(pendingFees).to.eq(totalPendingFees)
    })
  })
})
