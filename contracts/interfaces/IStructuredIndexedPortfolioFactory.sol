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

import {IAccessControlEnumerable} from "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IProtocolConfig} from "./IProtocolConfig.sol";
import {IStructuredIndexedPortfolio, ExpectedEquityRate, PortfolioParams, TrancheInitData} from "./IStructuredIndexedPortfolio.sol";
import {ITrancheVault} from "./ITrancheVault.sol";

struct TrancheData {
    /// @dev Tranche name
    string name;
    /// @dev Tranche symbol
    string symbol;
    /// @dev Implementation of the controller applied when calling deposit-related functions
    address depositControllerImplementation;
    /// @dev Encoded args with initialize method selector from deposit controller
    bytes depositControllerInitData;
    /// @dev Implementation of the controller applied when calling withdraw-related functions
    address withdrawControllerImplementation;
    /// @dev Encoded args with initialize method selector from withdraw controller
    bytes withdrawControllerInitData;
    /// @dev Implementation of the controller used when calling transfer-related functions
    address transferControllerImplementation;
    /// @dev Encoded args with initialize method selector from transfer controller
    bytes transferControllerInitData;
    /// @dev The APY expected to be granted at the end of the portfolio
    uint128 targetApy;
    /// @dev The minimum ratio of funds obtained in a tranche vault to its subordinate tranches
    uint128 minSubordinateRatio;
    /// @dev Manager fee expressed in BPS
    uint256 managerFeeRate;
}

/**
 * @title A factory for deploying Structured Indexed Portfolios
 * @dev Only whitelisted users can create portfolios
 */
interface IStructuredIndexedPortfolioFactory is IAccessControlEnumerable {
    /**
     * @notice Event fired on portfolio creation
     * @param newPortfolio Address of the newly created portfolio
     * @param manager Address of the portfolio manager
     * @param tranches List of addresses of tranche vaults deployed to store assets
     */
    event PortfolioCreated(IStructuredIndexedPortfolio indexed newPortfolio, address indexed manager, ITrancheVault[] tranches);

    /**
     * @return role Whitelisted manager role used for access control, allowing user with this role too create StructuredIndexedPortfolio
     */
    function WHITELISTED_MANAGER_ROLE() external view returns (bytes32);

    /**
     * @param portfolioId Id of the portfolio created with this StructuredIndexedPortfolioFactory
     * @return portfolio Address of the StructuredIndexedPortfolio with given portfolio id
     */
    function portfolios(uint256 portfolioId) external view returns (IStructuredIndexedPortfolio);

    /**
     * @return implementation Address of the Tranche contract implementation used for portfolio deployment
     */
    function trancheImplementation() external view returns (address);

    /**
     * @return implementation Address of the StructuredIndexedPortfolio contract implementation used for portfolio deployment
     */
    function portfolioImplementation() external view returns (address);

    /**
     * @return config Address of the ProtocolConfig
     */
    function protocolConfig() external view returns (IProtocolConfig);

    /**
     * @notice Creates a portfolio alongside with its tranche vaults
     * @dev Tranche vaults are ordered from the most volatile to the most stable
     * @param asset Token used as an underlying asset
     * @param portfolioParams Parameters used for portfolio deployment
     * @param tranchesData Data used for tranche vaults deployment
     * @param expectedEquityRate APY range that is expected to be reached by Equity tranche
     */
    function createPortfolio(
        IERC20Metadata asset,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) external;

    /**
     * @return portfolios All created portfolios
     */
    function getPortfolios() external view returns (IStructuredIndexedPortfolio[] memory);
}
