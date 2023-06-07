// SPDX-License-Identifier: BUSL-1.1
// Business Source License 1.1
// License text copyright (c) 2017 MariaDB Corporation Ab, All Rights Reserved. "Business Source License" is a trademark of MariaDB Corporation Ab.

// Parameters
// Licensor: TrueFi Foundation Ltd.
// Licensed Work: Structured Indexed Vaults. The Licensed Work is (c) 2023 TrueFi Foundation Ltd.
// Additional Use Grant: Any uses listed and defined at this [LICENSE](https://github.com/trusttoken/contracts-nitrogen/license.md)
// Change Date: December 31, 2030
// Change License: MIT
pragma solidity ^0.8.18;

import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {IVaultsRegistry} from "./interfaces/IVaultsRegistry.sol";
import {Upgradeable} from "./access/Upgradeable.sol";

contract VaultsRegistry is IVaultsRegistry, Upgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant LIST_ADMIN_ROLE = keccak256("LIST_ADMIN_ROLE");

    EnumerableSetUpgradeable.AddressSet internal vaults;

    event VaultAdded(address indexed vault);
    event VaultRemoved(address indexed vault);

    function initialize() external initializer {
        __Upgradeable_init(msg.sender, msg.sender);
    }

    function addVault(address vault) external {
        require(hasRole(LIST_ADMIN_ROLE, msg.sender), "VR: Only list admin");
        require(vaults.add(vault), "VR: Vault already added");
        emit VaultAdded(vault);
    }

    function removeVault(address vault) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "VR: Only default admin");
        require(vaults.remove(vault), "VR: Vault hasn't been added");
        emit VaultRemoved(vault);
    }

    function isVaultAdded(address vault) external view returns (bool) {
        return vaults.contains(vault);
    }

    function getVaultsList() external view returns (address[] memory) {
        return vaults.values();
    }
}
