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

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import {IStructuredIndexedPortfolio, PortfolioParams, TrancheInitData, TrancheData, ExpectedEquityRate, PortfolioStatus, BASIS_PRECISION, YEAR} from "./interfaces/IStructuredIndexedPortfolio.sol";
import {ITrancheVault, Checkpoint} from "./interfaces/ITrancheVault.sol";
import {IProtocolConfig} from "./interfaces/IProtocolConfig.sol";
import {IVaultsRegistry} from "./interfaces/IVaultsRegistry.sol";
import {Upgradeable} from "./access/Upgradeable.sol";

contract StructuredIndexedPortfolio is IStructuredIndexedPortfolio, Upgradeable {
    using SafeERC20 for IERC20Metadata;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE"); // 0x241ecf16d79d0f8dbfb92cbc07fe17840425976cf0667f022fe9877caa831b08

    IProtocolConfig public protocolConfig;
    IVaultsRegistry public vaultsRegistry;

    uint256 public virtualTokenBalance;
    uint256 public endDate;
    uint256 public startDate;

    IERC20Metadata public asset;
    PortfolioStatus public status;
    string public name;
    uint256 public portfolioDuration;
    uint256 public startDeadline;
    uint256 public minimumSize;

    ITrancheVault[] public tranches;
    TrancheData[] public tranchesData;
    ExpectedEquityRate public expectedEquityRate;

    EnumerableSetUpgradeable.AddressSet internal investments;

    //slither-disable-next-line reentrancy-no-eth
    function initialize(
        address manager,
        IERC20Metadata _asset,
        IProtocolConfig _protocolConfig,
        IVaultsRegistry _vaultsRegistry,
        PortfolioParams memory portfolioParams,
        TrancheInitData[] memory tranchesInitData,
        ExpectedEquityRate memory _expectedEquityRate
    ) external initializer {
        __Upgradeable_init(_protocolConfig.protocolAdmin(), _protocolConfig.pauserAddress());
        _grantRole(MANAGER_ROLE, manager);

        protocolConfig = _protocolConfig;
        vaultsRegistry = _vaultsRegistry;

        asset = _asset;
        status = PortfolioStatus.CapitalFormation;
        name = portfolioParams.name;
        portfolioDuration = portfolioParams.duration;
        startDeadline = block.timestamp + portfolioParams.capitalFormationPeriod;
        minimumSize = portfolioParams.minimumSize;
        expectedEquityRate = _expectedEquityRate;

        uint256 tranchesCount = tranchesInitData.length;

        require(tranchesCount > 0, "SIP: Cannot create portfolio without tranches");
        require(tranchesInitData[0].targetApy == 0, "SIP: Target APY in tranche #0 must be 0");
        require(tranchesInitData[0].minSubordinateRatio == 0, "SIP: Min sub ratio in tranche #0 must be 0");

        for (uint256 i = 0; i < tranchesCount; i++) {
            require(address(asset) == address(tranchesInitData[i].tranche.asset()), "SIP: Asset mismatched");
            TrancheInitData memory initData = tranchesInitData[i];
            tranches.push(initData.tranche);
            initData.tranche.setPortfolio(address(this));
            asset.safeApprove(address(initData.tranche), type(uint256).max);
            tranchesData.push(TrancheData(initData.targetApy, initData.minSubordinateRatio, 0, 0));
        }
    }

    function getTranches() external view returns (ITrancheVault[] memory) {
        return tranches;
    }

    function getTrancheData(uint256 trancheIdx) external view returns (TrancheData memory) {
        return tranchesData[trancheIdx];
    }

    //slither-disable-next-line reentrancy-no-eth
    function updateCheckpoints() public whenNotPaused {
        require(status != PortfolioStatus.CapitalFormation, "SIP: No checkpoints before start");
        uint256[] memory _totalAssetsAfter = calculateWaterfall();
        for (uint256 i = 0; i < _totalAssetsAfter.length; i++) {
            tranches[i].updateCheckpointFromPortfolio(_totalAssetsAfter[i]);
        }
    }

    function calculateDeficit(
        uint256 i,
        uint256 realTotalAssets,
        uint256 pendingFees,
        uint256 unpaidFees
    ) external view returns (uint256) {
        uint256 timestamp = _limitedBlockTimestamp();
        uint256 assumedTotalAssets = _assumedTrancheValue(i, timestamp);
        uint256 assumedTotalAssetsAfterFees = _saturatingSub(assumedTotalAssets, _max(pendingFees, unpaidFees));
        return _saturatingSub(assumedTotalAssetsAfterFees, realTotalAssets);
    }

    function increaseVirtualTokenBalance(uint256 increment) external {
        _changeVirtualTokenBalance(SafeCast.toInt256(increment));
    }

    function decreaseVirtualTokenBalance(uint256 decrement) external {
        _changeVirtualTokenBalance(-SafeCast.toInt256(decrement));
    }

    function calculateWaterfall() public view returns (uint256[] memory) {
        return _calculateWaterfall(virtualTokenBalance + investmentsValue());
    }

    function _calculateWaterfall(uint256 assetsLeft) internal view returns (uint256[] memory) {
        uint256[] memory waterfall = _calculateWaterfallWithoutFees(assetsLeft);
        for (uint256 i = 0; i < waterfall.length; i++) {
            uint256 pendingFees = tranches[i].totalPendingFeesForAssets(waterfall[i]);
            waterfall[i] = _saturatingSub(waterfall[i], pendingFees);
        }
        return waterfall;
    }

    function calculateWaterfallWithoutFees() public view returns (uint256[] memory) {
        return _calculateWaterfallWithoutFees(virtualTokenBalance + investmentsValue());
    }

    function _calculateWaterfallWithoutFees(uint256 assetsLeft) internal view returns (uint256[] memory) {
        uint256[] memory waterfall = new uint256[](tranches.length);
        if (status != PortfolioStatus.Live) {
            for (uint256 i = 0; i < waterfall.length; i++) {
                waterfall[i] = tranches[i].totalAssetsBeforeFees();
            }
            return waterfall;
        }

        uint256 limitedBlockTimestamp = _limitedBlockTimestamp();

        for (uint256 i = waterfall.length - 1; i > 0; i--) {
            uint256 assumedTrancheValue = _assumedTrancheValue(i, limitedBlockTimestamp);

            if (assumedTrancheValue >= assetsLeft) {
                waterfall[i] = assetsLeft;
                return waterfall;
            }

            waterfall[i] = assumedTrancheValue;
            assetsLeft -= assumedTrancheValue;
        }

        waterfall[0] = assetsLeft;

        return waterfall;
    }

    function calculateWaterfallForTranche(uint256 trancheIdx) external view returns (uint256) {
        require(trancheIdx < tranches.length, "SIP: Tranche index out of bounds");
        return calculateWaterfall()[trancheIdx];
    }

    function calculateWaterfallForTrancheWithoutFee(uint256 trancheIdx) external view returns (uint256) {
        require(trancheIdx < tranches.length, "SIP: Tranche index out of bounds");
        return calculateWaterfallWithoutFees()[trancheIdx];
    }

    function totalAssets() external view returns (uint256) {
        return _sum(_tranchesTotalAssets());
    }

    function liquidAssets() public view returns (uint256) {
        uint256 _totalPendingFees = totalPendingFees();
        return _saturatingSub(virtualTokenBalance, _totalPendingFees);
    }

    function totalPendingFees() public view returns (uint256) {
        uint256 sum = 0;
        uint256 tranchesCount = tranches.length;
        uint256[] memory _totalAssets = calculateWaterfallWithoutFees();

        for (uint256 i = 0; i < tranchesCount; i++) {
            sum += tranches[i].totalPendingFeesForAssets(_totalAssets[i]);
        }

        return sum;
    }

    function start() external whenNotPaused {
        _requireManagerRole();
        require(status == PortfolioStatus.CapitalFormation, "SIP: Portfolio is not in capital formation");
        uint256[] memory _totalAssets = _tranchesTotalAssets();
        _checkTranchesRatios(_totalAssets);
        require(_sum(_totalAssets) >= minimumSize, "SIP: Portfolio minimum size not reached");

        _changePortfolioStatus(PortfolioStatus.Live);

        startDate = block.timestamp;
        endDate = block.timestamp + portfolioDuration;

        uint256 tranchesCount = tranches.length;
        for (uint256 i = 0; i < tranchesCount; i++) {
            tranches[i].onPortfolioStart();
        }
    }

    function close() external whenNotPaused {
        require(status != PortfolioStatus.Closed, "SIP: Portfolio already closed");
        bool isAfterEndDate = block.timestamp > endDate;
        require(isAfterEndDate || investments.length() == 0, "SIP: Registered investments exist");

        bool isManager = hasRole(MANAGER_ROLE, msg.sender);

        if (status == PortfolioStatus.Live) {
            require(isManager || isAfterEndDate, "SIP: Cannot close before end date");
            _closeTranches();
        } else {
            require(isManager || block.timestamp >= startDeadline, "SIP: Cannot close before start deadline");
        }

        _changePortfolioStatus(PortfolioStatus.Closed);
        updateCheckpoints();

        if (!isAfterEndDate) {
            endDate = block.timestamp;
        }
    }

    function _closeTranches() internal {
        updateCheckpoints();
        uint256 limitedBlockTimestamp = _limitedBlockTimestamp();
        uint256[] memory waterfall = _calculateWaterfall(virtualTokenBalance);

        for (uint256 i = 0; i < waterfall.length; i++) {
            if (i != 0) {
                tranchesData[i].maxValueOnClose = _assumedTrancheValue(i, limitedBlockTimestamp);
            }
            tranchesData[i].distributedAssets = waterfall[i];
            _transfer(tranches[i], waterfall[i]);
        }
    }

    function _transfer(ITrancheVault tranche, uint256 amount) internal {
        asset.safeTransfer(address(tranche), amount);
        tranche.onTransfer(amount);
        virtualTokenBalance -= amount;
    }

    function _changePortfolioStatus(PortfolioStatus newStatus) internal {
        status = newStatus;
        emit PortfolioStatusChanged(newStatus);
    }

    function _changeVirtualTokenBalance(int256 delta) internal {
        uint256 tranchesCount = tranches.length;
        for (uint256 i = 0; i < tranchesCount; i++) {
            if (msg.sender == address(tranches[i])) {
                virtualTokenBalance = _addSigned(virtualTokenBalance, delta);
                return;
            }
        }
        revert("SIP: Not a tranche");
    }

    function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external view {
        uint256[] memory _totalAssets = calculateWaterfall();
        for (uint256 i = 0; i < _totalAssets.length; i++) {
            if (msg.sender == address(tranches[i])) {
                _totalAssets[i] = newTotalAssets;
            }
        }
        _checkTranchesRatios(_totalAssets);
    }

    function checkTranchesRatios() external view {
        _checkTranchesRatios(_tranchesTotalAssets());
    }

    function maxTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256) {
        if (status != PortfolioStatus.Live || trancheIdx == 0) {
            return type(uint256).max;
        }

        uint256[] memory waterfallValues = calculateWaterfall();

        uint256 subordinateValue = 0;
        for (uint256 i = 0; i < trancheIdx; i++) {
            subordinateValue += waterfallValues[i];
        }

        uint256 minSubordinateRatio = tranchesData[trancheIdx].minSubordinateRatio;
        if (minSubordinateRatio == 0) {
            return type(uint256).max;
        }

        return (subordinateValue * BASIS_PRECISION) / minSubordinateRatio;
    }

    function minTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256) {
        if (status != PortfolioStatus.Live) {
            return 0;
        }

        uint256[] memory trancheValues = calculateWaterfall();
        uint256 tranchesCount = trancheValues.length;

        //slither-disable-next-line incorrect-equality
        if (trancheIdx == tranchesCount - 1) {
            return 0;
        }

        uint256 subordinateValueWithoutTranche = 0;
        uint256 maxThreshold = 0;
        for (uint256 i = 0; i < tranchesCount - 1; i++) {
            uint256 trancheValue = trancheValues[i];
            if (i != trancheIdx) {
                subordinateValueWithoutTranche += trancheValue;
            }
            if (i >= trancheIdx) {
                uint256 lowerBound = (trancheValues[i + 1] * tranchesData[i + 1].minSubordinateRatio) / BASIS_PRECISION;
                uint256 minTrancheValue = _saturatingSub(lowerBound, subordinateValueWithoutTranche);
                maxThreshold = _max(minTrancheValue, maxThreshold);
            }
        }
        return maxThreshold;
    }

    function _tranchesTotalAssets() internal view returns (uint256[] memory) {
        if (status == PortfolioStatus.Live) {
            return calculateWaterfall();
        }

        uint256[] memory _totalAssets = new uint256[](tranches.length);
        for (uint256 i = 0; i < _totalAssets.length; i++) {
            _totalAssets[i] = tranches[i].totalAssets();
        }
        return _totalAssets;
    }

    function _sum(uint256[] memory components) internal pure returns (uint256) {
        uint256 sum;
        for (uint256 i = 0; i < components.length; i++) {
            sum += components[i];
        }
        return sum;
    }

    function _checkTranchesRatios(uint256[] memory _totalAssets) internal view {
        uint256 subordinateValue = _totalAssets[0];

        for (uint256 i = 1; i < _totalAssets.length; i++) {
            uint256 minSubordinateRatio = tranchesData[i].minSubordinateRatio;
            uint256 trancheValue = _totalAssets[i];

            bool isMinRatioRequired = minSubordinateRatio != 0;
            if (isMinRatioRequired) {
                uint256 subordinateValueInBps = subordinateValue * BASIS_PRECISION;
                uint256 lowerBound = trancheValue * minSubordinateRatio;
                bool isMinRatioSatisfied = subordinateValueInBps >= lowerBound;
                require(isMinRatioSatisfied, "SIP: Tranche min ratio not met");
            }

            subordinateValue += trancheValue;
        }
    }

    function investmentsValue() public view returns (uint256) {
        uint256 sum = 0;
        for (uint256 i = 0; i < investments.length(); ++i) {
            IERC4626 investment = IERC4626(investments.at(i));
            uint256 investmentBalance = investment.balanceOf(address(this));
            sum = sum + investment.previewRedeem(investmentBalance);
        }
        return sum;
    }

    function _assumedTrancheValue(uint256 trancheIdx, uint256 timestamp) internal view returns (uint256) {
        Checkpoint memory checkpoint = tranches[trancheIdx].getCheckpoint();
        TrancheData memory trancheData = tranchesData[trancheIdx];
        uint256 timePassedSinceCheckpoint = _saturatingSub(timestamp, checkpoint.timestamp);

        return
            _withInterest(checkpoint.totalAssets + checkpoint.deficit, trancheData.targetApy, timePassedSinceCheckpoint) +
            checkpoint.unpaidFees;
    }

    function _withInterest(
        uint256 initialValue,
        uint256 targetApy,
        uint256 timePassed
    ) internal pure returns (uint256) {
        uint256 interest = (initialValue * targetApy * timePassed) / YEAR / BASIS_PRECISION;
        return initialValue + interest;
    }

    function getInvestments() external view returns (address[] memory) {
        return investments.values();
    }

    function register(IERC4626 investment) external whenNotPaused {
        _requireManagerRole();
        _register(investment);
    }

    function _register(IERC4626 investment) internal {
        require(vaultsRegistry.isVaultAdded(address(investment)), "SIP: Investment is not in the registry");
        require(status == PortfolioStatus.Live, "SIP: Portfolio is not live");
        require(address(asset) == investment.asset(), "SIP: Asset mismatched");
        require(investments.add(address(investment)), "SIP: Investment already registered");
        updateCheckpoints();
        emit InvestmentRegistered(investment);
    }

    function unregister(IERC4626 investment) external whenNotPaused {
        _requireManagerRole();
        _unregister(investment);
    }

    //slither-disable-next-line reentrancy-no-eth
    function _unregister(IERC4626 investment) internal {
        if (status == PortfolioStatus.Live) {
            updateCheckpoints();
        }
        require(investments.remove(address(investment)), "SIP: Investment not registered");
        if (status == PortfolioStatus.Live) {
            updateCheckpoints();
        }
        emit InvestmentUnregistered(investment);
    }

    //slither-disable-next-line reentrancy-no-eth
    function executeDeposit(IERC4626 investment, uint256 assets) external whenNotPaused returns (uint256) {
        _requireManagerRole();
        require(status == PortfolioStatus.Live, "SIP: Portfolio is not live");
        require(investments.contains(address(investment)), "SIP: Investment not registered");
        updateCheckpoints();
        uint256 shares = _executeDeposit(investment, assets);
        updateCheckpoints();
        return shares;
    }

    function _executeDeposit(IERC4626 investment, uint256 assets) internal returns (uint256) {
        asset.safeApprove(address(investment), assets);
        virtualTokenBalance = _saturatingSub(virtualTokenBalance, assets);
        uint256 shares = investment.deposit(assets, address(this));
        emit ExecutedDeposit(investment, assets, shares);
        return shares;
    }

    //slither-disable-next-line reentrancy-no-eth
    function executeRedeem(IERC4626 investment, uint256 shares) external whenNotPaused returns (uint256) {
        _requireManagerRole();
        require(investments.contains(address(investment)), "SIP: Investment not registered");
        return _executeRedeem(investment, shares);
    }

    function _executeRedeem(IERC4626 investment, uint256 shares) internal returns (uint256) {
        if (status == PortfolioStatus.Live) {
            return _executeRedeemInLive(investment, shares);
        }
        if (status == PortfolioStatus.Closed) {
            return _executeRedeemInClosed(investment, shares);
        }
        return 0;
    }

    //slither-disable-next-line reentrancy-no-eth
    function _executeRedeemInLive(IERC4626 investment, uint256 shares) internal returns (uint256) {
        updateCheckpoints();
        uint256 assets = investment.redeem(shares, address(this), address(this));
        virtualTokenBalance += assets;
        emit ExecutedRedeem(investment, shares, assets);
        updateCheckpoints();
        return assets;
    }

    function _executeRedeemInClosed(IERC4626 investment, uint256 shares) internal returns (uint256) {
        uint256 redeemedAssets = investment.redeem(shares, address(this), address(this));
        emit ExecutedRedeem(investment, shares, redeemedAssets);

        uint256 undistributedAssets = redeemedAssets;

        for (uint256 i = tranches.length - 1; i > 0; i--) {
            if (undistributedAssets <= 0) {
                return redeemedAssets;
            }

            TrancheData memory trancheData = tranchesData[i];
            uint256 trancheFreeCapacity = trancheData.maxValueOnClose - trancheData.distributedAssets;
            if (trancheFreeCapacity == 0) {
                continue;
            }

            uint256 trancheShare = _min(trancheFreeCapacity, undistributedAssets);
            undistributedAssets -= trancheShare;
            _transferToTrancheInClosed(i, trancheShare);
        }

        if (undistributedAssets > 0) {
            _transferToTrancheInClosed(0, undistributedAssets);
        }

        return redeemedAssets;
    }

    function _transferToTrancheInClosed(uint256 trancheIdx, uint256 amount) internal {
        ITrancheVault tranche = tranches[trancheIdx];
        tranchesData[trancheIdx].distributedAssets += amount;
        asset.safeTransfer(address(tranche), amount);
        tranche.onTransfer(amount);
        tranche.updateCheckpoint();
    }

    //slither-disable-next-line reentrancy-no-eth
    function registerAndExecuteDeposit(IERC4626 investment, uint256 assets) external whenNotPaused returns (uint256) {
        _requireManagerRole();

        _register(investment);

        updateCheckpoints();
        uint256 shares = _executeDeposit(investment, assets);
        updateCheckpoints();

        return shares;
    }

    //slither-disable-next-line reentrancy-no-eth
    function executeRedeemAndUnregister(IERC4626 investment, uint256 shares) external whenNotPaused returns (uint256) {
        _requireManagerRole();
        _unregister(investment);
        return _executeRedeem(investment, shares);
    }

    function _limitedBlockTimestamp() internal view returns (uint256) {
        return _min(block.timestamp, endDate);
    }

    function _min(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? y : x;
    }

    function _max(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? x : y;
    }

    function _saturatingSub(uint256 x, uint256 y) internal pure returns (uint256) {
        return x > y ? x - y : 0;
    }

    function _addSigned(uint256 x, int256 y) internal pure returns (uint256) {
        return y < 0 ? x - uint256(-y) : x + uint256(y);
    }

    function _requireManagerRole() internal view {
        require(hasRole(MANAGER_ROLE, msg.sender), "SIP: Only manager");
    }
}
