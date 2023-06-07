import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { startTimeTravelAndClosePortfolio } from 'utils/startTimeTravelAndClosePortfolio'

use(solidity)

const TARGET_APYS = [0, 0, 0]

const BASIS_PRECISION = 10000
const JUNIOR_MIN_RATIO = 2 * BASIS_PRECISION
const SENIOR_MIN_RATIO = 6 * BASIS_PRECISION

const MIN_RATIOS = [0, JUNIOR_MIN_RATIO, SENIOR_MIN_RATIO]

const EQUITY_DEPOSIT_ASSETS = 4_000_000
const JUNIOR_DEPOSIT_ASSETS = 2_000_000
const SENIOR_DEPOSIT_ASSETS = 1_000_000
const DEPOSIT_AMOUNTS = [
  EQUITY_DEPOSIT_ASSETS,
  JUNIOR_DEPOSIT_ASSETS,
  SENIOR_DEPOSIT_ASSETS,
]

describe('StructuredIndexedPortfolio.minTrancheValueComplyingWithRatio', () => {
  const loadFixture = setupFixtureLoader()

  it('capital formation', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    expect(await portfolio.minTrancheValueComplyingWithRatio(0)).to.eq(0)
  })

  it('closed', async () => {
    const { portfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await startTimeTravelAndClosePortfolio(portfolio)
    expect(await portfolio.minTrancheValueComplyingWithRatio(0)).to.eq(0)
  })

  it('unitranche', async () => {
    const { unitranchePortfolio } = await loadFixture(structuredIndexedPortfolioFixture)
    await unitranchePortfolio.start()
    expect(await unitranchePortfolio.minTrancheValueComplyingWithRatio(0)).to.eq(0)
  })

  it('senior full, junior empty, equity empty', async () => {
    const { portfolio, depositToTranches, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const seniorDepositAssets = depositAmounts[2]

    await portfolio.setMinSubordinateRatios(MIN_RATIOS)
    await portfolio.setTargetApy(TARGET_APYS)
    await depositToTranches(portfolio, depositAmounts, wallet)
    await portfolio.start()

    await portfolio.setVirtualTokenBalance(seniorDepositAssets)

    const minSubordinateSum = seniorDepositAssets.mul(SENIOR_MIN_RATIO / BASIS_PRECISION)
    expect(await portfolio.minTrancheValueComplyingWithRatio(0)).to.eq(minSubordinateSum)
    expect(await portfolio.minTrancheValueComplyingWithRatio(1)).to.eq(minSubordinateSum)
    expect(await portfolio.minTrancheValueComplyingWithRatio(2)).to.eq(0)
  })

  it('senior full, junior full, equity empty', async () => {
    const { portfolio, depositToTranches, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const juniorDepositAssets = depositAmounts[1]
    const seniorDepositAssets = depositAmounts[2]

    await portfolio.setMinSubordinateRatios(MIN_RATIOS)
    await portfolio.setTargetApy(TARGET_APYS)
    await depositToTranches(portfolio, depositAmounts, wallet)
    await portfolio.start()

    await portfolio.setVirtualTokenBalance(juniorDepositAssets.add(seniorDepositAssets))

    const minSubordinateSum = seniorDepositAssets.mul(SENIOR_MIN_RATIO / BASIS_PRECISION)
    expect(await portfolio.minTrancheValueComplyingWithRatio(0)).to.eq(minSubordinateSum.sub(juniorDepositAssets))
    expect(await portfolio.minTrancheValueComplyingWithRatio(1)).to.eq(minSubordinateSum)
    expect(await portfolio.minTrancheValueComplyingWithRatio(2)).to.eq(0)
  })

  it('senior full, junior full, equity overflow', async () => {
    const { portfolio, depositToTranches, wallet, parseMockToken } = await loadFixture(structuredIndexedPortfolioFixture)
    const depositAmounts = DEPOSIT_AMOUNTS.map(parseMockToken)
    const equityDepositAssets = depositAmounts[0]
    const juniorDepositAssets = depositAmounts[1]
    const seniorDepositAssets = depositAmounts[2]

    await portfolio.setMinSubordinateRatios(MIN_RATIOS)
    await portfolio.setTargetApy(TARGET_APYS)
    await depositToTranches(portfolio, depositAmounts, wallet)
    await portfolio.start()

    const newEquityValue = equityDepositAssets.div(2)
    await portfolio.setVirtualTokenBalance(juniorDepositAssets.add(seniorDepositAssets).add(newEquityValue))

    const minSubordinateSum = seniorDepositAssets.mul(SENIOR_MIN_RATIO / BASIS_PRECISION)
    expect(await portfolio.minTrancheValueComplyingWithRatio(0)).to.eq(minSubordinateSum.sub(juniorDepositAssets))
    expect(await portfolio.minTrancheValueComplyingWithRatio(1)).to.eq(minSubordinateSum.sub(newEquityValue))
    expect(await portfolio.minTrancheValueComplyingWithRatio(2)).to.eq(0)
  })
})
