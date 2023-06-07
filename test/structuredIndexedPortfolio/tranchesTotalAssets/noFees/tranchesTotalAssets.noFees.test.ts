import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { Zero } from '@ethersproject/constants'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import {
  getHalfPortfolioDuration,
  getTranchesVirtualTokenBalances,
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

describe('StructuredIndexedPortfolio.tranchesTotalAssets.noFees', () => {
  const loadFixture = setupFixtureLoader()

  describe('no assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, Zero, Zero])
    })

    it('live', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.start()
      expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, Zero, Zero])
    })

    it('closed', async () => {
      const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
      await startTimeTravelAndClosePortfolio(portfolio)
      expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, Zero, Zero])
    })
  })

  describe('with assets deposited', () => {
    it('capital formation', async () => {
      const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)

      await depositToTranches(portfolio, depositAmounts, wallet)

      expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq(depositAmounts)
    })

    describe('live', () => {
      it('senior underflow, junior empty, equity empty', async () => {
        const { portfolio, depositToTranches, parseMockToken, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const seniorTrancheDepositAssets = depositAmounts[2]
        await depositToTranches(portfolio, depositAmounts, wallet)

        await portfolio.start()

        const newVirtualTokenBalance = seniorTrancheDepositAssets.sub(1)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)

        expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, Zero, newVirtualTokenBalance])
      })

      it('senior full, junior empty, equity empty', async () => {
        const { portfolio, wallet, depositAndCalculateAssumedTranchesValue, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, , expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        await portfolio.setVirtualTokenBalance(expectedSeniorTrancheValue)
        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, Zero, expectedSeniorTrancheValue])
      })

      it('senior full, junior underflow, equity empty', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, , expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)
        const expectedJuniorTrancheValue = parseMockToken(500_000)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedJuniorTrancheValue.add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)
        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue])
      })

      it('senior full, junior full, equity empty', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedJuniorTrancheValue.add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)
        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([Zero, expectedJuniorTrancheValue, expectedSeniorTrancheValue])
      })

      it('senior full, junior full, equity surplus', async () => {
        const { portfolio, wallet, parseMockToken, depositAndCalculateAssumedTranchesValue } = await loadFixture(structuredIndexedPortfolioFixture)
        const timeElapsed = await getHalfPortfolioDuration(portfolio)
        const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
        const [, expectedJuniorTrancheValue, expectedSeniorTrancheValue] = await depositAndCalculateAssumedTranchesValue(depositAmounts, wallet, timeElapsed)
        const expectedEquityTrancheValue = parseMockToken(500_000)

        const startTx = await portfolio.start()
        const startTxTimestamp = await getTxTimestamp(startTx)

        const newVirtualTokenBalance = expectedEquityTrancheValue.add(expectedJuniorTrancheValue).add(expectedSeniorTrancheValue)
        await portfolio.setVirtualTokenBalance(newVirtualTokenBalance)
        await timeTravelTo(startTxTimestamp + timeElapsed)

        expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq([expectedEquityTrancheValue, expectedJuniorTrancheValue, expectedSeniorTrancheValue])
      })
    })

    it('closed', async () => {
      const { portfolio, depositToTranches, wallet, parseMockToken, tranches } = await loadFixture(structuredIndexedPortfolioFixture)
      const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
      await depositToTranches(portfolio, depositAmounts, wallet)

      const closeTxTimestamp = await startTimeTravelAndClosePortfolio(portfolio)
      await timeTravelTo(closeTxTimestamp + ONE_DAY_IN_SECONDS)

      const expectedTotalAssets = await getTranchesVirtualTokenBalances(tranches)
      expect(await portfolio.tranchesTotalAssetsTest()).to.deep.eq(expectedTotalAssets)
    })
  })
})
