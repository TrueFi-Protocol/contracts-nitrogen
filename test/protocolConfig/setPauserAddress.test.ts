import { expect } from 'chai'
import { structuredIndexedPortfolioFixture } from 'fixtures/structuredIndexedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setPauserAddress', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.connect(other).setPauserAddress(other.address))
      .to.be.revertedWith('IPPC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigDeployParams: { pauserAddress } } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setPauserAddress(pauserAddress))
      .to.be.revertedWith('IPPC: Pauser already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await protocolConfig.setPauserAddress(other.address)
    expect(await protocolConfig.pauserAddress()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(structuredIndexedPortfolioFixture)
    await expect(protocolConfig.setPauserAddress(other.address))
      .to.emit(protocolConfig, 'PauserAddressChanged').withArgs(other.address)
  })
})
