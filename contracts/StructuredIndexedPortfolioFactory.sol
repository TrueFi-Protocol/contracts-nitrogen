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
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ProxyWrapper} from "./proxy/ProxyWrapper.sol";
import {IStructuredIndexedPortfolioFactory, TrancheData, ITrancheVault, IERC20Metadata, IStructuredIndexedPortfolio, IProtocolConfig, TrancheInitData, PortfolioParams, ExpectedEquityRate} from "./interfaces/IStructuredIndexedPortfolioFactory.sol";
import {IVaultsRegistry} from "./interfaces/IVaultsRegistry.sol";

contract StructuredIndexedPortfolioFactory is IStructuredIndexedPortfolioFactory, AccessControlEnumerable {
    using Address for address;

    bytes32 public constant WHITELISTED_MANAGER_ROLE = keccak256("WHITELISTED_MANAGER_ROLE"); // 0f1a06f478c6d93b4de7d3729d5b62d1767a80e47459ec53d09d36e3042f5253

    IStructuredIndexedPortfolio[] public portfolios;
    address public immutable trancheImplementation;
    address public immutable portfolioImplementation;
    IProtocolConfig public immutable protocolConfig;
    IVaultsRegistry public immutable vaultsRegistry;

    constructor(
        address _portfolioImplementation,
        address _trancheImplementation,
        IProtocolConfig _protocolConfig,
        IVaultsRegistry _vaultsRegistry
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        portfolioImplementation = _portfolioImplementation;
        trancheImplementation = _trancheImplementation;
        protocolConfig = _protocolConfig;
        vaultsRegistry = _vaultsRegistry;
    }

    function createPortfolio(
        IERC20Metadata asset,
        PortfolioParams calldata portfolioParams,
        TrancheData[] calldata tranchesData,
        ExpectedEquityRate calldata expectedEquityRate
    ) external {
        require(hasRole(WHITELISTED_MANAGER_ROLE, msg.sender), "SIPF: Only whitelisted manager");

        (TrancheInitData[] memory tranchesInitData, ITrancheVault[] memory tranches) = _deployTranches(asset, tranchesData);

        IStructuredIndexedPortfolio newPortfolio = IStructuredIndexedPortfolio(
            address(
                new ProxyWrapper(
                    portfolioImplementation,
                    abi.encodeWithSelector(
                        IStructuredIndexedPortfolio.initialize.selector,
                        msg.sender,
                        asset,
                        protocolConfig,
                        vaultsRegistry,
                        portfolioParams,
                        tranchesInitData,
                        expectedEquityRate
                    )
                )
            )
        );
        portfolios.push(newPortfolio);

        emit PortfolioCreated(newPortfolio, msg.sender, tranches);
    }

    /**
     * @notice Deploys all tranche vaults for a portfolio
     * @param asset Token used as an underlying asset
     * @param tranchesData Data used for tranche vaults deployment
     */
    //slither-disable-next-line unused-return
    function _deployTranches(IERC20Metadata asset, TrancheData[] memory tranchesData)
        internal
        returns (TrancheInitData[] memory trancheInitData, ITrancheVault[] memory tranches)
    {
        uint256 tranchesCount = tranchesData.length;
        trancheInitData = new TrancheInitData[](tranchesCount);
        tranches = new ITrancheVault[](tranchesCount);

        for (uint256 i = 0; i < tranchesCount; i++) {
            TrancheData memory trancheData = tranchesData[i];

            address depositController = Clones.clone(trancheData.depositControllerImplementation);
            depositController.functionCall(trancheData.depositControllerInitData);

            address withdrawController = Clones.clone(trancheData.withdrawControllerImplementation);
            withdrawController.functionCall(trancheData.withdrawControllerInitData);

            address transferController = Clones.clone(trancheData.transferControllerImplementation);
            transferController.functionCall(trancheData.transferControllerInitData);

            ITrancheVault tranche = ITrancheVault(
                address(
                    new ProxyWrapper(
                        trancheImplementation,
                        abi.encodeWithSelector(
                            ITrancheVault.initialize.selector,
                            trancheData.name,
                            trancheData.symbol,
                            asset,
                            depositController,
                            withdrawController,
                            transferController,
                            protocolConfig,
                            i,
                            msg.sender,
                            trancheData.managerFeeRate
                        )
                    )
                )
            );

            trancheInitData[i] = TrancheInitData(tranche, trancheData.targetApy, trancheData.minSubordinateRatio);

            tranches[i] = tranche;
        }
    }

    function getPortfolios() external view returns (IStructuredIndexedPortfolio[] memory) {
        return portfolios;
    }
}
