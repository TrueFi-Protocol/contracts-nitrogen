# interfaces/IStructuredIndexedPortfolio API

## PortfolioStatus

<br />

```solidity
enum PortfolioStatus {
  CapitalFormation,
  Live,
  Closed
}
```
## TrancheInitData

<br />

```solidity
struct TrancheInitData {
  contract ITrancheVault tranche;
  uint128 targetApy;
  uint128 minSubordinateRatio;
}
```
## InvestmentsDeficitCheckpoint

<br />

```solidity
struct InvestmentsDeficitCheckpoint {
  uint256 deficit;
  uint256 timestamp;
}
```
## TrancheData

<br />

```solidity
struct TrancheData {
  uint128 targetApy;
  uint128 minSubordinateRatio;
  uint256 distributedAssets;
  uint256 maxValueOnClose;
  struct InvestmentsDeficitCheckpoint investmentsDeficitCheckpoint;
}
```
## PortfolioParams

<br />

```solidity
struct PortfolioParams {
  string name;
  uint256 duration;
  uint256 capitalFormationPeriod;
  uint256 minimumSize;
}
```
## ExpectedEquityRate

<br />

```solidity
struct ExpectedEquityRate {
  uint256 from;
  uint256 to;
}
```
## IStructuredIndexedPortfolio

<br />

### PortfolioStatusChanged

```solidity
event PortfolioStatusChanged(enum PortfolioStatus newStatus)
```

Event emitted when portfolio status is changed

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newStatus | enum PortfolioStatus | Portfolio status set |

<br />

### InvestmentRegistered

```solidity
event InvestmentRegistered(contract IERC4626 investment)
```

Event emitted when investment is registered

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Registered investment |

<br />

### InvestmentUnregistered

```solidity
event InvestmentUnregistered(contract IERC4626 investment)
```

Event emitted when investment is unregistered

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Unregistered investment |

<br />

### ExecutedDeposit

```solidity
event ExecutedDeposit(contract IERC4626 investment, uint256 assets, uint256 shares)
```

Event emitted when deposit is executed on investment

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Registered investment that deposit was executed on |
| assets | uint256 | Assets deposited |
| shares | uint256 | Shares received by portfolio |

<br />

### ExecutedRedeem

```solidity
event ExecutedRedeem(contract IERC4626 investment, uint256 shares, uint256 assets)
```

Event emitted when redeem is executed on investment

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Registered investment that redeem was executed on |
| shares | uint256 | Shares redeemed |
| assets | uint256 | Assets received by portfolio |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | Portfolio manager role used for access control

<br />

### initialize

```solidity
function initialize(address manager, contract IERC20Metadata _asset, contract IProtocolConfig _protocolConfig, contract IVaultsRegistry _vaultsRegistry, struct PortfolioParams portfolioParams, struct TrancheInitData[] tranchesInitData, struct ExpectedEquityRate _expectedEquityRate) external
```

Setup contract with given params

_Used by Initializable contract (can be called only once)_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| manager | address | Address on which MANAGER_ROLE is granted |
| _asset | contract IERC20Metadata | Address of ERC20 token used by portfolio |
| _protocolConfig | contract IProtocolConfig | Address of ProtocolConfig contract |
| _vaultsRegistry | contract IVaultsRegistry | Address of Vaults Registry contract |
| portfolioParams | struct PortfolioParams | Parameters to configure portfolio |
| tranchesInitData | struct TrancheInitData[] | Parameters to configure tranches |
| _expectedEquityRate | struct ExpectedEquityRate | APY range that is expected to be reached by Equity tranche |

<br />

### getTranches

```solidity
function getTranches() external view returns (contract ITrancheVault[])
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| tranches | contract ITrancheVault[] | Array of portfolio's tranches addresses

<br />

### getTrancheData

```solidity
function getTrancheData(uint256 trancheIdx) external view returns (struct TrancheData)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIdx | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheData | struct TrancheData | i-th tranche data

<br />

### updateCheckpoints

```solidity
function updateCheckpoints() external
```

Pay pending fees and update checkpoints on each tranche

_Reverts if called in CapitalFormation status_

<br />

### virtualTokenBalance

```solidity
function virtualTokenBalance() external view returns (uint256)
```

Virtual value of the portfolio

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Current asset balance acknowledged by the portfolio

<br />

### increaseVirtualTokenBalance

```solidity
function increaseVirtualTokenBalance(uint256 increment) external
```

Increment virtual token balance by `increment`

_Must be called by own tranche_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| increment | uint256 | Value to be added to virtual token balance |

<br />

### decreaseVirtualTokenBalance

```solidity
function decreaseVirtualTokenBalance(uint256 decrement) external
```

Decrease virtual token balance by `decrement`

_Must be called by own tranche_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| decrement | uint256 | Value to be subtracted to virtual token balance |

<br />

### calculateWaterfall

```solidity
function calculateWaterfall() external view returns (uint256[])
```

Distribute portfolio value among tranches respecting their target APYs and fees.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| tranchesValues | uint256[] | Array of current tranche values

<br />

### calculateWaterfallWithoutFees

```solidity
function calculateWaterfallWithoutFees() external view returns (uint256[])
```

Distribute portfolio value among tranches respecting their target APYs, but not fees.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| tranchesValues | uint256[] | Array of current tranche values (with pending fees not deducted)

<br />

### calculateWaterfallForTranche

```solidity
function calculateWaterfallForTranche(uint256 trancheIdx) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIdx | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheValue | uint256 | Current value of tranche

<br />

### calculateWaterfallForTrancheWithoutFee

```solidity
function calculateWaterfallForTrancheWithoutFee(uint256 trancheIdx) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIdx | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheValue | uint256 | Current value of tranche (with pending fees not deducted)

<br />

### totalAssets

```solidity
function totalAssets() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Total value locked in the contract including value of outstanding investments

<br />

### liquidAssets

```solidity
function liquidAssets() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Underlying token balance of portfolio reduced by pending fees

<br />

### totalPendingFees

```solidity
function totalPendingFees() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Sum of all unsettled fees that tranches should pay

<br />

### start

```solidity
function start() external
```

Launch the portfolio making it possible to invest.

_- reverts if tranches ratios and portfolio min size are not met,
     - changes status to `Live`,
     - sets `startDate` and `endDate`,
     - transfers assets obtained in tranches to the portfolio._

<br />

### close

```solidity
function close() external
```

Close the portfolio, making it possible to withdraw funds from tranche vaults.

_- reverts if there are any outstanding investments before end date,
     - changes status to `Closed`,
     - calculates waterfall values for tranches and transfers the funds to the vaults,
     - updates `endDate`._

<br />

### checkTranchesRatiosFromTranche

```solidity
function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external
```

Ensure tranche ratios are met

_Reverts if ratios are not met
Is ignored if not called by tranche_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newTotalAssets | uint256 | New total assets value of the tranche calling this function. |

<br />

### maxTrancheValueComplyingWithRatio

```solidity
function maxTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIdx | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheValue | uint256 | Maximum tranche value complying with subordinate ratio in Live status, `2^256 - 1` for other statuses

<br />

### minTrancheValueComplyingWithRatio

```solidity
function minTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheIdx | uint256 | Index of tranche |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| trancheValue | uint256 | Minimum tranche value complying with subordinate ratio in Live status, 0 for other statuses

<br />

### checkTranchesRatios

```solidity
function checkTranchesRatios() external view
```

Ensure tranche ratios are met

_Reverts if ratios are not met_

<br />

### investmentsValue

```solidity
function investmentsValue() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| value | uint256 | Sum of current values of all outstanding investments

<br />

### getInvestments

```solidity
function getInvestments() external view returns (address[])
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| investments | address[] | Array of all outstanding investments

<br />

### register

```solidity
function register(contract IERC4626 investment) external
```

Register an investment

_Reverts if msg.sender does not have MANAGER_ROLE or investment is already registered_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Address of the investment |

<br />

### unregister

```solidity
function unregister(contract IERC4626 investment) external
```

Unregister an investment

_Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Address of the investment |

<br />

### executeDeposit

```solidity
function executeDeposit(contract IERC4626 investment, uint256 assets) external returns (uint256 shares)
```

Call `deposit` on another ERC4626 vault contract

_Portfolio is the receiver of shares;
Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Investment to call `deposit` on |
| assets | uint256 | Amount of assets to deposit |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares received from the vault |

<br />

### executeRedeem

```solidity
function executeRedeem(contract IERC4626 investment, uint256 shares) external returns (uint256 assets)
```

Call `redeem` on another ERC4626 vault contract

_Portfolio is the receiver of assets;
Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Investment to call `redeem` on |
| shares | uint256 | Amount of shares to redeem |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of assets received from the vault |

<br />

### registerAndExecuteDeposit

```solidity
function registerAndExecuteDeposit(contract IERC4626 investment, uint256 assets) external returns (uint256 shares)
```

Register ERC4626 vault as an investment and then call `deposit` on it

_Calls `register(investment)` and then `executeDeposit(investment, assets)`_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Investment to register and then call `deposit` on |
| assets | uint256 | Amount of assets to deposit |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of shares received from the vault |

<br />

### executeRedeemAndUnregister

```solidity
function executeRedeemAndUnregister(contract IERC4626 investment, uint256 shares) external returns (uint256 assets)
```

Call `redeem` on ERC4626 vault and then unregister it from investments

_Calls `redeem(investment, shares)` and then `unregister(investment)`_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| investment | contract IERC4626 | Investment call `redeem` on and unregister |
| shares | uint256 | Amount of shares to redeem |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of assets received from the vault |

<br />

