import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

describe('StructuredIndexedPortfolio.transfer', () => {
  const loadFixture = setupFixtureLoader()

  it('not enough funds', async () => {
    const { portfolioWithMockTranche: portfolio, mockTrancheVault: tranche, parseMockToken, increasePortfolioWithMockTrancheBalance } = await loadFixture(structuredIndexedPortfolioFixture)
    const transferAssets = parseMockToken(1_000_000)
    const transferAssetsOverflow = 1

    await increasePortfolioWithMockTrancheBalance(transferAssets)

    await expect(portfolio.transfer(tranche.address, transferAssets.add(transferAssetsOverflow)))
      .to.be.revertedWith('ERC20: transfer amount exceeds balance')
  })

  it('transfers funds', async () => {
    const { portfolioWithMockTranche: portfolio, mockTrancheVault: tranche, parseMockToken, token, increasePortfolioWithMockTrancheBalance } = await loadFixture(structuredIndexedPortfolioFixture)
    const transferAssets = parseMockToken(1_000_000)

    await increasePortfolioWithMockTrancheBalance(transferAssets)
    await portfolio.transfer(tranche.address, transferAssets)

    expect(await token.balanceOf(tranche.address)).to.eq(transferAssets)
  })

  it('calls onTransfer', async () => {
    const { portfolioWithMockTranche: portfolio, mockTrancheVault: tranche, parseMockToken, increasePortfolioWithMockTrancheBalance } = await loadFixture(structuredIndexedPortfolioFixture)
    const transferAssets = parseMockToken(1_000_000)

    await increasePortfolioWithMockTrancheBalance(transferAssets)
    await portfolio.transfer(tranche.address, transferAssets)

    expect('onTransfer').to.be.calledOnContractWith(tranche, [transferAssets])
  })

  it('decreases virtualTokenBalance', async () => {
    const { portfolioWithMockTranche: portfolio, mockTrancheVault: tranche, parseMockToken, increasePortfolioWithMockTrancheBalance } = await loadFixture(structuredIndexedPortfolioFixture)
    const transferAssets = parseMockToken(1_000_000)

    await increasePortfolioWithMockTrancheBalance(transferAssets)
    const virtualTokenBalanceBefore = await portfolio.virtualTokenBalance()
    await portfolio.transfer(tranche.address, transferAssets)
    const virtualTokenBalanceAfter = await portfolio.virtualTokenBalance()

    expect(virtualTokenBalanceAfter).to.eq(virtualTokenBalanceBefore.sub(transferAssets))
  })
})
