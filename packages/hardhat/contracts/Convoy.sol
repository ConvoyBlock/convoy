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
    uint32[5] defense; // null-terminated but 5 max
    // [0,1,2,3,4,5,6,7,8,9]
    // [0,1,2,3,4]
    uint32[5] invasion; // quick reset by setting invasion[0] = 0
    bytes32 defenseHash;
    bytes32 invasionHash;
    uint256 resultHash;
    uint8 pointsInvader;
    uint8 round;
    bool defenderRevealed;
    bool invaderRevealed;
    bool disputeFlag;
  }

  uint8 public armySize = 5; // const
  //  (position << 16) + (type << 13) + (hp << 10) + (range << 7) + (attack << 4);
  uint8 OFF_POSITION = 16;
  uint8 OFF_TYPE = 13;
  uint8 OFF_HP = 10;
  uint8 OFF_RANGE = 7;
  uint8 OFF_ATTACK = 4;
  uint8 OFF_SPEED = 1;

  mapping(uint256 => Match) public matches;
  uint256[] public joinables;
  uint256 private counter;
  event MatchMinted(uint256 indexed matchId);
  event MatchJoined(uint256 indexed matchId, address opponent);
  event Committed(uint256 indexed matchId, bool asDefender);
  event Revealed(uint256 indexed matchId, bool asDefender);
  event InvadersDestroyed(uint256 indexed matchId, uint8 count);
  event DefendersDestroyed(uint256 indexed matchId, uint8 count);

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
    joinables.push(counter);
    counter++;

    return m.matchId;
  }

  function getMatch(uint256 matchId) public view returns (Match memory) {
    require(matchId < counter, "Match too big");
    return matches[matchId];
  }

  // return your (defender or invader) newest 10 active (not round=4) matches 
  function yourNewestActiveMatches(address you) public view returns (uint256[] memory) {
    require(counter > 0, "Not a single match");
    uint256 count;
    uint256[] memory yourMatches = new uint256[](10);
    for (uint256 i = counter; i > 0 && count < 10; i--) {
      Match memory m = matches[i - 1]; // i-1 so i must be > 0, do not let 0--
      console.log(msg.sender);
      console.log(m.defender);
      console.log(m.invader);
      if (m.defender == you || m.invader == you) {
        if (m.round < 4) {
          yourMatches[count++] = i - 1;
        }
      }
    }
    // filters empty slots from yourMatches, prevents returning invalid 0s
    uint256[] memory filtered = new uint256[](count);
    for (uint256 i; i < count; i++) {
      filtered[i] = yourMatches[i];
    }
    return filtered;
  }
  
  function _test1round(uint256 matchId) public {
    require(matchId < counter, "Match too big");
    matches[matchId].defender = msg.sender;
    matches[matchId].invader = msg.sender;
    matches[matchId].defenseHash = "foo";
    matches[matchId].invasionHash = "bar";
//    matches[matchId].
  }

  function joinlist() public view returns (uint256[] memory) {
    return joinables;
  }
  function joinMatch(uint256 matchId, bool asDefender) public {
    require(matchId < counter, "Match too big");
    require(!asDefender || matches[matchId].defender == address(0), "Defender exists");
    require(asDefender || matches[matchId].invader == address(0), "Invader exists");
    for (uint256 i = 0; i < joinables.length; i++) {
      if (matchId == joinables[i]) {
        // delete element from array
        joinables[i] = joinables[joinables.length - 1];
        joinables.pop();

        if (asDefender) {
          matches[matchId].defender = msg.sender;
        } else {
          matches[matchId].invader = msg.sender;
        }
        emit MatchJoined(matchId, msg.sender);
        return;
      }
    }
    revert("matchId not joinable");
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
    // allows committing before someone has even joined

    if (asDefender) {
      matches[matchId].defenseHash = hash;
    } else {
      matches[matchId].invasionHash = hash;
    }
    emit Committed(matchId, asDefender);
    // you can commit repeatedly until someone has revealed
  }

  function reveal(uint256 matchId, bool asDefender, uint32[5] calldata army) public {
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

    finishRound(matchId);
  }
  function finishRound(uint256 matchId) public {
    if (matches[matchId].defenderRevealed && matches[matchId].invaderRevealed) {
      // Both revealed! game on!
      // rollRound(......);
      // alternatively, let one side compute results and wait for other side to accept or dispute
      // but then we need to save state to allow a confirm/dispute step
      // so we must validate here in the contract

      // TODO loop a few times, note that armies get modified in place
      evalRound(matchId);
      _roundUp(matchId);
    }
  }

  // position should be max 5 bits to fit up to 16 troops in defenseReverse where defense > 16.
 //  There is no uint4 so uint8.
  function posit(uint32 troop) public view returns (uint8) {
    return uint8(troop >> OFF_POSITION);
  }
  function setPos(uint32 troop, uint8 pos) public returns (uint32) {
    return troop | ((0x1F & pos) << OFF_POSITION);
  }
  function attrib(uint32 troop, uint8 offset) public view returns (uint8) {
    // 0b111 = 0x07
    return 0x07 & uint8(troop >> offset);
  }
  function setAttr(uint32 troop, uint8 offset, uint8 val) public returns (uint32) {
    return troop | ((0x07 & val) << offset);
  }
  // looks at defense/invasion and computes state based on that alone, assuming not mid-reveal
  function evalRound(uint256 matchId) public {
    require(matchId < counter, "Match too big");
    require(matches[matchId].invaderRevealed, "Invader has not revealed");
    require(matches[matchId].defenderRevealed, "Defender has not revealed");
    uint16 defenseMap;
    uint16 invasionMap;
    uint128 defenseReverse;
    uint128 invasionReverse;
    uint8 defendersDestroyed;
    uint8 invadersDestroyed;
    uint8 invadersSurvived;
    Match memory m = matches[matchId];

    // make map and reverse
    for (uint8 i = 0; i < armySize && m.defense[i] != 0; i++) {
      // XXX at this stage they should all be "alive"?
      if (attrib(m.defense[i], OFF_HP) == 0) {
        continue;
      }
      defenseMap |= uint16(1 << posit(m.defense[i]));
      defenseReverse |= (i << (4 * posit(m.defense[i]))); // 4 bits for position
    }
    for (uint8 i = 0; i < armySize && m.invasion[i] != 0; i++) {
      if (attrib(m.invasion[i], OFF_HP) == 0) {
        continue;
      }
      invadersSurvived++; // alternatively count bits in post-attacked invasionMap
      invasionMap |= uint16(1 << posit(m.invasion[i]));
      invasionReverse |= (i << (4 * posit(m.invasion[i]))); // 4 bits for position
    }

    // attack by defense
    for (uint8 i = 0; i < armySize && m.defense[i] != 0; i++) {
      uint8 range = attrib(m.defense[i], OFF_RANGE) - 1; // range=1 can attack only directly up/down, so --
      uint8 pos = posit(m.defense[i]);
      if (pos == 0) {
        continue;
      }
      uint8 min = pos - range;
      for (pos = pos + range; pos >= min; pos--) {
        // starts big, most advanced troops
        if ((invasionMap & uint16(1 << pos)) != 0) {
          // hit
          uint8 invaderIdx = (0x0F & uint8(invasionReverse >> (4 * pos)));
          uint8 newHp = attrib(m.invasion[invaderIdx], OFF_HP);
          newHp -= attrib(m.defense[i], OFF_ATTACK);
          // prevent underflow by not subtracting
          if (newHp <= attrib(m.defense[i], OFF_ATTACK)) {
            newHp = 0;
            invasionMap -= uint16(1 << pos);
            invadersDestroyed++;
            invadersSurvived--;
          }
          m.invasion[invaderIdx] = setAttr(m.invasion[invaderIdx], OFF_HP, newHp);
          // TODO mark as dead, besides hp=0
          break;
        }
      }
    }

    // TODO attack by invader like defense after testing

    m.pointsInvader += invadersSurvived;
    emit InvadersDestroyed(matchId, invadersDestroyed);
    emit DefendersDestroyed(matchId, defendersDestroyed);

    // move troops - only invaders move
    invasionMap = 0; // throw away
    for (uint8 i = 0; i < armySize && m.invasion[i] != 0; i++) {
      // skip dead troops
      if (attrib(m.invasion[i], OFF_HP) == 0) {
        continue;
      }
      uint8 speed = attrib(m.invasion[i], OFF_SPEED);
      uint8 pos = posit(m.invasion[i]);
      while (speed > 0) {
        pos++;
        if ((invasionMap & (1 << pos)) != 0) {
          pos--;
          invasionMap |= uint16(1 << pos);
          m.invasion[i] = setPos(m.invasion[i], pos);
          break;
        }
        speed--;
      }
      if (speed == 0) {
        invasionMap |= uint16(1 << pos);
        m.invasion[i] = setPos(m.invasion[i], pos);
      }
    }
  }
  
  function _roundUp(uint256 matchId) internal {
    matches[matchId].defenseHash = 0;
    matches[matchId].invasionHash = 0;
    // don't reset actual defense/invasion so that other side can view results themselves

    matches[matchId].defenderRevealed = false;
    matches[matchId].invaderRevealed = false;
    matches[matchId].round++;
    
    // emit rolled... rounded...
  }
  function defense(uint256 matchId) public view returns (uint32[5] memory) {
    return matches[matchId].defense;
  }
  function invasion(uint256 matchId) public view returns (uint32[5] memory) {
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
