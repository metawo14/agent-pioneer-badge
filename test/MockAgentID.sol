// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal mock of an Agent ID ERC-721, for local tests only.
/// Not deployed to mainnet.
contract MockAgentID {
    mapping(address => uint256) private _bal;

    function setBalance(address a, uint256 b) external {
        _bal[a] = b;
    }

    function balanceOf(address a) external view returns (uint256) {
        return _bal[a];
    }
}
