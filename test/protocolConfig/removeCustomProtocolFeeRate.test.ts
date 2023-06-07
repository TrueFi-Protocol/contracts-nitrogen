import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { getProtocolConfigFeeRateForWallet } from 'utils/getProtocolConfigFeeRate'

describe('ProtocolConfig.removeCustomProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).removeCustomProtocolFeeRate(other.address))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('only if custom fee rate set', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.removeCustomProtocolFeeRate(other.address))
      .to.be.revertedWith('IPPC: No fee rate to remove')
  })

  it('removes custom fee rate', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    const defaultProtocolFeeRate = 500
    const customFeeRate = 300
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(customFeeRate)

    await protocolConfig.removeCustomProtocolFeeRate(other.address)
    expect(await getProtocolConfigFeeRateForWallet(protocolConfig, other)).to.eq(defaultProtocolFeeRate)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await protocolConfig.setCustomProtocolFeeRate(other.address, 500)
    await expect(protocolConfig.removeCustomProtocolFeeRate(other.address))
      .to.emit(protocolConfig, 'CustomProtocolFeeRateRemoved').withArgs(other.address)
  })
})
