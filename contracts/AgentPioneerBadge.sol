// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title Agent Pioneer Badge
/// @notice Free (gas-only) ERC-721 badge, one per Agent ID holder.
/// @dev No owner, no fees, no pause, no privileged functions at all.
///      Eligibility is checked against an Agent ID ERC-721 contract
///      (balanceOf > 0) at mint time. On BNB Chain the Agent ID contract is
///      0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F. The address is a
///      constructor argument so the same source can be tested against a mock.
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
}

contract AgentPioneerBadge is ERC721 {
    IAgentID public immutable agentId;
    uint256 public totalMinted;
    mapping(address => bool) public hasMinted;

    event Minted(address indexed minter, uint256 indexed tokenId);

    constructor(address agentId_)
        ERC721("Agent Pioneer Badge", "APB")
    {
        agentId = IAgentID(agentId_);
    }

    /// @notice Mint one free badge. Caller must hold an Agent ID and must
    /// not have minted before. Gas only, no payment.
    function mint() external returns (uint256 tokenId) {
        require(agentId.balanceOf(msg.sender) > 0, "Agent ID required");
        require(!hasMinted[msg.sender], "Already minted");
        hasMinted[msg.sender] = true;
        tokenId = ++totalMinted;
        _safeMint(msg.sender, tokenId);
        emit Minted(msg.sender, tokenId);
    }

    /// @notice Fully on-chain metadata: JSON + SVG image as data URIs.
    /// No external host is needed to render a badge.
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Nonexistent token");
        string memory idStr = Strings.toString(tokenId);
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
            '<rect width="512" height="512" fill="#0b0b12"/>',
            '<circle cx="256" cy="256" r="200" fill="none" stroke="#f0b90b" stroke-width="10"/>',
            '<text x="256" y="220" font-family="sans-serif" font-size="44" font-weight="bold" fill="#f0b90b" text-anchor="middle">AGENT</text>',
            '<text x="256" y="280" font-family="sans-serif" font-size="44" font-weight="bold" fill="#f0b90b" text-anchor="middle">PIONEER</text>',
            '<text x="256" y="340" font-family="sans-serif" font-size="30" fill="#ffffff" text-anchor="middle">#',
            idStr,
            "</text></svg>"
        );
        string memory json = string.concat(
            '{"name":"Agent Pioneer Badge #',
            idStr,
            '","description":"A free badge for Agent ID holders. One per Agent ID, gas only. No rewards or returns are promised.",',
            '"image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return
            string.concat(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            );
    }
}
