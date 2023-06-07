# interfaces/IStructuredIndexedPortfolioFactory API

## TrancheData

<br />

```solidity
struct TrancheData {
  string name;
  string symbol;
  address depositControllerImplementation;
  bytes depositControllerInitData;
  address withdrawControllerImplementation;
  bytes withdrawControllerInitData;
  address transferControllerImplementation;
  bytes transferControllerInitData;
  uint128 targetApy;
  uint128 minSubordinateRatio;
  uint256 managerFeeRate;
}
```
## IStructuredIndexedPortfolioFactory

__A factory for deploying Structured Indexed Portfolios__

_Only whitelisted users can create portfolios_

<br />

### PortfolioCreated

```solidity
event PortfolioCreated(contract IStructuredIndexedPortfolio newPortfolio, address manager, contract ITrancheVault[] tranches)
```

Event fired on portfolio creation

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newPortfolio | contract IStructuredIndexedPortfolio | Address of the newly created portfolio |
| manager | address | Address of the portfolio manager |
| tranches | contract ITrancheVault[] | List of addresses of tranche vaults deployed to store assets |

<br />

### WHITELISTED_MANAGER_ROLE

```solidity
function WHITELISTED_MANAGER_ROLE() external view returns (bytes32)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | Whitelisted manager role used for access control, allowing user with this role too create StructuredIndexedPortfolio

<br />

### portfolios

```solidity
function portfolios(uint256 portfolioId) external view returns (contract IStructuredIndexedPortfolio)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| portfolioId | uint256 | Id of the portfolio created with this StructuredIndexedPortfolioFactory |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| portfolio | contract IStructuredIndexedPortfolio | Address of the StructuredIndexedPortfolio with given portfolio id

<br />

### trancheImplementation

```solidity
function trancheImplementation() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| implementation | address | Address of the Tranche contract implementation used for portfolio deployment

<br />

### portfolioImplementation

```solidity
function portfolioImplementation() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| implementation | address | Address of the StructuredIndexedPortfolio contract implementation used for portfolio deployment

<br />

### protocolConfig

```solidity
function protocolConfig() external view returns (contract IProtocolConfig)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| config | contract IProtocolConfig | Address of the ProtocolConfig

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

