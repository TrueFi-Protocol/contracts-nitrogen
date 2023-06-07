import { Zero } from '@ethersproject/constants'
import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { calculateInterest, getHalfPortfolioDuration, ONE_DAY_IN_SECONDS } from 'utils'
import { setupFixtureLoader } from 'test/setup'
import {
  ONE_YEAR_IN_SECONDS,
  getTxTimestamp,
  timeTravelTo,
  startTimeTravelAndClosePortfolio,
  percentToBips,
} from 'utils'

use(solidity)

const DEFAULT_PROTOCOL_FEE_RATE = 400
const EQUITY_FEE_RATE = 100
const EQUITY_DEPOSIT_ASSETS = 1_000_000

describe('StructuredIndexedPortfolio.totalPendingFees.withFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      await unitranchePortfolio.start()
      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { unitranchePortfolio, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])

      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx, unitranche, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])

      const timeElapsedBeforeClose = await getHalfPortfolioDuration(unitranchePortfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS

      const portfolioCreationTxTimestamp = await getTxTimestamp(unitranchePortfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + timeElapsedBeforeClose)

      const closeTx = await unitranchePortfolio.close()

      const closeTxTimestamp = await getTxTimestamp(closeTx)
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx, approveAndDepositToTranche, parseMockToken, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const portfolioCreationTxTimestamp = await getTxTimestamp(unitranchePortfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + ONE_YEAR_IN_SECONDS)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const startTx = await unitranchePortfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const timeElapsed = ONE_YEAR_IN_SECONDS

      const protocolFees = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsed, equityDepositAssets)
      const trancheFees = calculateInterest(EQUITY_FEE_RATE, timeElapsed, equityDepositAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      const expectedPendingFees = protocolFees.add(trancheFees)
      expect(pendingFees).to.eq(expectedPendingFees)
    })

    it('fee bigger than value', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      const timeElapsed = ONE_YEAR_IN_SECONDS
      const maxFeeRate = percentToBips(200)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [maxFeeRate])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const startTx = await unitranchePortfolio.start()
      const startTxTimestamp = await getTxTimestamp(startTx)

      const protocolFees = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsed, equityDepositAssets)
      const trancheFees = calculateInterest(maxFeeRate, timeElapsed, equityDepositAssets)

      await timeTravelTo(startTxTimestamp + timeElapsed)

      const expectedPendingFees = protocolFees.add(trancheFees)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(expectedPendingFees)
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const equityTrancheVirtualTokenBalance = await unitranche.virtualTokenBalance()

      const protocolFee = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsedAfterClose, equityTrancheVirtualTokenBalance)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(protocolFee)
    })

    it('capital formation -> closed', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx, parseMockToken, approveAndDepositToTranche, unitranche, wallet, setProtocolAndTranchesFeeRates } = await loadFixture(structuredIndexedPortfolioFixture)
      await setProtocolAndTranchesFeeRates([unitranche], DEFAULT_PROTOCOL_FEE_RATE, [EQUITY_FEE_RATE])
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const timeElapsedBeforeClose = await getHalfPortfolioDuration(unitranchePortfolio)
      const timeElapsedAfterClose = ONE_DAY_IN_SECONDS

      const portfolioCreationTxTimestamp = await getTxTimestamp(unitranchePortfolioCreationTx)
      await timeTravelTo(portfolioCreationTxTimestamp + timeElapsedBeforeClose)
      const closeTx = await unitranchePortfolio.close()
      const closeTxTimestamp = await getTxTimestamp(closeTx)
      await timeTravelTo(closeTxTimestamp + timeElapsedAfterClose)

      const equityTrancheVirtualTokenBalance = await unitranche.virtualTokenBalance()

      const protocolFee = calculateInterest(DEFAULT_PROTOCOL_FEE_RATE, timeElapsedAfterClose, equityTrancheVirtualTokenBalance)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(protocolFee)
    })
  })
})
