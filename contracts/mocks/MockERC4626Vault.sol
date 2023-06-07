// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC4626Vault is ERC20, IERC4626 {
    IERC20 internal token;
    uint256 value;
    uint256 public previewRedeemFlatFee;

    constructor(IERC20 _token) ERC20("MockERC4626Vault", "MEV") {
        token = _token;
    }

    function asset() public view returns (address) {
        return address(token);
    }

    function setValue(uint256 _value) public {
        value = _value;
    }

    function totalAssets() public view returns (uint256) {
        return value;
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            return assets;
        }
        return (assets * _totalSupply) / value;
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            return shares;
        }
        return (shares * value) / _totalSupply;
    }

    function maxDeposit(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return convertToShares(assets);
    }

    function deposit(uint256 assets, address receiver) public returns (uint256) {
        uint256 shares = convertToShares(assets);
        value += assets;
        _mint(receiver, shares);
        token.transferFrom(msg.sender, address(this), assets);
        return shares;
    }

    function maxMint(address) public pure returns (uint256) {
        return type(uint256).max;
    }

    function previewMint(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    function mint(uint256 shares, address receiver) public returns (uint256) {
        uint256 assets = convertToAssets(shares);
        value += assets;
        _mint(receiver, shares);
        token.transferFrom(msg.sender, address(this), assets);
        return assets;
    }

    function maxWithdraw(address) public view returns (uint256) {
        return convertToAssets(balanceOf(msg.sender));
    }

    function previewWithdraw(uint256 shares) public view returns (uint256) {
        return convertToAssets(shares);
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public returns (uint256) {
        uint256 shares = convertToShares(assets);
        value -= assets;
        _burn(owner, shares);
        token.transfer(receiver, assets);
        return shares;
    }

    function maxRedeem(address) public view returns (uint256) {
        return balanceOf(msg.sender);
    }

    function previewRedeem(uint256 shares) public view virtual returns (uint256) {
        uint256 assets = convertToAssets(shares);
        if (previewRedeemFlatFee > assets) return 0;
        return convertToAssets(shares) - previewRedeemFlatFee;
    }

    function setPreviewRedeemFlatFee(uint256 fee) external {
        previewRedeemFlatFee = fee;
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public returns (uint256) {
        uint256 assets = convertToAssets(shares);
        value -= assets;
        _burn(owner, shares);
        token.transfer(receiver, assets);
        return assets;
    }
}
