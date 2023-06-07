# StructuredIndexedPortfolio API

## StructuredIndexedPortfolio

<br />

### MANAGER_ROLE

```solidity
bytes32 MANAGER_ROLE
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

### virtualTokenBalance

```solidity
uint256 virtualTokenBalance
```

Virtual value of the portfolio

<br />

### endDate

```solidity
uint256 endDate
```

<br />

### startDate

```solidity
uint256 startDate
```

<br />

### asset

```solidity
contract IERC20Metadata asset
```

<br />

### status

```solidity
enum PortfolioStatus status
```

<br />

### name

```solidity
string name
```

<br />

### portfolioDuration

```solidity
uint256 portfolioDuration
```

<br />

### startDeadline

```solidity
uint256 startDeadline
```

<br />

### minimumSize

```solidity
uint256 minimumSize
```

<br />

### tranches

```solidity
contract ITrancheVault[] tranches
```

<br />

### tranchesData

```solidity
struct TrancheData[] tranchesData
```

<br />

### expectedEquityRate

```solidity
struct ExpectedEquityRate expectedEquityRate
```

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
function updateCheckpoints() public
```

Pay pending fees and update checkpoints on each tranche

_Reverts if called in CapitalFormation status_

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
function calculateWaterfall() public view returns (uint256[])
```

Distribute portfolio value among tranches respecting their target APYs and fees.

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| tranchesValues | uint256[] | Array of current tranche values

<br />

### calculateWaterfallWithoutFees

```solidity
function calculateWaterfallWithoutFees() public view returns (uint256[])
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
function liquidAssets() public view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Underlying token balance of portfolio reduced by pending fees

<br />

### totalPendingFees

```solidity
function totalPendingFees() public view returns (uint256)
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
function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external view
```

Ensure tranche ratios are met

_Reverts if ratios are not met
Is ignored if not called by tranche_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newTotalAssets | uint256 | New total assets value of the tranche calling this function. |

<br />

### checkTranchesRatios

```solidity
function checkTranchesRatios() external view
```

Ensure tranche ratios are met

_Reverts if ratios are not met_

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

### investmentsValue

```solidity
function investmentsValue() public view returns (uint256)
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
function executeDeposit(contract IERC4626 investment, uint256 assets) external returns (uint256)
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

<br />

### executeRedeem

```solidity
function executeRedeem(contract IERC4626 investment, uint256 shares) external returns (uint256)
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

<br />

### registerAndExecuteDeposit

```solidity
function registerAndExecuteDeposit(contract IERC4626 investment, uint256 assets) external returns (uint256)
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

<br />

### executeRedeemAndUnregister

```solidity
function executeRedeemAndUnregister(contract IERC4626 investment, uint256 shares) external returns (uint256)
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

<br />

