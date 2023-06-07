import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_HUNDRED_PERCENT_IN_BIPS } from 'utils/constants'

use(solidity)

const EQUITY_DEPOSIT_ASSETS = 1_000_000
const JUNIOR_DEPOSIT_ASSETS = 500_000
const SENIOR_DEPOSIT_ASSETS = 300_000
const JUNIOR_MIN_SUBORDINATE_RATIO = 2 * ONE_HUNDRED_PERCENT_IN_BIPS
const SENIOR_MIN_SUBORDINATE_RATIO = 5 * ONE_HUNDRED_PERCENT_IN_BIPS
const MIN_SUBORDINATE_RATIOS = [0, JUNIOR_MIN_SUBORDINATE_RATIO, SENIOR_MIN_SUBORDINATE_RATIO]

describe('StructuredIndexedPortfolio.checkTranchesRatiosFromTranche.decreaseAssets', () => {
  const loadFixture = setupFixtureLoader()

  it('unitranche', async () => {
    const { unitranchePortfolio: portfolio, unitranche: tranche, approveAndDepositToTranche, parseMockToken, wallet, provider } = await loadFixture(structuredIndexedPortfolioFixture)
    const equityDepositAssets = parseMockToken(EQUITY_DEPOSIT_ASSETS)
    const equityDepositAssetsDecrease = equityDepositAssets.sub(parseMockToken(500_000))

    await approveAndDepositToTranche(tranche, equityDepositAssets, wallet)
    await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityDepositAssets.sub(equityDepositAssetsDecrease), { from: tranche.address })).not.to.be.reverted
  })

  describe('multitranche', () => {
    it('equity calls, ratios met', async () => {
      const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
      const equityDepositSurplus = parseMockToken(1)
      const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS).add(equityDepositSurplus), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
      const equityDepositAssets = depositAmounts[0]
      const equityDepositAssetsDecrease = equityDepositSurplus

      await depositToTranches(portfolio, depositAmounts, wallet)

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityDepositAssets.sub(equityDepositAssetsDecrease), { from: tranches[0].address })).not.to.be.reverted
    })

    it('equity calls, ratios not met', async () => {
      const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
      const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
      const equityDepositAssets = depositAmounts[0]
      const equityDepositAssetsDecrease = 1

      await depositToTranches(portfolio, depositAmounts, wallet)

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityDepositAssets.sub(equityDepositAssetsDecrease), { from: tranches[0].address })).to.be.revertedWith('SIP: Tranche min ratio not met')
    })

    it('junior calls, ratios met', async () => {
      const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
      const juniorDepositSurplus = parseMockToken(1)
      const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS).add(juniorDepositSurplus), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
      const juniorDepositAssets = depositAmounts[1]
      const juniorDepositAssetsDecrease = juniorDepositSurplus

      await depositToTranches(portfolio, depositAmounts, wallet)

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(juniorDepositAssets.sub(juniorDepositAssetsDecrease), { from: tranches[1].address })).not.to.be.reverted
    })

    it('junior calls, ratios not met', async () => {
      const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
      const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
      const equityDepositAssets = depositAmounts[0]
      const juniorDepositAssetsDecrease = parseMockToken(1)

      await depositToTranches(portfolio, depositAmounts, wallet)

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(equityDepositAssets.sub(juniorDepositAssetsDecrease), { from: tranches[1].address })).to.be.revertedWith('SIP: Tranche min ratio not met')
    })

    it('senior calls, ratios met', async () => {
      const { portfolio, tranches, parseMockToken, provider, depositToTranches, wallet } = await loadFixture(structuredIndexedPortfolioFixture)
      await portfolio.setMinSubordinateRatios(MIN_SUBORDINATE_RATIOS)
      const depositAmounts = [parseMockToken(EQUITY_DEPOSIT_ASSETS), parseMockToken(JUNIOR_DEPOSIT_ASSETS), parseMockToken(SENIOR_DEPOSIT_ASSETS)]
      const seniorDepositAssets = depositAmounts[2]
      const seniorDepositAssetsDecrease = seniorDepositAssets.div(2)

      await depositToTranches(portfolio, depositAmounts, wallet)

      await expect(portfolio.connect(provider).checkTranchesRatiosFromTranche(seniorDepositAssets.sub(seniorDepositAssetsDecrease), { from: tranches[2].address })).not.to.be.reverted
    })
  })
})
