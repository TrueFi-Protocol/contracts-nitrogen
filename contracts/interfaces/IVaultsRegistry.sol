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

import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

interface IVaultsRegistry is IAccessControlUpgradeable {
    /**
     * @notice Setup contract
     * @dev Used by Initializable contract (can be called only once)
     */
    function initialize() external;

    /**
     * @notice Add vault to the list of registered vaults
     * @dev Reverts if vault is already on the list
     * @param vault Address of the vault
     */
    function addVault(address vault) external;

    /**
     * @notice Removes vault from the list of registered vaults
     * @dev Reverts if vault is not present on the list
     * @param vault Address of the vault
     */
    function removeVault(address vault) external;

    /**
     * @notice Checks if the vault is on the list of registered vaults
     * @param vault Address of the vault
     * @return True if vault is on the list of registered vaults, false otherwise
     */
    function isVaultAdded(address vault) external view returns (bool);

    /**
     * @return List of all registered vaults
     */
    function getVaultsList() external view returns (address[] memory);
}
