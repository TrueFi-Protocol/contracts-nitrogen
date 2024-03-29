# IndexedPortfoliosProtocolConfig API

## CustomFeeRate

<br />

```solidity
struct CustomFeeRate {
  bool isSet;
  uint16 feeRate;
}
```
## IndexedPortfoliosProtocolConfig

<br />

### defaultProtocolFeeRate

```solidity
uint256 defaultProtocolFeeRate
```

<br />

### protocolAdmin

```solidity
address protocolAdmin
```

<br />

### protocolTreasury

```solidity
address protocolTreasury
```

<br />

### pauserAddress

```solidity
address pauserAddress
```

<br />

### initialize

```solidity
function initialize(uint256 _defaultProtocolFeeRate, address _protocolAdmin, address _protocolTreasury, address _pauserAddress) external
```

Setups the contract with given params

_Used by Initializable contract (can be called only once)_

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| _defaultProtocolFeeRate | uint256 | Default fee rate valid for every contract except those with custom fee rate set |
| _protocolAdmin | address | Address of the account/contract that should be able to upgrade Upgradeable contracts |
| _protocolTreasury | address | Address of the account/contract to which collected fee should be transferred |
| _pauserAddress | address | Address of the account/contract that should be granted PAUSER role on TrueFi Pausable contracts |

<br />

### protocolFeeRate

```solidity
function protocolFeeRate() external view returns (uint256)
```

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| feeRate | uint256 | Protocol fee rate valid for the message sender

<br />

### protocolFeeRate

```solidity
function protocolFeeRate(address contractAddress) external view returns (uint256)
```

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddress | address | Address of contract queried for it's protocol fee rate |

##### Returns
| Name | Type | Description |
| ---- | ---- | ----------- |
| feeRate | uint256 | Protocol fee rate valid for the given address

<br />

### setCustomProtocolFeeRate

```solidity
function setCustomProtocolFeeRate(address contractAddress, uint16 newFeeRate) external
```

Custom protocol fee rate setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddress | address | Address of the contract for which new custom fee rate should be set |
| newFeeRate | uint16 | Custom protocol fee rate (in BPS) which should be set for the given address |

<br />

### removeCustomProtocolFeeRate

```solidity
function removeCustomProtocolFeeRate(address contractAddress) external
```

Removes custom protocol fee rate from the given contract address

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| contractAddress | address | Address of the contract for which custom fee rate should be unset |

<br />

### setDefaultProtocolFeeRate

```solidity
function setDefaultProtocolFeeRate(uint256 newFeeRate) external
```

Default protocol fee rate setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newFeeRate | uint256 | New protocol fee rate (in BPS) to set |

<br />

### setProtocolAdmin

```solidity
function setProtocolAdmin(address newProtocolAdmin) external
```

Protocol admin address setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newProtocolAdmin | address | New protocol admin address to set |

<br />

### setProtocolTreasury

```solidity
function setProtocolTreasury(address newProtocolTreasury) external
```

Protocol treasury address setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newProtocolTreasury | address | New protocol treasury address to set |

<br />

### setPauserAddress

```solidity
function setPauserAddress(address newPauserAddress) external
```

TrueFi contracts pauser address setter

##### Arguments
| Name | Type | Description |
| ---- | ---- | ----------- |
| newPauserAddress | address | New pauser address to set |

<br />

