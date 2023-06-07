import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

use(solidity)

const ARBITRARY_REDEEM_AMOUNT = 1

describe('StructuredIndexedPortfolio.executeRedeemAndUnregister.pausable', () => {
  const loadFixture = setupFixtureLoader()

  it('when not paused only', async () => {
    const { portfolio, mockErc4626Vault } = await loadFixture(structuredIndexedPortfolioFixture)
    await portfolio.pause()
    await expect(portfolio.executeRedeemAndUnregister(mockErc4626Vault.address, ARBITRARY_REDEEM_AMOUNT))
      .to.be.revertedWith('Pausable: paused')
  })
})
