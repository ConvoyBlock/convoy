pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

// import "@openzeppelin/contracts/access/Ownable.sol"; 
// https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol

contract Convoy is ERC721, ERC721Enumerable {
  struct Match {
    uint256 matchId; // not necessary, for debugging
    address defender;
    address invader;
    uint32[10] defense; // null-terminated but 10 max
    // [0,1,2,3,4,5,6,7,8,9]
    uint32[10] invasion; // quick reset by setting invasion[0] = 0
    bytes32 defenseHash;
    bytes32 invasionHash;
    uint256 resultHash;
    uint8 pointsInvader;
    uint8 round;
    bool defenderRevealed;
    bool invaderRevealed;
    bool disputeFlag;
  }

  mapping(uint256 => Match) public matches;
  uint256 private counter;
  event MatchMinted(uint256 indexed matchId);
  event Committed(uint256 indexed matchId, bool asDefender);
  event Revealed(uint256 indexed matchId, bool asDefender);

  constructor() ERC721("Match", "MATCH") {
    // what should we do on deploy?
  }

  // to support receiving ETH by default
  receive() external payable {}
  fallback() external payable {}

  function initMatch() public returns (uint256) {
    _mint(msg.sender, counter);
    Match storage m = matches[counter];
    m.matchId = counter;
    m.defender = msg.sender; // TODO allow proposing match as invader
    emit MatchMinted(counter);
    counter++;

    return m.matchId;
  }

  function _test1round(uint256 matchId) public {
    matches[matchId].defender = msg.sender;
    matches[matchId].invader = msg.sender;
    matches[matchId].defenseHash = "foo";
    matches[matchId].invasionHash = "bar";
//    matches[matchId].
  }

  function joinMatch(uint256 matchId, bool asDefender) public {
    require(matchId < counter, "Match too big");
    require(!asDefender || matches[matchId].defender == address(0), "Defender exists");
    require(asDefender || matches[matchId].invader == address(0), "Invader exists");
    if (asDefender) {
      matches[matchId].defender = msg.sender;
    } else {
      matches[matchId].invader = msg.sender;
    }
  }

  function matchRound(uint256 matchId) public view returns (uint8 round, bool ready) {
    require(matchId < counter, "Match too big");
    round = matches[matchId].round;
    ready = matches[matchId].defender != address(0) && matches[matchId].invader != address(0);
    return (round, ready);
  }

  function commit(uint256 matchId, bool asDefender, bytes32 hash) public {
    require(matchId < counter, "Match too big");
    require(!matches[matchId].defenderRevealed && !matches[matchId].invaderRevealed, "Reveal initiated already");
    require(!asDefender || matches[matchId].defender == msg.sender, "Not the defender");
    require(asDefender || matches[matchId].invader == msg.sender, "Not the invader");
    // Can only reveal after both sides committed, can commit until both committed and one revealed
    require(!matches[matchId].defenderRevealed, "Defender already revealed");
    require(!matches[matchId].invaderRevealed, "Invader already revealed");

    if (asDefender) {
      matches[matchId].defenseHash = hash;
    } else {
      matches[matchId].invasionHash = hash;
    }
    emit Committed(matchId, asDefender);
    // you can commit repeatedly until someone has revealed
  }

  function reveal(uint256 matchId, bool asDefender, uint32[10] calldata army) public {
    require(matchId < counter, "Match too big");
    //require(!matches[matchId].defenderRevealed && !matches[matchId].invaderRevealed, "Reveal initiated already");
    require(!asDefender || matches[matchId].defender == msg.sender, "Not the defender");
    require(asDefender || matches[matchId].invader == msg.sender, "Not the invader");
    require(matches[matchId].defenseHash != 0 && matches[matchId].invasionHash != 0, "A side has yet to commit");
    require(!asDefender || !matches[matchId].defenderRevealed, "Defender already revealed");
    require(asDefender || !matches[matchId].invaderRevealed, "Invader already revealed");

    if (asDefender) {
      matches[matchId].defense = army;
      matches[matchId].defenderRevealed = true;
    } else {
      matches[matchId].invasion = army;
      matches[matchId].invaderRevealed = true;
    }
    emit Revealed(matchId, asDefender);
    // TODO compute and check hash matches, can't just let opponent take responsibility
    // XXX not optional because we will clear hash w/o dispute step

    if (matches[matchId].defenderRevealed && matches[matchId].invaderRevealed) {
      // Both revealed! game on!
      // rollRound(......);
      // alternatively, let one side compute results and wait for other side to accept or dispute
      // but then we need to save state to allow a confirm/dispute step
      // so we must validate here in the contract


      matches[matchId].defenseHash = 0;
      matches[matchId].invasionHash = 0;
      // don't reset actual defense/invasion so that other side can view results themselves

      matches[matchId].defenderRevealed = false;
      matches[matchId].invaderRevealed = false;
      matches[matchId].round++;
      
      // emit rolled... rounded...
    }
  }

  function defense(uint256 matchId) public view returns (uint32[10] memory) {
    return matches[matchId].defense;
  }
  function invasion(uint256 matchId) public view returns (uint32[10] memory) {
    return matches[matchId].invasion;
  }

  /* -------------------------------------------------------------------- */  
  // Required implementations for ERC721

  function _beforeTokenTransfer(address from, address to, uint256 tokenId)
      internal
      override(ERC721, ERC721Enumerable)
  {
      super._beforeTokenTransfer(from, to, tokenId);
  }

  function supportsInterface(bytes4 interfaceId)
      public
      view
      override(ERC721, ERC721Enumerable)
      returns (bool)
  {
      return super.supportsInterface(interfaceId);
  }

}
