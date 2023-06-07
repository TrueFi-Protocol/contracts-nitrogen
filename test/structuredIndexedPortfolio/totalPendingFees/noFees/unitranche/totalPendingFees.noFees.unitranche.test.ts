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

describe('StructuredIndexedPortfolio.totalPendingFees.noFees.unitranche', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await unitranchePortfolio.start()
      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)

      await startTimeTravelAndClosePortfolio(unitranchePortfolio)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx } = await loadFixture(structuredIndexedPortfolioFixture)

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
      const { unitranchePortfolio, approveAndDepositToTranche, parseMockToken, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('live', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      await unitranchePortfolio.start()

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('closed', async () => {
      const { unitranchePortfolio, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(unitranchePortfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const pendingFees = await unitranchePortfolio.totalPendingFees()
      expect(pendingFees).to.eq(Zero)
    })

    it('capital formation -> closed', async () => {
      const { unitranchePortfolio, unitranchePortfolioCreationTx, parseMockToken, approveAndDepositToTranche, unitranche, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
      await approveAndDepositToTranche(unitranche, equityDepositAssets, wallet)

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
})
