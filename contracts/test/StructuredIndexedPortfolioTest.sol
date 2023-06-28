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

import "../StructuredIndexedPortfolio.sol";

/**
 * @dev This contract is used to test the StructuredIndexedPortfolio contract.
 * The intention is to easily set non-settable values and have access to private methods.
 * Please don't override any StructuredIndexedPortfolio methods in this contract.
 */
contract StructuredIndexedPortfolioTest is StructuredIndexedPortfolio {
    function tranchesTotalAssetsTest() external view returns (uint256[] memory) {
        return _tranchesTotalAssets();
    }

    function setMinimumSize(uint256 newSize) external {
        minimumSize = newSize;
    }

    function setMinSubordinateRatios(uint128[] memory newRatios) external {
        uint256 length = uint256(tranchesData.length);
        require(newRatios.length == tranchesData.length, "SIP: Wrong ratios array length");
        for (uint256 trancheId = 0; trancheId < length; trancheId++) {
            tranchesData[trancheId].minSubordinateRatio = newRatios[trancheId];
        }
    }

    function setTargetApy(uint128[] memory newApys) external {
        uint256 length = uint256(tranchesData.length);
        require(newApys.length == tranchesData.length, "SIP: Wrong ratios array length");
        for (uint256 trancheId = 0; trancheId < length; trancheId++) {
            tranchesData[trancheId].targetApy = newApys[trancheId];
        }
    }

    function setTranchesData(TrancheData[] calldata _tranchesData) external {
        for (uint256 i = 0; i < _tranchesData.length; i++) {
            tranchesData[i] = _tranchesData[i];
        }
    }

    function updateCheckpointsFromPortfolio(uint256[] memory newTotalAssets) external {
        for (uint256 i = 0; i < tranches.length; i++) {
            tranches[i].updateCheckpointFromPortfolio(newTotalAssets[i]);
        }
    }

    function setVirtualTokenBalance(uint256 _virtualTokenBalance) external {
        virtualTokenBalance = _virtualTokenBalance;
    }

    function assumedTrancheValue(uint256 trancheIdx, uint256 timestamp) external view returns (uint256) {
        return _assumedTrancheValue(trancheIdx, timestamp);
    }

    function saturatingSub(uint256 x, uint256 y) external pure returns (uint256) {
        return _saturatingSub(x, y);
    }

    function withInterest(
        uint256 initialValue,
        uint256 targetApy,
        uint256 timePassed
    ) external pure returns (uint256) {
        return _withInterest(initialValue, targetApy, timePassed);
    }

    function limitedBlockTimestamp() external view returns (uint256) {
        return _limitedBlockTimestamp();
    }

    function min(uint256 x, uint256 y) external pure returns (uint256) {
        return _min(x, y);
    }

    function transfer(ITrancheVault tranche, uint256 amount) external {
        _transfer(tranche, amount);
    }
}
