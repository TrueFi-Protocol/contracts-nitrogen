import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setDefaultProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).setDefaultProtocolFeeRate(500))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigDeployParams: { defaultProtocolFeeRate } } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate))
      .to.be.revertedWith('IPPC: Fee already set')
  })

  it('sets new value', async () => {
    const { protocolConfig } = await loadFixture(structuredIndexedPortfolioFixture)
    const defaultProtocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)
    expect(await protocolConfig.defaultProtocolFeeRate()).to.eq(defaultProtocolFeeRate)
  })

  it('emits event', async () => {
    const { protocolConfig } = await loadFixture(structuredIndexedPortfolioFixture)
    const defaultProtocolFeeRate = 500
    await expect(protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate))
      .to.emit(protocolConfig, 'DefaultProtocolFeeRateChanged').withArgs(defaultProtocolFeeRate)
  })
})
