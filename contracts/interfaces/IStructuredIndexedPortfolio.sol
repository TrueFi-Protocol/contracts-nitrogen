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

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IAccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import {ITrancheVault} from "./ITrancheVault.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";
import {IVaultsRegistry} from "./IVaultsRegistry.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

enum PortfolioStatus {
    CapitalFormation,
    Live,
    Closed
}

uint256 constant BASIS_PRECISION = 10_000;
uint256 constant YEAR = 365 days;

struct TrancheInitData {
    /// @dev Address of the tranche vault
    ITrancheVault tranche;
    /// @dev The APY expected to be granted at the end of the portfolio Live phase (in BPS)
    uint128 targetApy;
    /// @dev The minimum ratio of the sum of subordinate tranches assets to the tranche assets (in BPS)
    uint128 minSubordinateRatio;
}

struct InvestmentsDeficitCheckpoint {
    /// @dev Tranche missing funds due to defaulted loans
    uint256 deficit;
    /// @dev Timestamp of checkpoint
    uint256 timestamp;
}

struct TrancheData {
    /// @dev The APY expected to be granted at the end of the portfolio Live phase (in BPS)
    uint128 targetApy;
    /// @dev The minimum required ratio of the sum of subordinate tranches assets to the tranche assets (in BPS)
    uint128 minSubordinateRatio;
    /// @dev The amount of assets transferred to the tranche after close() was called
    uint256 distributedAssets;
    /// @dev The potential maximum amount of tranche assets available for withdraw after close() was called
    uint256 maxValueOnClose;
    /// @dev Checkpoint tracking how many assets should be returned to the tranche due to defaulted loans
    InvestmentsDeficitCheckpoint investmentsDeficitCheckpoint;
}

struct PortfolioParams {
    /// @dev Portfolio name
    string name;
    /// @dev Portfolio duration in seconds
    uint256 duration;
    /// @dev Capital formation period in seconds, used to calculate portfolio start deadline
    uint256 capitalFormationPeriod;
    /// @dev Minimum deposited amount needed to start the portfolio
    uint256 minimumSize;
}

struct ExpectedEquityRate {
    /// @dev Minimum expected APY on tranche 0 (expressed in bps)
    uint256 from;
    /// @dev Maximum expected APY on tranche 0 (expressed in bps)
    uint256 to;
}

interface IStructuredIndexedPortfolio is IAccessControlUpgradeable {
    /**
     * @notice Event emitted when portfolio status is changed
     * @param newStatus Portfolio status set
     */
    event PortfolioStatusChanged(PortfolioStatus newStatus);

    /**
     * @notice Event emitted when investment is registered
     * @param investment Registered investment
     */
    event InvestmentRegistered(IERC4626 investment);

    /**
     * @notice Event emitted when investment is unregistered
     * @param investment Unregistered investment
     */
    event InvestmentUnregistered(IERC4626 investment);

    /**
     * @notice Event emitted when deposit is executed on investment
     * @param investment Registered investment that deposit was executed on
     * @param assets Assets deposited
     * @param shares Shares received by portfolio
     */
    event ExecutedDeposit(IERC4626 investment, uint256 assets, uint256 shares);

    /**
     * @notice Event emitted when redeem is executed on investment
     * @param investment Registered investment that redeem was executed on
     * @param shares Shares redeemed
     * @param assets Assets received by portfolio
     */
    event ExecutedRedeem(IERC4626 investment, uint256 shares, uint256 assets);

    /**
     * @return role Portfolio manager role used for access control
     */
    function MANAGER_ROLE() external view returns (bytes32);

    /**
     * @notice Setup contract with given params
     * @dev Used by Initializable contract (can be called only once)
     * @param manager Address on which MANAGER_ROLE is granted
     * @param _asset Address of ERC20 token used by portfolio
     * @param _protocolConfig Address of ProtocolConfig contract
     * @param _vaultsRegistry Address of Vaults Registry contract
     * @param portfolioParams Parameters to configure portfolio
     * @param tranchesInitData Parameters to configure tranches
     * @param _expectedEquityRate APY range that is expected to be reached by Equity tranche
     */
    function initialize(
        address manager,
        IERC20Metadata _asset,
        IProtocolConfig _protocolConfig,
        IVaultsRegistry _vaultsRegistry,
        PortfolioParams memory portfolioParams,
        TrancheInitData[] memory tranchesInitData,
        ExpectedEquityRate memory _expectedEquityRate
    ) external;

    /**
     * @return tranches Array of portfolio's tranches addresses
     */
    function getTranches() external view returns (ITrancheVault[] memory);

    /**
     * @param trancheIdx Index of tranche
     * @return trancheData i-th tranche data
     */
    function getTrancheData(uint256 trancheIdx) external view returns (TrancheData memory);

    /**
     * @notice Pay pending fees and update checkpoints on each tranche
     * @dev Reverts if called in CapitalFormation status
     */
    function updateCheckpoints() external;

    /**
     * @notice Virtual value of the portfolio
     * @return assets Current asset balance acknowledged by the portfolio
     */
    function virtualTokenBalance() external view returns (uint256);

    /**
     * @notice Increment virtual token balance by `increment`
     * @dev Must be called by own tranche
     * @param increment Value to be added to virtual token balance
     */
    function increaseVirtualTokenBalance(uint256 increment) external;

    /**
     * @notice Decrease virtual token balance by `decrement`
     * @dev Must be called by own tranche
     * @param decrement Value to be subtracted to virtual token balance
     */
    function decreaseVirtualTokenBalance(uint256 decrement) external;

    /**
     * @notice Distribute portfolio value among tranches respecting their target APYs and fees.
     * @return tranchesValues Array of current tranche values
     */
    function calculateWaterfall() external view returns (uint256[] memory);

    /**
     * @notice Distribute portfolio value among tranches respecting their target APYs, but not fees.
     * @return tranchesValues Array of current tranche values (with pending fees not deducted)
     */
    function calculateWaterfallWithoutFees() external view returns (uint256[] memory);

    /**
     * @param trancheIdx Index of tranche
     * @return trancheValue Current value of tranche
     */
    function calculateWaterfallForTranche(uint256 trancheIdx) external view returns (uint256);

    /**
     * @param trancheIdx Index of tranche
     * @return trancheValue Current value of tranche (with pending fees not deducted)
     */
    function calculateWaterfallForTrancheWithoutFee(uint256 trancheIdx) external view returns (uint256);

    /**
     * @return assets Total value locked in the contract including value of outstanding investments
     */
    function totalAssets() external view returns (uint256);

    /**
     * @return assets Underlying token balance of portfolio reduced by pending fees
     */
    function liquidAssets() external view returns (uint256);

    /**
     * @return assets Sum of all unsettled fees that tranches should pay
     */
    function totalPendingFees() external view returns (uint256);

    /**
     * @notice Launch the portfolio making it possible to invest.
     * @dev - reverts if tranches ratios and portfolio min size are not met,
     *      - changes status to `Live`,
     *      - sets `startDate` and `endDate`,
     *      - transfers assets obtained in tranches to the portfolio.
     */
    function start() external;

    /**
     * @notice Close the portfolio, making it possible to withdraw funds from tranche vaults.
     * @dev - reverts if there are any outstanding investments before end date,
     *      - changes status to `Closed`,
     *      - calculates waterfall values for tranches and transfers the funds to the vaults,
     *      - updates `endDate`.
     */
    function close() external;

    /**
     * @notice Ensure tranche ratios are met
     * @dev Reverts if ratios are not met
     * Is ignored if not called by tranche
     * @param newTotalAssets New total assets value of the tranche calling this function.
     */
    function checkTranchesRatiosFromTranche(uint256 newTotalAssets) external;

    /**
     * @param trancheIdx Index of tranche
     * @return trancheValue Maximum tranche value complying with subordinate ratio in Live status, `2^256 - 1` for other statuses
     */
    function maxTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256);

    /**
     * @param trancheIdx Index of tranche
     * @return trancheValue Minimum tranche value complying with subordinate ratio in Live status, 0 for other statuses
     */
    function minTrancheValueComplyingWithRatio(uint256 trancheIdx) external view returns (uint256);

    /**
     * @notice Ensure tranche ratios are met
     * @dev Reverts if ratios are not met
     */
    function checkTranchesRatios() external view;

    /**
     * @return value Sum of current values of all outstanding investments
     */
    function investmentsValue() external view returns (uint256);

    /**
     * @return investments Array of all outstanding investments
     */
    function getInvestments() external view returns (address[] memory);

    /**
     * @notice Register an investment
     * @dev Reverts if msg.sender does not have MANAGER_ROLE or investment is already registered
     * @param investment Address of the investment
     */
    function register(IERC4626 investment) external;

    /**
     * @notice Unregister an investment
     * @dev Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered
     * @param investment Address of the investment
     */
    function unregister(IERC4626 investment) external;

    /**
     * @notice Call `deposit` on another ERC4626 vault contract
     * @dev Portfolio is the receiver of shares;
     * Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered
     * @param investment Investment to call `deposit` on
     * @param assets Amount of assets to deposit
     * @return shares Amount of shares received from the vault
     */
    function executeDeposit(IERC4626 investment, uint256 assets) external returns (uint256 shares);

    /**
     * @notice Call `redeem` on another ERC4626 vault contract
     * @dev Portfolio is the receiver of assets;
     * Reverts if msg.sender does not have MANAGER_ROLE or investment is not registered
     * @param investment Investment to call `redeem` on
     * @param shares Amount of shares to redeem
     * @return assets Amount of assets received from the vault
     */
    function executeRedeem(IERC4626 investment, uint256 shares) external returns (uint256 assets);

    /**
     * @notice Register ERC4626 vault as an investment and then call `deposit` on it
     * @dev Calls `register(investment)` and then `executeDeposit(investment, assets)`
     * @param investment Investment to register and then call `deposit` on
     * @param assets Amount of assets to deposit
     * @return shares Amount of shares received from the vault
     */
    function registerAndExecuteDeposit(IERC4626 investment, uint256 assets) external returns (uint256 shares);

    /**
     * @notice Call `redeem` on ERC4626 vault and then unregister it from investments
     * @dev Calls `redeem(investment, shares)` and then `unregister(investment)`
     * @param investment Investment call `redeem` on and unregister
     * @param shares Amount of shares to redeem
     * @return assets Amount of assets received from the vault
     */
    function executeRedeemAndUnregister(IERC4626 investment, uint256 shares) external returns (uint256 assets);
}
