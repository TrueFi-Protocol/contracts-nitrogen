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

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import {IStructuredIndexedPortfolio} from "../interfaces/IStructuredIndexedPortfolio.sol";
import {Checkpoint} from "../interfaces/ITrancheVault.sol";

contract MockTrancheVault {
    address public asset;
    IStructuredIndexedPortfolio public portfolio;
    Checkpoint internal checkpoint;

    constructor(address _asset) {
        asset = _asset;
    }

    function setPortfolio(IStructuredIndexedPortfolio _portfolio) external {
        portfolio = _portfolio;
    }

    function getCheckpoint() external view returns (Checkpoint memory) {
        return checkpoint;
    }

    function setCheckpoint(Checkpoint calldata _checkpoint) external {
        checkpoint = _checkpoint;
    }

    function increaseVirtualTokenBalance(uint256 increment) external {
        portfolio.increaseVirtualTokenBalance(increment);
    }

    function decreaseVirtualTokenBalance(uint256 decrement) external {
        portfolio.decreaseVirtualTokenBalance(decrement);
    }

    function onTransfer(uint256 amount) external {}
}
