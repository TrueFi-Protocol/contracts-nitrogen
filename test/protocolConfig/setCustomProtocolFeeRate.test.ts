import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getProtocolConfigFeeRateForWallet } from 'utils/getProtocolConfigFeeRate'

describe('ProtocolConfig.setCustomProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).setCustomProtocolFeeRate(other.address, 500))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(customFeeRate)
  })

  it('only different value', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    await expect(protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate))
      .to.be.revertedWith('IPPC: Fee already set')
  })

  it('can set zero fee rate', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await protocolConfig.setCustomProtocolFeeRate(other.address, 0)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(0)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const customFeeRate = 500
    await expect(protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate))
      .to.emit(protocolConfig, 'CustomProtocolFeeRateChanged').withArgs(other.address, customFeeRate)
  })
})
