# StructuredIndexedPortfolioFactory API

## StructuredIndexedPortfolioFactory

<br />

### WHITELISTED_MANAGER_ROLE

```solidity
bytes32 WHITELISTED_MANAGER_ROLE
```

<br />

### portfolios

```solidity
contract IStructuredIndexedPortfolio[] portfolios
```

<br />

### trancheImplementation

```solidity
address trancheImplementation
```

<br />

### portfolioImplementation

```solidity
address portfolioImplementation
```

<br />

### protocolConfig

```solidity
contract IProtocolConfig protocolConfig
```

<br />

### vaultsRegistry

```solidity
contract IVaultsRegistry vaultsRegistry
```

<br />

### constructor

```solidity
constructor(address _portfolioImplementation, address _trancheImplementation, contract IProtocolConfig _protocolConfig, contract IVaultsRegistry _vaultsRegistry) public
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _portfolioImplementation | address |  |
| _trancheImplementation | address |  |
| _protocolConfig | contract IProtocolConfig |  |
| _vaultsRegistry | contract IVaultsRegistry |  |

<br />

### createPortfolio

```solidity
function createPortfolio(contract IERC20Metadata asset, struct PortfolioParams portfolioParams, struct TrancheData[] tranchesData, struct ExpectedEquityRate expectedEquityRate) external
```

Creates a portfolio alongside with its tranche vaults

_Tranche vaults are ordered from the most volatile to the most stable_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| asset | contract IERC20Metadata | Token used as an underlying asset |
| portfolioParams | struct PortfolioParams | Parameters used for portfolio deployment |
| tranchesData | struct TrancheData[] | Data used for tranche vaults deployment |
| expectedEquityRate | struct ExpectedEquityRate | APY range that is expected to be reached by Equity tranche |

<br />

### getPortfolios

```solidity
function getPortfolios() external view returns (contract IStructuredIndexedPortfolio[])
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| portfolios | contract IStructuredIndexedPortfolio[] | All created portfolios

<br />

