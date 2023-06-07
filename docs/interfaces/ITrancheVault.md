# interfaces/ITrancheVault API

## SizeRange

<br />

```solidity
struct SizeRange {
  uint256 floor;
  uint256 ceiling;
}
```
## Checkpoint

<br />

```solidity
struct Checkpoint {
  uint256 totalAssets;
  uint256 protocolFeeRate;
  uint256 timestamp;
  uint256 unpaidFees;
}
```
## Configuration

<br />

```solidity
struct Configuration {
  uint256 managerFeeRate;
  address managerFeeBeneficiary;
  address depositController;
  address withdrawController;
  address transferController;
}
```
## ITrancheVault

<br />

### CheckpointUpdated

```solidity
event CheckpointUpdated(uint256 totalAssets, uint256 protocolFeeRate)
```

Event emitted when checkpoint is changed

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| totalAssets | uint256 | Tranche total assets at the moment of checkpoint creation |
| protocolFeeRate | uint256 | Protocol fee rate at the moment of checkpoint creation |

<br />

### ProtocolFeePaid

```solidity
event ProtocolFeePaid(address protocolAddress, uint256 fee)
```

Event emitted when fee is transferred to protocol

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolAddress | address | Address to which protocol fees are transferred |
| fee | uint256 | Fee amount paid to protocol |

<br />

### ManagerFeePaid

```solidity
event ManagerFeePaid(address managerFeeBeneficiary, uint256 fee)
```

Event emitted when fee is transferred to manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| managerFeeBeneficiary | address | Address to which manager fees are transferred |
| fee | uint256 | Fee amount paid to protocol |

<br />

### ManagerFeeRateChanged

```solidity
event ManagerFeeRateChanged(uint256 newManagerFeeRate)
```

Event emitted when manager fee rate is changed by the manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newManagerFeeRate | uint256 | New fee rate |

<br />

### ManagerFeeBeneficiaryChanged

```solidity
event ManagerFeeBeneficiaryChanged(address newManagerFeeBeneficiary)
```

Event emitted when manager fee beneficiary is changed by the manager

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newManagerFeeBeneficiary | address | New beneficiary address to which manager fee will be transferred |

<br />

### DepositControllerChanged

```solidity
event DepositControllerChanged(address newController)
```

Event emitted when new DepositController address is set

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New DepositController address |

<br />

### WithdrawControllerChanged

```solidity
event WithdrawControllerChanged(address newController)
```

Event emitted when new WithdrawController address is set

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New WithdrawController address |

<br />

### TransferControllerChanged

```solidity
event TransferControllerChanged(address newController)
```

Event emitted when new TransferController address is set

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New TransferController address |

<br />

### MANAGER_ROLE

```solidity
function MANAGER_ROLE() external view returns (bytes32)
```

Tranche manager role used for access control

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | Manager role used for access control

<br />

### TRANCHE_CONTROLLER_OWNER_ROLE

```solidity
function TRANCHE_CONTROLLER_OWNER_ROLE() external view returns (bytes32)
```

Role used to access tranche controllers setters

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | Controller owner role used for access control

<br />

### portfolio

```solidity
function portfolio() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| portfolio | address | Associated StructuredPortfolio address

<br />

### depositController

```solidity
function depositController() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| controller | address | Address of DepositController contract responsible for deposit-related operations on TrancheVault

<br />

### withdrawController

```solidity
function withdrawController() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| controller | address | Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault

<br />

### transferController

```solidity
function transferController() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| controller | address | Address of TransferController contract deducing whether a specific transfer is allowed or not

<br />

### waterfallIndex

```solidity
function waterfallIndex() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | TrancheVault index in StructuredPortfolio tranches order

<br />

### managerFeeRate

```solidity
function managerFeeRate() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| feeRate | uint256 | Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps)

<br />

### managerFeeBeneficiary

```solidity
function managerFeeBeneficiary() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | Address to which manager fee should be transferred

<br />

### protocolConfig

```solidity
function protocolConfig() external view returns (address)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| config | address | Address of ProtocolConfig contract used to collect protocol fee

<br />

### setDepositController

```solidity
function setDepositController(address newController) external
```

DepositController address setter

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New DepositController address |

<br />

### setWithdrawController

```solidity
function setWithdrawController(address newController) external
```

WithdrawController address setter

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New WithdrawController address |

<br />

### setTransferController

```solidity
function setTransferController(address newController) external
```

TransferController address setter

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newController | address | New TransferController address |

<br />

### setPortfolio

```solidity
function setPortfolio(address _portfolio) external
```

Sets address of StructuredPortfolio associated with TrancheVault

_Can be executed only once_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _portfolio | address | StructuredPortfolio address |

<br />

### setManagerFeeRate

```solidity
function setManagerFeeRate(uint256 newFeeRate) external
```

Manager fee rate setter

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New manager fee rate (expressed in bps) |

<br />

### setManagerFeeBeneficiary

```solidity
function setManagerFeeBeneficiary(address newBeneficiary) external
```

Manager fee beneficiary setter

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newBeneficiary | address | New manager fee beneficiary address |

<br />

### initialize

```solidity
function initialize(string _name, string _symbol, address _token, address _depositController, address _withdrawController, address _transferController, address _protocolConfig, uint256 _waterfallIndex, address manager, uint256 _managerFeeRate) external
```

Setup contract with given params

_Used by Initializable contract (can be called only once)_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _name | string | Contract name |
| _symbol | string | Contract symbol |
| _token | address | Address of ERC20 token used by TrancheVault |
| _depositController | address | Address of DepositController contract responsible for deposit-related operations on TrancheVault |
| _withdrawController | address | Address of WithdrawController contract responsible for withdraw-related operations on TrancheVault |
| _transferController | address | Address of TransferController contract deducing whether a specific transfer is allowed or not |
| _protocolConfig | address | Address of ProtocolConfig contract storing TrueFi protocol-related data |
| _waterfallIndex | uint256 | TrancheVault index in StructuredPortfolio tranches order |
| manager | address | Address on which MANAGER_ROLE is granted |
| _managerFeeRate | uint256 | Annual rate of continuous fee accrued on every block on the top of checkpoint tranche total assets (expressed in bps) |

<br />

### updateCheckpoint

```solidity
function updateCheckpoint() external
```

Updates TrancheVault checkpoint with current total assets and pays pending fees

<br />

### updateCheckpointFromPortfolio

```solidity
function updateCheckpointFromPortfolio(uint256 _totalAssets, uint256 deficit) external
```

Updates TrancheVault checkpoint with total assets value calculated in StructuredPortfolio waterfall

_- can be executed only by associated StructuredPortfolio
     - is used by StructuredPortfolio only in Live portfolio status_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _totalAssets | uint256 | Total assets amount to save in the checkpoint |
| deficit | uint256 |  |

<br />

### totalAssetsBeforeFees

```solidity
function totalAssetsBeforeFees() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Total tranche assets including accrued but yet not paid fees

<br />

### totalPendingFees

```solidity
function totalPendingFees() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| fees | uint256 | Sum of all unpaid fees and fees accrued since last checkpoint update

<br />

### totalPendingFeesForAssets

```solidity
function totalPendingFeesForAssets(uint256 amount) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | Asset amount with which fees should be calculated |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
|  | uint256 | Sum of all unpaid fees and fees accrued on the given amount since last checkpoint update

<br />

### pendingProtocolFee

```solidity
function pendingProtocolFee() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | Sum of unpaid protocol fees and protocol fees accrued since last checkpoint update

<br />

### pendingManagerFee

```solidity
function pendingManagerFee() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| fee | uint256 | Sum of unpaid manager fees and manager fees accrued since last checkpoint update

<br />

### getCheckpoint

```solidity
function getCheckpoint() external view returns (struct Checkpoint checkpoint)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| checkpoint | struct Checkpoint | Checkpoint tracking info about TrancheVault total assets and protocol fee rate at last checkpoint update, and timestamp of that update |

<br />

### unpaidProtocolFee

```solidity
function unpaidProtocolFee() external view returns (uint256 protocolFee)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| protocolFee | uint256 | Remembered value of fee unpaid to protocol due to insufficient TrancheVault funds at the moment of transfer |

<br />

### unpaidManagerFee

```solidity
function unpaidManagerFee() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| managerFee | uint256 | Remembered value of fee unpaid to manager due to insufficient TrancheVault funds at the moment of transfer

<br />

### onPortfolioStart

```solidity
function onPortfolioStart() external
```

Initializes TrancheVault checkpoint and transfers all TrancheVault assets to associated StructuredPortfolio

_- can be executed only by associated StructuredPortfolio
     - called by associated StructuredPortfolio on transition to Live status_

<br />

### onTransfer

```solidity
function onTransfer(uint256 assets) external
```

Updates virtualTokenBalance and checkpoint after transferring assets from StructuredPortfolio to TrancheVault

_Can be executed only by associated StructuredPortfolio_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Transferred assets amount |

<br />

### convertToSharesCeil

```solidity
function convertToSharesCeil(uint256 assets) external view returns (uint256 shares)
```

Converts given amount of token assets to TrancheVault LP tokens at the current price, without respecting fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of assets to convert |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of corresponding shares |

<br />

### convertToAssetsCeil

```solidity
function convertToAssetsCeil(uint256 shares) external view returns (uint256 assets)
```

Converts given amount of TrancheVault LP tokens to token assets at the current price, without respecting fees

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| shares | uint256 | Amount of TrancheVault LP tokens to convert |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| assets | uint256 | Amount of corresponding assets |

<br />

### configure

```solidity
function configure(struct Configuration newConfiguration) external
```

Allows to change managerFeeRate, managerFeeBeneficiary, depositController and withdrawController

_Can be executed only by TrancheVault manager_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newConfiguration | struct Configuration | New TrancheVault configuration |

<br />

