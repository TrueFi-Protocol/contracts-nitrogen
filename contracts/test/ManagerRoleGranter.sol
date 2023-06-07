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

contract ManagerRoleGranter {
    bytes32 public constant WHITELISTED_MANAGER_ROLE = keccak256("WHITELISTED_MANAGER_ROLE"); // 0f1a06f478c6d93b4de7d3729d5b62d1767a80e47459ec53d09d36e3042f5253
    address public immutable portfolioFactory;

    constructor(address _portfolioFactory) {
        portfolioFactory = _portfolioFactory;
    }

    function becomeManager() external {
        IAccessControlUpgradeable(portfolioFactory).grantRole(WHITELISTED_MANAGER_ROLE, msg.sender);
    }
}
